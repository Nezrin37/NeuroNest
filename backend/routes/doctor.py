from flask import Blueprint, request, jsonify
from sqlalchemy import func
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import and_, or_, desc
from database.models import (
    db,
    Appointment,
    AppointmentSlot,
    DoctorSlotOverride,
    InAppNotification,
    User,
    ClinicalRemark,
    MedicalRecord,
    ClinicalPin,
)
from utils.slot_engine import (
    apply_override_to_existing_slots,
    get_or_create_schedule_setting,
    regenerate_slots_for_doctor,
    rolling_window_bounds,
    release_expired_holds,
)
from services.slot_lifecycle_service import (
    apply_cancellation_policy,
    log_slot_event,
    mark_slot_available,
    mark_slot_blocked,
    mark_slot_booked,
)

doctor_bp = Blueprint("doctor", __name__)

def check_doctor_role():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return False
    return True


def _utc_now():
    return datetime.now(timezone.utc)


def _lock_slot(slot_id: int):
    return AppointmentSlot.query.filter_by(id=slot_id).with_for_update().first()

@doctor_bp.route("/appointment-requests", methods=["GET"])
@jwt_required()
def get_appointment_requests():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    
    # Get pending appointments for this doctor, joining with patient profile for depth
    requests = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.status.in_(["pending"])
    ).order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).all()

    enriched_requests = []
    for req in requests:
        data = req.to_dict()
        # Add profile data if available
        if req.patient and req.patient.patient_profile:
            p = req.patient.patient_profile
            data["gender"] = p.gender
            data["dob"] = str(p.date_of_birth) if p.date_of_birth else None
            data["phone"] = p.phone
        enriched_requests.append(data)
    
    return jsonify(enriched_requests), 200

@doctor_bp.route("/appointments/<int:appointment_id>/approve", methods=["PATCH"])
@jwt_required()
def approve_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
    
    appointment.status = "approved"
    if appointment.slot_id:
        slot = _lock_slot(appointment.slot_id)
        if slot:
            mark_slot_booked(
                slot=slot,
                appointment_id=appointment.id,
                actor_user_id=current_user_id,
                source="doctor_approval",
                reason="Doctor approved appointment",
            )
    db.session.commit()
    
    return jsonify({
        "message": "Appointment approved successfully",
        "appointment": appointment.to_dict()
    }), 200

@doctor_bp.route("/appointments/<int:appointment_id>/reject", methods=["PATCH"])
@jwt_required()
def reject_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
    
    appointment.status = "rejected"
    if appointment.slot_id:
        slot = _lock_slot(appointment.slot_id)
        if slot and slot.booked_appointment_id == appointment.id:
            mark_slot_available(
                slot=slot,
                actor_user_id=current_user_id,
                source="doctor_reject",
                reason="Doctor rejected appointment",
            )
    db.session.commit()
    
    return jsonify({
        "message": "Appointment rejected successfully",
        "appointment": appointment.to_dict()
    }), 200

@doctor_bp.route("/appointments/<int:appointment_id>/reschedule", methods=["PATCH"])
@jwt_required()
def reschedule_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    data = request.json
    
    if not data or 'appointment_date' not in data or 'appointment_time' not in data:
        return jsonify({"message": "New date and time are required"}), 400
        
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
    
    old_date = appointment.appointment_date
    old_time = appointment.appointment_time
    
    try:
        new_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        new_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
    except ValueError:
        return jsonify({"message": "Invalid date or time format"}), 400

    appointment.appointment_date = new_date
    appointment.appointment_time = new_time
    appointment.status = "rescheduled" # Indicates doctor suggested a new time
    
    # If there was a slot, unbind it as the time has changed
    if appointment.slot_id:
        slot = _lock_slot(appointment.slot_id)
        if slot and slot.booked_appointment_id == appointment.id:
            mark_slot_available(
                slot=slot,
                actor_user_id=current_user_id,
                source="doctor_reschedule",
                reason="Doctor rescheduled appointment",
            )
        appointment.slot_id = None

    db.session.add(
        InAppNotification(
            user_id=appointment.patient_id,
            type="appointment_rescheduled",
            title="Appointment Rescheduled",
            message=f"Dr. {appointment.doctor.full_name} has suggested a new time for your appointment: {new_date} at {new_time}. Please review and confirm.",
            payload={
                "appointment_id": appointment.id,
                "old_date": str(old_date),
                "old_time": str(old_time),
                "new_date": str(new_date),
                "new_time": str(new_time),
                "doctor_id": current_user_id
            },
        )
    )
    
    db.session.commit()
    
    return jsonify({
        "message": "Appointment rescheduled successfully",
        "appointment": appointment.to_dict()
    }), 200

