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


def test_task_tag_normalization_and_deduplication(client, create_test_board, auth_headers):
    board, owner = create_test_board(name="Tag Deduplication Board")
    owner_headers = auth_headers(owner.id)

    # 1. Create task with duplicated and case-variant tags
    create_res = client.post(
        "/api/tasks",
        headers=owner_headers,
        data=json.dumps({
            "boardId": board.id,
            "title": "Deduplicate Tags Test",
            "columnId": "todo",
            "tags": [
                {"name": "Frontend", "color": "#3b82f6"},
                {"name": "frontend", "color": "#ef4444"},
                "Backend",
                "backend",
                "   FRONTEND   "
            ]
        }),
        content_type="application/json"
    )
    assert create_res.status_code == 201
    task_data = create_res.get_json()
    tags = task_data.get("tags", [])
    # Should only contain 2 tags: Frontend and Backend
    assert len(tags) == 2
    tag_names = [t["name"] if isinstance(t, dict) else t for t in tags]
    assert "Frontend" in tag_names
    assert "Backend" in tag_names

    task_id = task_data["id"]

    # 2. Update task with duplicate tags
    update_res = client.put(
        f"/api/tasks/{task_id}",
        headers=owner_headers,
        data=json.dumps({
            "tags": [
                {"name": "Feature", "color": "#10b981"},
                {"name": "feature", "color": "#f59e0b"},
                {"name": "FEATURE", "color": "#6366f1"}
            ]
        }),
        content_type="application/json"
    )
    assert update_res.status_code == 200
    updated_data = update_res.get_json()
    updated_tags = updated_data.get("tags", [])
    assert len(updated_tags) == 1
    assert (updated_tags[0]["name"] if isinstance(updated_tags[0], dict) else updated_tags[0]) == "Feature"


def test_task_column_responsive_auto_progress(client, create_test_user, auth_headers):
    from app.services.board_service import BoardService
    owner = create_test_user(email="progress_owner@example.com")
    headers = auth_headers(owner.id)

    # Board with 4 distinct pipeline stages
    board = BoardService.create_board({
        "name": "Pipeline Progress Board",
        "columns": [
            {"id": "col_todo", "title": "To Do"},
            {"id": "col_dev", "title": "In Development"},
            {"id": "col_qa", "title": "Quality Assurance"},
            {"id": "col_done", "title": "Done"},
        ]
    }, owner.id)

    # 1. Create task in first column (col_todo) -> progress auto-computes to 0%
    create_res = client.post(
        "/api/tasks",
        headers=headers,
        data=json.dumps({
            "boardId": board.id,
            "title": "Pipeline Task",
            "status": "col_todo"
        }),
        content_type="application/json"
    )
    assert create_res.status_code == 201
    task_id = create_res.get_json()["id"]
    assert create_res.get_json()["progress"] == 0

    # 2. Move to intermediate column 1 (col_dev: 1/3) -> progress auto-computes to 33%
    dev_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        data=json.dumps({"status": "col_dev"}),
        content_type="application/json"
    )
    assert dev_res.status_code == 200
    assert dev_res.get_json()["progress"] == 33

    # 3. Move to intermediate column 2 (col_qa: 2/3) -> progress auto-computes to 67%
    qa_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        data=json.dumps({"status": "col_qa"}),
        content_type="application/json"
    )
    assert qa_res.status_code == 200
    assert qa_res.get_json()["progress"] == 67

    # 4. Move to final column (col_done: 3/3) -> progress auto-computes to 100%
    done_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        data=json.dumps({"status": "col_done"}),
        content_type="application/json"
    )
    assert done_res.status_code == 200
    assert done_res.get_json()["progress"] == 100

    # 5. When subtasks exist, subtask completion takes priority over column progress
    chk_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        data=json.dumps({
            "status": "col_dev",
            "checklist": [
                {"id": "c1", "title": "Subtask 1", "completed": True},
                {"id": "c2", "title": "Subtask 2", "completed": False},
                {"id": "c3", "title": "Subtask 3", "completed": False},
                {"id": "c4", "title": "Subtask 4", "completed": False},
            ]
        }),
        content_type="application/json"
    )
    assert chk_res.status_code == 200
    # 1 out of 4 completed = 25%, overriding col_dev's 33%
    assert chk_res.get_json()["progress"] == 25

