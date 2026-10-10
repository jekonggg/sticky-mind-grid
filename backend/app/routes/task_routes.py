from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.task_service import TaskService
from app.utils.decorators import require_task_access, get_effective_role, ROLE_HIERARCHY
from app.models.task import Task
from app.models.board import Board

from app import db

bp = Blueprint('task_routes', __name__, url_prefix='/api')

@bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    board_id = request.args.get('boardId')
    user_id = get_jwt_identity()
    assigned_only = request.args.get('assignedToMe', 'false').lower() == 'true'
    
    if not board_id or board_id == 'all':
        tasks = TaskService.get_user_tasks(user_id, assigned_to_me=assigned_only)
        return jsonify([task.to_dict() for task in tasks]), 200

    if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['viewer']:
        return jsonify({'error': 'Unauthorized to view tasks for this board'}), 403

    tasks = TaskService.get_tasks(board_id)
    return jsonify([task.to_dict() for task in tasks]), 200

@bp.route('/boards/<board_id>/trash', methods=['GET'])
@jwt_required()
def get_trash(board_id):
    user_id = get_jwt_identity()
    if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['editor']:
        return jsonify({'error': 'Unauthorized to view trash for this board'}), 403

    deleted_tasks = TaskService.get_deleted_tasks(board_id)
    return jsonify([task.to_dict() for task in deleted_tasks]), 200

@bp.route('/boards/<board_id>/trash', methods=['DELETE'])
@jwt_required()
def empty_trash(board_id):
    user_id = get_jwt_identity()
    if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['admin']:
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
    user_id = str(get_jwt_identity())
    board_id = data.get('boardId') if data else None
    
    if not data or not board_id or not data.get('title'):
        return jsonify({'error': 'boardId and title are required'}), 400

    # Require at least 'editor' role (accepted membership or owner) to create tasks
    if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['editor']:
        return jsonify({'error': 'You do not have permission to create tasks on this board'}), 403

    assignee_id = data.get('assignedTo') or data.get('assigneeId')
    if assignee_id and assignee_id != 'unassigned':
        assignee_level = get_effective_role(board_id, assignee_id)
        if assignee_level < ROLE_HIERARCHY['editor']:
            return jsonify({'error': 'Cards can only be assigned to members with Editor role or above'}), 400
    
    try:
        task = TaskService.create_task(data, user_id=user_id)
        return jsonify(task.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/tasks/reorder', methods=['PATCH'])
@jwt_required()
def reorder_tasks():
    data = request.json
    user_id = str(get_jwt_identity())
    board_id = data.get('boardId') if data else None
    items = data.get('items') if data else None
    
    if not data or not board_id or not isinstance(items, list):
        return jsonify({'error': 'boardId and items array are required'}), 400

    if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['editor']:
        return jsonify({'error': 'You do not have permission to reorder tasks on this board'}), 403

    try:
        updated_tasks = TaskService.reorder_tasks(board_id, items, user_id=user_id)
        return jsonify([t.to_dict() for t in updated_tasks]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/tasks/<task_id>', methods=['PATCH', 'PUT'])
@jwt_required()
@require_task_access('editor')
def update_task(task_id):
    data = request.json
    user_id = get_jwt_identity()

    # Guard against cross-board hijack: moving a task into another board
    # requires write access on the target board as well.
    target_board_id = data.get('boardId') if data else None
    if target_board_id:
        task = TaskService.get_task_by_id(task_id)
        if task and str(target_board_id) != str(task.board_id):
            if get_effective_role(target_board_id, user_id) < ROLE_HIERARCHY['editor']:
                return jsonify({'error': 'You do not have permission to move tasks to the target board'}), 403
            target_board_obj = db.session.get(Board, target_board_id)
            if target_board_obj and target_board_obj.columns:
                target_cols = [c['id'] for c in target_board_obj.columns]
                if data.get('status') not in target_cols:
                    data['status'] = target_cols[0]

            # Tenancy rule: Remove assignees who are not members/editors of the target board
            candidate_assignee = data.get('assignedTo') if 'assignedTo' in data else task.assigned_to
            if candidate_assignee and candidate_assignee != 'unassigned':
                assignee_role = get_effective_role(target_board_id, candidate_assignee)
                if assignee_role < ROLE_HIERARCHY['editor']:
                    data['assignedTo'] = 'unassigned'

    assignee_id = data.get('assignedTo') or data.get('assigneeId')
    if assignee_id and assignee_id != 'unassigned':
        task = TaskService.get_task_by_id(task_id)
        if task:
            target_board = data.get('boardId') or task.board_id
            assignee_level = get_effective_role(target_board, assignee_id)
            if assignee_level < ROLE_HIERARCHY['editor']:
                return jsonify({'error': 'Cards can only be assigned to members with Editor role or above'}), 400

    task = TaskService.update_task(task_id, data, user_id=user_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict()), 200

@bp.route('/tasks/<task_id>', methods=['DELETE'])
@jwt_required()
@require_task_access('editor')
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
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    membership_level = get_effective_role(task.board_id, user_id)
    if membership_level < ROLE_HIERARCHY['editor']:
        return jsonify({'error': 'Unauthorized to restore task'}), 403

    restored_task, error = TaskService.restore_task(task_id, user_id=user_id)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(restored_task.to_dict()), 200

@bp.route('/tasks/<task_id>/permanent', methods=['DELETE'])
@jwt_required()
def permanent_delete_task(task_id):
    user_id = get_jwt_identity()
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    if get_effective_role(task.board_id, user_id) < ROLE_HIERARCHY['admin']:
        return jsonify({'error': 'Only admins or owners can permanently delete tasks'}), 403

    success, error = TaskService.permanent_delete_task(task_id, user_id=user_id)
    if not success:
        return jsonify({'error': error or 'Failed to permanently delete task'}), 400

    return jsonify({'message': 'Task permanently deleted'}), 200
