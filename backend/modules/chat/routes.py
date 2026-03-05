from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from database.models import db, User, Appointment, PatientProfile
from models.chat_models import Conversation, Participant, Message, to_utc_iso
from sqlalchemy import and_, or_, desc
from flask_jwt_extended import get_jwt

# ... (rest of imports)

chat_bp = Blueprint("chat", __name__)

# =======================================================
# 0. UPLOAD FILE
# =======================================================
@chat_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        # Create unique filename
        import time
        filename = f"{int(time.time())}_{filename}"
        
        upload_folder = os.path.join(current_app.root_path, 'uploads/chat')
        os.makedirs(upload_folder, exist_ok=True)
        
        file.save(os.path.join(upload_folder, filename))
        
        # Return URL
        return jsonify({"url": f"/api/chat/uploads/{filename}"}), 201

@chat_bp.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(os.path.join(current_app.root_path, 'uploads/chat'), filename)

# =======================================================
# 1. GET ALL CONVERSATIONS FOR USER
# =======================================================
@chat_bp.route("/", methods=["GET"])
@jwt_required()
def get_conversations():
    current_user_id = int(get_jwt_identity())
    
    # query participants where user_id matches
    # This is a bit complex in SQL.
    # Join Participant -> Conversation
    # And also fetch the OTHER participant
    
    user_participations = Participant.query.filter_by(user_id=current_user_id).all()
    
    results = []
    for p in user_participations:
        conv = Conversation.query.get(p.conversation_id)
        if not conv: continue
        
        # Find other participant
        other_participant = Participant.query.filter(
            Participant.conversation_id == conv.id,
            Participant.user_id != current_user_id
        ).first()
        
        last_message = conv.messages.order_by(Message.created_at.desc()).first()
        
        # Calculate unread count (messages where current user is NOT the sender and is_read is false)
        unread_count = Message.query.filter_by(
            conversation_id=conv.id, 
            is_read=False
        ).filter(Message.sender_id != current_user_id).count()
        
        results.append({
            "id": conv.id,
            "other_user": {
                "id": other_participant.user.id if other_participant else None,
                "name": other_participant.user.full_name if other_participant and other_participant.user else "Unknown",
                "email": other_participant.user.email if other_participant and other_participant.user else "",
                "role": other_participant.user.role if other_participant and other_participant.user else "patient",
                "profile_image": other_participant.user.patient_profile.profile_image if other_participant and other_participant.user and other_participant.user.patient_profile else None
            },
            "last_message": {
                "content": last_message.content,
                "created_at": to_utc_iso(last_message.created_at),
                "is_read": last_message.is_read,
                "sender_id": last_message.sender_id,
                "type": getattr(last_message, 'type', 'text')
            } if last_message else None,
            "unread_count": unread_count
        })
        
    # Sort by last message date
    results.sort(key=lambda x: x['last_message']['created_at'] or "", reverse=True)
    
    return jsonify(results), 200

# =======================================================
# 2. START OR GET CONVERSATION WITH USER
# =======================================================
@chat_bp.route("/", methods=["POST"])
@jwt_required()
def start_conversation():
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    target_user_id = data.get("target_user_id") # ID of doctor/patient
    
    if not target_user_id:
        return jsonify({"error": "Target user ID required"}), 400
        
    if str(target_user_id) == str(current_user_id):
        return jsonify({"error": "Cannot chat with self"}), 400
    target_user_id = int(target_user_id)

    # Check if conversation already exists
    # Find conversation where BOTH are participants
    # SQL: Select c.id from conversations c join participants p1 on c.id=p1.conv_id join participants p2 on c.id=p2.conv_id where p1.user=me and p2.user=target
    
    # Simplistic approach: intersection of conversation IDs
    my_convs = [p.conversation_id for p in Participant.query.filter_by(user_id=current_user_id).all()]
    their_convs = [p.conversation_id for p in Participant.query.filter_by(user_id=target_user_id).all()]
    
    common = set(my_convs).intersection(set(their_convs))
    
    if common:
        conv_id = list(common)[0] # direct chat should be unique ?
        # Verify type is direct
        conv = Conversation.query.get(conv_id)
        if conv:
             return jsonify({"message": "Conversation exists", "conversation_id": conv.id}), 200

    # Create new
    new_conv = Conversation(type="direct")
    db.session.add(new_conv)
    db.session.flush()
    
    p1 = Participant(conversation_id=new_conv.id, user_id=current_user_id)
    p2 = Participant(conversation_id=new_conv.id, user_id=target_user_id)
    
    db.session.add(p1)
    db.session.add(p2)
    db.session.commit()
    
    return jsonify({"message": "Conversation created", "conversation_id": new_conv.id}), 201

