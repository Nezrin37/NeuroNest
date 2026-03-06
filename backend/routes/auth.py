import os
from flask import Blueprint, request, jsonify
from database.models import db, User, PatientProfile, DoctorProfile, SecurityActivity
from utils.security import hash_password, verify_password
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/test-email")
def test_email():
    version = "V_REQUESTS_2026"  # marker
    try:
        import requests as req_lib
        resend_api_key = os.getenv("RESEND_API_KEY")

        if not resend_api_key:
            return jsonify({"status": "error", "reason": "RESEND_API_KEY missing"}), 500

        resp = req_lib.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
            json={
                "from": "NeuroNest <onboarding@resend.dev>",
                "to": ["neuronest4@gmail.com"],
                "subject": "NeuroNest Test",
                "text": "Email system working!",
            },
            timeout=15
        )
        data = resp.json()
        if resp.status_code == 200:
            return jsonify({"status": "SUCCESS", "id": data.get("id")}), 200
        else:
            return jsonify({"status": "error", "http_code": resp.status_code, "detail": data}), 500
    except Exception as e:
        return jsonify({"status": "error", "version": version, "type": type(e).__name__, "msg": str(e)}), 500

def parse_user_agent(ua_string):
    if not ua_string: return "Unknown Device"
    ua_string = ua_string.lower()
    
    # Simple OS detection
    os = "Unknown OS"
    if "macintosh" in ua_string or "mac os" in ua_string: os = "MacOS"
    elif "windows" in ua_string: os = "Windows"
    elif "android" in ua_string: os = "Android"
    elif "iphone" in ua_string or "ipad" in ua_string: os = "iOS"
    elif "linux" in ua_string: os = "Linux"

    # Simple Browser detection
    browser = "Browser"
    if "chrome" in ua_string and "edg" not in ua_string: browser = "Chrome"
    elif "safari" in ua_string and "chrome" not in ua_string: browser = "Safari"
    elif "firefox" in ua_string: browser = "Firefox"
    elif "edg" in ua_string: browser = "Edge"
    elif "opera" in ua_string or "opr" in ua_string: browser = "Opera"
    
    return f"{browser} on {os}"

def log_security_event(user_id, event_type, description, commit=True):
    ua = request.headers.get('User-Agent', '')
    try:
        activity = SecurityActivity(
            user_id=user_id,
            event_type=event_type,
            description=description,
            ip_address=request.remote_addr,
            user_agent=ua
        )
        db.session.add(activity)
        if commit:
            db.session.commit()
    except Exception as e:
        print(f"Error logging security event: {e}")
        db.session.rollback()


# Cache bootstrap config to speed up failed/dev lookups
ALLOW_BOOTSTRAP = os.getenv("ALLOW_DEV_DOCTOR_BOOTSTRAP", "false").lower() == "true"
DEFAULT_DOCTOR_EMAIL = os.getenv("DEFAULT_DOCTOR_EMAIL", "nayanasunilkumar8@gmail.com").strip().lower()
DEFAULT_DOCTOR_PASSWORD = os.getenv("DEFAULT_DOCTOR_PASSWORD", "123456")

def _maybe_bootstrap_doctor_for_dev(email: str):
    """
    Dev-only fallback:
    If enabled, auto-creates the default doctor account when missing.
    """
    if not ALLOW_BOOTSTRAP:
        return None
        
    email_clean = email.strip().lower()
    if email_clean != DEFAULT_DOCTOR_EMAIL:
        return None

    # Redundant query avoided: if we are here, 'User.query.filter_by(email=email).first()' 
    # already returned None in the main login flow for this specific email.

    doctor_user = User(
        email=DEFAULT_DOCTOR_EMAIL,
        password_hash=hash_password(DEFAULT_DOCTOR_PASSWORD),
        role="doctor",
        full_name="Dr. Nayana",
    )
    db.session.add(doctor_user)
    db.session.flush()

    profile = DoctorProfile(
        user_id=doctor_user.id,
        specialization="Neurologist",
        qualification="MBBS, MD (Neurology)",
        experience_years=10,
    )
    db.session.add(profile)
    db.session.commit()
    return doctor_user


# --------------------------------------------------
# REGISTER API
# --------------------------------------------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    requested_role = data.get("role", "patient")
    full_name = data.get("full_name")

    if not email or not password or not full_name:
        return jsonify({"message": "Full name, email and password required"}), 400

    # Public registration is patient-only; doctor accounts must be provisioned by admins/scripts.
    role = "patient"
    if requested_role and requested_role != "patient":
        return jsonify({"message": "Only patient self-registration is allowed"}), 403

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "User already exists"}), 409

    user = User(
        email=email,
        password_hash=hash_password(password),
        role=role,
        full_name=full_name
    )

    db.session.add(user)
    db.session.flush() # Ensure ID is generated

    # Auto-create patient profile for self-registered users
    patient_profile = PatientProfile(user_id=user.id, full_name=full_name)
    db.session.add(patient_profile)
    
    db.session.commit()

    return jsonify({
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    }), 201


# --------------------------------------------------
# LOGIN API
# --------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}

        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            user = _maybe_bootstrap_doctor_for_dev(email)

        if not user:
            return jsonify({"message": "Invalid email or password"}), 401

        is_verified = verify_password(password, user.password_hash)

        if not is_verified:
            log_security_event(user.id, "login_failed", "Failed login attempt detected")
            return jsonify({"message": "Invalid email or password"}), 401

        # ✅ CRITICAL FIX: identity MUST be string
        token = create_access_token(
            identity=str(user.id),   # 🔥 THIS FIXES "Subject must be a string"
            additional_claims={
                "role": user.role
            }
        )

        ua = request.headers.get('User-Agent', '')
        device_info = parse_user_agent(ua)
        log_security_event(user.id, "login_success", f"New login from {device_info}", commit=False)
        db.session.commit()

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name
            }
        }), 200
    except Exception as e:
        import traceback
        return jsonify({"message": f"Login crash: {str(e)}", "trace": traceback.format_exc()}), 500
