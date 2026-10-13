import json
from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task

def test_create_board(client, create_test_user, auth_headers):
    user = create_test_user(email="boardcreator@example.com")
    response = client.post(
        "/api/boards",
        headers=auth_headers(user.id),
        data=json.dumps({
            "name": "Engineering Board",
            "description": "Sprint planning board",
            "emoji": "🚀",
            "color": "hsl(210, 80%, 55%)"
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "Engineering Board"
    assert data["ownerId"] == user.id
    assert len(data["columns"]) > 0

    # Verify owner membership was created
    membership = BoardMember.query.filter_by(board_id=data["id"], user_id=user.id).first()
    assert membership is not None
    assert membership.role == "owner"
    assert membership.status == "accepted"

def test_get_user_boards(client, create_test_user, auth_headers):
    user = create_test_user(email="boardlister@example.com")
    headers = auth_headers(user.id)

    # Initially empty
    resp1 = client.get("/api/boards", headers=headers)
    assert resp1.status_code == 200
    assert len(resp1.get_json()) == 0

    # Create 2 boards
    client.post("/api/boards", headers=headers, data=json.dumps({"name": "Board 1"}), content_type="application/json")
    client.post("/api/boards", headers=headers, data=json.dumps({"name": "Board 2"}), content_type="application/json")

    resp2 = client.get("/api/boards", headers=headers)
    assert resp2.status_code == 200
    boards = resp2.get_json()
    assert len(boards) == 2

def test_get_board_by_id(client, create_test_user, auth_headers):
    owner = create_test_user(email="owner_get@example.com")
    outsider = create_test_user(email="outsider_get@example.com")

    # Create board
    create_resp = client.post(
        "/api/boards",
        headers=auth_headers(owner.id),
        data=json.dumps({"name": "Secret Board"}),
        content_type="application/json"
    )
    board_id = create_resp.get_json()["id"]

    # Owner can get board
    owner_resp = client.get(f"/api/boards/{board_id}", headers=auth_headers(owner.id))
    assert owner_resp.status_code == 200
    assert owner_resp.get_json()["name"] == "Secret Board"

    # Outsider gets 403
    outsider_resp = client.get(f"/api/boards/{board_id}", headers=auth_headers(outsider.id))
    assert outsider_resp.status_code == 403

def test_update_board(client, create_test_user, auth_headers):
    owner = create_test_user(email="owner_update@example.com")
    create_resp = client.post(
        "/api/boards",
        headers=auth_headers(owner.id),
        data=json.dumps({"name": "Original Name"}),
        content_type="application/json"
    )
    board_id = create_resp.get_json()["id"]

    update_resp = client.patch(
        f"/api/boards/{board_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"name": "Updated Name", "description": "New description"}),
        content_type="application/json"
    )
    assert update_resp.status_code == 200
    data = update_resp.get_json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "New description"

def test_delete_board_cascades_tasks_and_members(client, create_test_user, auth_headers):
    owner = create_test_user(email="owner_del@example.com")
    create_resp = client.post(
        "/api/boards",
        headers=auth_headers(owner.id),
        data=json.dumps({"name": "Board To Delete"}),
        content_type="application/json"
    )
    board_id = create_resp.get_json()["id"]

    # Create task under this board
    task = Task(id="task-to-cascade", board_id=board_id, title="Cascaded Task")
    db.session.add(task)
    db.session.commit()

    # Delete board
    del_resp = client.delete(f"/api/boards/{board_id}?confirm_name=Board To Delete", headers=auth_headers(owner.id))
    assert del_resp.status_code == 200

    # Verify board, task, and memberships are gone
    assert db.session.get(Board, board_id) is None
    assert db.session.get(Task, "task-to-cascade") is None
    assert BoardMember.query.filter_by(board_id=board_id).count() == 0


def test_create_board_minimum_columns(client, create_test_user, auth_headers):
    user = create_test_user(email="mincols@example.com")
    headers = auth_headers(user.id)

    # 2-column "Ideas / Doing" board succeeds
    resp_two = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "Ideas & Doing",
            "columns": [
                {"id": "ideas", "title": "Ideas", "emoji": "💡"},
                {"id": "doing", "title": "Doing", "emoji": "🛠️"},
            ],
        }),
        content_type="application/json",
    )
    assert resp_two.status_code == 201
    assert len(resp_two.get_json()["columns"]) == 2

    # 1-column board succeeds
    resp_one = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "Single Inbox",
            "columns": [{"id": "inbox", "title": "Inbox", "emoji": "📥"}],
        }),
        content_type="application/json",
    )
    assert resp_one.status_code == 201
    assert len(resp_one.get_json()["columns"]) == 1

    # 0 workflow columns (only archive) fails with 400
    resp_zero = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "Invalid Empty Columns",
            "columns": [{"id": "archive", "title": "Archive"}],
        }),
        content_type="application/json",
    )
    assert resp_zero.status_code == 400


