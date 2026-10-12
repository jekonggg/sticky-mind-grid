import json
from app import db
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.activity import Activity
from app.utils.event_broadcaster import broadcaster


def test_concurrent_card_drag_last_write_wins_and_logs_both_moves(
    client, create_test_user, create_test_board, auth_headers
):
    """Two users drag the same card at once: last write wins and activity log records both moves."""
    board, owner = create_test_board(name="Concurrent Drag Board")
    editor_a = create_test_user(email="editor_a@example.com", full_name="Editor A")
    editor_b = create_test_user(email="editor_b@example.com", full_name="Editor B")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=editor_a.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor_b.id, role="editor", status="accepted"),
    ])
    task = Task(
        board_id=board.id,
        title="Shared Drag Card",
        status="todo",
        position=1000.0,
        created_by=owner.id,
    )
    db.session.add(task)
    db.session.commit()

    headers_a = auth_headers(editor_a.id)
    headers_b = auth_headers(editor_b.id)

    # User A drags from todo -> in_progress via reorder endpoint
    res_a = client.patch(
        "/api/tasks/reorder",
        headers=headers_a,
        json={
            "boardId": board.id,
            "items": [
                {
                    "id": task.id,
                    "status": "in_progress",
                    "fromStatus": "todo",
                    "position": 1500.0,
                }
            ],
        },
    )
    assert res_a.status_code == 200

    # User B (whose local state still had card in todo) drags from todo -> done
    res_b = client.patch(
        f"/api/tasks/{task.id}",
        headers=headers_b,
        json={
            "status": "done",
            "fromStatus": "todo",
            "position": 2500.0,
        },
    )
    assert res_b.status_code == 200
    final_data = res_b.get_json()
    assert final_data["status"] == "done"
    assert final_data["position"] == 2500.0

    # Verify DB state reflects last write wins
    refreshed = db.session.get(Task, task.id)
    assert refreshed.status == "done"
    assert refreshed.position == 2500.0

    # Verify both moves are recorded in the activity log
    move_activities = (
        Activity.query.filter_by(board_id=board.id, type="move")
        .order_by(Activity.timestamp.asc())
        .all()
    )
    assert len(move_activities) == 2
    messages = [a.message for a in move_activities]
    assert 'Moved "Shared Drag Card" from To Do to In Progress' in messages
    assert 'Moved "Shared Drag Card" from To Do to Done' in messages


def test_concurrent_same_column_target_drag_logs_both_moves_with_from_status(
    client, create_test_user, create_test_board, auth_headers
):
    """Even if both users drag from To Do to In Progress concurrently, both moves are logged when fromStatus is sent."""
    board, owner = create_test_board(name="Same Target Column Drag Board")
    editor_a = create_test_user(email="editor_a2@example.com", full_name="Editor A2")
    editor_b = create_test_user(email="editor_b2@example.com", full_name="Editor B2")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=editor_a.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor_b.id, role="editor", status="accepted"),
    ])
    task = Task(
        board_id=board.id,
        title="Race Card",
        status="todo",
        position=1000.0,
        created_by=owner.id,
    )
    db.session.add(task)
    db.session.commit()

    res_a = client.patch(
        "/api/tasks/reorder",
        headers=auth_headers(editor_a.id),
        json={
            "boardId": board.id,
            "items": [{"id": task.id, "status": "in_progress", "fromStatus": "todo", "position": 1000.0}],
        },
    )
    assert res_a.status_code == 200

    res_b = client.patch(
        "/api/tasks/reorder",
        headers=auth_headers(editor_b.id),
        json={
            "boardId": board.id,
            "items": [{"id": task.id, "status": "in_progress", "fromStatus": "todo", "position": 2000.0}],
        },
    )
    assert res_b.status_code == 200

    refreshed = db.session.get(Task, task.id)
    assert refreshed.status == "in_progress"
    assert refreshed.position == 2000.0

    move_activities = Activity.query.filter_by(board_id=board.id, type="move").all()
    assert len(move_activities) == 2


