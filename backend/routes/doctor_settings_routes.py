from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database.models import (
    db,
    DoctorScheduleSetting,
    DoctorNotificationSetting,
    DoctorPrivacySetting,
    DoctorConsultationSetting,
    User,
)
from utils.slot_engine import regenerate_slots_for_doctor, rolling_window_bounds

doctor_settings_bp = Blueprint("doctor_settings", __name__)

def _is_doctor():
    return get_jwt().get("role") == "doctor"

def _get_or_create_settings(doctor_id):
    # Schedule Setting
    schedule = DoctorScheduleSetting.query.filter_by(doctor_user_id=doctor_id).first()
    if not schedule:
        schedule = DoctorScheduleSetting(doctor_user_id=doctor_id)
        db.session.add(schedule)

    # Notification Setting
    notifications = DoctorNotificationSetting.query.filter_by(doctor_user_id=doctor_id).first()
    if not notifications:
        notifications = DoctorNotificationSetting(doctor_user_id=doctor_id)
        db.session.add(notifications)

    # Privacy Setting
    privacy = DoctorPrivacySetting.query.filter_by(doctor_user_id=doctor_id).first()
    if not privacy:
        privacy = DoctorPrivacySetting(doctor_user_id=doctor_id)
        db.session.add(privacy)

    # Consultation Setting
    consultation = DoctorConsultationSetting.query.filter_by(doctor_user_id=doctor_id).first()
    if not consultation:
        consultation = DoctorConsultationSetting(doctor_user_id=doctor_id)
        db.session.add(consultation)

    db.session.commit()
    return schedule, notifications, privacy, consultation


@doctor_settings_bp.route("/", methods=["GET"])
@jwt_required()
def get_all_settings():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    schedule, notifications, privacy, consultation = _get_or_create_settings(doctor_id)
    user = User.query.get(doctor_id)

    return jsonify({
        "account": {
            "full_name": user.full_name if user else "",
            "email": user.email if user else "",
        },
        "schedule": schedule.to_dict(),
        "notifications": notifications.to_dict(),
        "privacy": privacy.to_dict(),
        "consultation": consultation.to_dict()
    }), 200


@doctor_settings_bp.route("/schedule", methods=["PUT"])
@jwt_required()
def update_schedule_settings():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    schedule, _, _, _ = _get_or_create_settings(doctor_id)

    slot_duration = schedule.slot_duration_minutes
    buffer_minutes = schedule.buffer_minutes
    timezone = schedule.timezone

    if "slot_duration_minutes" in data:
        slot_duration = int(data["slot_duration_minutes"])
    if "buffer_minutes" in data:
        buffer_minutes = int(data["buffer_minutes"])
    if "approval_mode" in data:
        schedule.approval_mode = data["approval_mode"]
    if "accepting_new_bookings" in data:
        schedule.accepting_new_bookings = bool(data["accepting_new_bookings"])
    if "timezone" in data:
        timezone = data["timezone"]

    requires_regeneration = (
        schedule.slot_duration_minutes != slot_duration
        or schedule.buffer_minutes != buffer_minutes
        or schedule.timezone != timezone
    )

    schedule.slot_duration_minutes = slot_duration
    schedule.buffer_minutes = buffer_minutes
    schedule.timezone = timezone

    try:
        if requires_regeneration:
            start_date, end_date = rolling_window_bounds()
            regenerate_slots_for_doctor(doctor_id, start_date, end_date)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"ERROR updating doctor schedule settings: {e}")
        return jsonify({"message": f"Update failed: {str(e)}"}), 500

    return jsonify({"message": "Schedule settings updated", "settings": schedule.to_dict()}), 200


@doctor_settings_bp.route("/notifications", methods=["PUT"])
@jwt_required()
def update_notification_settings():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    _, notifications, _, _ = _get_or_create_settings(doctor_id)

    if "email_on_booking" in data:
        notifications.email_on_booking = bool(data["email_on_booking"])
    # SMS delivery is deprecated for doctor notifications.
    # Keep hard-disabled even if legacy clients send this field.
    notifications.sms_on_booking = False
    if "in_app_notifications" in data:
        notifications.in_app_notifications = bool(data["in_app_notifications"])
    if "reminder_before_minutes" in data:
        notifications.reminder_before_minutes = int(data["reminder_before_minutes"])

    db.session.commit()
    return jsonify({"message": "Notification settings updated", "settings": notifications.to_dict()}), 200


@doctor_settings_bp.route("/privacy", methods=["PUT"])
@jwt_required()
def update_privacy_settings():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    _, _, privacy, _ = _get_or_create_settings(doctor_id)

    if "show_profile_publicly" in data:
        privacy.show_profile_publicly = bool(data["show_profile_publicly"])
    if "show_consultation_fee" in data:
        privacy.show_consultation_fee = bool(data["show_consultation_fee"])
    if "allow_chat_before_booking" in data:
        privacy.allow_chat_before_booking = bool(data["allow_chat_before_booking"])
    if "allow_reviews_publicly" in data:
        privacy.allow_reviews_publicly = bool(data["allow_reviews_publicly"])

    db.session.commit()
    return jsonify({"message": "Privacy settings updated", "settings": privacy.to_dict()}), 200


@doctor_settings_bp.route("/consultation", methods=["PUT"])
@jwt_required()
def update_consultation_settings():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    _, _, _, consultation = _get_or_create_settings(doctor_id)

    if "consultation_fee" in data:
        consultation.consultation_fee = float(data["consultation_fee"])
    if "consultation_mode" in data:
        consultation.consultation_mode = data["consultation_mode"]
    if "cancellation_policy_hours" in data:
        consultation.cancellation_policy_hours = int(data["cancellation_policy_hours"])
    if "auto_cancel_unpaid_minutes" in data:
        consultation.auto_cancel_unpaid_minutes = int(data["auto_cancel_unpaid_minutes"])

    # Sync with DoctorProfile
    from database.models import DoctorProfile
    profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()
    if profile:
        profile.consultation_fee = consultation.consultation_fee
        profile.consultation_mode = consultation.consultation_mode

    db.session.commit()
    return jsonify({"message": "Consultation settings updated", "settings": consultation.to_dict()}), 200


@doctor_settings_bp.route("/account", methods=["PUT"])
@jwt_required()
def update_account():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    user = User.query.get(doctor_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if "full_name" in data and data["full_name"].strip():
        user.full_name = data["full_name"].strip()

    db.session.commit()
    return jsonify({"message": "Account updated successfully", "full_name": user.full_name, "email": user.email}), 200


@doctor_settings_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    if not _is_doctor():
        return jsonify({"message": "Doctor access required"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.json or {}
    current_pw = data.get("current_password", "")
    new_pw = data.get("new_password", "")

    if not current_pw or not new_pw:
        return jsonify({"error": "Both current and new password are required"}), 400
    if len(new_pw) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user = User.query.get(doctor_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    from utils.security import verify_password, hash_password
    if not verify_password(current_pw, user.password_hash):
        return jsonify({"error": "Current password is incorrect"}), 400

    user.password_hash = hash_password(new_pw)
    db.session.commit()
    return jsonify({"message": "Password changed successfully"}), 200