@doctor_bp.route("/schedule", methods=["GET"])
@jwt_required()
def get_doctor_schedule():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    date_str = request.args.get('date')
    status_filter = request.args.get('status')
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        target_date = date.today()
    
    query = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.appointment_date == target_date
    )
    
    if status_filter and status_filter.lower() != 'all':
        normalized_status = status_filter.lower().replace("-", "_")
        query = query.filter(Appointment.status == normalized_status)
    else:
        # Default: Show everything except 'Pending' which should be in Requests
        query = query.filter(Appointment.status.notin_(["pending"]))
        
    schedule = query.order_by(Appointment.appointment_time.asc()).all()
    
    return jsonify([appt.to_dict() for appt in schedule]), 200


@doctor_bp.route("/schedule/settings", methods=["GET"])
@jwt_required()
def get_schedule_settings():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    setting = get_or_create_schedule_setting(current_user_id)
    db.session.commit()
    return jsonify(setting.to_dict()), 200


@doctor_bp.route("/schedule/settings", methods=["PUT"])
@jwt_required()
def update_schedule_settings():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    setting = get_or_create_schedule_setting(current_user_id)

    slot_duration = int(data.get("slot_duration_minutes", setting.slot_duration_minutes))
    buffer_minutes = int(data.get("buffer_minutes", setting.buffer_minutes))
    approval_mode = data.get("approval_mode", setting.approval_mode)
    accepting_new_bookings = bool(data.get("accepting_new_bookings", setting.accepting_new_bookings))
    tz = data.get("timezone", setting.timezone or "Asia/Kolkata")

    if slot_duration <= 0 or slot_duration > 180:
        return jsonify({"message": "slot_duration_minutes must be between 1 and 180"}), 400
    if buffer_minutes < 0 or buffer_minutes > 60:
        return jsonify({"message": "buffer_minutes must be between 0 and 60"}), 400
    if approval_mode not in ("auto_confirm", "doctor_approval"):
        return jsonify({"message": "approval_mode must be auto_confirm or doctor_approval"}), 400

    requires_regeneration = (
        setting.slot_duration_minutes != slot_duration
        or setting.buffer_minutes != buffer_minutes
        or setting.timezone != tz
    )

    setting.slot_duration_minutes = slot_duration
    setting.buffer_minutes = buffer_minutes
    setting.approval_mode = approval_mode
    setting.accepting_new_bookings = accepting_new_bookings
    setting.timezone = tz

    if requires_regeneration:
        start_date, end_date = rolling_window_bounds()
        regenerate_slots_for_doctor(current_user_id, start_date, end_date)
    db.session.commit()

    return jsonify(setting.to_dict()), 200


@doctor_bp.route("/schedule/generate", methods=["POST"])
@jwt_required()
def generate_schedule_slots():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    horizon_days = int(data.get("horizon_days", 14))
    if horizon_days < 1 or horizon_days > 30:
        return jsonify({"message": "horizon_days must be between 1 and 30"}), 400

    start_date = date.today()
    end_date = start_date + timedelta(days=horizon_days - 1)

    try:
        summary = regenerate_slots_for_doctor(current_user_id, start_date, end_date)
        db.session.commit()
        return jsonify(
            {
                "message": "Slots generated",
                "range": {"start_date": str(start_date), "end_date": str(end_date)},
                **summary,
            }
        ), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 400


@doctor_bp.route("/schedule/slots", methods=["GET"])
@jwt_required()
def get_schedule_slots():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"message": "date query param required (YYYY-MM-DD)"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    release_expired_holds(current_user_id)
    slots = (
        AppointmentSlot.query.filter(
            AppointmentSlot.doctor_user_id == current_user_id,
            AppointmentSlot.slot_date_local == target_date,
        )
        .order_by(AppointmentSlot.slot_start_utc.asc())
        .all()
    )

    counts = {
        "total": len(slots),
        "available": sum(1 for s in slots if s.status == "available"),
        "booked": sum(1 for s in slots if s.status == "booked"),
        "held": sum(1 for s in slots if s.status == "held"),
        "blocked": sum(1 for s in slots if s.status == "blocked"),
    }

    db.session.commit()
    return jsonify({"slots": [s.to_dict() for s in slots], "counts": counts}), 200


