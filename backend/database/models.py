from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import UniqueConstraint, CheckConstraint, Index, Enum as SAEnum

db = SQLAlchemy()


# =========================================
# USER TABLE
# =========================================
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="patient")
    full_name = db.Column(db.String(100))

    # Account Control Fields
    account_status = db.Column(db.String(20), default="active") # active, suspended, deleted
    is_email_verified = db.Column(db.Boolean, default=False)
    is_phone_verified = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False) # Clinical/Medical verification

    # Sync with DB reality
    email_verified = db.Column(db.Boolean, default=False)
    phone_verified = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    preferred_language = db.Column(db.String(20), default="en")
    is_two_factor_enabled = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =========================================
# PATIENT PROFILE TABLE
# =========================================
class PatientProfile(db.Model):
    __tablename__ = "patient_profiles"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

    full_name = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(20))
    blood_group = db.Column(db.String(5))
    height_cm = db.Column(db.Integer)
    weight_kg = db.Column(db.Integer)

    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    pincode = db.Column(db.String(20))

    allergies = db.Column(db.Text)
    chronic_conditions = db.Column(db.Text)

    profile_image = db.Column(db.String(255))

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationship
    user = db.relationship("User", backref=db.backref("patient_profile", uselist=False))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.full_name,
            "phone": self.phone,
            "date_of_birth": str(self.date_of_birth) if self.date_of_birth else None,
            "gender": self.gender,
            "blood_group": self.blood_group,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "pincode": self.pincode,
            "allergies": self.allergies,
            "chronic_conditions": self.chronic_conditions,
            "profile_image": self.profile_image,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }


# =========================================
# EMERGENCY CONTACT TABLE
# =========================================
class EmergencyContact(db.Model):
    __tablename__ = "emergency_contacts"

    id = db.Column(db.Integer, primary_key=True)

    # ✅ FIXED FOREIGN KEY
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patient_profiles.id"),
        nullable=False
    )

    contact_name = db.Column(db.String(100), nullable=False)
    relationship = db.Column(db.String(50))
    phone = db.Column(db.String(20), nullable=False)
    alternate_phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    is_primary = db.Column(db.Boolean, default=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "contact_name": self.contact_name,
            "relationship": self.relationship,
            "phone": self.phone,
            "alternate_phone": self.alternate_phone,
            "email": self.email,
            "is_primary": self.is_primary,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }
    
# =========================================
# APPOINTMENTS TABLE
# =========================================
class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)

    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    slot_id = db.Column(
        db.Integer,
        db.ForeignKey("appointment_slots.id"),
        nullable=True,
        index=True
    )

    reason = db.Column(db.String(255))
    notes = db.Column(db.Text)

    status = db.Column(
        db.String(50),
        default="pending"  # pending / approved / rejected / cancelled / completed
    )
    booking_mode = db.Column(
        SAEnum("auto_confirm", "doctor_approval", name="booking_mode_enum"),
        nullable=False,
        default="doctor_approval"
    )
    delay_reason = db.Column(db.Text, nullable=True)
    extended_from_appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id"),
        nullable=True
    )
    priority_level = db.Column(
        db.String(50),
        default="routine"  # routine / urgent / emergency
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    feedback_given = db.Column(db.Boolean, default=False)


    # Relationships
    patient = db.relationship("User", foreign_keys=[patient_id], backref="patient_appointments")
    doctor = db.relationship("User", foreign_keys=[doctor_id], backref="doctor_appointments")
    slot = db.relationship("AppointmentSlot", foreign_keys=[slot_id], backref="appointment", uselist=False)

    # =========================================
    # RETURN JSON DATA
    # =========================================
    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.full_name if self.patient else f"Patient #{self.patient_id}",
            "patient_image": self.patient.patient_profile.profile_image if self.patient and self.patient.patient_profile else None,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.full_name if self.doctor else None,
            "appointment_date": str(self.appointment_date),
            "appointment_time": str(self.appointment_time),
            "slot_id": self.slot_id,
            "reason": self.reason,
            "notes": self.notes,
            "priority_level": self.priority_level,
            "status": self.status,
            "booking_mode": self.booking_mode,
            "delay_reason": self.delay_reason,
            "extended_from_appointment_id": self.extended_from_appointment_id,
            "feedback_given": self.feedback_given,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }


