from app import app
from database.models import db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Add priority_level column to appointments
            # We use IF NOT EXISTS if possible, but SQLite/Postgres syntax differ.
            # To be safe and consistent with other scripts, we just try/except.
            db.session.execute(text("ALTER TABLE appointments ADD COLUMN priority_level VARCHAR(50) DEFAULT 'routine'"))
            db.session.commit()
            print("Successfully added priority_level column to appointments.")
        except Exception as e:
            db.session.rollback()
            # If it already exists, that's fine
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("priority_level column already exists.")
            else:
                print(f"Error adding priority_level column: {e}")

if __name__ == "__main__":
    migrate()
