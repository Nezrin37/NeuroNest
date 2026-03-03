from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from database.models import (
    Appointment,
    AppointmentSlot,
    DoctorProfile,
    User,
    db,
)
from utils.slot_engine import (
    find_slot_for_legacy_time,
    generate_slots_for_doctor,
    get_or_create_schedule_setting,
    rolling_window_bounds,
    release_expired_holds,
)
from services.slot_lifecycle_service import (
    apply_cancellation_policy,
    mark_slot_available,
    mark_slot_booked,
    mark_slot_held,
)

appointments_bp = Blueprint("appointments", __name__)


def _is_patient():
    return get_jwt().get("role") == "patient"


def _utc_now():
    return datetime.now(timezone.utc)


def _appointment_status_for_mode(mode: str) -> str:
    return "approved" if mode == "auto_confirm" else "pending"


def _lock_slot(slot_id: int):
    return (
        AppointmentSlot.query.filter_by(id=slot_id)
        .with_for_update()
        .first()
    )


def _book_slot_atomic(*, current_user_id: int, doctor_id: int, slot_id: int, reason: str, notes: str, priority_level: str = "routine"):
    now_utc = _utc_now()
    setting = get_or_create_schedule_setting(doctor_id)
    if not setting.accepting_new_bookings:
        return None, "Doctor is not accepting new appointments currently", 409
    release_expired_holds(doctor_id)

    slot = _lock_slot(slot_id)
    if not slot:
        return None, "Slot not found", 404

    if slot.doctor_user_id != doctor_id:
        return None, "Slot does not belong to selected doctor", 400

    if slot.slot_start_utc <= now_utc:
        return None, "Cannot book past slot", 400

    if slot.status != "available":
        return None, "Slot already booked", 409

    booking_mode = setting.approval_mode

    appointment = Appointment(
        patient_id=current_user_id,
        doctor_id=doctor_id,
        appointment_date=slot.slot_date_local,
        appointment_time=slot.slot_start_utc.time(),
        slot_id=slot.id,
        reason=reason,
        notes=notes,
        priority_level=priority_level,
        status=_appointment_status_for_mode(booking_mode),
        booking_mode=booking_mode,
    )
    db.session.add(appointment)
    db.session.flush()

    if booking_mode == "doctor_approval":
        mark_slot_held(
            slot=slot,
            patient_id=current_user_id,
            hold_minutes=5,
            actor_user_id=current_user_id,
            source="patient_booking",
            reason="Patient selected slot; temporary soft-lock",
        )
        slot.booked_appointment_id = appointment.id
    else:
        mark_slot_booked(
            slot=slot,
            appointment_id=appointment.id,
            actor_user_id=current_user_id,
            source="patient_booking",
            reason="Auto-confirm booking",
        )

    return appointment, None, None


@appointments_bp.route("/doctors", methods=["GET"])
@jwt_required()
def get_all_doctors():
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        doctors_query = (
            db.session.query(User, DoctorProfile)
            .join(DoctorProfile, User.id == DoctorProfile.user_id)
            .filter(User.role == "doctor")
            .all()
        )

        result = []
        for user, profile in doctors_query:
            result.append(
                {
                    "id": user.id,
                    "full_name": user.full_name,
                    "specialization": profile.specialization or "General Physician",
                }
            )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/doctors/<int:doctor_id>/available-slots", methods=["GET"])
@jwt_required()
def get_available_slots(doctor_id):
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        date_str = request.args.get("date")
        if not date_str:
            return jsonify({"error": "date is required (YYYY-MM-DD)"}), 400

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        window_start, window_end = rolling_window_bounds()
        if target_date < window_start or target_date > window_end:
            return jsonify({
                "slots": [],
                "accepting_new_bookings": True,
                "message": None,
            }), 200

        setting = get_or_create_schedule_setting(doctor_id)
        # Opportunistically ensure rolling-window slots exist.
        generate_slots_for_doctor(doctor_id, window_start, window_end)
        release_expired_holds(doctor_id)
        db.session.commit()

        if not setting.accepting_new_bookings:
            return jsonify({
                "slots": [],
                "accepting_new_bookings": False,
                "message": "Doctor is not accepting new appointments currently.",
            }), 200

        slots = (
            AppointmentSlot.query.filter(
                AppointmentSlot.doctor_user_id == doctor_id,
                AppointmentSlot.slot_date_local == target_date,
                AppointmentSlot.status == "available",
            )
            .order_by(AppointmentSlot.slot_start_utc.asc())
            .all()
        )

        return jsonify({
            "slots": [s.to_dict() for s in slots],
            "accepting_new_bookings": True,
            "message": None,
        }), 200
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/book-by-slot", methods=["POST"])
@jwt_required()
def book_by_slot():
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        slot_id = data.get("slot_id")
        reason = data.get("reason")
        notes = data.get("notes", "")
        priority_level = data.get("priority_level", "routine")

        if not doctor_id or not slot_id or not reason:
            return jsonify({"error": "doctor_id, slot_id and reason are required"}), 400

        appointment, err_msg, err_code = _book_slot_atomic(
            current_user_id=current_user_id,
            doctor_id=int(doctor_id),
            slot_id=int(slot_id),
            reason=reason,
            notes=notes,
            priority_level=priority_level,
        )
        if err_msg:
            db.session.rollback()
            return jsonify({"error": err_msg}), err_code

        db.session.commit()
        return jsonify(appointment.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/", methods=["POST"])
@jwt_required()
def book_appointment():
    """
    Backward-compatible endpoint.
    If slot exists for date+time it uses slot booking atomically.
    Otherwise falls back to legacy appointment create (with conflict guard).
    """
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        required_fields = ["doctor_id", "date", "time", "reason"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        doctor_id = int(data["doctor_id"])
        appointment_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        appointment_time = datetime.strptime(data["time"], "%H:%M").time()

        slot = find_slot_for_legacy_time(doctor_id, appointment_date, appointment_time)
        if slot:
            appointment, err_msg, err_code = _book_slot_atomic(
                current_user_id=current_user_id,
                doctor_id=doctor_id,
                slot_id=slot.id,
                reason=data["reason"],
                notes=data.get("notes", ""),
                priority_level=data.get("priority_level", "routine"),
            )
            if err_msg:
                db.session.rollback()
                return jsonify({"error": err_msg}), err_code

            db.session.commit()
            payload = appointment.to_dict()
            payload["deprecated"] = True
            payload["message"] = "Legacy endpoint used; slot-aware booking applied"
            return jsonify(payload), 201

        # legacy fallback with duplicate guard
        existing = Appointment.query.filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.appointment_time == appointment_time,
            Appointment.status.in_(["pending", "approved", "completed", "no_show"]),
        ).first()

        if existing:
            return jsonify({"error": "Slot already booked"}), 409

        new_appointment = Appointment(
            patient_id=current_user_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            reason=data["reason"],
            notes=data.get("notes", ""),
            priority_level=data.get("priority_level", "routine"),
            status="pending",
            booking_mode="doctor_approval",
        )

        db.session.add(new_appointment)
        db.session.commit()

        payload = new_appointment.to_dict()
        payload["deprecated"] = True
        payload["message"] = "Legacy date/time booking path; migrate to /appointments/book-by-slot"
        return jsonify(payload), 201

    except ValueError:
        db.session.rollback()
        return jsonify({"error": "Invalid date/time format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/", methods=["GET"])
@jwt_required()
def get_appointments():
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        appointments = (
            Appointment.query.filter_by(patient_id=current_user_id)
            .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
            .all()
        )
        return jsonify([appt.to_dict() for appt in appointments]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/<int:id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_appointment(id):
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        appointment = Appointment.query.filter_by(id=id, patient_id=current_user_id).first()

        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        if appointment.status == "cancelled_by_patient":
            return jsonify({"message": "Appointment already cancelled"}), 200

        appointment.status = "cancelled_by_patient"

        if appointment.slot_id:
            apply_cancellation_policy(
                appointment=appointment,
                cancelled_by="patient",
                actor_user_id=current_user_id,
                source="patient_cancel",
                reason="Patient cancelled appointment",
            )

        db.session.commit()
        return jsonify({"message": "Appointment cancelled successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@appointments_bp.route("/<int:id>/reschedule", methods=["PUT"])
@jwt_required()
def reschedule_appointment(id):
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        appointment = Appointment.query.filter_by(id=id, patient_id=current_user_id).first()

        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        doctor_id = appointment.doctor_id

        target_slot = None
        if data.get("slot_id"):
            target_slot = AppointmentSlot.query.filter_by(
                id=int(data["slot_id"]),
                doctor_user_id=doctor_id,
            ).first()
        elif data.get("date") and data.get("time"):
            target_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
            target_time = datetime.strptime(data["time"], "%H:%M").time()
            target_slot = find_slot_for_legacy_time(doctor_id, target_date, target_time)

        if target_slot:
            release_expired_holds(doctor_id)
            slot = _lock_slot(target_slot.id)
            if not slot or slot.status != "available":
                db.session.rollback()
                return jsonify({"error": "Slot already booked"}), 409

            if appointment.slot_id:
                old_slot = _lock_slot(appointment.slot_id)
                if old_slot and old_slot.booked_appointment_id == appointment.id:
                    mark_slot_available(
                        slot=old_slot,
                        actor_user_id=current_user_id,
                        source="patient_reschedule",
                        reason="Patient moved to a new slot",
                    )

            setting = get_or_create_schedule_setting(doctor_id)
            mode = setting.approval_mode
            appointment.slot_id = slot.id
            appointment.appointment_date = slot.slot_date_local
            appointment.appointment_time = slot.slot_start_utc.time()
            appointment.status = _appointment_status_for_mode(mode)
            appointment.booking_mode = mode

            if mode == "doctor_approval":
                mark_slot_held(
                    slot=slot,
                    patient_id=current_user_id,
                    hold_minutes=5,
                    actor_user_id=current_user_id,
                    source="patient_reschedule",
                    reason="Rescheduled slot soft-lock",
                )
                slot.booked_appointment_id = appointment.id
            else:
                mark_slot_booked(
                    slot=slot,
                    appointment_id=appointment.id,
                    actor_user_id=current_user_id,
                    source="patient_reschedule",
                    reason="Rescheduled slot confirmed",
                )
            db.session.commit()
            return jsonify({"message": "Appointment rescheduled successfully", "appointment": appointment.to_dict()}), 200

        # legacy fallback
        if "date" in data:
            appointment.appointment_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        if "time" in data:
            appointment.appointment_time = datetime.strptime(data["time"], "%H:%M").time()

        appointment.status = "pending"
        appointment.booking_mode = "doctor_approval"
        db.session.commit()

        payload = {
            "message": "Appointment rescheduled via legacy path",
            "appointment": appointment.to_dict(),
            "deprecated": True,
        }
        return jsonify(payload), 200

    except ValueError:
        db.session.rollback()
        return jsonify({"error": "Invalid date/time format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@appointments_bp.route("/<int:id>/confirm-reschedule", methods=["POST"])
@jwt_required()
def confirm_reschedule(id):
    try:
        if not _is_patient():
            return jsonify({"error": "Patient access required"}), 403

        current_user_id = int(get_jwt_identity())
        appointment = Appointment.query.filter_by(id=id, patient_id=current_user_id).first()

        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404

        if appointment.status != "rescheduled":
            return jsonify({"error": "Appointment is not in rescheduled state"}), 400

        # If doctor suggested it, we can auto-approve it once patient confirms
        appointment.status = "approved"
        
        db.session.commit()
        return jsonify({"message": "Appointment confirmed successfully", "appointment": appointment.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