def test_board_banner_url_validation(client, create_test_user, auth_headers):
    user = create_test_user(email="bannerurl@example.com")
    headers = auth_headers(user.id)

    # Third-party tracking URL is rejected
    bad_resp = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "Tracked Board",
            "heroImageUrl": "https://evil-tracker.example.com/pixel.png",
        }),
        content_type="application/json",
    )
    assert bad_resp.status_code == 400
    assert "third-party" in bad_resp.get_json()["error"].lower()

    # Trusted Unsplash preset URL is accepted
    ok_resp = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "Preset Board",
            "heroImageUrl": "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&q=80&w=1200",
        }),
        content_type="application/json",
    )
    assert ok_resp.status_code == 201
    assert ok_resp.get_json()["heroImageUrl"].startswith("https://images.unsplash.com/")


def test_board_banner_upload_limits_and_permission_check(client, create_test_user, auth_headers):
    import io

    owner = create_test_user(email="banner_owner@example.com")
    outsider = create_test_user(email="banner_outsider@example.com")
    owner_headers = auth_headers(owner.id)
    outsider_headers = auth_headers(outsider.id)

    # 1. Spoofed PNG with invalid magic bytes is rejected when purpose=banner
    spoofed_resp = client.post(
        "/api/files/upload?purpose=banner",
        headers=owner_headers,
        data={"file": (io.BytesIO(b"not-an-image-script-payload"), "fake.png", "image/png")},
        content_type="multipart/form-data",
    )
    assert spoofed_resp.status_code == 400

    # 2. Valid PNG header bytes succeed when purpose=banner
    valid_png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    upload_resp = client.post(
        "/api/files/upload?purpose=banner",
        headers=owner_headers,
        data={"file": (io.BytesIO(valid_png_bytes), "banner.png", "image/png")},
        content_type="multipart/form-data",
    )
    assert upload_resp.status_code == 201
    uploaded_data = upload_resp.get_json()
    stored_url = uploaded_data["url"]  # /api/files/<storedName>

    # 3. Create board referencing the uploaded banner image
    board_resp = client.post(
        "/api/boards",
        headers=owner_headers,
        data=json.dumps({
            "name": "Private Banner Board",
            "heroImageUrl": stored_url,
        }),
        content_type="application/json",
    )
    assert board_resp.status_code == 201

    # 4. Permission-check the stored banner image identically to task attachments:
    # Unauthenticated request -> 401
    unauth_get = client.get(stored_url)
    assert unauth_get.status_code == 401

    # Authenticated non-member -> 403
    outsider_get = client.get(stored_url, headers=outsider_headers)
    assert outsider_get.status_code == 403

    # Authenticated board member/owner -> 200
    owner_get = client.get(stored_url, headers=owner_headers)
    assert owner_get.status_code == 200
    owner_get.close()


