import json
from app import db
from app.models.board_member import BoardMember
from app.models.notification import Notification

def test_task_lifecycle_and_assignment_notification(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Task Lifecycle Board")
    assignee = create_test_user(email="assignee@example.com", full_name="Assignee User")

    # Add assignee as member
    db.session.add(BoardMember(board_id=board.id, user_id=assignee.id, role="member", status="accepted"))
    db.session.commit()

    owner_headers = auth_headers(owner.id)

    # 1. Create Task with assignee
    create_res = client.post(
        "/api/tasks",
        headers=owner_headers,
        data=json.dumps({
            "boardId": board.id,
            "title": "Implement Feature X",
            "description": "Comprehensive specifications for Feature X",
            "columnId": "todo",
            "priority": "high",
            "assignedTo": assignee.id,
            "tags": ["frontend", "feature"]
        }),
        content_type="application/json"
    )
    assert create_res.status_code == 201
    task_data = create_res.get_json()
    assert task_data["title"] == "Implement Feature X"
    assert task_data["assignedTo"] == assignee.id
    assert task_data["priority"] == "high"
    task_id = task_data["id"]

    # 2. Verify assignee received assignment notification
    assign_notif = Notification.query.filter_by(user_id=assignee.id, type="assignment").first()
    assert assign_notif is not None
    assert "Implement Feature X" in assign_notif.message

    # 3. Update Task (move column to 'in-progress')
    update_res = client.put(
        f"/api/tasks/{task_id}",
        headers=owner_headers,
        data=json.dumps({
            "status": "in_progress",
            "position": 1
        }),
        content_type="application/json"
    )
    assert update_res.status_code == 200
    updated_data = update_res.get_json()
    assert updated_data["status"] == "in_progress"

    # 4. Fetch all tasks for board
    tasks_res = client.get(f"/api/tasks?boardId={board.id}", headers=owner_headers)
    assert tasks_res.status_code == 200
    tasks_list = tasks_res.get_json()
    assert len(tasks_list) == 1
    assert tasks_list[0]["id"] == task_id

    # 5. Delete Task
    delete_res = client.delete(f"/api/tasks/{task_id}", headers=owner_headers)
    assert delete_res.status_code == 200

    # Verify task deleted
    tasks_res_after = client.get(f"/api/tasks?boardId={board.id}", headers=owner_headers)
    assert len(tasks_res_after.get_json()) == 0
