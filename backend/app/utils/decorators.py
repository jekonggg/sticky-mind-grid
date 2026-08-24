from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from app.models.board_member import BoardMember
from app.models.board import Board
from app.models.task import Task

ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'member': 2,
    'viewer': 1
}

def get_effective_role(board_id, user_id):
    """Return the numeric role level a user holds on a board.

    - Board owners get 'owner' level even without an accepted membership
      row (covers legacy boards created before memberships existed).
    - Only memberships with status == 'accepted' count; pending or
      declined invitees have no access.
    - Returns 0 when the user has no access at all.
    """
    user_id = str(user_id)
    board = Board.query.get(board_id)
    if board and board.owner_id and str(board.owner_id) == user_id:
        return ROLE_HIERARCHY['owner']

    membership = BoardMember.query.filter_by(
        board_id=board_id, user_id=user_id, status='accepted'
    ).first()
    if not membership:
        return 0

    return ROLE_HIERARCHY.get(membership.role, 0)

def require_board_access(minimum_role='viewer'):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = str(get_jwt_identity())
            board_id = kwargs.get('board_id') or kwargs.get('id')
            
            if not board_id:
                return jsonify({'error': 'Board ID is required in the path variables'}), 400
                
            board = Board.query.get(board_id)
            if not board:
                return jsonify({'error': 'Board not found'}), 404

            # If user is the board owner, grant access
            if board.owner_id and str(board.owner_id) == current_user_id:
                return fn(*args, **kwargs)
                
            membership = BoardMember.query.filter_by(board_id=board_id, user_id=current_user_id).first()
            
            if not membership or membership.status != 'accepted':
                return jsonify({'error': 'You do not have active access to this board'}), 403
                
            user_level = ROLE_HIERARCHY.get(membership.role, 0)
            required_level = ROLE_HIERARCHY.get(minimum_role, 0)
            
            if user_level < required_level:
                return jsonify({'error': f'Requires {minimum_role} privileges on this board'}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_task_access(minimum_role='viewer'):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = str(get_jwt_identity())
            task_id = kwargs.get('task_id')
            
            if not task_id:
                return jsonify({'error': 'Task ID is required'}), 400
                
            task = Task.query.get(task_id)
            if not task:
                return jsonify({'error': 'Task not found'}), 404
                
            # If user is the board owner, grant access
            if task.board and task.board.owner_id and str(task.board.owner_id) == current_user_id:
                return fn(*args, **kwargs)

            membership = BoardMember.query.filter_by(board_id=task.board_id, user_id=current_user_id).first()
            if not membership or membership.status != 'accepted':
                return jsonify({'error': 'You do not have access to this task'}), 403
                
            user_level = ROLE_HIERARCHY.get(membership.role, 0)
            required_level = ROLE_HIERARCHY.get(minimum_role, 0)
            
            if user_level < required_level:
                return jsonify({'error': f'Requires {minimum_role} privileges'}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

