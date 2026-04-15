from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from app.models.board_member import BoardMember
from app.models.task import Task

ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'member': 2,
    'viewer': 1
}

def require_board_access(minimum_role='viewer'):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            board_id = kwargs.get('board_id') or kwargs.get('id')
            
            if not board_id:
                return jsonify({'error': 'Board ID is required in the path variables'}), 400
                
            membership = BoardMember.query.filter_by(board_id=board_id, user_id=current_user_id).first()
            
            if not membership:
                return jsonify({'error': 'You do not have access to this board'}), 403
                
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
            current_user_id = get_jwt_identity()
            task_id = kwargs.get('task_id')
            
            if not task_id:
                return jsonify({'error': 'Task ID is required'}), 400
                
            task = Task.query.get(task_id)
            if not task:
                return jsonify({'error': 'Task not found'}), 404
                
            membership = BoardMember.query.filter_by(board_id=task.board_id, user_id=current_user_id).first()
            if not membership:
                return jsonify({'error': 'You do not have access to this task'}), 403
                
            user_level = ROLE_HIERARCHY.get(membership.role, 0)
            required_level = ROLE_HIERARCHY.get(minimum_role, 0)
            
            if user_level < required_level:
                return jsonify({'error': f'Requires {minimum_role} privileges'}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator
