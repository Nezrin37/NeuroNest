from pathlib import Path
import eventlet
eventlet.monkey_patch()

import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Always load backend/.env regardless of run directory, overriding inherited.
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

from config.config import Config
from database.models import db, ClinicalPin
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.appointments import appointments_bp
from routes.medical_records import medical_records_bp
from routes.prescription_routes import prescriptions_bp
from routes.doctor_profile import doctor_profile_bp
from routes.patient_settings_routes import patient_settings_bp
from routes.announcements import announcements_bp
from routes.patient_medical_records import patient_medical_bp
from routes.modules_config import modules_config_bp


from extensions.socket import socketio

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ========== CORS ========== 
    # In production, set CORS_ORIGINS to your Vercel frontend URL (comma-separated)
    # e.g. CORS_ORIGINS=https://neuronest.vercel.app
    import re
    _raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    # Dynamically allow all Vercel preview deployments
    _allowed_origins.append(re.compile(r"^https://.*\.vercel\.app$"))
    
    CORS(app, origins=_allowed_origins, supports_credentials=True)
    db.init_app(app)
    jwt = JWTManager(app)
    socketio.init_app(app)

    with app.app_context():
        db.create_all()

    # ================= Blueprints =================
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(profile_bp, url_prefix="/profile")
    app.register_blueprint(appointments_bp, url_prefix="/appointments")
    app.register_blueprint(medical_records_bp)
    app.register_blueprint(patient_medical_bp)
    app.register_blueprint(prescriptions_bp, url_prefix="/prescriptions")
    app.register_blueprint(announcements_bp, url_prefix="/api/announcements")
    app.register_blueprint(modules_config_bp, url_prefix="/api/modules")
    
    # New Doctor Profile Route
    app.register_blueprint(doctor_profile_bp, url_prefix="/api/doctor/profile")
    
    # Admin Management Routes
    from routes.admin.manage_patients_routes import admin_patients_bp
    app.register_blueprint(admin_patients_bp, url_prefix="/api/admin/patients")

    from routes.admin.manage_doctors_routes import admin_doctors_bp
    app.register_blueprint(admin_doctors_bp, url_prefix="/api/admin/doctors")
    
    from routes.admin.manage_appointments_routes import admin_appointments_bp
    app.register_blueprint(admin_appointments_bp, url_prefix="/api/admin/appointments")
    
    from modules.chat.routes import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/api/chat")

    from routes.doctor import doctor_bp
    app.register_blueprint(doctor_bp, url_prefix="/doctor")

    from modules.feedback.routes import feedback_bp
    app.register_blueprint(feedback_bp, url_prefix="/api/feedback")
    app.register_blueprint(patient_settings_bp, url_prefix="/api/patient/settings")

    from routes.doctor_settings_routes import doctor_settings_bp
    app.register_blueprint(doctor_settings_bp, url_prefix="/api/doctor/settings")

    from routes.admin.reports_routes import admin_reports_bp
    app.register_blueprint(admin_reports_bp, url_prefix="/api/admin/reports")

    from routes.admin.settings_routes import admin_settings_bp
    app.register_blueprint(admin_settings_bp, url_prefix="/api/admin/settings")

    from routes.admin.dashboard_routes import admin_dashboard_bp
    app.register_blueprint(admin_dashboard_bp, url_prefix="/api/admin/dashboard")
    
    from routes.admin.announcement_routes import admin_announcements_bp
    app.register_blueprint(admin_announcements_bp, url_prefix="/api/admin/announcements")

    from routes.rtc import rtc_bp
    app.register_blueprint(rtc_bp, url_prefix="/api/rtc")

    # Import socket events to register handlers
    import modules.chat.socket_events
    
    from sockets.video_socket import register_video_events
    register_video_events(socketio)

    # ================= Home Route =================
    @app.route("/")
    def home():
        return {"status": "NeuroNest backend running"}

    # NOTE: /uploads/<filename> route removed — files are now served by Cloudinary directly.

    return app


app = create_app()

if __name__ == "__main__":
    socketio.run(app, debug=True)
