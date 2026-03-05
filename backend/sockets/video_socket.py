from flask import request
from flask_socketio import emit, join_room, leave_room
import logging

def register_video_events(socketio):
    def _room_participants(room):
        members = socketio.server.manager.rooms.get("/", {}).get(room, set())
        return sorted(list(members))

    def _emit_room_state(room):
        participants = _room_participants(room)
        emit(
            "video_room_state",
            {"room": room, "participants": participants, "count": len(participants)},
            room=room,
        )

    @socketio.on("join_video_room")
    def handle_join(data):
        room = data.get("room")
        if not room:
            return
        join_room(room)
        participants = _room_participants(room)
        if len(participants) > 2:
            leave_room(room)
            emit("room_full", {"room": room}, room=request.sid)
            print(f"[VideoSocket] Room full, rejected sid {request.sid} for room: {room}")
            return

        print(f"[VideoSocket] User joined room: {room} as sid {request.sid}")
        emit("user_joined", {"room": room, "sid": request.sid}, room=room, include_self=False)

        peers = [sid for sid in participants if sid != request.sid]
        peer_sid = peers[0] if peers else None
        # Joining user gets explicit peer and polite role.
        emit(
            "video_peer",
            {"room": room, "peerSid": peer_sid, "isPolite": bool(peer_sid), "shouldOffer": False},
            room=request.sid,
        )
        # Existing peer is the offerer.
        if peer_sid:
            emit(
                "video_peer",
                {"room": room, "peerSid": request.sid, "isPolite": False, "shouldOffer": True},
                room=peer_sid,
            )
        _emit_room_state(room)

    @socketio.on("webrtc_offer")
    def handle_offer(data):
        room = data.get("room")
        target_sid = data.get("to")
        payload = {**data, "from": request.sid}
        print(f"[VideoSocket] webrtc_offer received for room: {room}, to: {target_sid}")
        if target_sid:
            emit("webrtc_offer", payload, room=target_sid)
        else:
            emit("webrtc_offer", payload, room=room, include_self=False)

    @socketio.on("webrtc_answer")
    def handle_answer(data):
        room = data.get("room")
        target_sid = data.get("to")
        payload = {**data, "from": request.sid}
        print(f"[VideoSocket] webrtc_answer received for room: {room}, to: {target_sid}")
        if target_sid:
            emit("webrtc_answer", payload, room=target_sid)
        else:
            emit("webrtc_answer", payload, room=room, include_self=False)

    @socketio.on("ice_candidate")
    def handle_ice(data):
        room = data.get("room")
        target_sid = data.get("to")
        payload = {**data, "from": request.sid}
        if target_sid:
            emit("ice_candidate", payload, room=target_sid)
        else:
            emit("ice_candidate", payload, room=room, include_self=False)
        
    @socketio.on("leave_video_room")
    def handle_leave(data):
        room = data.get("room")
        if not room:
            return
        leave_room(room)
        print(f"[VideoSocket] User left room: {room}")
        emit("user_left", {"room": room, "sid": request.sid}, room=room, include_self=False)
        _emit_room_state(room)
