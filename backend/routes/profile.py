from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database.models import (
    db, PatientProfile, User, EmergencyContact, 
    PatientMedication, PatientCondition, PatientAllergy, Appointment
)
from datetime import datetime
from utils.cloudinary_upload import upload_file as cld_upload

profile_bp = Blueprint("profile", __name__, url_prefix="/profile")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================
# GET PROFILE
# ============================
@profile_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_profile():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Patient access required"}), 403

    user_id = int(get_jwt_identity())

    profile = PatientProfile.query.filter_by(user_id=user_id).first()

    # 🔥 Create profile if not exists
    if not profile:
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        profile = PatientProfile(
            user_id=user_id,
            full_name=user.full_name
        )

        db.session.add(profile)
        db.session.commit()

    return jsonify(profile.to_dict()), 200


# ============================
# UPDATE PROFILE (JSON + IMAGE)
# ============================
@profile_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_my_profile():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Patient access required"}), 403

    user_id = int(get_jwt_identity())

    profile = PatientProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        profile = PatientProfile(
            user_id=user_id,
            full_name=user.full_name
        )

        db.session.add(profile)

    data = request.form if request.form else request.get_json()

    if not data:
        data = {}

    if "full_name" in data:
        profile.full_name = data.get("full_name")
        if profile.user:
            profile.user.full_name = data.get("full_name")

    if "phone" in data:
        profile.phone = data.get("phone")

    if "date_of_birth" in data:
        dob = data.get("date_of_birth")
        if dob:
            try:
                profile.date_of_birth = datetime.strptime(dob, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"message": "Invalid date_of_birth format. Use YYYY-MM-DD"}), 400
        else:
            profile.date_of_birth = None

    if "gender" in data:
        profile.gender = data.get("gender")

    if "blood_group" in data:
        profile.blood_group = data.get("blood_group")

    if "height_cm" in data:
        value = data.get("height_cm")
        profile.height_cm = int(value) if value not in (None, "", "null") else None

    if "weight_kg" in data:
        value = data.get("weight_kg")
        profile.weight_kg = int(value) if value not in (None, "", "null") else None

    if "address" in data:
        profile.address = data.get("address")

    if "city" in data:
        profile.city = data.get("city")

    if "state" in data:
        profile.state = data.get("state")

    if "country" in data:
        profile.country = data.get("country")

    if "pincode" in data:
        profile.pincode = data.get("pincode")

    if "allergies" in data:
        profile.allergies = data.get("allergies")

    if "chronic_conditions" in data:
        profile.chronic_conditions = data.get("chronic_conditions")

    if "profile_image" in request.files:
        file = request.files["profile_image"]
        if file and file.filename != "" and allowed_file(file.filename):
            public_id = f"neuronest/profiles/patient_{user_id}"
            try:
                result = cld_upload(file.stream, public_id=public_id, folder="neuronest/profiles", resource_type="image")
                profile.profile_image = result["secure_url"]
            except Exception as e:
                return jsonify({"message": f"Image upload failed: {str(e)}"}), 500

    db.session.commit()

    return jsonify(profile.to_dict()), 200


# ============================
# GET EMERGENCY CONTACTS (LIST)
# ============================
@profile_bp.route("/emergency-contact/me", methods=["GET"])
@jwt_required()
def get_my_emergency_contacts():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Patient access required"}), 403

    user_id = int(get_jwt_identity())
    profile = PatientProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        return jsonify([]), 200  # Return empty list if no profile

    contacts = EmergencyContact.query.filter_by(patient_id=profile.id).all()
    return jsonify([c.to_dict() for c in contacts]), 200


# ============================
# UPDATE EMERGENCY CONTACTS (Replaces list)
# ============================
@profile_bp.route("/emergency-contact/me", methods=["PUT"])
@jwt_required()
def update_my_emergency_contacts():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Patient access required"}), 403

    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not isinstance(data, list):
        return jsonify({"message": "Expected a list of contacts"}), 400

    profile = PatientProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({"message": "Profile not found"}), 404

    try:
        # strategy: delete old contacts, add new ones (simple sync)
        EmergencyContact.query.filter_by(patient_id=profile.id).delete()

        new_contacts = []
        primary_set = False # Track if a primary contact is already set

        for index, contact_data in enumerate(data):
            # Basic validation
            if not contact_data.get("contact_name"):
                 return jsonify({"message": f"Contact {index + 1} name is required"}), 400
            
            if not contact_data.get("phone"):
                 return jsonify({"message": f"Contact {index + 1} phone is required"}), 400

            is_primary = contact_data.get("is_primary", False)
            
            # Enforce single primary contact
            if is_primary:
                if primary_set:
                    is_primary = False # Demote subsequent primary contacts
                else:
                    primary_set = True

            new_contact = EmergencyContact(
                patient_id=profile.id,
                contact_name=contact_data.get("contact_name"),
                relationship=contact_data.get("relationship"),
                phone=contact_data.get("phone"),
                alternate_phone=contact_data.get("alternate_phone"),
                email=contact_data.get("email"),
                is_primary=is_primary
            )
            db.session.add(new_contact)
            new_contacts.append(new_contact)

        db.session.commit()

        return jsonify([c.to_dict() for c in new_contacts]), 200
    
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Server error while saving emergency contacts"}), 500

@profile_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_my_notifications():
    user_id = int(get_jwt_identity())
    unread_only = request.args.get("unread_only") == "true"
    
    from database.models import InAppNotification
    
    query = InAppNotification.query.filter_by(user_id=user_id)
    if unread_only:
        query = query.filter_by(is_read=False)
        
    notifications = query.order_by(InAppNotification.created_at.desc()).limit(20).all()
    
    return jsonify([n.to_dict() for n in notifications]), 200

@profile_bp.route("/notifications/<int:id>/read", methods=["PATCH"])
@jwt_required()
def mark_notification_read(id):
    user_id = int(get_jwt_identity())
    from database.models import InAppNotification
    
    notification = InAppNotification.query.filter_by(id=id, user_id=user_id).first()
    if not notification:
        return jsonify({"message": "Notification not found"}), 404
        
    notification.is_read = True
    db.session.commit()
    
    return jsonify({"message": "Notification marked as read"}), 200
@profile_bp.route("/clinical-summary", methods=["GET"])
@jwt_required()
def get_my_clinical_summary():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Patient access required"}), 403

    user_id = int(get_jwt_identity())
    profile = PatientProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        return jsonify({"message": "Profile not found"}), 404

    # Fetch Clinical History
    medications = PatientMedication.query.filter_by(patient_id=user_id, status='active').all()
    conditions = PatientCondition.query.filter_by(patient_id=user_id, status='active').all()
    allergies = PatientAllergy.query.filter_by(patient_id=user_id, status='active').all()
    
    # Fetch Recent appointments
    appointments = Appointment.query.filter_by(patient_id=user_id).order_by(Appointment.appointment_date.desc()).limit(10).all()

    summary = {
        "identity": profile.to_dict(),
        "medications": [m.to_dict() for m in medications],
        "conditions": [c.to_dict() for c in conditions],
        "allergies": [a.to_dict() for a in allergies],
        "timeline": [appt.to_dict() for appt in appointments]
    }

    return jsonify(summary), 200
