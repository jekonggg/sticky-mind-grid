from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.task_service import TaskService
from app.utils.decorators import require_task_access
from app.models.board_member import BoardMember
from app.models.task import Task

bp = Blueprint('task_routes', __name__, url_prefix='/api')

@bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    board_id = request.args.get('boardId')
    user_id = get_jwt_identity()
    
    if not board_id:
        return jsonify({'error': 'boardId query parameter is required'}), 400

    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not membership:
        return jsonify({'error': 'Unauthorized to view tasks for this board'}), 403
            
    tasks = TaskService.get_tasks(board_id)
    return jsonify([task.to_dict() for task in tasks]), 200

@bp.route('/boards/<board_id>/trash', methods=['GET'])
@jwt_required()
def get_trash(board_id):
    user_id = get_jwt_identity()
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not membership:
        return jsonify({'error': 'Unauthorized to view trash for this board'}), 403

    deleted_tasks = TaskService.get_deleted_tasks(board_id)
    return jsonify([task.to_dict() for task in deleted_tasks]), 200

@bp.route('/boards/<board_id>/trash', methods=['DELETE'])
@jwt_required()
def empty_trash(board_id):
    user_id = get_jwt_identity()
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not membership or membership.role in ['viewer', 'member']:
        return jsonify({'error': 'Only board admins or owners can empty trash'}), 403

    count = TaskService.empty_trash(board_id, user_id=user_id)
    return jsonify({'message': f'Emptied trash with {count} tasks permanently deleted'}), 200

@bp.route('/tasks/<task_id>', methods=['GET'])
@jwt_required()
@require_task_access('viewer')
def get_task(task_id):
    task = TaskService.get_task_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('/tasks', methods=['POST'])
@jwt_required()
def create_task():
    data = request.json
    user_id = get_jwt_identity()
    board_id = data.get('boardId') if data else None
    
    if not data or not board_id or not data.get('title'):
        return jsonify({'error': 'boardId and title are required'}), 400
        
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    # Require at least 'member' role to create task
    if not membership or membership.role in ['viewer']:
        return jsonify({'error': 'You do not have permission to create tasks on this board'}), 403
    
    task = TaskService.create_task(data, user_id=user_id)
    return jsonify(task.to_dict()), 201

@bp.route('/tasks/reorder', methods=['PATCH'])
@jwt_required()
def reorder_tasks():
    data = request.json
    user_id = get_jwt_identity()
    board_id = data.get('boardId') if data else None
    items = data.get('items') if data else None
    
    if not data or not board_id or not isinstance(items, list):
        return jsonify({'error': 'boardId and items array are required'}), 400
        
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not membership or membership.role in ['viewer']:
        return jsonify({'error': 'You do not have permission to reorder tasks on this board'}), 403

    updated_tasks = TaskService.reorder_tasks(board_id, items, user_id=user_id)
    return jsonify([t.to_dict() for t in updated_tasks]), 200

@bp.route('/tasks/<task_id>', methods=['PATCH', 'PUT'])
@jwt_required()
@require_task_access('member')
def update_task(task_id):
    data = request.json
    user_id = get_jwt_identity()
    task = TaskService.update_task(task_id, data, user_id=user_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('/tasks/<task_id>', methods=['DELETE'])
@jwt_required()
@require_task_access('member')
def delete_task(task_id):
    user_id = get_jwt_identity()
    success = TaskService.delete_task(task_id, user_id=user_id)
    if not success:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task moved to trash'}), 200

@bp.route('/tasks/<task_id>/restore', methods=['PATCH', 'PUT'])
@jwt_required()
def restore_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    membership = BoardMember.query.filter_by(board_id=task.board_id, user_id=user_id).first()
    if not membership or membership.role in ['viewer']:
        return jsonify({'error': 'Unauthorized to restore task'}), 403

    restored_task, error = TaskService.restore_task(task_id, user_id=user_id)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(restored_task.to_dict()), 200

@bp.route('/tasks/<task_id>/permanent', methods=['DELETE'])
@jwt_required()
def permanent_delete_task(task_id):
    user_id = get_jwt_identity()
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    membership = BoardMember.query.filter_by(board_id=task.board_id, user_id=user_id).first()
    if not membership or membership.role in ['viewer', 'member']:
        return jsonify({'error': 'Only admins or owners can permanently delete tasks'}), 403

    success, error = TaskService.permanent_delete_task(task_id, user_id=user_id)
    if not success:
        return jsonify({'error': error or 'Failed to permanently delete task'}), 400

    return jsonify({'message': 'Task permanently deleted'}), 200