@doctor_bp.route("/slots/<int:slot_id>/block", methods=["PATCH"])
@jwt_required()
def block_slot(slot_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    slot = _lock_slot(slot_id)
    if not slot or slot.doctor_user_id != current_user_id:
        return jsonify({"message": "Slot not found"}), 404

    if slot.status == "booked":
        return jsonify({"message": "Booked slots cannot be blocked"}), 400

    mark_slot_blocked(
        slot=slot,
        actor_user_id=current_user_id,
        source="doctor_manual_block",
        reason="Manual doctor block",
    )
    slot.source = "manual_override"
    db.session.commit()
    return jsonify(slot.to_dict()), 200


@doctor_bp.route("/slots/<int:slot_id>/unblock", methods=["PATCH"])
@jwt_required()
def unblock_slot(slot_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    slot = _lock_slot(slot_id)
    if not slot or slot.doctor_user_id != current_user_id:
        return jsonify({"message": "Slot not found"}), 404

    if slot.status == "booked":
        return jsonify({"message": "Booked slots cannot be unblocked"}), 400

    mark_slot_available(
        slot=slot,
        actor_user_id=current_user_id,
        source="doctor_manual_unblock",
        reason="Manual doctor unblock",
    )
    slot.source = "manual_override"
    db.session.commit()
    return jsonify(slot.to_dict()), 200


@doctor_bp.route("/schedule/overrides", methods=["GET"])
@jwt_required()
def list_schedule_overrides():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    date_str = request.args.get("date")
    query = DoctorSlotOverride.query.filter_by(doctor_user_id=current_user_id, is_active=True)
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(DoctorSlotOverride.override_date == target_date)
        except ValueError:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    rows = query.order_by(DoctorSlotOverride.override_date.asc(), DoctorSlotOverride.created_at.desc()).all()
    return jsonify([row.to_dict() for row in rows]), 200


@doctor_bp.route("/schedule/overrides", methods=["POST"])
@jwt_required()
def create_schedule_override():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    scope = data.get("scope", "full_day")
    date_str = data.get("date")
    reason = data.get("reason")
    if scope not in ("full_day", "range"):
        return jsonify({"message": "scope must be full_day or range"}), 400
    if not date_str:
        return jsonify({"message": "date is required (YYYY-MM-DD)"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

    setting = get_or_create_schedule_setting(current_user_id)
    tz = timezone.utc
    if setting.timezone:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(setting.timezone)

    start_utc = None
    end_utc = None
    if scope == "range":
        start_str = data.get("start_time")
        end_str = data.get("end_time")
        if not start_str or not end_str:
            return jsonify({"message": "start_time and end_time are required for range scope"}), 400
        try:
            start_local_t = datetime.strptime(start_str, "%H:%M").time()
            end_local_t = datetime.strptime(end_str, "%H:%M").time()
        except ValueError:
            return jsonify({"message": "Invalid time format. Use HH:MM"}), 400
        if start_local_t >= end_local_t:
            return jsonify({"message": "start_time must be before end_time"}), 400

        start_local_dt = datetime(
            target_date.year,
            target_date.month,
            target_date.day,
            start_local_t.hour,
            start_local_t.minute,
            tzinfo=tz,
        )
        end_local_dt = datetime(
            target_date.year,
            target_date.month,
            target_date.day,
            end_local_t.hour,
            end_local_t.minute,
            tzinfo=tz,
        )
        start_utc = start_local_dt.astimezone(timezone.utc)
        end_utc = end_local_dt.astimezone(timezone.utc)

    override = DoctorSlotOverride(
        doctor_user_id=current_user_id,
        override_date=target_date,
        scope=scope,
        start_time_utc=start_utc,
        end_time_utc=end_utc,
        reason=reason,
        created_by=current_user_id,
        is_active=True,
    )
    db.session.add(override)
    db.session.flush()

    log_slot_event(
        event_type="override_created",
        doctor_user_id=current_user_id,
        actor_user_id=current_user_id,
        source="doctor_override",
        reason=reason,
        metadata={"override_id": override.id, "scope": scope, "date": str(target_date)},
    )

    window_start, window_end = rolling_window_bounds()
    if window_start <= target_date <= window_end:
        regenerate_slots_for_doctor(current_user_id, target_date, target_date)
        apply_override_to_existing_slots(current_user_id, target_date)

    db.session.commit()
    return jsonify(override.to_dict()), 201


@doctor_bp.route("/schedule/overrides/<int:override_id>", methods=["DELETE"])
@jwt_required()
def delete_schedule_override(override_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    override = DoctorSlotOverride.query.filter_by(id=override_id, doctor_user_id=current_user_id, is_active=True).first()
    if not override:
        return jsonify({"message": "Override not found"}), 404

    override.is_active = False
    override.updated_at = datetime.utcnow()
    log_slot_event(
        event_type="override_deleted",
        doctor_user_id=current_user_id,
        actor_user_id=current_user_id,
        source="doctor_override",
        reason=override.reason,
        metadata={"override_id": override.id, "date": str(override.override_date), "scope": override.scope},
    )

    window_start, window_end = rolling_window_bounds()
    if window_start <= override.override_date <= window_end:
        regenerate_slots_for_doctor(current_user_id, override.override_date, override.override_date)

    db.session.commit()
    return jsonify({"message": "Override removed", "override_id": override_id}), 200


@doctor_bp.route("/appointments/<int:appointment_id>/complete", methods=["PATCH"])
@jwt_required()
def complete_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
        
    appointment.status = "completed"
    db.session.commit()
    
    return jsonify({"message": "Appointment marked as completed"}), 200

@doctor_bp.route("/appointments/<int:appointment_id>/cancel", methods=["PATCH"])
@jwt_required()
def cancel_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
        
    appointment.status = "cancelled_by_doctor"
    if appointment.slot_id:
        apply_cancellation_policy(
            appointment=appointment,
            cancelled_by="doctor",
            actor_user_id=current_user_id,
            source="doctor_cancel",
            reason="Doctor cancelled appointment",
        )

    db.session.add(
        InAppNotification(
            user_id=appointment.patient_id,
            type="appointment_cancelled",
            title="Appointment Cancelled",
            message=f"Your appointment with Dr. {appointment.doctor.full_name if appointment.doctor else appointment.doctor_id} was cancelled by doctor.",
            payload={
                "appointment_id": appointment.id,
                "doctor_id": appointment.doctor_id,
            },
        )
    )
    db.session.commit()
    
    return jsonify({"message": "Appointment cancelled"}), 200

@doctor_bp.route("/appointments/history", methods=["GET"])
@jwt_required()
def get_appointment_history():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    
    appointments = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.status.notin_(["pending"])
    ).order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()
    
    return jsonify([appt.to_dict() for appt in appointments]), 200

@doctor_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_doctor_stats():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    today = date.today()
    
    # 1. Total Patients (Unique)
    total_patients = db.session.query(func.count(func.distinct(Appointment.patient_id)))\
        .filter(Appointment.doctor_id == current_user_id).scalar()
        
    # 2. Today's Appointments
    today_count = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.status.in_(["approved"]),
        Appointment.appointment_date == today
    ).count()
    
    # 3. Pending Requests
    pending_requests = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.status.in_(["pending"])
    ).count()
    
    return jsonify({
        "total_patients": total_patients or 0,
        "today_appointments": today_count,
        "pending_requests": pending_requests,
        "active_assessments": 0 # Placeholder for now
    }), 200

@doctor_bp.route("/patients", methods=["GET"])
@jwt_required()
def get_doctor_patients():
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    
    # A patient belongs to a doctor if they have an Approved or Completed appointment
    patient_ids = db.session.query(Appointment.patient_id).filter(
        Appointment.doctor_id == current_user_id,
        Appointment.status.in_(['approved', 'completed'])
    ).distinct().all()
    
    patient_ids = [pid[0] for pid in patient_ids]
    
    if not patient_ids:
        return jsonify([]), 200

    patients_data = []
    now = datetime.now()

    for pid in patient_ids:
        patient_user = User.query.get(pid)
        if not patient_user:
            continue
        
        # Fetch Last Visit (Completed or past Approved)
        last_visit = Appointment.query.filter(
            Appointment.patient_id == pid,
            Appointment.doctor_id == current_user_id,
            Appointment.status.in_(['completed', 'approved']),
            or_(
                Appointment.appointment_date < now.date(),
                and_(Appointment.appointment_date == now.date(), Appointment.appointment_time <= now.time())
            )
        ).order_by(desc(Appointment.appointment_date), desc(Appointment.appointment_time)).first()

        # Fetch Next Visit (Upcoming Approved)
        next_visit = Appointment.query.filter(
            Appointment.patient_id == pid,
            Appointment.doctor_id == current_user_id,
            Appointment.status.in_(['approved']),
            or_(
                Appointment.appointment_date > now.date(),
                and_(Appointment.appointment_date == now.date(), Appointment.appointment_time > now.time())
            )
        ).order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).first()

        patients_data.append({
            "id": pid,
            "full_name": patient_user.full_name,
            "email": patient_user.email,
            "patient_image": patient_user.patient_profile.profile_image if patient_user.patient_profile else None,
            "last_visit": str(last_visit.appointment_date) if last_visit else None,
            "next_appointment": str(next_visit.appointment_date) if next_visit else None,
            "status": "Active" if next_visit else "Inactive" # This status is for Clinical Roster, keep as is for UI if needed, but wait.
        })

    return jsonify(patients_data), 200

@doctor_bp.route("/patients/<int:patient_id>/records", methods=["GET"])
@jwt_required()
def get_patient_records(patient_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    # Check if the doctor has (or had) an appointment with this patient
    current_user_id = int(get_jwt_identity())
    exists = Appointment.query.filter_by(doctor_id=current_user_id, patient_id=patient_id).first()
    
    if not exists:
        return jsonify({"message": "Access denied. No clinical relationship found."}), 403
        
    records = MedicalRecord.query.filter_by(patient_id=patient_id).all()
    return jsonify([r.to_dict() for r in records]), 200

@doctor_bp.route("/appointments/<int:appointment_id>/no-show", methods=["PATCH"])
@jwt_required()
def mark_no_show(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
        
    appointment.status = "no_show"
    if appointment.slot_id:
        apply_cancellation_policy(
            appointment=appointment,
            cancelled_by="no_show",
            actor_user_id=current_user_id,
            source="doctor_no_show",
            reason="Doctor marked patient as no-show",
        )
    db.session.commit()
    
    return jsonify({"message": "Appointment marked as No-Show"}), 200


@doctor_bp.route("/appointments/<int:appointment_id>/extend", methods=["POST"])
@jwt_required()
def extend_appointment(appointment_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403

    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    minutes = int(data.get("minutes", 15))
    if minutes not in (15, 30):
        return jsonify({"message": "minutes must be 15 or 30"}), 400

    appointment = Appointment.query.filter_by(id=appointment_id, doctor_id=current_user_id).first()
    if not appointment:
        return jsonify({"message": "Appointment not found"}), 404
    if not appointment.slot_id:
        return jsonify({"message": "Only slot-based appointments can be extended"}), 400

    slot = _lock_slot(appointment.slot_id)
    if not slot:
        return jsonify({"message": "Linked slot not found"}), 404

    extension_end = slot.slot_end_utc + timedelta(minutes=minutes)

    conflicting = (
        AppointmentSlot.query.filter(
            AppointmentSlot.doctor_user_id == current_user_id,
            AppointmentSlot.id != slot.id,
            AppointmentSlot.slot_start_utc < extension_end,
            AppointmentSlot.slot_end_utc > slot.slot_end_utc,
            AppointmentSlot.status.in_(["booked", "held", "blocked"]),
        )
        .with_for_update()
        .first()
    )

    if conflicting:
        db.session.rollback()
        return jsonify({"message": "Cannot extend: next slot is not available. Please reschedule manually."}), 409

    slot.slot_end_utc = extension_end
    appointment.delay_reason = f"Extended by {minutes} minutes"
    db.session.commit()

    return jsonify({"message": "Appointment extended successfully", "appointment": appointment.to_dict(), "slot": slot.to_dict()}), 200

@doctor_bp.route("/patients/<int:patient_id>/dossier", methods=["GET"])
@jwt_required()
def get_patient_clinical_dossier(patient_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    
    # 1. Fetch Patient Identity
    patient_user = User.query.get(patient_id)
    if not patient_user:
        return jsonify({"message": "Patient not found"}), 404
    
    # Check for clinical relationship (at least one appointment)
    exists = Appointment.query.filter_by(doctor_id=current_user_id, patient_id=patient_id).first()
    if not exists:
        return jsonify({"message": "Access denied. No clinical relationship found."}), 403

    # 2. Fetch Clinical Timeline (All except Pending)
    history = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.patient_id == patient_id,
        Appointment.status.notin_(["pending"])
    ).order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()

    profile = patient_user.patient_profile
    
    dossier = {
        "identity": {
            "id": patient_user.id,
            "full_name": patient_user.full_name,
            "email": patient_user.email,
            "phone": profile.phone if profile else "N/A",
            "gender": profile.gender if profile else "Not Specified",
            "dob": str(profile.date_of_birth) if profile and profile.date_of_birth else "N/A",
            "profile_image": profile.profile_image if profile else None,
            "blood_group": profile.blood_group if profile else "N/A",
            "allergies": profile.allergies if profile else "None",
            "chronic_conditions": profile.chronic_conditions if profile else "None"
        },
        "timeline": [appt.to_dict() for appt in history]
    }
    
    return jsonify(dossier), 200

@doctor_bp.route("/patients/<int:patient_id>/remarks", methods=["POST"])
@jwt_required()
def save_clinical_remark(patient_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    data = request.json
    
    if not data or 'content' not in data:
        return jsonify({"message": "Remark content is required"}), 400
        
    remark = ClinicalRemark(
        patient_id=patient_id,
        doctor_id=current_user_id,
        content=data['content']
    )
    
    db.session.add(remark)
    db.session.commit()
    
    return jsonify({"message": "Clinical remark saved successfully", "remark": remark.to_dict()}), 201

@doctor_bp.route("/patients/<int:patient_id>/remarks", methods=["GET"])
@jwt_required()
def get_clinical_remarks(patient_id):
    if not check_doctor_role():
        return jsonify({"message": "Doctor access required"}), 403
    
    current_user_id = int(get_jwt_identity())
    
    # Verify clinical relationship (or just fetch remarks specifically from this doctor for this patient)
    remarks = ClinicalRemark.query.filter_by(
        patient_id=patient_id, 
        doctor_id=current_user_id
    ).order_by(ClinicalRemark.created_at.desc()).all()
    
    return jsonify([r.to_dict() for r in remarks]), 200


# =========================================
# CLINICAL PINS (DOCTOR TASKS)
# =========================================

@doctor_bp.route("/pins", methods=["GET"])
@jwt_required()
def get_clinical_pins():
    check_doctor_role()
    current_user_id = get_jwt_identity()
    
    # Sort completed pins to the bottom, then by created_at desc
    pins = ClinicalPin.query.filter_by(
        doctor_id=current_user_id
    ).order_by(ClinicalPin.completed.asc(), ClinicalPin.created_at.desc()).all()
    
    return jsonify([p.to_dict() for p in pins]), 200

@doctor_bp.route("/pins", methods=["POST"])
@jwt_required()
def create_clinical_pin():
    check_doctor_role()
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get("title"):
        return jsonify({"error": "Title is required"}), 400
        
    new_pin = ClinicalPin(
        doctor_id=current_user_id,
        title=data.get("title"),
        date=data.get("date"),
        time=data.get("time"),
        description=data.get("description"),
        category=data.get("category", "General"),
        completed=False
    )
    
    db.session.add(new_pin)
    db.session.commit()
    
    return jsonify(new_pin.to_dict()), 201

@doctor_bp.route("/pins/<int:pin_id>", methods=["PATCH"])
@jwt_required()
def update_clinical_pin(pin_id):
    check_doctor_role()
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    pin = ClinicalPin.query.filter_by(id=pin_id, doctor_id=current_user_id).first_or_404()
    
    if "completed" in data:
        pin.completed = data["completed"]
    if "title" in data:
        pin.title = data["title"]
    if "description" in data:
        pin.description = data["description"]
        
    db.session.commit()
    return jsonify(pin.to_dict()), 200

@doctor_bp.route("/pins/<int:pin_id>", methods=["DELETE"])
@jwt_required()
def delete_clinical_pin(pin_id):
    check_doctor_role()
    current_user_id = get_jwt_identity()
    
    pin = ClinicalPin.query.filter_by(id=pin_id, doctor_id=current_user_id).first_or_404()
    
    db.session.delete(pin)
    db.session.commit()
    
    return jsonify({"message": "Pin deleted"}), 200
