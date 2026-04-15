from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.board_service import BoardService
from app.utils.decorators import require_board_access

bp = Blueprint('board_routes', __name__, url_prefix='/api/boards')

@bp.route('', methods=['GET'])
@jwt_required()
def get_boards():
    user_id = get_jwt_identity()
    boards = BoardService.get_user_boards(user_id)
    return jsonify([board.to_dict() for board in boards]), 200

@bp.route('/<board_id>', methods=['GET'])
@jwt_required()
@require_board_access('viewer')
def get_board(board_id):
    board = BoardService.get_board_by_id(board_id)
    if not board:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify(board.to_dict()), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_board():
    data = request.json
    user_id = get_jwt_identity()
    if not data or not data.get('name'):
        return jsonify({'error': 'Board name is required'}), 400
    
    board = BoardService.create_board(data, owner_id=user_id)
    return jsonify(board.to_dict()), 201

@bp.route('/<board_id>', methods=['PATCH', 'PUT'])
@jwt_required()
@require_board_access('admin')
def update_board(board_id):
    data = request.json
    board = BoardService.update_board(board_id, data)
    if not board:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify(board.to_dict()), 200

@bp.route('/<board_id>', methods=['DELETE'])
@jwt_required()
@require_board_access('owner')
def delete_board(board_id):
    success = BoardService.delete_board(board_id)
    if not success:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify({'message': 'Board deleted successfully'}), 200

@bp.route('/<board_id>/members', methods=['GET'])
@jwt_required()
@require_board_access('viewer')
def get_members(board_id):
    members = BoardService.get_board_members(board_id)
    return jsonify([member.to_dict() for member in members]), 200

@bp.route('/<board_id>/members', methods=['POST'])
@jwt_required()
@require_board_access('admin')
def add_member(board_id):
    data = request.json
    email = data.get('email')
    role = data.get('role', 'member')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    member, error = BoardService.add_member(board_id, email, role)
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify(member.to_dict()), 201

@bp.route('/<board_id>/members/<user_id>', methods=['DELETE'])
@jwt_required()
@require_board_access('admin')
def remove_member(board_id, user_id):
    success = BoardService.remove_member(board_id, user_id)
    if not success:
        return jsonify({'error': 'Could not remove member. Cannot remove sole owner.'}), 400
    return jsonify({'message': 'Member removed'}), 200
