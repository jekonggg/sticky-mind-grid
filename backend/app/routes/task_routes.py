from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.task_service import TaskService
from app.utils.decorators import require_task_access
from app.models.board_member import BoardMember

bp = Blueprint('task_routes', __name__, url_prefix='/api/tasks')

@bp.route('', methods=['GET'])
@jwt_required()
def get_tasks():
    board_id = request.args.get('boardId')
    user_id = get_jwt_identity()
    
    if board_id:
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return jsonify({'error': 'Unauthorized to view tasks for this board'}), 403
            
    tasks = TaskService.get_tasks(board_id)
    return jsonify([task.to_dict() for task in tasks]), 200

@bp.route('/<task_id>', methods=['GET'])
@jwt_required()
@require_task_access('viewer')
def get_task(task_id):
    task = TaskService.get_task_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    data = request.json
    user_id = get_jwt_identity()
    board_id = data.get('boardId')
    
    if not data or not board_id or not data.get('title'):
        return jsonify({'error': 'boardId and title are required'}), 400
        
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    # Require at least 'member' role to create task
    if not membership or membership.role in ['viewer']:
        return jsonify({'error': 'You do not have permission to create tasks on this board'}), 403
    
    # Optionally inject created_by
    data['createdBy'] = user_id
    task = TaskService.create_task(data)
    return jsonify(task.to_dict()), 201

@bp.route('/<task_id>', methods=['PATCH', 'PUT'])
@jwt_required()
@require_task_access('member')
def update_task(task_id):
    data = request.json
    task = TaskService.update_task(task_id, data)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
@require_task_access('member') # Only members or above can delete tasks
def delete_task(task_id):
    success = TaskService.delete_task(task_id)
    if not success:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task deleted successfully'}), 200
