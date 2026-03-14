from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database.models import db
from datetime import datetime
from collections import deque

vitals_bp = Blueprint("vitals", __name__)

# ─── In-memory latest reading (for real-time display) ───────────
_latest = {
    "hr": None, "spo2": None, "temp": None,
    "signal": "na",
    "hr_alert": 0, "spo2_alert": 0, "temp_alert": 0,
    "ts": None
}
_history = deque(maxlen=60)  # last 60 valid readings


# =========================================
# ESP32 → POST /api/vitals/update
# No auth needed (device posts directly)
# =========================================
@vitals_bp.route("/api/vitals/update", methods=["POST"])
def receive_vitals():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data"}), 400

    _latest.update({
        "hr":         data.get("hr"),
        "spo2":       data.get("spo2"),
        "temp":       data.get("temp"),
        "signal":     data.get("signal", "na"),
        "hr_alert":   int(data.get("hr_alert", 0)),
        "spo2_alert": int(data.get("spo2_alert", 0)),
        "temp_alert": int(data.get("temp_alert", 0)),
        "ts":         datetime.utcnow().isoformat()
    })

    # Save to history only when signal is valid
    if data.get("signal") in ("ok", "weak"):
        _history.append({**_latest})

    # Optionally persist to DB (uncomment if you want DB storage)
    # try:
    #     reading = VitalReading(
    #         hr=data.get("hr"),
    #         spo2=data.get("spo2"),
    #         temp=data.get("temp"),
    #         signal=data.get("signal", "na"),
    #         hr_alert=bool(data.get("hr_alert")),
    #         spo2_alert=bool(data.get("spo2_alert")),
    #         temp_alert=bool(data.get("temp_alert")),
    #     )
    #     db.session.add(reading)
    #     db.session.commit()
    # except Exception as e:
    #     print(f"[VITALS DB] Warning: {e}")

    return jsonify({"status": "ok"}), 200


# =========================================
# Frontend → GET /api/vitals/latest
# Requires JWT (patient only)
# =========================================
@vitals_bp.route("/api/vitals/latest", methods=["GET"])
@jwt_required()
def get_latest():
    claims = get_jwt()
    if claims.get("role") not in ("patient", "doctor", "admin"):
        return jsonify({"message": "Access denied"}), 403
    return jsonify(_latest), 200


# =========================================
# Frontend → GET /api/vitals/history
# Requires JWT (patient only)
# =========================================
@vitals_bp.route("/api/vitals/history", methods=["GET"])
@jwt_required()
def get_history():
    claims = get_jwt()
    if claims.get("role") not in ("patient", "doctor", "admin"):
        return jsonify({"message": "Access denied"}), 403
    return jsonify(list(_history)), 200
