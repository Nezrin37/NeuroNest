import json
from datetime import datetime

from flask import Blueprint, jsonify, request, redirect
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func
from werkzeug.utils import secure_filename

from database.models import (
    MedicalRecord,
    MedicalRecordTag,
    PatientAllergy,
    PatientCondition,
    PatientMedication,
    User,
    db,
)
from models.prescription_models import Prescription


patient_medical_bp = Blueprint("patient_medical_bp", __name__, url_prefix="/api/patient")

ALLOWED_RECORD_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
MAX_RECORD_FILE_SIZE_BYTES = 15 * 1024 * 1024
ALLOWED_MEDICATION_ORIGINS = {"past_external", "current_doctor"}


def _actor_info():
    claims = get_jwt()
    actor_id = int(get_jwt_identity())
    actor_role = claims.get("role") or "patient"
    return actor_id, actor_role


def _doctor_only_clinical_write():
    actor_id, actor_role = _actor_info()
    if actor_role != "doctor":
        return None, (jsonify({"message": "Only doctors can modify allergies, conditions, and medications"}), 403)
    return actor_id, None

def _verify_patient_access(patient_id):
    actor_id, actor_role = _actor_info()
    if actor_role == "patient" and actor_id != patient_id:
        return False, "Access denied"
    if actor_role == "doctor":
        # Check clinical relationship
        from database.models import Appointment
        exists = Appointment.query.filter_by(doctor_id=actor_id, patient_id=patient_id).first()
        if not exists:
            return False, "No clinical relationship found"
    if actor_role not in ["patient", "doctor", "admin"]:
        return False, "Unauthorized role"
    return True, None


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_RECORD_EXTENSIONS


def _parse_tags(raw_tags):
    if raw_tags is None:
        return []

    if isinstance(raw_tags, list):
        tags = raw_tags
    else:
        try:
            parsed = json.loads(raw_tags)
            tags = parsed if isinstance(parsed, list) else str(raw_tags).split(",")
        except Exception:
            tags = str(raw_tags).split(",")

    cleaned = []
    seen = set()
    for tag in tags:
        value = str(tag).strip()
        key = value.lower()
        if not value or key in seen:
            continue
        seen.add(key)
        cleaned.append(value[:80])
    return cleaned[:15]


def _get_prescription_medications(patient_id, active_only=True):
    today = datetime.utcnow().date()
    query = Prescription.query.filter(Prescription.patient_id == patient_id)
    if active_only:
        query = query.filter(Prescription.status == "active").filter(
            (Prescription.valid_until.is_(None)) | (Prescription.valid_until >= today)
        )
    prescriptions = query.order_by(Prescription.created_at.desc()).all()
    if not prescriptions:
        return []

    doctor_ids = {p.doctor_id for p in prescriptions}
    doctors = {d.id: d for d in User.query.filter(User.id.in_(doctor_ids)).all()} if doctor_ids else {}

    rows = []
    for prescription in prescriptions:
        doctor = doctors.get(prescription.doctor_id)
        doctor_name = doctor.full_name if doctor else "Doctor"
        for item in prescription.items:
            rows.append(
                {
                    "id": f"rx-{prescription.id}-{item.id}",
                    "patient_id": patient_id,
                    "drug_name": item.medicine_name,
                    "created_by_user_id": prescription.doctor_id,
                    "created_by_role": "doctor",
                    "dosage": item.dosage,
                    "frequency": item.frequency,
                    "start_date": str(prescription.created_at.date()) if prescription.created_at else None,
                    "end_date": str(prescription.valid_until) if prescription.valid_until else None,
                    "prescribed_by": doctor_name,
                    "medication_origin": "current_doctor",
                    "source_hospital_name": None,
                    "status": prescription.status if active_only else ("active" if (prescription.status == "active" and (not prescription.valid_until or prescription.valid_until >= today)) else "inactive"),
                    "created_at": prescription.created_at.isoformat() + "Z" if prescription.created_at else None,
                    "updated_at": prescription.updated_at.isoformat() + "Z" if prescription.updated_at else None,
                    "source_type": "prescription",
                    "source_prescription_id": prescription.id,
                    "read_only": True,
                }
            )
    return rows


