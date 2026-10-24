from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.utils.presence import presence

bp = Blueprint('presence_routes', __name__, url_prefix='/api/presence')


@bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    """Record that the authenticated user's client is still active."""
    user_id = get_jwt_identity()
    presence.touch(user_id)
    return jsonify({'isOnline': True}), 200


@bp.route('/offline', methods=['POST'])
@jwt_required()
def mark_offline():
    """Immediately mark the authenticated user as offline on explicit logout."""
    user_id = get_jwt_identity()
    presence.mark_offline(user_id)
    return jsonify({'isOnline': False}), 200
