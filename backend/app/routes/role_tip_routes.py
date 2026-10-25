from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.role_tip_service import RoleTipService
from app.utils.decorators import require_board_access

bp = Blueprint('role_tip_routes', __name__, url_prefix='/api/boards')


@bp.route('/<board_id>/role-tips', methods=['GET'])
@jwt_required()
@require_board_access('viewer')
def get_role_tip(board_id):
    user_id = get_jwt_identity()
    state, error = RoleTipService.get_state(user_id, board_id)
    if error:
        return jsonify({'error': error}), 403 if 'access' in error else 404
    return jsonify(state), 200


@bp.route('/<board_id>/role-tips/seen', methods=['POST'])
@jwt_required()
@require_board_access('viewer')
def mark_role_tip_seen(board_id):
    user_id = get_jwt_identity()
    success, error = RoleTipService.mark_tip_seen(user_id, board_id)
    if not success:
        return jsonify({'error': error}), 404
    return jsonify({'message': 'Role tip marked as seen'}), 200


@bp.route('/<board_id>/role-tips/role-change/seen', methods=['POST'])
@jwt_required()
@require_board_access('viewer')
def mark_role_change_seen(board_id):
    user_id = get_jwt_identity()
    success, error = RoleTipService.mark_role_change_seen(user_id, board_id)
    if not success:
        return jsonify({'error': error}), 404
    return jsonify({'message': 'Role change notice marked as seen'}), 200
