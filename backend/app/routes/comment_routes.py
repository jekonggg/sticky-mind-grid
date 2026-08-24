from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.comment_service import CommentService
from app.utils.decorators import require_task_access

bp = Blueprint('comment_routes', __name__, url_prefix='/api')

@bp.route('/tasks/<task_id>/comments', methods=['GET'])
@jwt_required()
@require_task_access('viewer')
def get_comments(task_id):
    comments = CommentService.get_task_comments(task_id)
    return jsonify([c.to_dict() for c in comments]), 200

@bp.route('/tasks/<task_id>/comments', methods=['POST'])
@jwt_required()
@require_task_access('viewer') # Even viewers or members can participate in task discussions
def add_comment(task_id):
    data = request.json
    user_id = get_jwt_identity()
    content = data.get('content') if data else None

    if not content or not content.strip():
        return jsonify({'error': 'Comment content cannot be empty'}), 400

    comment, error = CommentService.create_comment(task_id, user_id, content.strip())
    if error:
        return jsonify({'error': error}), 400

    return jsonify(comment.to_dict()), 201

@bp.route('/comments/<comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    success, error = CommentService.delete_comment(comment_id, user_id)
    if not success:
        return jsonify({'error': error or 'Failed to delete comment'}), 403

    return jsonify({'message': 'Comment deleted successfully'}), 200
