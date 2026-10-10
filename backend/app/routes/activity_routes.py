from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.activity_service import ActivityService
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

bp = Blueprint('activity_routes', __name__, url_prefix='/api/activities')

@bp.route('', methods=['GET'])
@jwt_required()
def get_activities():
    board_id = request.args.get('boardId')
    task_title = request.args.get('taskTitle')
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)

    if not board_id or board_id == 'all':
        activities = ActivityService.get_user_activities(user_id, limit)
        return jsonify([activity.to_dict() for activity in activities]), 200

    effective_role = get_effective_role(board_id, user_id)
    if effective_role < ROLE_HIERARCHY['viewer']:
        return jsonify({'error': 'Unauthorized to view activities for this board'}), 403

    # Viewing the full board activity log requires Admin or Owner.
    # Viewing a card's history (taskTitle provided) is allowed for all board roles (Viewer+).
    if not task_title and effective_role < ROLE_HIERARCHY['admin']:
        return jsonify({'error': 'Only board admins and owners can view the full board activity log'}), 403

    activities = ActivityService.get_activities(board_id, limit, task_title=task_title)
    return jsonify([activity.to_dict() for activity in activities]), 200

@bp.route('', methods=['POST'])
@jwt_required()
def add_activity():
    data = request.json
    user_id = get_jwt_identity()
    if not data or not data.get('type') or not data.get('message'):
        return jsonify({'error': 'type and message are required'}), 400
    
    board_id = data.get('boardId')
    if board_id:
        if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['viewer']:
            return jsonify({'error': 'Unauthorized to post activities on this board'}), 403

    # Inject user_id from token
    data['userId'] = user_id
    activity = ActivityService.add_activity(data)
    return jsonify(activity.to_dict()), 201

@bp.route('', methods=['DELETE'])
@jwt_required()
def clear_history():
    return jsonify({'error': 'Activity log entries are immutable and cannot be edited or deleted'}), 403