def test_concurrent_description_edit_conflict_and_force_overwrite(
    client, create_test_user, create_test_board, auth_headers
):
    """Two users edit the same task description: detects stale baseDescription with 409 Conflict and allows forceOverwrite."""
    board, owner = create_test_board(name="Description Conflict Board")
    editor_a = create_test_user(email="desc_a@example.com", full_name="Editor A")
    editor_b = create_test_user(email="desc_b@example.com", full_name="Editor B")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=editor_a.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor_b.id, role="editor", status="accepted"),
    ])
    task = Task(
        board_id=board.id,
        title="Spec Task",
        description="Initial specification v1",
        status="todo",
        position=1000.0,
        created_by=owner.id,
    )
    db.session.add(task)
    db.session.commit()

    headers_a = auth_headers(editor_a.id)
    headers_b = auth_headers(editor_b.id)

    # User A saves updated description based on v1
    res_a = client.patch(
        f"/api/tasks/{task.id}",
        headers=headers_a,
        json={
            "description": "User A specification v2",
            "baseDescription": "Initial specification v1",
        },
    )
    assert res_a.status_code == 200
    assert res_a.get_json()["description"] == "User A specification v2"

    # User B tries to save based on stale v1 -> receives 409 Conflict with currentTask
    res_b_conflict = client.patch(
        f"/api/tasks/{task.id}",
        headers=headers_b,
        json={
            "description": "User B conflicting specification",
            "baseDescription": "Initial specification v1",
        },
    )
    assert res_b_conflict.status_code == 409
    conflict_payload = res_b_conflict.get_json()
    assert conflict_payload["conflict"] is True
    assert conflict_payload["currentTask"]["description"] == "User A specification v2"

    # DB still holds User A's version
    assert db.session.get(Task, task.id).description == "User A specification v2"

    # User B resolves conflict by explicitly choosing forceOverwrite
    res_b_force = client.patch(
        f"/api/tasks/{task.id}",
        headers=headers_b,
        json={
            "description": "User B merged specification v3",
            "baseDescription": "Initial specification v1",
            "forceOverwrite": True,
        },
    )
    assert res_b_force.status_code == 200
    assert res_b_force.get_json()["description"] == "User B merged specification v3"
    assert db.session.get(Task, task.id).description == "User B merged specification v3"

    # Check description update activities were logged
    desc_activities = Activity.query.filter_by(board_id=board.id, type="update").all()
    assert len(desc_activities) == 2
    assert all('Updated description for "Spec Task"' in a.message for a in desc_activities)