def test_board_task_counts_and_member_preview_cues(client, create_test_user, auth_headers):
    from datetime import datetime, timedelta

    owner = create_test_user(email="metrics_owner@example.com")
    editor = create_test_user(email="metrics_editor@example.com")
    owner_headers = auth_headers(owner.id)

    create_resp = client.post(
        "/api/boards",
        headers=owner_headers,
        data=json.dumps({"name": "Metrics Board"}),
        content_type="application/json",
    )
    assert create_resp.status_code == 201
    board_id = create_resp.get_json()["id"]

    # Initially solo board
    initial_data = create_resp.get_json()
    assert initial_data["isShared"] is False
    assert initial_data["memberCount"] == 1
    assert len(initial_data["membersPreview"]) == 1
    assert "email" not in initial_data["membersPreview"][0]

    # Add an accepted editor member
    bm = BoardMember(board_id=board_id, user_id=editor.id, role="editor", status="accepted")
    db.session.add(bm)

    now = datetime.utcnow()
    tasks = [
        # Open + overdue
        Task(id="t-overdue", board_id=board_id, title="Overdue Task", status="todo", progress=10, due_date=now - timedelta(days=2)),
        # Open + due soon (within 3 days)
        Task(id="t-soon", board_id=board_id, title="Due Soon Task", status="in_progress", progress=50, due_date=now + timedelta(days=1)),
        # Open + due later (> 3 days)
        Task(id="t-later", board_id=board_id, title="Due Later Task", status="todo", progress=0, due_date=now + timedelta(days=10)),
        # Completed (status='done') - active but not open
        Task(id="t-done", board_id=board_id, title="Done Task", status="done", progress=100, due_date=now - timedelta(days=1)),
        # Archived (status='archive') - excluded from active and open
        Task(id="t-archive", board_id=board_id, title="Archived Task", status="archive", progress=20, due_date=now - timedelta(days=1)),
        # Trashed (is_deleted=True) - excluded from active and open
        Task(id="t-trash", board_id=board_id, title="Trashed Task", status="todo", progress=0, is_deleted=True, due_date=now - timedelta(days=1)),
    ]
    db.session.add_all(tasks)
    db.session.commit()

    resp = client.get(f"/api/boards/{board_id}", headers=owner_headers)
    assert resp.status_code == 200
    board_data = resp.get_json()

    # Active tasks = overdue + soon + later + done = 4 (excludes archive and trash)
    assert board_data["taskCount"] == 4
    # Open tasks = overdue + soon + later = 3 (excludes done, archive, trash)
    assert board_data["openTaskCount"] == 3
    assert board_data["overdueCount"] == 1
    assert board_data["dueSoonCount"] == 1

    # Shared member cues & privacy rule (never expose email in membersPreview)
    assert board_data["isShared"] is True
    assert board_data["memberCount"] == 2
    assert len(board_data["membersPreview"]) == 2
    for mp in board_data["membersPreview"]:
        assert "email" not in mp
        assert set(mp.keys()) == {"id", "fullName", "avatarUrl", "role"}


def test_soft_delete_board_grace_period_and_restore(client, create_test_user, auth_headers):
    from datetime import datetime, timedelta

    owner = create_test_user(email="grace_owner@example.com")
    headers = auth_headers(owner.id)

    create_resp = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({"name": "Grace Period Board"}),
        content_type="application/json",
    )
    assert create_resp.status_code == 201
    board_id = create_resp.get_json()["id"]

    # Soft-delete the board
    soft_del_resp = client.delete(f"/api/boards/{board_id}?soft=true", headers=headers)
    assert soft_del_resp.status_code == 200
    assert soft_del_resp.get_json()["isDeleted"] is True

    # Disappears from GET /api/boards and GET /api/boards/<id>
    list_resp = client.get("/api/boards", headers=headers)
    assert list_resp.status_code == 200
    assert all(b["id"] != board_id for b in list_resp.get_json())

    get_resp = client.get(f"/api/boards/{board_id}", headers=headers)
    assert get_resp.status_code == 404

    # Appears in GET /api/boards/trash
    trash_resp = client.get("/api/boards/trash", headers=headers)
    assert trash_resp.status_code == 200
    trashed_boards = trash_resp.get_json()
    assert len(trashed_boards) == 1
    assert trashed_boards[0]["id"] == board_id
    assert trashed_boards[0]["isDeleted"] is True
    assert trashed_boards[0]["deletedAt"] is not None

    # Restore the board via POST /api/boards/<id>/restore
    restore_resp = client.post(f"/api/boards/{board_id}/restore", headers=headers)
    assert restore_resp.status_code == 200
    restored_data = restore_resp.get_json()
    assert restored_data["isDeleted"] is False
    assert restored_data["deletedAt"] is None

    # Reappears in GET /api/boards and disappears from trash
    list_resp_after = client.get("/api/boards", headers=headers)
    assert any(b["id"] == board_id for b in list_resp_after.get_json())
    trash_resp_after = client.get("/api/boards/trash", headers=headers)
    assert len(trash_resp_after.get_json()) == 0

    # Expired soft-deleted board (> 30 days) is auto-purged
    board_obj = db.session.get(Board, board_id)
    board_obj.is_deleted = True
    board_obj.deleted_at = datetime.utcnow() - timedelta(days=31)
    db.session.commit()

    client.get("/api/boards", headers=headers)
    assert db.session.get(Board, board_id) is None


