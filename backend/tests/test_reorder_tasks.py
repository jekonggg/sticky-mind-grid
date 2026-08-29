import pytest
from app import db
from app.models.board import Board
from app.models.task import Task

def test_reorder_tasks_success(client, auth_headers, create_test_user, create_test_board):
    """Test successful batch reordering of tasks within and across columns."""
    user = create_test_user()
    board, _ = create_test_board(owner=user)
    headers = auth_headers(user.id)

    # Create two tasks
    task1 = Task(board_id=board.id, title="Task One", status="todo", position=1000.0, created_by=user.id)
    task2 = Task(board_id=board.id, title="Task Two", status="todo", position=2000.0, created_by=user.id)
    db.session.add_all([task1, task2])
    db.session.commit()

    payload = {
        "boardId": board.id,
        "items": [
            {"id": task1.id, "status": "in_progress", "position": 1000.0},
            {"id": task2.id, "status": "in_progress", "position": 2000.0}
        ]
    }

    res = client.patch('/api/tasks/reorder', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 2
    assert data[0]["id"] == task1.id
    assert data[0]["status"] == "in_progress"
    assert data[0]["position"] == 1000.0
    assert data[1]["id"] == task2.id
    assert data[1]["status"] == "in_progress"
    assert data[1]["position"] == 2000.0

def test_reorder_tasks_unauthorized(client, auth_headers, create_test_user):
    """Test reorder fails if user does not have write access to board."""
    user = create_test_user(email="user1@example.com")
    other_user = create_test_user(email="user2@example.com")
    headers = auth_headers(user.id)

    other_board = Board(name="Secret Board", owner_id=other_user.id)
    db.session.add(other_board)
    db.session.commit()

    payload = {
        "boardId": other_board.id,
        "items": [{"id": "any-task-id", "position": 1000.0}]
    }

    res = client.patch('/api/tasks/reorder', json=payload, headers=headers)
    assert res.status_code == 403

def test_reorder_tasks_invalid_payload(client, auth_headers, create_test_user):
    """Test reorder validation when boardId or items array is missing."""
    user = create_test_user()
    headers = auth_headers(user.id)

    res = client.patch('/api/tasks/reorder', json={}, headers=headers)
    assert res.status_code == 400
