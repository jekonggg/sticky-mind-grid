from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json
from app import db
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.board_invitation import BoardInvitation
from app.models.task import Task
from app.models.note import Note
from app.models.comment import Comment
from app.models.activity import Activity
from app.models.notification import Notification
from app.models.message import Conversation, ConversationParticipant, Message

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

    if 'notifyCardMoves' in data and isinstance(data['notifyCardMoves'], bool):
        prefs.notify_card_moves = data['notifyCardMoves']

    db.session.commit()
    return jsonify(prefs.to_dict()), 200

@bp.route('/me/export', methods=['GET'])
@jwt_required()
def export_user_data():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # 1. Fetch active and trashed boards
    owned_active_boards = Board.query.filter_by(owner_id=user_id, is_deleted=False).all()
    owned_trashed_boards = Board.query.filter_by(owner_id=user_id, is_deleted=True).all()

    # User's board memberships
    user_memberships = BoardMember.query.filter_by(user_id=user_id).all()
    accepted_member_board_ids = [m.board_id for m in user_memberships if m.status == 'accepted']
    all_active_board_ids = list(set([b.id for b in owned_active_boards] + accepted_member_board_ids))

    active_boards = Board.query.filter(Board.id.in_(all_active_board_ids), Board.is_deleted == False).all() if all_active_board_ids else []

    # 2. Fetch active tasks & trashed tasks
    active_tasks = Task.query.filter(Task.board_id.in_(all_active_board_ids), Task.is_deleted == False).all() if all_active_board_ids else []

    trashed_conditions = [Task.created_by == user_id]
    if all_active_board_ids:
        trashed_conditions.append(Task.board_id.in_(all_active_board_ids))
    trashed_tasks = Task.query.filter(Task.is_deleted == True, db.or_(*trashed_conditions)).all()

    # 3. Fetch comments (authored by user or on active tasks)
    active_task_ids = [t.id for t in active_tasks]
    comment_conditions = [Comment.user_id == user_id]
    if active_task_ids:
        comment_conditions.append(Comment.task_id.in_(active_task_ids))
    comments = Comment.query.filter(db.or_(*comment_conditions)).order_by(Comment.created_at.asc()).all()

    # 4. Fetch activity history (performed by user or on user's active boards)
    activity_conditions = [Activity.user_id == user_id]
    if all_active_board_ids:
        activity_conditions.append(Activity.board_id.in_(all_active_board_ids))
    activities = Activity.query.filter(db.or_(*activity_conditions)).order_by(Activity.timestamp.desc()).all()

    # 5. Fetch board invitations (sent by user or received by user's email)
    invitation_conditions = [BoardInvitation.inviter_id == user_id]
    if user.email:
        invitation_conditions.append(BoardInvitation.email == user.email.strip().lower())
    invitations = BoardInvitation.query.filter(db.or_(*invitation_conditions)).order_by(BoardInvitation.created_at.desc()).all()

    # 6. Fetch notifications
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()

    # 7. Fetch notes (board notes and user-authored notes)
    board_notes = Note.query.filter(Note.board_id.in_(all_active_board_ids)).all() if all_active_board_ids else []
    user_notes = Note.query.filter_by(user_id=user_id).all()
    notes_dict = {n.id: n for n in (board_notes + user_notes)}
    notes = list(notes_dict.values())

    # 8. Fetch conversations & messages
    participations = ConversationParticipant.query.filter_by(user_id=user_id).all()
    conv_ids = [p.conversation_id for p in participations]
    conversations = Conversation.query.filter(Conversation.id.in_(conv_ids)).all() if conv_ids else []
    messages = Message.query.filter(Message.conversation_id.in_(conv_ids)).order_by(Message.created_at.asc()).all() if conv_ids else []

    export_data = {
        'exportMetadata': {
            'exportedAt': datetime.utcnow().isoformat() + 'Z',
            'version': '2.0',
            'appName': 'Sticky Mind Grid'
        },
        'user': user.to_dict(),
        'preferences': user.preferences.to_dict() if user.preferences else None,
        'boards': [b.to_dict() for b in active_boards],
        'memberships': [m.to_dict() for m in user_memberships],
        'tasks': [t.to_dict() for t in active_tasks],
        'comments': [c.to_dict() for c in comments],
        'activities': [a.to_dict() for a in activities],
        'invitations': [inv.to_dict() for inv in invitations],
        'notifications': [n.to_dict() for n in notifications],
        'notes': [n.to_dict() for n in notes],
        'scratchpads': [s.to_dict() for s in user.scratchpads],
        'conversations': [conv.to_dict(current_user_id=user_id) for conv in conversations],
        'messages': [m.to_dict() for m in messages],
        'trash': {
            'boards': [b.to_dict() for b in owned_trashed_boards],
            'tasks': [t.to_dict() for t in trashed_tasks]
        }
    }

    response_json = json.dumps(export_data, indent=2)
    return Response(
        response_json,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment;filename=sticky_mind_grid_export_{user_id[:8]}.json'}
    )

@bp.route('/teammates', methods=['GET'])
@jwt_required()
def get_teammates():
    user_id = get_jwt_identity()
    
    # 1. Get all boards current user is an accepted member of
    user_memberships = BoardMember.query.filter_by(user_id=user_id, status='accepted').all()
    user_board_ids = [m.board_id for m in user_memberships]
    
    if not user_board_ids:
        # Strict board isolation: No common boards means no visible teammates
        return jsonify([]), 200

    # 2. Get all accepted members across these shared boards
    all_members = BoardMember.query.filter(
        BoardMember.board_id.in_(user_board_ids),
        BoardMember.status == 'accepted',
        BoardMember.user_id != user_id
    ).all()

    teammates_map = {}
    for m in all_members:
        u = m.user
        b = m.board
        if not u:
            continue
        if u.id not in teammates_map:
            teammates_map[u.id] = {
                'id': u.id,
                'email': u.email,
                'fullName': u.full_name,
                'avatarUrl': u.avatar_url,
                'sharedBoards': [],
                'role': m.role
            }
        if b:
            teammates_map[u.id]['sharedBoards'].append({
                'id': b.id,
                'name': b.name,
                'emoji': b.emoji,
                'color': b.color,
                'role': m.role
            })

    return jsonify(list(teammates_map.values())), 200

@bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = get_jwt_identity()
    from app.services.user_service import UserService
    success, error = UserService.delete_account(user_id)
    if not success:
        return jsonify({'error': error}), 400
    return jsonify({'message': 'Account deleted successfully'}), 200

