from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database.models import db, DoctorProfile, User, DoctorAvailability, DoctorExpertiseTag, AppointmentSlot, DoctorExperience
from datetime import datetime, timezone
from utils.cloudinary_upload import upload_file as cld_upload
from utils.slot_engine import regenerate_slots_for_doctor, rolling_window_bounds

doctor_profile_bp = Blueprint("doctor_profile", __name__, url_prefix="/api/doctor/profile")

# ============================
# GET DOCTOR PROFILE
# ============================
@doctor_profile_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_doctor_profile():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        # Auto-create profile if missing (fallback)
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        profile = DoctorProfile(user_id=user_id)
        db.session.add(profile)
        db.session.commit()

    return jsonify(profile.to_dict()), 200


# ============================
# UPDATE DOCTOR PROFILE
# ============================
@doctor_profile_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_my_doctor_profile():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        return jsonify({"message": "Profile not found"}), 404

    data = request.json
    
    # Update Basic Info
    if "phone" in data: profile.phone = data["phone"]
    if "gender" in data: profile.gender = data["gender"]
    if "dob" in data and data["dob"]: 
        try:
            profile.dob = datetime.strptime(data["dob"], "%Y-%m-%d").date()
        except:
            pass 
            
    if "bio" in data: profile.bio = data["bio"]
    if "hospital_name" in data: profile.hospital_name = data["hospital_name"]

    # Update Professional Info
    if "specialization" in data: profile.specialization = data["specialization"]
    if "license_number" in data: profile.license_number = data["license_number"]
    if "qualification" in data: profile.qualification = data["qualification"]
    if "experience_years" in data: profile.experience_years = data["experience_years"]
    if "department" in data: profile.department = data["department"]
    if "consultation_fee" in data: profile.consultation_fee = data["consultation_fee"]
    if "consultation_mode" in data: profile.consultation_mode = data["consultation_mode"]
    
    # Sync with DoctorConsultationSetting
    if "consultation_fee" in data or "consultation_mode" in data:
        from database.models import DoctorConsultationSetting
        consultation = DoctorConsultationSetting.query.filter_by(doctor_user_id=user_id).first()
        if not consultation:
            consultation = DoctorConsultationSetting(doctor_user_id=user_id)
            db.session.add(consultation)
        if "consultation_fee" in data:
            try:
                consultation.consultation_fee = float(data["consultation_fee"])
            except:
                pass
        if "consultation_mode" in data:
            consultation.consultation_mode = data["consultation_mode"]
    
    # Update Expertise Tags
    if "expertise_tags" in data:
        # Clear existing tags first
        DoctorExpertiseTag.query.filter_by(doctor_id=profile.id).delete()
        
        # Add new tags
        new_tags = data["expertise_tags"]
        for tag_input in new_tags:
            # Handle list of strings ["Tag1", "Tag2"] OR list of objects [{"tag_name": "Tag1"}]
            tag_name = None
            if isinstance(tag_input, dict):
                tag_name = tag_input.get("tag_name")
            else:
                tag_name = tag_input
                
            if tag_name:
                new_tag = DoctorExpertiseTag(doctor_id=profile.id, tag_name=tag_name)
                db.session.add(new_tag)

    db.session.commit()
    return jsonify(profile.to_dict()), 200


# ============================
# UPLOAD PROFILE IMAGE
# ============================
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@doctor_profile_bp.route("/image", methods=["POST"])
@jwt_required()
def upload_profile_image():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        return jsonify({"message": "Profile not found"}), 404

    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Invalid file type"}), 400

    public_id = f"neuronest/profiles/doctor_{user_id}"
    try:
        result = cld_upload(file.stream, public_id=public_id, folder="neuronest/profiles", resource_type="image")
    except Exception as e:
        return jsonify({"message": f"Upload failed: {str(e)}"}), 500

    image_url = result["secure_url"]
    profile.profile_image = image_url
    db.session.commit()

    return jsonify({"message": "Image uploaded successfully", "image_url": image_url}), 200