@patient_medical_bp.route("/medical-records", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medical-records", methods=["GET"])
@jwt_required()
def list_medical_records(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    query = MedicalRecord.query.filter_by(patient_id=patient_id)

    category = request.args.get("category")
    if category:
        query = query.filter(MedicalRecord.category == category)

    title_search = request.args.get("q")
    if title_search:
        query = query.filter(MedicalRecord.title.ilike(f"%{title_search.strip()}%"))

    records = query.order_by(MedicalRecord.record_date.desc().nullslast(), MedicalRecord.created_at.desc()).all()
    return jsonify([record.to_dict() for record in records]), 200


@patient_medical_bp.route("/medical-records/summary", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medical-records/summary", methods=["GET"])
@jwt_required()
def medical_summary(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    severe_allergies = PatientAllergy.query.filter_by(patient_id=patient_id, severity="severe", status="active").count()
    active_conditions = PatientCondition.query.filter_by(patient_id=patient_id, status="active").count()
    manual_active_medications = (
        PatientMedication.query.filter(PatientMedication.patient_id == patient_id, PatientMedication.status == "active")
        .filter((PatientMedication.end_date.is_(None)) | (PatientMedication.end_date >= datetime.utcnow().date()))
        .count()
    )
    prescription_active_medications = len(_get_prescription_medications(patient_id, active_only=True))
    active_medications = manual_active_medications + prescription_active_medications
    total_records = MedicalRecord.query.filter_by(patient_id=patient_id).count()

    return jsonify(
        {
            "severe_allergy_count": severe_allergies,
            "active_condition_count": active_conditions,
            "active_medication_count": active_medications,
            "total_records_uploaded": total_records,
        }
    ), 200


@patient_medical_bp.route("/medical-records", methods=["POST"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medical-records", methods=["POST"])
@jwt_required()
def create_medical_record(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"message": "File is required"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"message": "File type not allowed"}), 400

    content = file.read()
    file_size = len(content)
    if file_size > MAX_RECORD_FILE_SIZE_BYTES:
        return jsonify({"message": "File too large (max 15MB)"}), 400
    file.seek(0)

    original_filename = secure_filename(file.filename) if hasattr(file, 'filename') else 'record'
    extension = original_filename.rsplit(".", 1)[1].lower() if '.' in original_filename else 'bin'
    timestamp = int(datetime.utcnow().timestamp() * 1000)
    public_id = f"neuronest/medical_records/{patient_id}_{timestamp}"

    from utils.cloudinary_upload import upload_file as cld_upload
    try:
        cld_result = cld_upload(file.stream, public_id=public_id, folder="neuronest/medical_records")
    except Exception as e:
        return jsonify({"message": f"File upload failed: {str(e)}"}), 500

    file_url = cld_result["secure_url"]
    actor_id, actor_role = _actor_info()

    record = MedicalRecord(
        patient_id=patient_id,
        title=(request.form.get("title") or original_filename)[:255],
        category=(request.form.get("category") or "Other")[:100],
        doctor_name=(request.form.get("doctor_name") or None),
        hospital_name=(request.form.get("hospital_name") or None),
        description=(request.form.get("description") or None),
        notes=(request.form.get("notes") or None),
        file_path=file_url,             # Cloudinary HTTPS URL
        file_type=extension,
        file_size_bytes=file_size,
        uploaded_by=actor_id,
        record_date=_parse_date(request.form.get("record_date")),
    )
    db.session.add(record)
    db.session.flush()

    tags = _parse_tags(request.form.get("tags"))
    for tag in tags:
        db.session.add(MedicalRecordTag(record_id=record.id, tag_name=tag))

    db.session.commit()
    return jsonify(record.to_dict()), 201


@patient_medical_bp.route("/medical-records/<int:record_id>", methods=["GET"])
@jwt_required()
def get_medical_record(record_id):
    patient_check = _require_patient()
    if patient_check:
        return patient_check

    patient_id = int(get_jwt_identity())
    record = MedicalRecord.query.filter_by(id=record_id, patient_id=patient_id).first()
    if not record:
        return jsonify({"message": "Record not found"}), 404
    return jsonify(record.to_dict()), 200


@patient_medical_bp.route("/medical-records/<int:record_id>", methods=["PUT"])
@jwt_required()
def update_medical_record(record_id):
    patient_check = _require_patient()
    if patient_check:
        return patient_check

    patient_id = int(get_jwt_identity())
    record = MedicalRecord.query.filter_by(id=record_id, patient_id=patient_id).first()
    if not record:
        return jsonify({"message": "Record not found"}), 404

    data = request.get_json(silent=True) or {}

    if "title" in data:
        record.title = str(data.get("title") or "").strip()[:255] or record.title
    if "category" in data:
        record.category = str(data.get("category") or "").strip()[:100] or record.category
    if "doctor_name" in data:
        record.doctor_name = data.get("doctor_name")
    if "hospital_name" in data:
        record.hospital_name = data.get("hospital_name")
    if "description" in data:
        record.description = data.get("description")
    if "notes" in data:
        record.notes = data.get("notes")
    if "record_date" in data:
        record.record_date = _parse_date(data.get("record_date"))
    if "status" in data:
        record.status = str(data.get("status") or "active")[:30]

    if "tags" in data:
        MedicalRecordTag.query.filter_by(record_id=record.id).delete()
        for tag in _parse_tags(data.get("tags")):
            db.session.add(MedicalRecordTag(record_id=record.id, tag_name=tag))

    db.session.commit()
    return jsonify(record.to_dict()), 200


@patient_medical_bp.route("/medical-records/<int:record_id>", methods=["DELETE"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medical-records/<int:record_id>", methods=["DELETE"])
@jwt_required()
def delete_medical_record(record_id, patient_id=None):
    if patient_id is None:
        # Determine patient_id from record if not provided
        record_tmp = MedicalRecord.query.get(record_id)
        if not record_tmp:
            return jsonify({"message": "Record not found"}), 404
        patient_id = record_tmp.patient_id

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    record = MedicalRecord.query.filter_by(id=record_id, patient_id=patient_id).first()
    if not record:
        return jsonify({"message": "Record not found"}), 404

    # Delete from Cloudinary if stored there
    if record.file_path and 'cloudinary.com' in (record.file_path or ''):
        from utils.cloudinary_upload import delete_file as cld_delete
        try:
            parts = record.file_path.split('/upload/')
            if len(parts) == 2:
                public_id_with_ext = '/'.join(parts[1].split('/')[1:])  # strip version segment
                public_id = public_id_with_ext.rsplit('.', 1)[0]
                cld_delete(public_id)
        except Exception:
            pass

    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Record deleted"}), 200


@patient_medical_bp.route("/medical-records/<int:record_id>/download", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medical-records/<int:record_id>/download", methods=["GET"])
@jwt_required()
def download_medical_record(record_id, patient_id=None):
    if patient_id is None:
        record_tmp = MedicalRecord.query.get(record_id)
        if not record_tmp:
            return jsonify({"message": "Record not found"}), 404
        patient_id = record_tmp.patient_id

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    record = MedicalRecord.query.filter_by(id=record_id, patient_id=patient_id).first()
    if not record:
        return jsonify({"message": "Record not found"}), 404

    # Cloudinary URLs are direct — redirect the client
    if record.file_path and record.file_path.startswith('http'):
        return redirect(record.file_path)

    return jsonify({"message": "File not available"}), 404


@patient_medical_bp.route("/allergies", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/allergies", methods=["GET"])
@jwt_required()
def get_allergies(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    include_inactive = str(request.args.get("include_inactive", "")).lower() in ("true", "1", "yes")
    query = PatientAllergy.query.filter_by(patient_id=patient_id)
    if not include_inactive:
        query = query.filter_by(status="active")
    rows = query.order_by(PatientAllergy.created_at.desc()).all()

    # Enrich with creator name + specialization
    from database.models import DoctorProfile
    creator_ids = {r.created_by_user_id for r in rows if r.created_by_user_id}
    creators = {u.id: u for u in User.query.filter(User.id.in_(creator_ids)).all()} if creator_ids else {}
    doctor_profiles = {
        dp.user_id: dp
        for dp in DoctorProfile.query.filter(DoctorProfile.user_id.in_(creator_ids)).all()
    } if creator_ids else {}

    result = []
    for row in rows:
        d = row.to_dict()
        creator = creators.get(row.created_by_user_id)
        if creator:
            dp = doctor_profiles.get(creator.id)
            d["added_by_name"] = creator.full_name
            d["added_by_role"] = row.created_by_role
            d["added_by_specialization"] = dp.specialization if dp and dp.specialization else None
        else:
            d["added_by_name"] = None
            d["added_by_role"] = row.created_by_role
            d["added_by_specialization"] = None
        result.append(d)

    return jsonify(result), 200


@patient_medical_bp.route("/allergies", methods=["POST"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/allergies", methods=["POST"])
@jwt_required()
def create_allergy(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    actor_id, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error
    actor_role = "doctor"
    data = request.get_json(silent=True) or {}

    allergy_name = str(data.get("allergy_name") or "").strip()
    if not allergy_name:
        return jsonify({"message": "allergy_name is required"}), 400
    if len(allergy_name) < 3:
        return jsonify({"message": "allergy_name must be at least 3 characters"}), 400

    existing = (
        PatientAllergy.query.filter(PatientAllergy.patient_id == patient_id)
        .filter(func.lower(PatientAllergy.allergy_name) == allergy_name.lower())
        .first()
    )
    if existing and existing.status == "active":
        return jsonify({"message": "Allergy already exists"}), 409
    if existing and existing.status != "active":
        existing.status = "active"
        existing.reaction = data.get("reaction") or existing.reaction
        existing.severity = (data.get("severity") or existing.severity)[:20]
        existing.diagnosed_date = _parse_date(data.get("diagnosed_date")) or existing.diagnosed_date
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    row = PatientAllergy(
        patient_id=patient_id,
        allergy_name=allergy_name[:120],
        created_by_user_id=actor_id,
        created_by_role=actor_role[:20],
        reaction=(data.get("reaction") or None),
        severity=(data.get("severity") or "mild")[:20],
        diagnosed_date=_parse_date(data.get("diagnosed_date")),
        status=(data.get("status") or "active")[:30],
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.to_dict()), 201


@patient_medical_bp.route("/allergies/<int:allergy_id>", methods=["PUT"])
@jwt_required()
def update_allergy(allergy_id):
    patient_check = _require_patient()
    if patient_check:
        return patient_check
    patient_id = int(get_jwt_identity())
    row = PatientAllergy.query.filter_by(id=allergy_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Allergy not found"}), 404

    data = request.get_json(silent=True) or {}
    if "allergy_name" in data:
        row.allergy_name = str(data.get("allergy_name") or row.allergy_name)[:120]
    if "reaction" in data:
        row.reaction = data.get("reaction")
    if "severity" in data:
        row.severity = str(data.get("severity") or row.severity)[:20]
    if "diagnosed_date" in data:
        row.diagnosed_date = _parse_date(data.get("diagnosed_date"))
    if "status" in data:
        row.status = str(data.get("status") or row.status)[:30]

    db.session.commit()
    return jsonify(row.to_dict()), 200


@patient_medical_bp.route("/allergies/<int:allergy_id>", methods=["DELETE"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/allergies/<int:allergy_id>", methods=["DELETE"])
@jwt_required()
def delete_allergy(allergy_id, patient_id=None):
    if patient_id is None:
        row_tmp = PatientAllergy.query.get(allergy_id)
        if not row_tmp:
            return jsonify({"message": "Allergy not found"}), 404
        patient_id = row_tmp.patient_id

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403
    _, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error

    row = PatientAllergy.query.filter_by(id=allergy_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Allergy not found"}), 404
    row.status = "inactive"
    db.session.commit()
    return jsonify({"message": "Allergy marked inactive"}), 200


@patient_medical_bp.route("/conditions", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/conditions", methods=["GET"])
@jwt_required()
def get_conditions(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    include_inactive = str(request.args.get("include_inactive", "")).lower() in ("true", "1", "yes")
    query = PatientCondition.query.filter_by(patient_id=patient_id)
    if not include_inactive:
        query = query.filter_by(status="active")
    rows = query.order_by(PatientCondition.created_at.desc()).all()

    # Enrich with creator name + specialization
    from database.models import DoctorProfile
    creator_ids = {r.created_by_user_id for r in rows if r.created_by_user_id}
    creators = {u.id: u for u in User.query.filter(User.id.in_(creator_ids)).all()} if creator_ids else {}
    doctor_profiles = {
        dp.user_id: dp
        for dp in DoctorProfile.query.filter(DoctorProfile.user_id.in_(creator_ids)).all()
    } if creator_ids else {}

    result = []
    for row in rows:
        d = row.to_dict()
        creator = creators.get(row.created_by_user_id)
        if creator:
            dp = doctor_profiles.get(creator.id)
            d["added_by_name"] = creator.full_name
            d["added_by_role"] = row.created_by_role
            d["added_by_specialization"] = dp.specialization if dp and dp.specialization else None
        else:
            d["added_by_name"] = None
            d["added_by_role"] = row.created_by_role
            d["added_by_specialization"] = None
        result.append(d)

    return jsonify(result), 200


@patient_medical_bp.route("/conditions", methods=["POST"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/conditions", methods=["POST"])
@jwt_required()
def create_condition(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    actor_id, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error
    actor_role = "doctor"
    data = request.get_json(silent=True) or {}
    condition_name = str(data.get("condition_name") or "").strip()
    if not condition_name:
        return jsonify({"message": "condition_name is required"}), 400
    if len(condition_name) < 3:
        return jsonify({"message": "condition_name must be at least 3 characters"}), 400

    existing = (
        PatientCondition.query.filter(PatientCondition.patient_id == patient_id)
        .filter(func.lower(PatientCondition.condition_name) == condition_name.lower())
        .first()
    )
    if existing and existing.status == "active":
        return jsonify({"message": "Condition already exists"}), 409
    if existing and existing.status != "active":
        existing.status = "active"
        existing.diagnosed_date = _parse_date(data.get("diagnosed_date")) or existing.diagnosed_date
        existing.last_reviewed = _parse_date(data.get("last_reviewed")) or existing.last_reviewed
        existing.under_treatment = bool(data.get("under_treatment", existing.under_treatment))
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    row = PatientCondition(
        patient_id=patient_id,
        condition_name=condition_name[:120],
        created_by_user_id=actor_id,
        created_by_role=actor_role[:20],
        diagnosed_date=_parse_date(data.get("diagnosed_date")),
        status=(data.get("status") or "active")[:30],
        under_treatment=bool(data.get("under_treatment", True)),
        last_reviewed=_parse_date(data.get("last_reviewed")),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.to_dict()), 201


@patient_medical_bp.route("/conditions/<int:condition_id>", methods=["PUT"])
@jwt_required()
def update_condition(condition_id):
    patient_check = _require_patient()
    if patient_check:
        return patient_check
    patient_id = int(get_jwt_identity())
    row = PatientCondition.query.filter_by(id=condition_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Condition not found"}), 404

    data = request.get_json(silent=True) or {}
    if "condition_name" in data:
        row.condition_name = str(data.get("condition_name") or row.condition_name)[:120]
    if "diagnosed_date" in data:
        row.diagnosed_date = _parse_date(data.get("diagnosed_date"))
    if "status" in data:
        row.status = str(data.get("status") or row.status)[:30]
    if "under_treatment" in data:
        row.under_treatment = bool(data.get("under_treatment"))
    if "last_reviewed" in data:
        row.last_reviewed = _parse_date(data.get("last_reviewed"))

    db.session.commit()
    return jsonify(row.to_dict()), 200


@patient_medical_bp.route("/conditions/<int:condition_id>", methods=["DELETE"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/conditions/<int:condition_id>", methods=["DELETE"])
@jwt_required()
def delete_condition(condition_id, patient_id=None):
    if patient_id is None:
        row_tmp = PatientCondition.query.get(condition_id)
        if not row_tmp:
            return jsonify({"message": "Condition not found"}), 404
        patient_id = row_tmp.patient_id

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403
    _, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error

    row = PatientCondition.query.filter_by(id=condition_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Condition not found"}), 404
    row.status = "inactive"
    db.session.commit()
    return jsonify({"message": "Condition marked inactive"}), 200


@patient_medical_bp.route("/medications", methods=["GET"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medications", methods=["GET"])
@jwt_required()
def get_medications(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    include_inactive_param = str(request.args.get("include_inactive", "")).lower()
    include_inactive = include_inactive_param in ("true", "1", "yes")
    
    query = PatientMedication.query.filter_by(patient_id=patient_id)
    if not include_inactive:
        query = query.filter(PatientMedication.status == "active")
        query = query.filter((PatientMedication.end_date.is_(None)) | (PatientMedication.end_date >= datetime.utcnow().date()))
    rows = [row.to_dict() for row in query.order_by(PatientMedication.created_at.desc()).all()]
    rows.extend(_get_prescription_medications(patient_id, active_only=not include_inactive))
    rows.sort(key=lambda row: row.get("created_at") or "", reverse=True)
    return jsonify(rows), 200


@patient_medical_bp.route("/medications", methods=["POST"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medications", methods=["POST"])
@jwt_required()
def create_medication(patient_id=None):
    if patient_id is None:
        patient_id = int(get_jwt_identity())

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403

    actor_id, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error
    actor_role = "doctor"
    data = request.get_json(silent=True) or {}
    drug_name = str(data.get("drug_name") or "").strip()
    if not drug_name:
        return jsonify({"message": "drug_name is required"}), 400
    if len(drug_name) < 3:
        return jsonify({"message": "drug_name must be at least 3 characters"}), 400

    medication_origin = str(data.get("medication_origin") or "past_external").strip().lower()
    if medication_origin not in ALLOWED_MEDICATION_ORIGINS:
        return jsonify({"message": "Invalid medication_origin"}), 400
    existing = (
        PatientMedication.query.filter(PatientMedication.patient_id == patient_id)
        .filter(func.lower(PatientMedication.drug_name) == drug_name.lower())
        .filter(PatientMedication.status == "active")
        .first()
    )
    if existing:
        return jsonify({"message": "Medication already exists"}), 409

    row = PatientMedication(
        patient_id=patient_id,
        drug_name=drug_name[:150],
        created_by_user_id=actor_id,
        created_by_role=actor_role[:20],
        dosage=(data.get("dosage") or None),
        frequency=(data.get("frequency") or None),
        start_date=_parse_date(data.get("start_date")),
        end_date=_parse_date(data.get("end_date")),
        prescribed_by=(data.get("prescribed_by") or None),
        medication_origin=medication_origin[:30],
        source_hospital_name=(data.get("source_hospital_name") or None),
        status=(data.get("status") or "active")[:30],
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(row.to_dict()), 201


@patient_medical_bp.route("/medications/<int:medication_id>", methods=["PUT"])
@jwt_required()
def update_medication(medication_id):
    patient_check = _require_patient()
    if patient_check:
        return patient_check
    patient_id = int(get_jwt_identity())
    row = PatientMedication.query.filter_by(id=medication_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Medication not found"}), 404

    data = request.get_json(silent=True) or {}
    if "drug_name" in data:
        row.drug_name = str(data.get("drug_name") or row.drug_name)[:150]
    if "dosage" in data:
        row.dosage = data.get("dosage")
    if "frequency" in data:
        row.frequency = data.get("frequency")
    if "start_date" in data:
        row.start_date = _parse_date(data.get("start_date"))
    if "end_date" in data:
        row.end_date = _parse_date(data.get("end_date"))
    if "prescribed_by" in data:
        row.prescribed_by = data.get("prescribed_by")
    if "medication_origin" in data:
        medication_origin = str(data.get("medication_origin") or "").strip().lower()
        if medication_origin not in ALLOWED_MEDICATION_ORIGINS:
            return jsonify({"message": "Invalid medication_origin"}), 400
        if row.created_by_role == "patient" and medication_origin == "current_doctor":
            return jsonify({"message": "Patient-entered medications cannot be marked as current doctor prescribed"}), 400
        row.medication_origin = medication_origin[:30]
    if "source_hospital_name" in data:
        row.source_hospital_name = data.get("source_hospital_name")
    if "status" in data:
        row.status = str(data.get("status") or row.status)[:30]

    db.session.commit()
    return jsonify(row.to_dict()), 200


@patient_medical_bp.route("/medications/<int:medication_id>", methods=["DELETE"])
@patient_medical_bp.route("/doctor/patients/<int:patient_id>/medications/<int:medication_id>", methods=["DELETE"])
@jwt_required()
def delete_medication(medication_id, patient_id=None):
    if patient_id is None:
        row_tmp = PatientMedication.query.get(medication_id)
        if not row_tmp:
            return jsonify({"message": "Medication not found"}), 404
        patient_id = row_tmp.patient_id

    is_allowed, msg = _verify_patient_access(patient_id)
    if not is_allowed:
        return jsonify({"message": msg}), 403
    _, doctor_only_error = _doctor_only_clinical_write()
    if doctor_only_error:
        return doctor_only_error

    row = PatientMedication.query.filter_by(id=medication_id, patient_id=patient_id).first()
    if not row:
        return jsonify({"message": "Medication not found"}), 404
    row.status = "inactive"
    db.session.commit()
    return jsonify({"message": "Medication marked inactive"}), 200
