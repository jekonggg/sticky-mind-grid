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


@bp.route('/vapid-public-key', methods=['GET'])
@jwt_required()
def get_vapid_public_key():
    from app.services.push_notification_service import PushNotificationService
    public_key = PushNotificationService.get_public_key()
    if not public_key:
        return jsonify({'error': 'Push notification service is not available'}), 503
    return jsonify({'publicKey': public_key}), 200


@bp.route('/push-subscriptions', methods=['POST'])
@jwt_required()
def register_push_subscription():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    subscription_info = data.get('subscription') or data
    user_agent = request.headers.get('User-Agent')

    from app.services.push_notification_service import PushNotificationService
    sub, error = PushNotificationService.save_subscription(user_id, subscription_info, user_agent=user_agent)
    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'message': 'Push subscription registered successfully',
        'subscription': sub.to_dict()
    }), 201


@bp.route('/push-subscriptions', methods=['DELETE'])
@jwt_required()
def unregister_push_subscription():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    endpoint = data.get('endpoint') or request.args.get('endpoint')

    if not endpoint:
        return jsonify({'error': 'Missing endpoint parameter'}), 400

    from app.services.push_notification_service import PushNotificationService
    success, error = PushNotificationService.remove_subscription(user_id, endpoint)
    if error:
        return jsonify({'error': error}), 404

    return jsonify({'message': 'Push subscription unregistered successfully'}), 200


@bp.route('/test-push', methods=['POST'])
@jwt_required()
def send_test_push():
    user_id = get_jwt_identity()
    from app.services.push_notification_service import PushNotificationService

    payload = {
        'id': 'test-push',
        'title': 'Sticky Mind Grid',
        'message': 'Push notifications are working perfectly on this device!',
        'link': '/settings',
        'type': 'system',
        'tag': 'test-push-verification'
    }

    count = PushNotificationService.send_push_notification(user_id, payload, async_dispatch=False)
    return jsonify({
        'message': 'Test push dispatched',
        'devicesNotified': count
    }), 200
