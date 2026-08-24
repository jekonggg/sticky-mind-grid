from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.note_service import NoteService
from app.utils.decorators import require_board_access

bp = Blueprint('note_routes', __name__, url_prefix='/api')

@bp.route('/boards/<board_id>/notes', methods=['GET'])
@jwt_required()
@require_board_access('viewer')
def get_notes(board_id):
    notes = NoteService.get_board_notes(board_id)
    return jsonify([n.to_dict() for n in notes]), 200

@bp.route('/boards/<board_id>/notes', methods=['POST'])
@jwt_required()
@require_board_access('member')
def create_note(board_id):
    data = request.json
    user_id = get_jwt_identity()
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    note, error = NoteService.create_note(board_id, user_id, data)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(note.to_dict()), 201

@bp.route('/notes/<note_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_note(note_id):
    data = request.json
    user_id = get_jwt_identity()
    if not data:
        return jsonify({'error': 'Data is required'}), 400

    note, error = NoteService.update_note(note_id, user_id, data)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(note.to_dict()), 200

@bp.route('/notes/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    user_id = get_jwt_identity()
    success, error = NoteService.delete_note(note_id, user_id)
    if not success:
        return jsonify({'error': error or 'Failed to delete note'}), 403

    return jsonify({'message': 'Note deleted successfully'}), 200