# =======================================================
# 3. GET MESSAGES
# =======================================================
@chat_bp.route("/<int:conversation_id>/messages", methods=["GET"])
@jwt_required()
def get_messages(conversation_id):
    current_user_id = int(get_jwt_identity())
    
    # Verify participation
    part = Participant.query.filter_by(conversation_id=conversation_id, user_id=current_user_id).first()
    if not part:
        return jsonify({"error": "Access denied"}), 403
        
    messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.asc()).all()
    
    return jsonify([m.to_dict() for m in messages]), 200

# =======================================================
# 4. SEND MESSAGE (HTTP Fallback)
# =======================================================
@chat_bp.route("/<int:conversation_id>/messages", methods=["POST"])
@jwt_required()
def send_message_http(conversation_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get("content")
    msg_type = data.get("type", "text")
    
    # Verify participation
    part = Participant.query.filter_by(conversation_id=conversation_id, user_id=current_user_id).first()
    if not part:
        return jsonify({"error": "Access denied"}), 403
        
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user_id,
        content=content,
        type=msg_type
    )
    db.session.add(msg)
    db.session.commit()
    
    # Broadcast to socket room for real-time
    from extensions.socket import socketio
    socketio.emit('new_message', msg.to_dict(), room=f"conversation_{conversation_id}")
    
    return jsonify(msg.to_dict()), 201

# =======================================================
# 5. MARK AS READ
# =======================================================
@chat_bp.route("/<int:conversation_id>/read", methods=["PATCH"])
@jwt_required()
def mark_as_read(conversation_id):
    current_user_id = int(get_jwt_identity())

    part = Participant.query.filter_by(conversation_id=conversation_id, user_id=current_user_id).first()
    if not part:
        return jsonify({"error": "Access denied"}), 403
    
    # Mark messages as read where current user is NOT the sender
    Message.query.filter_by(conversation_id=conversation_id, is_read=False).filter(
        Message.sender_id != current_user_id
    ).update({"is_read": True}, synchronize_session=False)
    
    db.session.commit()
    return jsonify({"message": "Conversation marked as read"}), 200

# =======================================================
# 6. DOCTOR: GET PATIENT CONTEXT
# =======================================================
@chat_bp.route("/patient-context/<int:patient_id>", methods=["GET"])
@jwt_required()
def get_patient_context(patient_id):
    claims = get_jwt()
    if claims.get("role") != "doctor":
        return jsonify({"error": "Doctor access only"}), 403
        
    current_user_id = int(get_jwt_identity())
    
    # Get patient identity
    patient = User.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
        
    profile = patient.patient_profile
    
    # Find next appointment
    from datetime import datetime
    now = datetime.now()
    
    next_apt = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.patient_id == patient_id,
        Appointment.appointment_date >= now.date(),
        Appointment.status == "approved"
    ).order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).first()
    
    last_apt = Appointment.query.filter(
        Appointment.doctor_id == current_user_id,
        Appointment.patient_id == patient_id,
        # Logic for last: date < today OR (date == today and time < now)
        Appointment.appointment_date <= now.date(),
        Appointment.status == "completed"
    ).order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).first()
    
    return jsonify({
        "identity": {
            "full_name": patient.full_name,
            "email": patient.email,
            "profile_image": profile.profile_image if profile else None,
            "gender": profile.gender if profile else "N/A",
            "blood_group": profile.blood_group if profile else "N/A",
            "dob": str(profile.date_of_birth) if profile and profile.date_of_birth else "N/A",
            "allergies": profile.allergies if profile else "None reported",
            "chronic_conditions": profile.chronic_conditions if profile else "None reported",
            "height": profile.height_cm if profile else "N/A",
            "weight": profile.weight_kg if profile else "N/A",
            "location": f"{profile.city}, {profile.country}" if profile and profile.city else "N/A"
        },
        "next_appointment": {
            "date": str(next_apt.appointment_date),
            "time": str(next_apt.appointment_time),
            "reason": next_apt.reason
        } if next_apt else None,
        "last_appointment": {
            "date": str(last_apt.appointment_date),
            "time": str(last_apt.appointment_time),
            "status": last_apt.status
        } if last_apt else None
    }), 200