# ============================
# AVAILABILITY CRUD
# ============================
@doctor_profile_bp.route("/availability", methods=["POST"])
@jwt_required()
def add_availability():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()
    
    if not profile:
        return jsonify({"message": "Doctor profile not found"}), 404
        
    data = request.json
    day = data.get("day_of_week")
    start = data.get("start_time")
    end = data.get("end_time")
    
    if not day or not start or not end:
        return jsonify({"message": "Missing required fields"}), 400
        
    try:
        # Robust time parsing (HH:MM or HH:MM:SS)
        def parse_time(t_str):
            if len(t_str) == 5: return datetime.strptime(t_str, "%H:%M").time()
            if len(t_str) == 8: return datetime.strptime(t_str, "%H:%M:%S").time()
            # fallback try both
            try:
                return datetime.strptime(t_str, "%H:%M").time()
            except ValueError:
                return datetime.strptime(t_str, "%H:%M:%S").time()

        start_time_obj = parse_time(start)
        end_time_obj = parse_time(end)

        if start_time_obj >= end_time_obj:
            return jsonify({"message": "Start time must be before end time"}), 400

        # Check for overlaps
        # (StartA < EndB) and (EndA > StartB)
        overlaps = DoctorAvailability.query.filter(
            DoctorAvailability.doctor_id == profile.id,
            DoctorAvailability.day_of_week == day,
            DoctorAvailability.start_time < end_time_obj,
            DoctorAvailability.end_time > start_time_obj
        ).first()

        if overlaps:
            return jsonify({
                "message": f"Overlap detected with existing slot: {overlaps.start_time.strftime('%H:%M')} - {overlaps.end_time.strftime('%H:%M')}"
            }), 400
        
        new_slot = DoctorAvailability(
            doctor_id=profile.id,
            day_of_week=day,
            start_time=start_time_obj,
            end_time=end_time_obj
        )
        
        db.session.add(new_slot)
        start_date, end_date = rolling_window_bounds()
        regenerate_slots_for_doctor(user_id, start_date, end_date)
        db.session.commit()
        
        return jsonify(profile.to_dict()), 201

    except ValueError:
        return jsonify({"message": f"Invalid time format. Received: {start}, {end}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@doctor_profile_bp.route("/availability/<int:slot_id>", methods=["DELETE"])
@jwt_required()
def delete_availability(slot_id):
    try:
        claims = get_jwt()
        if claims.get("role") != "doctor":
            return jsonify({"message": "Doctor access required"}), 403

        user_id = int(get_jwt_identity())
        profile = DoctorProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            return jsonify({"message": "Doctor profile not found"}), 404

        slot = DoctorAvailability.query.get(slot_id)

        if not slot:
            return jsonify({"message": "Availability range not found"}), 404

        if slot.doctor_id != profile.id:
            return jsonify({"message": "Unauthorized"}), 403

        # Block deletion when booked/held slots exist for this weekday window.
        day_name = slot.day_of_week
        start_t = slot.start_time
        end_t = slot.end_time

        day_index = {
            "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
            "Friday": 4, "Saturday": 5, "Sunday": 6,
        }.get(day_name)

        if day_index is not None:
            # Check next 60 days for overlapping non-editable slots.
            from datetime import date, timedelta
            target_dates = []
            d = date.today()
            for _ in range(60):
                if d.weekday() == day_index:
                    target_dates.append(d)
                d += timedelta(days=1)

            if target_dates:
                overlap_slots = AppointmentSlot.query.filter(
                    AppointmentSlot.doctor_user_id == user_id,
                    AppointmentSlot.slot_date_local.in_(target_dates),
                    AppointmentSlot.status.in_(["booked", "held"]),
                ).all()

                from zoneinfo import ZoneInfo
                tz = ZoneInfo("Asia/Kolkata")
                for appointment_slot in overlap_slots:
                    slot_dt = appointment_slot.slot_start_utc
                    if not slot_dt:
                        continue

                    # Tolerate legacy naive UTC datetimes.
                    if slot_dt.tzinfo is None:
                        slot_dt = slot_dt.replace(tzinfo=timezone.utc)

                    local_time = slot_dt.astimezone(tz).time()
                    if start_t <= local_time < end_t:
                        return jsonify({
                            "message": "Cannot delete availability range containing booked/held slots. Cancel or resolve appointments first."
                        }), 400

        db.session.delete(slot)
        start_date, end_date = rolling_window_bounds()
        regenerate_slots_for_doctor(user_id, start_date, end_date)
        db.session.commit()

        return jsonify(profile.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete availability: {str(e)}"}), 500

# ============================
# EXPERIENCE CRUD
# ============================
@doctor_profile_bp.route("/experience", methods=["POST"])
@jwt_required()
def add_experience():
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()
    
    if not profile:
        return jsonify({"message": "Doctor profile not found"}), 404
        
    data = request.json
    title = data.get("title")
    hospital = data.get("hospital")
    period = data.get("period")
    description = data.get("description")
    
    if not title or not hospital or not period:
        return jsonify({"message": "Missing required fields"}), 400
        
    new_exp = DoctorExperience(
        doctor_id=profile.id,
        title=title,
        hospital=hospital,
        period=period,
        description=description
    )
    
    db.session.add(new_exp)
    db.session.commit()
    
    return jsonify(profile.to_dict()), 201

@doctor_profile_bp.route("/experience/<int:exp_id>", methods=["DELETE"])
@jwt_required()
def delete_experience(exp_id):
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"message": "Doctor access required"}), 403

    user_id = int(get_jwt_identity())
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()
    
    exp = DoctorExperience.query.get(exp_id)
    if not exp or exp.doctor_id != profile.id:
        return jsonify({"message": "Experience not found"}), 404
        
    db.session.delete(exp)
    db.session.commit()
    
    return jsonify(profile.to_dict()), 200