# =========================================
# APPOINTMENT SLOTS TABLE
# =========================================
class AppointmentSlot(db.Model):
    __tablename__ = "appointment_slots"
    __table_args__ = (
        UniqueConstraint("doctor_user_id", "slot_start_utc", name="uq_doctor_slot_start"),
        CheckConstraint("slot_end_utc > slot_start_utc", name="ck_slot_end_after_start"),
        Index("idx_slot_doctor_date_status", "doctor_user_id", "slot_date_local", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    slot_start_utc = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    slot_end_utc = db.Column(db.DateTime(timezone=True), nullable=False)
    slot_date_local = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(
        SAEnum("available", "held", "booked", "blocked", "cancelled", name="slot_status_enum"),
        nullable=False,
        default="available",
        index=True
    )
    held_by_patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    held_until_utc = db.Column(db.DateTime(timezone=True), nullable=True)
    booked_appointment_id = db.Column(db.Integer, nullable=True, index=True)
    source = db.Column(
        SAEnum("generated", "manual_override", "emergency_block", name="slot_source_enum"),
        nullable=False,
        default="generated"
    )
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor_user = db.relationship("User", foreign_keys=[doctor_user_id], backref="appointment_slots")
    held_by_patient = db.relationship("User", foreign_keys=[held_by_patient_id], backref="held_slots")

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_user_id": self.doctor_user_id,
            "slot_start_utc": self.slot_start_utc.isoformat() if self.slot_start_utc else None,
            "slot_end_utc": self.slot_end_utc.isoformat() if self.slot_end_utc else None,
            "slot_date_local": str(self.slot_date_local),
            "status": self.status,
            "held_by_patient_id": self.held_by_patient_id,
            "held_until_utc": self.held_until_utc.isoformat() if self.held_until_utc else None,
            "booked_appointment_id": self.booked_appointment_id,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# =========================================
# DOCTOR SLOT OVERRIDES (EMERGENCY BLOCKS)
# =========================================
class DoctorSlotOverride(db.Model):
    __tablename__ = "doctor_slot_overrides"
    __table_args__ = (
        CheckConstraint("scope IN ('full_day', 'range')", name="ck_slot_override_scope"),
        CheckConstraint(
            "(scope = 'full_day' AND start_time_utc IS NULL AND end_time_utc IS NULL) OR "
            "(scope = 'range' AND start_time_utc IS NOT NULL AND end_time_utc IS NOT NULL AND end_time_utc > start_time_utc)",
            name="ck_slot_override_time_scope",
        ),
        Index("idx_slot_override_doctor_date", "doctor_user_id", "override_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    override_date = db.Column(db.Date, nullable=False, index=True)
    scope = db.Column(
        SAEnum("full_day", "range", name="slot_override_scope_enum"),
        nullable=False,
        default="full_day",
    )
    start_time_utc = db.Column(db.DateTime(timezone=True), nullable=True)
    end_time_utc = db.Column(db.DateTime(timezone=True), nullable=True)
    reason = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor_user = db.relationship("User", foreign_keys=[doctor_user_id], backref="slot_overrides")
    created_by_user = db.relationship("User", foreign_keys=[created_by], backref="created_slot_overrides")

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_user_id": self.doctor_user_id,
            "override_date": str(self.override_date),
            "scope": self.scope,
            "start_time_utc": self.start_time_utc.isoformat() if self.start_time_utc else None,
            "end_time_utc": self.end_time_utc.isoformat() if self.end_time_utc else None,
            "reason": self.reason,
            "created_by": self.created_by,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# =========================================
# SLOT EVENT LOGS
# =========================================
class SlotEventLog(db.Model):
    __tablename__ = "slot_event_logs"
    __table_args__ = (
        Index("idx_slot_event_doctor_created", "doctor_user_id", "created_at"),
        Index("idx_slot_event_slot_created", "slot_id", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(80), nullable=False, index=True)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    slot_id = db.Column(db.Integer, db.ForeignKey("appointment_slots.id"), nullable=True, index=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=True, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    source = db.Column(db.String(80), nullable=False, default="system")
    reason = db.Column(db.String(255), nullable=True)
    correlation_id = db.Column(db.String(100), nullable=True, index=True)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    doctor_user = db.relationship("User", foreign_keys=[doctor_user_id], backref="slot_event_logs")
    actor_user = db.relationship("User", foreign_keys=[actor_user_id], backref="slot_events_by_actor")
    slot = db.relationship("AppointmentSlot", foreign_keys=[slot_id], backref="event_logs")
    appointment = db.relationship("Appointment", foreign_keys=[appointment_id], backref="slot_event_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "event_type": self.event_type,
            "doctor_user_id": self.doctor_user_id,
            "slot_id": self.slot_id,
            "appointment_id": self.appointment_id,
            "actor_user_id": self.actor_user_id,
            "source": self.source,
            "reason": self.reason,
            "correlation_id": self.correlation_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "metadata": self.metadata_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# =========================================
# DOCTOR SCHEDULE SETTINGS
# =========================================
class DoctorScheduleSetting(db.Model):
    __tablename__ = "doctor_schedule_settings"

    id = db.Column(db.Integer, primary_key=True)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    slot_duration_minutes = db.Column(db.Integer, nullable=False, default=30)
    buffer_minutes = db.Column(db.Integer, nullable=False, default=10)
    approval_mode = db.Column(
        SAEnum("auto_confirm", "doctor_approval", name="approval_mode_enum"),
        nullable=False,
        default="doctor_approval"
    )
    accepting_new_bookings = db.Column(db.Boolean, nullable=False, default=True)
    timezone = db.Column(db.String(64), nullable=False, default="Asia/Kolkata")
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor_user = db.relationship("User", backref=db.backref("schedule_setting", uselist=False))

    def to_dict(self):
        return {
            "doctor_user_id": self.doctor_user_id,
            "slot_duration_minutes": self.slot_duration_minutes,
            "buffer_minutes": self.buffer_minutes,
            "approval_mode": self.approval_mode,
            "accepting_new_bookings": self.accepting_new_bookings,
            "timezone": self.timezone,
        }


# =========================================
# DOCTOR NOTIFICATION SETTINGS
# =========================================
class DoctorNotificationSetting(db.Model):
    __tablename__ = "doctor_notification_settings"

    id = db.Column(db.Integer, primary_key=True)

    doctor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    email_on_booking = db.Column(db.Boolean, default=True)
    sms_on_booking = db.Column(db.Boolean, default=False)
    in_app_notifications = db.Column(db.Boolean, default=True)

    reminder_before_minutes = db.Column(db.Integer, default=30)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = db.relationship("User", backref=db.backref("notification_setting", uselist=False))

    def to_dict(self):
        return {
            "email_on_booking": self.email_on_booking,
            "sms_on_booking": self.sms_on_booking,
            "in_app_notifications": self.in_app_notifications,
            "reminder_before_minutes": self.reminder_before_minutes,
        }

# =========================================
# DOCTOR PRIVACY SETTINGS
# =========================================
class DoctorPrivacySetting(db.Model):
    __tablename__ = "doctor_privacy_settings"

    id = db.Column(db.Integer, primary_key=True)

    doctor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    show_profile_publicly = db.Column(db.Boolean, default=True)
    show_consultation_fee = db.Column(db.Boolean, default=True)
    allow_chat_before_booking = db.Column(db.Boolean, default=True)
    allow_reviews_publicly = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    doctor = db.relationship("User", backref=db.backref("privacy_setting", uselist=False))

    def to_dict(self):
        return {
            "show_profile_publicly": self.show_profile_publicly,
            "show_consultation_fee": self.show_consultation_fee,
            "allow_chat_before_booking": self.allow_chat_before_booking,
            "allow_reviews_publicly": self.allow_reviews_publicly,
        }


# =========================================
# DOCTOR CONSULTATION SETTINGS
# =========================================
class DoctorConsultationSetting(db.Model):
    __tablename__ = "doctor_consultation_settings"

    id = db.Column(db.Integer, primary_key=True)

    doctor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    consultation_fee = db.Column(db.Float, nullable=False, default=500.0)
    consultation_mode = db.Column(db.String(50), default="Online")
    cancellation_policy_hours = db.Column(db.Integer, default=24)
    auto_cancel_unpaid_minutes = db.Column(db.Integer, default=15)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    doctor = db.relationship("User", backref=db.backref("consultation_setting", uselist=False))

    def to_dict(self):
        return {
            "consultation_fee": self.consultation_fee,
            "consultation_mode": self.consultation_mode,
            "cancellation_policy_hours": self.cancellation_policy_hours,
            "auto_cancel_unpaid_minutes": self.auto_cancel_unpaid_minutes,
        }


# =========================================
# IN-APP NOTIFICATIONS
# =========================================
class InAppNotification(db.Model):
    __tablename__ = "in_app_notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False, default="info")
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    payload = db.Column(db.JSON, nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "metadata": self.payload or {},
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }




# =========================================
# MEDICAL RECORDS TABLE
# =========================================
class MedicalRecord(db.Model):
    __tablename__ = "medical_records"
    __table_args__ = (
        Index("idx_medical_records_patient_date", "patient_id", "record_date"),
        Index("idx_medical_records_patient_category", "patient_id", "category"),
    )

    id = db.Column(db.Integer, primary_key=True)

    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=True)
    file_size_bytes = db.Column(db.BigInteger, nullable=True)
    
    doctor_name = db.Column(db.String(120))
    hospital_name = db.Column(db.String(200))
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id"),
        nullable=True
    )
    
    description = db.Column(db.Text)
    notes = db.Column(db.Text)
    record_date = db.Column(db.Date)
    status = db.Column(db.String(30), nullable=False, default="active")
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    
    verified_by_doctor = db.Column(db.Boolean, default=False)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    tags = db.relationship("MedicalRecordTag", backref="record", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "title": self.title,
            "category": self.category,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size_bytes": self.file_size_bytes,
            "doctor_name": self.doctor_name,
            "hospital_name": self.hospital_name,
            "appointment_id": self.appointment_id,
            "description": self.description,
            "notes": self.notes,
            "status": self.status,
            "uploaded_by": self.uploaded_by,
            "tags": [tag.tag_name for tag in self.tags],
            "record_date": str(self.record_date) if self.record_date else None,
            "verified_by_doctor": self.verified_by_doctor,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }


class MedicalRecordTag(db.Model):
    __tablename__ = "record_tags"
    __table_args__ = (
        UniqueConstraint("record_id", "tag_name", name="uq_record_tag_name"),
        Index("idx_record_tags_record_id", "record_id"),
        Index("idx_record_tags_tag_name", "tag_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, db.ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    tag_name = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "record_id": self.record_id,
            "tag_name": self.tag_name,
            "created_at": self.created_at.isoformat() + 'Z',
        }


class PatientAllergy(db.Model):
    __tablename__ = "patient_allergies"
    __table_args__ = (
        UniqueConstraint("patient_id", "allergy_name", name="uq_patient_allergy_name"),
        Index("idx_patient_allergies_patient_status", "patient_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    allergy_name = db.Column(db.String(120), nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_role = db.Column(db.String(20), nullable=False, default="patient")
    reaction = db.Column(db.String(255), nullable=True)
    severity = db.Column(db.String(20), nullable=False, default="mild")
    diagnosed_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "allergy_name": self.allergy_name,
            "created_by_user_id": self.created_by_user_id,
            "created_by_role": self.created_by_role,
            "reaction": self.reaction,
            "severity": self.severity,
            "diagnosed_date": str(self.diagnosed_date) if self.diagnosed_date else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }


class PatientCondition(db.Model):
    __tablename__ = "patient_conditions"
    __table_args__ = (
        UniqueConstraint("patient_id", "condition_name", name="uq_patient_condition_name"),
        Index("idx_patient_conditions_patient_status", "patient_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    condition_name = db.Column(db.String(120), nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_role = db.Column(db.String(20), nullable=False, default="patient")
    diagnosed_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")
    under_treatment = db.Column(db.Boolean, nullable=False, default=True)
    last_reviewed = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "condition_name": self.condition_name,
            "created_by_user_id": self.created_by_user_id,
            "created_by_role": self.created_by_role,
            "diagnosed_date": str(self.diagnosed_date) if self.diagnosed_date else None,
            "status": self.status,
            "under_treatment": self.under_treatment,
            "last_reviewed": str(self.last_reviewed) if self.last_reviewed else None,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }


class PatientMedication(db.Model):
    __tablename__ = "patient_medications"
    __table_args__ = (
        Index("idx_patient_medications_patient_active", "patient_id", "status", "end_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    drug_name = db.Column(db.String(150), nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_role = db.Column(db.String(20), nullable=False, default="patient")
    dosage = db.Column(db.String(80), nullable=True)
    frequency = db.Column(db.String(80), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    prescribed_by = db.Column(db.String(120), nullable=True)
    medication_origin = db.Column(db.String(30), nullable=False, default="past_external")
    source_hospital_name = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "drug_name": self.drug_name,
            "created_by_user_id": self.created_by_user_id,
            "created_by_role": self.created_by_role,
            "dosage": self.dosage,
            "frequency": self.frequency,
            "start_date": str(self.start_date) if self.start_date else None,
            "end_date": str(self.end_date) if self.end_date else None,
            "prescribed_by": self.prescribed_by,
            "medication_origin": self.medication_origin,
            "source_hospital_name": self.source_hospital_name,
            "status": self.status,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }





# =========================================
# CLINICAL STRUCTURE TABLE (Hierarchy)
# =========================================
class ClinicalStructure(db.Model):
    __tablename__ = "clinical_structures"

    id = db.Column(db.Integer, primary_key=True)
    sector = db.Column(db.String(100), nullable=False)
    specialty = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "sector": self.sector,
            "specialty": self.specialty,
            "is_active": self.is_active
        }


# =========================================
# DOCTOR PROFILE TABLE
# =========================================
class DoctorProfile(db.Model):
    __tablename__ = "doctor_profiles"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

    specialization = db.Column(db.String(100))
    license_number = db.Column(db.String(50), unique=True)
    qualification = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    department = db.Column(db.String(100))
    sector = db.Column(db.String(50), default="North Sector") # North, South, East, West
    
    phone = db.Column(db.String(20))
    gender = db.Column(db.String(20))
    dob = db.Column(db.Date)
    bio = db.Column(db.Text)
    hospital_name = db.Column(db.String(200))
    
    consultation_fee = db.Column(db.Float)
    consultation_mode = db.Column(db.String(50)) # Online/Offline/Both
    
    profile_image = db.Column(db.String(255)) 

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    user = db.relationship("User", backref=db.backref("doctor_profile", uselist=False))
    availability = db.relationship("DoctorAvailability", backref="doctor", lazy=True, cascade="all, delete-orphan")
    blocked_dates = db.relationship("DoctorBlockedDate", backref="doctor", lazy=True, cascade="all, delete-orphan")
    expertise_tags = db.relationship("DoctorExpertiseTag", backref="doctor", lazy=True, cascade="all, delete-orphan")
    experience = db.relationship("DoctorExperience", backref="doctor", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.user.full_name if self.user else "Doctor",
            "specialization": self.specialization,
            "license_number": self.license_number,
            "qualification": self.qualification,
            "experience_years": self.experience_years,
            "department": self.department,
            "sector": self.sector,
            "phone": self.phone,
            "gender": self.gender,
            "dob": str(self.dob) if self.dob else None,
            "bio": self.bio,
            "hospital_name": self.hospital_name,
            "consultation_fee": self.consultation_fee,
            "consultation_mode": self.consultation_mode,
            "profile_image": self.profile_image,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
            "availability": [a.to_dict() for a in self.availability],
            "blocked_dates": [b.to_dict() for b in self.blocked_dates],
            "expertise_tags": [t.to_dict() for t in self.expertise_tags],
            "experience": [e.to_dict() for e in self.experience]
        }


# =========================================
# DOCTOR AVAILABILITY
# =========================================
class DoctorAvailability(db.Model):
    __tablename__ = "doctor_availability"
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id"), nullable=False)
    
    day_of_week = db.Column(db.String(20), nullable=False) # Monday, Tuesday...
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "day_of_week": self.day_of_week,
            "start_time": str(self.start_time),
            "end_time": str(self.end_time)
        }


# =========================================
# DOCTOR BLOCKED DATES
# =========================================
class DoctorBlockedDate(db.Model):
    __tablename__ = "doctor_blocked_dates"
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id"), nullable=False)
    
    date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(255))
    
    def to_dict(self):
        return {
            "id": self.id,
            "date": str(self.date),
            "reason": self.reason
        }


# =========================================
# DOCTOR EXPERTISE TAGS
# =========================================
class DoctorExpertiseTag(db.Model):
    __tablename__ = "doctor_expertise_tags"
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id"), nullable=False)
    
    tag_name = db.Column(db.String(100), nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "tag_name": self.tag_name
        }

# =========================================
# DOCTOR EXPERIENCE TIMELINE
# =========================================
class DoctorExperience(db.Model):
    __tablename__ = "doctor_experiences"
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id"), nullable=False)
    
    title = db.Column(db.String(150), nullable=False)
    hospital = db.Column(db.String(200), nullable=False)
    period = db.Column(db.String(50), nullable=False) # e.g., "2020 - Present"
    description = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "hospital": self.hospital,
            "period": self.period,
            "description": self.description
        }

# =========================================
# CLINICAL REMARKS TABLE
# =========================================
class ClinicalRemark(db.Model):
    __tablename__ = "clinical_remarks"

    id = db.Column(db.Integer, primary_key=True)
    
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )
    
    content = db.Column(db.Text, nullable=False)
    
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z'
        }


# =========================================
# MODULES CONFIG TABLE (FUTURE SERVER TOGGLES)
# =========================================
class ModuleConfig(db.Model):
    __tablename__ = "modules"

    id = db.Column(db.Integer, primary_key=True)
    module_key = db.Column(db.String(120), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(150), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    roles_allowed = db.Column(db.JSON, nullable=False, default=list)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "module_key": self.module_key,
            "display_name": self.display_name,
            "is_enabled": self.is_enabled,
            "roles_allowed": self.roles_allowed or [],
            "created_at": self.created_at.isoformat() + 'Z',
            "updated_at": self.updated_at.isoformat() + 'Z',
        }

# =========================================
# CLINICAL QUALITY & REVIEWS TABLE
# =========================================
class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=False, unique=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    rating = db.Column(db.Integer, CheckConstraint('rating >= 1 AND rating <= 5'), nullable=False)
    review_text = db.Column(db.Text)
    sentiment = db.Column(db.String(20)) # positive, neutral, negative
    
    is_hidden = db.Column(db.Boolean, default=False)
    is_flagged = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    appointment = db.relationship("Appointment", backref=db.backref("review", uselist=False))
    patient = db.relationship("User", foreign_keys=[patient_id], backref="reviews_given")
    doctor = db.relationship("User", foreign_keys=[doctor_id], backref="reviews_received")

    def to_dict(self):
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.full_name if self.patient else "Anonymous",
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.full_name if self.doctor else "N/A",
            "rating": self.rating,
            "review_text": self.review_text,
            "sentiment": self.sentiment,
            "is_hidden": self.is_hidden,
            "is_flagged": self.is_flagged,
            "created_at": self.created_at.isoformat() + 'Z'
        }

# =========================================
# REVIEW MODERATION LOGS
# =========================================
class ReviewModerationLog(db.Model):
    __tablename__ = "review_moderation_logs"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("reviews.id"), nullable=False)
    action = db.Column(db.String(50), nullable=False) # hidden, escalated, approved, removed
    performed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    note = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# =========================================
# REVIEW TAGS (Institutional Triage)
# =========================================
class ReviewTag(db.Model):
    __tablename__ = "review_tags"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("reviews.id"), nullable=False)
    tag = db.Column(db.String(50), nullable=False) # Rude, Late, Misdiagnosis etc.

# =========================================
# REVIEW ESCALATIONS (Governance Control)
# =========================================
class ReviewEscalation(db.Model):
    __tablename__ = "review_escalations"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("reviews.id"), nullable=False)
    escalated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="open") # open, investigating, resolved, closed
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
# =========================================
# SECURITY ACTIVITY LOGS
# =========================================
class SecurityActivity(db.Model):
    __tablename__ = "security_activity"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    
    event_type = db.Column(db.String(100), nullable=False) # password_change, login_success, login_failed
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="security_activities")

    def to_dict(self):
        return {
            "id": self.id,
            "event_type": self.event_type,
            "description": self.description,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() + 'Z'
        }

class PatientAuditLog(db.Model):
    __tablename__ = "patient_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    action_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    audit_metadata = db.Column(db.JSON)   # 👈 FIXED HERE

    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PatientFlag(db.Model):
    __tablename__ = "patient_flags"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    category = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default="medium")

    is_resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    resolution_note = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PatientStatusLog(db.Model):
    __tablename__ = "patient_status_logs"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    previous_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =========================================
# DOCTOR STATUS LOG
# =========================================
class DoctorStatusLog(db.Model):
    __tablename__ = "doctor_status_logs"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    previous_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# =========================================
# DOCTOR AUDIT LOG
# =========================================
class DoctorAuditLog(db.Model):
    __tablename__ = "doctor_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    action_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    audit_metadata = db.Column(db.JSON)

    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
