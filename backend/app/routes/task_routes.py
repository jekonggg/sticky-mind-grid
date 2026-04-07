from flask import Blueprint, request, jsonify
from app.services.task_service import TaskService

bp = Blueprint('task_routes', __name__, url_prefix='/api/tasks')

@bp.route('', methods=['GET'])
def get_tasks():
    board_id = request.args.get('boardId')
    tasks = TaskService.get_tasks(board_id)
    return jsonify([task.to_dict() for task in tasks]), 200

@bp.route('/<task_id>', methods=['GET'])
def get_task(task_id):
    task = TaskService.get_task_by_id(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('', methods=['POST'])
def create_task():
    data = request.json
    if not data or not data.get('boardId') or not data.get('title'):
        return jsonify({'error': 'boardId and title are required'}), 400
    
    task = TaskService.create_task(data)
    return jsonify(task.to_dict()), 201

@bp.route('/<task_id>', methods=['PATCH', 'PUT'])
def update_task(task_id):
    data = request.json
    task = TaskService.update_task(task_id, data)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    success = TaskService.delete_task(task_id)
    if not success:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task deleted successfully'}), 200
