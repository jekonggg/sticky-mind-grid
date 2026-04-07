from flask import Blueprint, request, jsonify
from app.services.board_service import BoardService

bp = Blueprint('board_routes', __name__, url_prefix='/api/boards')

@bp.route('', methods=['GET'])
def get_boards():
    boards = BoardService.get_all_boards()
    return jsonify([board.to_dict() for board in boards]), 200

@bp.route('/<board_id>', methods=['GET'])
def get_board(board_id):
    board = BoardService.get_board_by_id(board_id)
    if not board:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify(board.to_dict()), 200

@bp.route('', methods=['POST'])
def create_board():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Board name is required'}), 400
    
    board = BoardService.create_board(data)
    return jsonify(board.to_dict()), 201

@bp.route('/<board_id>', methods=['PATCH', 'PUT'])
def update_board(board_id):
    data = request.json
    board = BoardService.update_board(board_id, data)
    if not board:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify(board.to_dict()), 200

@bp.route('/<board_id>', methods=['DELETE'])
def delete_board(board_id):
    success = BoardService.delete_board(board_id)
    if not success:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify({'message': 'Board deleted successfully'}), 200
