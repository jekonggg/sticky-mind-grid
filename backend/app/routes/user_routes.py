from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json
from app import db
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.note import Note
from app.models.comment import Comment

bp = Blueprint('user_routes', __name__, url_prefix='/api/users')

@bp.route('/me/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    prefs = UserPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = UserPreference(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()

    return jsonify(prefs.to_dict()), 200

@bp.route('/me/preferences', methods=['PATCH', 'PUT'])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    prefs = UserPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = UserPreference(user_id=user_id)
        db.session.add(prefs)

    data = request.get_json() or {}

    if 'defaultBoardView' in data:
        valid_views = ['board', 'list', 'calendar', 'documents', 'overview']
        if data['defaultBoardView'] in valid_views:
            prefs.default_board_view = data['defaultBoardView']

    if 'timezone' in data and isinstance(data['timezone'], str):
        prefs.timezone = data['timezone'].strip()

    if 'dateFormat' in data and isinstance(data['dateFormat'], str):
        valid_formats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
        if data['dateFormat'] in valid_formats:
            prefs.date_format = data['dateFormat']

    if 'firstDayOfWeek' in data:
        try:
            val = int(data['firstDayOfWeek'])
            if val in (0, 1):
                prefs.first_day_of_week = val
        except (ValueError, TypeError):
            pass

    if 'notifyMentions' in data and isinstance(data['notifyMentions'], bool):
        prefs.notify_mentions = data['notifyMentions']

    if 'notifyAssignments' in data and isinstance(data['notifyAssignments'], bool):
        prefs.notify_assignments = data['notifyAssignments']

    if 'notifyInvites' in data and isinstance(data['notifyInvites'], bool):
        prefs.notify_invites = data['notifyInvites']

    if 'notifyComments' in data and isinstance(data['notifyComments'], bool):
        prefs.notify_comments = data['notifyComments']

    db.session.commit()
    return jsonify(prefs.to_dict()), 200

@bp.route('/me/export', methods=['GET'])
@jwt_required()
def export_user_data():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # 1. Fetch user owned boards and memberships
    owned_boards = Board.query.filter_by(owner_id=user_id).all()
    member_records = BoardMember.query.filter_by(user_id=user_id, status='accepted').all()
    member_board_ids = [m.board_id for m in member_records]
    all_board_ids = list(set([b.id for b in owned_boards] + member_board_ids))

    all_boards = Board.query.filter(Board.id.in_(all_board_ids)).all() if all_board_ids else []

    # 2. Fetch tasks in these boards
    tasks = Task.query.filter(Task.board_id.in_(all_board_ids), Task.is_deleted == False).all() if all_board_ids else []

    # 3. Fetch notes for these boards
    notes = Note.query.filter(Note.board_id.in_(all_board_ids)).all() if all_board_ids else []

    export_data = {
        'exportMetadata': {
            'exportedAt': datetime.utcnow().isoformat() + 'Z',
            'version': '1.0',
            'appName': 'Sticky Mind Grid'
        },
        'user': user.to_dict(),
        'preferences': user.preferences.to_dict() if user.preferences else None,
        'boards': [b.to_dict() for b in all_boards],
        'tasks': [t.to_dict() for t in tasks],
        'notes': [n.to_dict() for n in notes]
    }

    response_json = json.dumps(export_data, indent=2)
    return Response(
        response_json,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment;filename=sticky_mind_grid_export_{user_id[:8]}.json'}
    )