def test_mid_session_role_downgrade_blocks_mutations_immediately(
    client, create_test_user, create_test_board, auth_headers
):
    """Downgrading an editor to viewer immediately blocks subsequent task mutations with 403 and broadcasts member:role_updated."""
    board, owner = create_test_board(name="Role Downgrade Board")
    member = create_test_user(email="downgrade@example.com", full_name="Downgraded User")

    db.session.add(
        BoardMember(board_id=board.id, user_id=member.id, role="editor", status="accepted")
    )
    task = Task(
        board_id=board.id,
        title="Protected Task",
        status="todo",
        position=1000.0,
        created_by=owner.id,
    )
    db.session.add(task)
    db.session.commit()

    owner_headers = auth_headers(owner.id)
    member_headers = auth_headers(member.id)

    # While editor, member can edit the task
    ok_res = client.patch(
        f"/api/tasks/{task.id}",
        headers=member_headers,
        json={"title": "Edited while Editor"},
    )
    assert ok_res.status_code == 200

    # Subscribe to board SSE events to verify member:role_updated broadcast
    q = broadcaster.subscribe(board.id, user_id=member.id)
    try:
        # Owner downgrades member from editor to viewer
        downgrade_res = client.patch(
            f"/api/boards/{board.id}/members/{member.id}",
            headers=owner_headers,
            json={"role": "viewer"},
        )
        assert downgrade_res.status_code == 200

        # Check SSE event received
        events = []
        while not q.empty():
            raw = q.get_nowait()
            if raw and raw.startswith("data: "):
                events.append(json.loads(raw[len("data: "):].strip()))

        role_events = [e for e in events if e["type"] == "member:role_updated"]
        assert len(role_events) == 1
        assert role_events[0]["data"]["userId"] == str(member.id)
        assert role_events[0]["data"]["role"] == "viewer"
        assert role_events[0]["data"]["actorId"] == str(owner.id)

        # Immediately after downgrade, member's existing JWT session is rejected with 403 on task update/reorder/create/delete
        forbidden_edit = client.patch(
            f"/api/tasks/{task.id}",
            headers=member_headers,
            json={"title": "Should Fail"},
        )
        assert forbidden_edit.status_code == 403

        forbidden_reorder = client.patch(
            "/api/tasks/reorder",
            headers=member_headers,
            json={"boardId": board.id, "items": [{"id": task.id, "status": "done", "position": 2000.0}]},
        )
        assert forbidden_reorder.status_code == 403

        forbidden_create = client.post(
            "/api/tasks",
            headers=member_headers,
            json={"boardId": board.id, "title": "Unauthorized Task"},
        )
        assert forbidden_create.status_code == 403

        forbidden_delete = client.delete(
            f"/api/tasks/{task.id}",
            headers=member_headers,
        )
        assert forbidden_delete.status_code == 403
    finally:
        broadcaster.unsubscribe(board.id, q)


def test_member_removed_while_connected_receives_force_disconnect(
    client, create_test_user, create_test_board, auth_headers
):
    """Removing a connected member broadcasts member:removed, enqueues force_disconnect + None sentinel, and unsubscribes them."""
    board, owner = create_test_board(name="Force Disconnect Board")
    removed_user = create_test_user(email="removed@example.com", full_name="Removed User")
    staying_user = create_test_user(email="staying@example.com", full_name="Staying User")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=removed_user.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=staying_user.id, role="editor", status="accepted"),
    ])
    db.session.commit()

    q_removed = broadcaster.subscribe(board.id, user_id=removed_user.id)
    q_staying = broadcaster.subscribe(board.id, user_id=staying_user.id)

    try:
        # Owner removes removed_user from the board
        res = client.delete(
            f"/api/boards/{board.id}/members/{removed_user.id}",
            headers=auth_headers(owner.id),
        )
        assert res.status_code == 200

        # Collect all items from removed_user's queue
        removed_items = []
        while not q_removed.empty():
            removed_items.append(q_removed.get_nowait())

        # Expect member:removed SSE message, force_disconnect SSE message, and None sentinel
        assert None in removed_items
        parsed_events = [
            json.loads(item[len("data: "):].strip())
            for item in removed_items
            if isinstance(item, str) and item.startswith("data: ")
        ]
        event_types = [e["type"] for e in parsed_events]
        assert "member:removed" in event_types
        assert "force_disconnect" in event_types

        # Subsequent board broadcasts should NOT reach q_removed because it was unsubscribed
        broadcaster.broadcast(board.id, "task:updated", {"id": "test-after-disconnect"})
        assert q_removed.empty()

        # Staying user's queue remains subscribed and did NOT receive force_disconnect or None
        staying_items = []
        while not q_staying.empty():
            staying_items.append(q_staying.get_nowait())
        assert None not in staying_items
        staying_types = [
            json.loads(item[len("data: "):].strip())["type"]
            for item in staying_items
            if isinstance(item, str) and item.startswith("data: ")
        ]
        assert "member:removed" in staying_types
        assert "force_disconnect" not in staying_types
        assert "task:updated" in staying_types
    finally:
        broadcaster.unsubscribe(board.id, q_removed)
        broadcaster.unsubscribe(board.id, q_staying)
