import json
from app import db
from app.models.task import Task
from app.models.notification import Notification

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

    # Add a task to the board
    task = Task(
        board_id=board.id,
        title='Exported Task',
        status='todo',
        created_by=user.id
    )
    db.session.add(task)
    db.session.commit()

    res = client.get('/api/users/me/export', headers=headers)
    assert res.status_code == 200
    assert 'application/json' in res.content_type
    
    data = json.loads(res.data.decode('utf-8'))
    assert 'exportMetadata' in data
    assert data['user']['email'] == "export_user@example.com"
    assert len(data['boards']) >= 1
    assert data['boards'][0]['id'] == board.id
    assert len(data['tasks']) >= 1
    assert data['tasks'][0]['title'] == 'Exported Task'
