from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.activity_service import ActivityService

bp = Blueprint('activity_routes', __name__, url_prefix='/api/activities')

@bp.route('', methods=['GET'])
@jwt_required()
def get_activities():
    board_id = request.args.get('boardId')
    limit = request.args.get('limit', 50, type=int)
    activities = ActivityService.get_activities(board_id, limit)
    return jsonify([activity.to_dict() for activity in activities]), 200

@bp.route('', methods=['POST'])
@jwt_required()
def add_activity():
    data = request.json
    user_id = get_jwt_identity()
    if not data or not data.get('type') or not data.get('message'):
        return jsonify({'error': 'type and message are required'}), 400
    
    # Inject user_id from token
    data['userId'] = user_id
    activity = ActivityService.add_activity(data)
    return jsonify(activity.to_dict()), 201

@bp.route('', methods=['DELETE'])
def clear_history():
    board_id = request.args.get('boardId')
    ActivityService.clear_activities(board_id)
    return jsonify({'message': 'History cleared'}), 200
