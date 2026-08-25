from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app import db
from app.services.board_service import BoardService
from app.utils.decorators import require_board_access, get_effective_role, ROLE_HIERARCHY
from app.utils.event_broadcaster import broadcaster

bp = Blueprint('board_routes', __name__, url_prefix='/api/boards')

@bp.route('', methods=['GET'])
@jwt_required()
def get_boards():
    user_id = get_jwt_identity()
    boards = BoardService.get_user_boards(user_id)
    return jsonify([board.to_dict() for board in boards]), 200

@bp.route('/invitations', methods=['GET'])
@jwt_required()
def get_invitations():
    user_id = get_jwt_identity()
    invitations = BoardService.get_user_invitations(user_id)
    return jsonify(invitations), 200

@bp.route('/<board_id>/invitations/accept', methods=['POST', 'PATCH'])
@jwt_required()
def accept_invitation(board_id):
    user_id = get_jwt_identity()
    membership, error = BoardService.accept_invitation(board_id, user_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(membership.to_dict()), 200

@bp.route('/<board_id>/invitations/decline', methods=['POST', 'PATCH', 'DELETE'])
@jwt_required()
def decline_invitation(board_id):
    user_id = get_jwt_identity()
    success, error = BoardService.decline_invitation(board_id, user_id)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Invitation declined'}), 200

@bp.route('/<board_id>', methods=['GET'])
@jwt_required()
@require_board_access('viewer')
def get_board(board_id):
    board = BoardService.get_board_by_id(board_id)
    if not board:
        return jsonify({'error': 'Board not found'}), 404
    return jsonify(board.to_dict()), 200

@bp.route('/<board_id>/events', methods=['GET'])
def stream_board_events(board_id):
    """Server-Sent Events (SSE) stream for real-time board collaboration."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '') or request.args.get('token')
    if not token:
        return jsonify({'error': 'Authentication token is required'}), 401
    
    try:
        decoded = decode_token(token)
        user_id = decoded['sub']
    except Exception:
        return jsonify({'error': 'Invalid or expired token'}), 401

    board = BoardService.get_board_by_id(board_id)
    if not board:
        db.session.remove()
        return jsonify({'error': 'Board not found'}), 404

    effective_role = get_effective_role(board_id, user_id)
    # Release database connection back to the pool immediately so the long-lived SSE stream does not hold it
    db.session.remove()

    if effective_role < ROLE_HIERARCHY['viewer']:
        return jsonify({'error': 'Unauthorized to subscribe to events for this board'}), 403

    def event_stream():
        q = broadcaster.subscribe(board_id)
        yield f"data: {{\"type\":\"connected\",\"boardId\":\"{board_id}\"}}\n\n"
        try:
            while True:
                try:
                    msg = q.get(timeout=25.0)
                    yield msg
                except Exception:
                    # Keep-alive comment
                    yield ": ping\n\n"
        finally:
            broadcaster.unsubscribe(board_id, q)

    return Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

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
    user_id = get_jwt_identity()
    board = BoardService.update_board(board_id, data, user_id=user_id)
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
    user_id = get_jwt_identity()
    email = data.get('email') if data else None
    role = data.get('role', 'member') if data else 'member'
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    member, error = BoardService.add_member(board_id, email, role, actor_id=user_id)
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify(member.to_dict()), 201

@bp.route('/<board_id>/members/<user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(board_id, user_id):
    actor_id = str(get_jwt_identity())
    board = BoardService.get_board_by_id(board_id)
    if not board:
        return jsonify({'error': 'Board not found'}), 404

    is_self = actor_id == str(user_id)
    if not is_self:
        # Require admin or owner privileges to remove other members
        if get_effective_role(board_id, actor_id) < ROLE_HIERARCHY['admin']:
            return jsonify({'error': 'Requires admin privileges to remove other members'}), 403

    success, error = BoardService.remove_member(board_id, user_id, actor_id=actor_id)
    if not success:
        return jsonify({'error': error or 'Could not remove member'}), 400
    return jsonify({'message': 'Left board successfully' if is_self else 'Member removed'}), 200

@bp.route('/<board_id>/members/<user_id>', methods=['PATCH', 'PUT'])
@jwt_required()
@require_board_access('admin')
def update_member_role(board_id, user_id):
    data = request.json
    actor_id = get_jwt_identity()
    if not data or 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400
        
    role = data.get('role')
    member, error = BoardService.update_member_role(board_id, user_id, role, actor_id=actor_id)
    if error:
        return jsonify({'error': error}), 400
        
    return jsonify(member.to_dict()), 200
