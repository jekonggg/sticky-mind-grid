from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.activity_service import ActivityService
from app.models.board_member import BoardMember
from app.models.board import Board

bp = Blueprint('activity_routes', __name__, url_prefix='/api/activities')

@bp.route('', methods=['GET'])
@jwt_required()
def get_activities():
    board_id = request.args.get('boardId')
    user_id = get_jwt_identity()

    if not board_id:
        return jsonify({'error': 'boardId query parameter is required'}), 400

    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not membership:
        # Check if user is the direct board owner
        board = Board.query.get(board_id)
        if not board or board.owner_id != user_id:
            return jsonify({'error': 'Unauthorized to view activities for this board'}), 403

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
    
    board_id = data.get('boardId')
    if board_id:
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        board = Board.query.get(board_id)
        is_owner = board and board.owner_id == user_id
        if not membership and not is_owner:
            return jsonify({'error': 'Unauthorized to post activities on this board'}), 403

    # Inject user_id from token
    data['userId'] = user_id
    activity = ActivityService.add_activity(data)
    return jsonify(activity.to_dict()), 201

@bp.route('', methods=['DELETE'])
@jwt_required()
def clear_history():
    board_id = request.args.get('boardId')
    user_id = get_jwt_identity()

    if not board_id:
        return jsonify({'error': 'boardId query parameter is required'}), 400

    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    board = Board.query.get(board_id)
    is_owner = (board and board.owner_id == user_id) or (membership and membership.role == 'owner')
    is_admin = is_owner or (membership and membership.role == 'admin')

    if not is_admin:
        return jsonify({'error': 'Only board admins or owners can clear activity history'}), 403

    ActivityService.clear_activities(board_id)
    return jsonify({'message': 'History cleared'}), 200
