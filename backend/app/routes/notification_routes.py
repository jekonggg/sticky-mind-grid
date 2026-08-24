from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.notification import Notification

bp = Blueprint('notification_routes', __name__, url_prefix='/api/notifications')

@bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 30, type=int)

    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(limit).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unreadCount': unread_count
    }), 200

@bp.route('/<notification_id>/read', methods=['PATCH', 'PUT'])
@jwt_required()
def mark_as_read(notification_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notif:
        return jsonify({'error': 'Notification not found'}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify(notif.to_dict()), 200

@bp.route('/read-all', methods=['PATCH', 'PUT'])
@jwt_required()
def mark_all_as_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'}), 200
