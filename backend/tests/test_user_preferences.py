import json
from app import db
from app.models.task import Task
from app.models.board import Board
from app.models.notification import Notification
from app.models.comment import Comment
from app.models.activity import Activity
from app.models.board_invitation import BoardInvitation
from app.models.board_member import BoardMember
from app.models.note import Note
from app.models.scratchpad_note import ScratchpadNote
from app.models.message import Conversation, ConversationParticipant, Message

def test_get_default_preferences(client, create_test_user, auth_headers):
    user = create_test_user(email="prefs_user@example.com")
    headers = auth_headers(user.id)

    res = client.get('/api/users/me/preferences', headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['defaultBoardView'] == 'board'
    assert data['timezone'] == 'UTC'
    assert data['dateFormat'] == 'MM/DD/YYYY'
    assert data['notifyMentions'] is True
    assert data['notifyAssignments'] is True
    assert data['notifyInvites'] is True
    assert data['notifyComments'] is True

def test_update_preferences(client, create_test_user, auth_headers):
    user = create_test_user(email="prefs_update@example.com")
    headers = auth_headers(user.id)

    payload = {
        'defaultBoardView': 'calendar',
        'timezone': 'America/New_York',
        'dateFormat': 'YYYY-MM-DD',
        'firstDayOfWeek': 1,
        'notifyMentions': False,
        'notifyAssignments': False,
        'notifyInvites': True,
        'notifyComments': False
    }

    res = client.patch('/api/users/me/preferences', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['defaultBoardView'] == 'calendar'
    assert data['timezone'] == 'America/New_York'
    assert data['dateFormat'] == 'YYYY-MM-DD'
    assert data['firstDayOfWeek'] == 1
    assert data['notifyMentions'] is False
    assert data['notifyAssignments'] is False
    assert data['notifyComments'] is False

def test_notification_suppression_by_preferences(client, create_test_user, create_test_board, auth_headers):
    # User 1 creates board and turns off assignment notifications
    user1 = create_test_user(email="u1@example.com")
    board, _ = create_test_board(owner=user1, name="Pref Board")

    headers1 = auth_headers(user1.id)
    client.patch('/api/users/me/preferences', json={'notifyAssignments': False}, headers=headers1)

    # User 2 joins as member
    user2 = create_test_user(email="u2@example.com")
    from app.models.board_member import BoardMember
    member2 = BoardMember(
        board_id=board.id,
        user_id=user2.id,
        role="member",
        status="accepted"
    )
    db.session.add(member2)
    db.session.commit()

    headers2 = auth_headers(user2.id)

    # User 2 creates task assigned to User 1
    task_payload = {
        'boardId': board.id,
        'title': 'Test Assignment Task',
        'assignedTo': user1.id,
        'status': 'todo',
        'priority': 'medium'
    }
    res = client.post('/api/tasks', json=task_payload, headers=headers2)
    assert res.status_code == 201

    # Check that User 1 did NOT receive an assignment notification
    notifs = Notification.query.filter_by(user_id=user1.id, type='assignment').all()
    assert len(notifs) == 0

def test_user_data_export(client, create_test_user, create_test_board, auth_headers):
    user = create_test_user(email="export_user@example.com")
    board, _ = create_test_board(owner=user, name="Export Board")
    headers = auth_headers(user.id)

    # 1. Add active and trashed tasks, and trashed board
    task = Task(
        board_id=board.id,
        title='Exported Task',
        status='todo',
        created_by=user.id
    )
    trashed_task = Task(
        board_id=board.id,
        title='Trashed Task',
        status='todo',
        created_by=user.id,
        is_deleted=True
    )
    trashed_board = Board(
        name='Trashed Board',
        owner_id=user.id,
        is_deleted=True
    )
    db.session.add_all([task, trashed_task, trashed_board])
    db.session.commit()

    # 2. Add comment
    comment = Comment(
        task_id=task.id,
        user_id=user.id,
        content='Exported comment text'
    )
    # 3. Add activity
    activity = Activity(
        type='task_created',
        task_title=task.title,
        message='Created exported task',
        board_id=board.id,
        user_id=user.id
    )
    # 4. Add notification
    notification = Notification(
        user_id=user.id,
        type='system',
        title='Welcome',
        message='Welcome to Sticky Mind Grid'
    )
    # 5. Add board invitation
    invitation = BoardInvitation(
        board_id=board.id,
        email='teammate@example.com',
        inviter_id=user.id,
        role='editor'
    )
    # 6. Add note & scratchpad
    note = Note(
        board_id=board.id,
        user_id=user.id,
        title='Project Outline',
        content='Key milestones for Q4'
    )
    scratchpad = ScratchpadNote(
        user_id=user.id,
        title='Quick Thoughts',
        content='Follow up with design'
    )
    # 7. Add conversation & message
    conv = Conversation(title='Project Chat', type='group', created_by=user.id)
    db.session.add(conv)
    db.session.flush()

    participant = ConversationParticipant(conversation_id=conv.id, user_id=user.id, role='admin')
    msg = Message(conversation_id=conv.id, sender_id=user.id, content='Hello team!')
    
    db.session.add_all([comment, activity, notification, invitation, note, scratchpad, participant, msg])
    db.session.commit()

    res = client.get('/api/users/me/export', headers=headers)
    assert res.status_code == 200
    assert 'application/json' in res.content_type
    
    data = json.loads(res.data.decode('utf-8'))
    assert 'exportMetadata' in data
    assert data['exportMetadata']['version'] == '2.0'
    assert data['user']['email'] == "export_user@example.com"
    assert len(data['boards']) >= 1
    assert data['boards'][0]['id'] == board.id
    assert len(data['tasks']) >= 1
    assert data['tasks'][0]['title'] == 'Exported Task'

    # Verify newly added sections
    assert len(data['comments']) >= 1
    assert data['comments'][0]['content'] == 'Exported comment text'

    assert len(data['activities']) >= 1
    assert data['activities'][0]['taskTitle'] == 'Exported Task'

    assert len(data['notifications']) >= 1
    assert data['notifications'][0]['title'] == 'Welcome'

    assert len(data['invitations']) >= 1
    assert data['invitations'][0]['email'] == 'teammate@example.com'

    assert len(data['notes']) >= 1
    assert data['notes'][0]['title'] == 'Project Outline'

    assert len(data['scratchpads']) >= 1
    assert data['scratchpads'][0]['title'] == 'Quick Thoughts'

    assert len(data['conversations']) >= 1
    assert data['conversations'][0]['id'] == conv.id

    assert len(data['messages']) >= 1
    assert data['messages'][0]['content'] == 'Hello team!'

    assert 'trash' in data
    assert len(data['trash']['tasks']) >= 1
    assert data['trash']['tasks'][0]['title'] == 'Trashed Task'
    assert len(data['trash']['boards']) >= 1
    assert data['trash']['boards'][0]['name'] == 'Trashed Board'
