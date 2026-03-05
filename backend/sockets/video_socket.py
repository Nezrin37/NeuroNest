from flask import request
from flask_socketio import emit, join_room, leave_room
import logging

def register_video_events(socketio):
    @socketio.on("join_video_room")
    def handle_join(data):
        room = data.get("room")
        if not room:
            return
        join_room(room)
        print(f"[VideoSocket] User joined room: {room}")
        participants = socketio.server.manager.rooms.get("/", {}).get(room, set())
        emit(
            "video_room_state",
            {"room": room, "participants": len(participants)},
            room=request.sid,
        )
        emit("user_joined", {"room": room, "sid": request.sid}, room=room, include_self=False)

    @socketio.on("webrtc_offer")
    def handle_offer(data):
        room = data.get("room")
        print(f"[VideoSocket] webrtc_offer received for room: {room}")
        emit("webrtc_offer", data, room=room, include_self=False)

    @socketio.on("webrtc_answer")
    def handle_answer(data):
        room = data.get("room")
        print(f"[VideoSocket] webrtc_answer received for room: {room}")
        emit("webrtc_answer", data, room=room, include_self=False)

    @socketio.on("ice_candidate")
    def handle_ice(data):
        room = data.get("room")
        # Too chatty to log ICE candidates
        emit("ice_candidate", data, room=room, include_self=False)
        
    @socketio.on("leave_video_room")
    def handle_leave(data):
        room = data.get("room")
        if not room:
            return
        leave_room(room)
        print(f"[VideoSocket] User left room: {room}")
        emit("user_left", {"room": room, "sid": request.sid}, room=room, include_self=False)