def test_board_column_wip_limits_and_delete_protection(client, create_test_user, auth_headers):
    owner = create_test_user(email="wip_owner@example.com")
    headers = auth_headers(owner.id)

    # Create board with valid WIP limit
    create_resp = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({
            "name": "WIP Board",
            "columns": [
                {"id": "todo", "title": "To Do", "wipLimit": None},
                {"id": "doing", "title": "Doing", "wipLimit": 3},
                {"id": "done", "title": "Done"},
            ],
        }),
        content_type="application/json",
    )
    assert create_resp.status_code == 201
    board_id = create_resp.get_json()["id"]
    doing_col = next(c for c in create_resp.get_json()["columns"] if c["id"] == "doing")
    assert doing_col["wipLimit"] == 3

    # Reject invalid WIP limit (0 or negative)
    bad_wip_resp = client.patch(
        f"/api/boards/{board_id}",
        headers=headers,
        data=json.dumps({
            "columns": [
                {"id": "todo", "title": "To Do"},
                {"id": "doing", "title": "Doing", "wipLimit": 0},
                {"id": "done", "title": "Done"},
            ]
        }),
        content_type="application/json",
    )
    assert bad_wip_resp.status_code == 400
    assert "wip limit" in bad_wip_resp.get_json()["error"].lower()

    # Block deleting a column that contains active cards
    task = Task(id="active-in-doing", board_id=board_id, title="Active Task", status="doing")
    db.session.add(task)
    db.session.commit()

    del_col_resp = client.patch(
        f"/api/boards/{board_id}",
        headers=headers,
        data=json.dumps({
            "columns": [
                {"id": "todo", "title": "To Do"},
                {"id": "done", "title": "Done"},
            ]
        }),
        content_type="application/json",
    )
    assert del_col_resp.status_code == 400
    assert "active cards" in del_col_resp.get_json()["error"].lower()


def test_auto_sync_schema_adds_missing_columns(app):
    from sqlalchemy import inspect as sa_inspect, text
    from app import _auto_sync_schema

    with app.app_context():
        # Simulate a legacy boards table without workspace_id, is_deleted, deleted_at
        if db.engine.dialect.name == 'mysql':
            db.session.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        db.session.execute(text("DROP TABLE IF EXISTS boards"))
        db.session.execute(
            text(
                "CREATE TABLE boards ("
                "id VARCHAR(36) PRIMARY KEY, "
                "name VARCHAR(255) NOT NULL, "
                "emoji VARCHAR(50), "
                "description TEXT, "
                "color VARCHAR(50) NOT NULL, "
                "hero_image_url TEXT, "
                "columns JSON, "
                "created_at DATETIME, "
                "updated_at DATETIME)"
            )
        )
        if db.engine.dialect.name == 'mysql':
            db.session.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.session.commit()

        _auto_sync_schema(app)

        inspector = sa_inspect(db.engine)
        board_cols = {c["name"] for c in inspector.get_columns("boards")}
        assert "owner_id" in board_cols
        assert "workspace_id" in board_cols
        assert "is_deleted" in board_cols
        assert "deleted_at" in board_cols
