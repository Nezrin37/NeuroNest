from app import app
from database.models import db, DoctorProfile

def test_to_dict():
    with app.app_context():
        # Try to fetch the first doctor
        doctor = DoctorProfile.query.first()
        if not doctor:
            print("No doctor found in DB.")
            return
        try:
            d = doctor.to_dict()
            print("Successfully called to_dict() for doctor ID:", doctor.id)
            print("Experience count:", len(d.get("experience", [])))
        except Exception as e:
            print("FAILED to call to_dict():", str(e))
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_to_dict()
