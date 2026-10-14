from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.scratchpad_service import ScratchpadService

bp = Blueprint('scratchpad_routes', __name__, url_prefix='/api')

@bp.route('/scratchpads', methods=['GET'])
@jwt_required()
def get_scratchpads():
    user_id = get_jwt_identity()
    notes = ScratchpadService.get_user_notes(user_id)
    return jsonify([n.to_dict() for n in notes]), 200

@bp.route('/scratchpads', methods=['POST'])
@jwt_required()
def create_scratchpad():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    note, error = ScratchpadService.create_note(user_id, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(note.to_dict()), 201

@bp.route('/scratchpads/<note_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_scratchpad(note_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    note, error = ScratchpadService.update_note(note_id, user_id, data)
    if error:
        status_code = 404 if 'not found' in error.lower() else 403
        return jsonify({'error': error}), status_code
    return jsonify(note.to_dict()), 200

@bp.route('/scratchpads/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_scratchpad(note_id):
    user_id = get_jwt_identity()
    success, error = ScratchpadService.delete_note(note_id, user_id)
    if not success:
        status_code = 404 if 'not found' in error.lower() else 403
        return jsonify({'error': error}), status_code
    return jsonify({'message': 'Scratchpad note deleted successfully'}), 200
