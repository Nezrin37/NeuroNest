from datetime import datetime
from database.models import Appointment, DoctorNotificationSetting
from services.notification_service import NotificationService

def check_upcoming_consultations(app):
    """
    Runs every minute. Finds upcoming appointments and checks if a reminder is due 
    based on the doctor's NotificationSettings.
    """
    with app.app_context():
        try:
            # We want to check appointments that are today, and approved
            now = datetime.now()
            today_date = now.date()
            # Find all approved appointments for today
            upcoming_appointments = Appointment.query.filter(
                Appointment.status == "approved",
                Appointment.appointment_date == today_date
            ).all()

            for appt in upcoming_appointments:
                # Get doctor's notification settings
                doc_settings = DoctorNotificationSetting.query.filter_by(doctor_user_id=appt.doctor_id).first()
                if not doc_settings or not doc_settings.reminder_before_minutes or doc_settings.reminder_before_minutes <= 0:
                    continue
                
                # Calculate time until appointment
                appt_datetime = datetime.combine(appt.appointment_date, appt.appointment_time)
                time_difference = appt_datetime - now
                minutes_until = int(time_difference.total_seconds() / 60)
                
                # We trigger exactly when minutes_until == reminder_before_minutes (give or take a minute)
                if minutes_until == doc_settings.reminder_before_minutes:
                    _trigger_upcoming_consultation_alert(appt, minutes_until)

        except Exception as e:
            print(f"[SCHEDULER ERROR] Failed to check upcoming consultations: {e}")

def _trigger_upcoming_consultation_alert(appt, minutes_until):
    # Keep it simple and stateless by relying on exact minute matching.
    doctor = appt.doctor
    patient = appt.patient

    title = f"Upcoming Consultation in {minutes_until} mins"
    message = f"Your appointment with patient {patient.full_name} is starting in {minutes_until} minutes."

    # Send Notification (Email / In-App based on doctor settings)
    doc_settings = DoctorNotificationSetting.query.filter_by(doctor_user_id=doctor.id).first()

    # 1. In-App Notification (Database Log)
    if doc_settings and doc_settings.in_app_notifications:
        NotificationService.send_in_app(
            user_id=doctor.id,
            title=title,
            message=message,
            payload={"type": "upcoming_consultation", "related_client_id": patient.id}
        )

    # 2. Email Notification
    if doc_settings and doc_settings.email_on_booking:
        NotificationService.send_email(
            recipient=doctor.email,
            subject=title,
            body=f"Hello Dr. {doctor.full_name},\n\n" + message + "\n\nRegards,\nThe App Team"
        )
