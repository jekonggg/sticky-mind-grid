import json
import os
from datetime import datetime, timedelta
import pytest
from sqlalchemy import text
from app import db
from app.models.user import User
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.comment import Comment
from app.models.note import Note
from app.services.board_service import BoardService
from app.services.task_service import TaskService
from app.services.file_service import FileService

def test_oq_01_board_delete_and_lazy_purge_cascades_tasks(client, create_test_user, auth_headers):
    """
    OQ-01 / CD-03: Task.board_id must specify ondelete='CASCADE'.
    Permanent delete and 30-day lazy purge of a board with tasks must succeed without IntegrityError.
    """
    # 1. Verify Task.board_id foreign key definition has ondelete='CASCADE'
    fk = list(Task.__table__.c.board_id.foreign_keys)[0]
    assert fk.ondelete == 'CASCADE', "Task.board_id FK must have ondelete='CASCADE'"

    owner = create_test_user(email="oq01_owner@example.com")
    headers = auth_headers(owner.id)

    # 2. Test 30-day lazy purge with SQLite foreign keys enabled
    with db.engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys = ON"))

    # Create board and task
    board1 = Board(name="Expired Board", owner_id=owner.id, columns=[{"id": "c1", "title": "C1"}])
    board1.is_deleted = True
    board1.deleted_at = datetime.utcnow() - timedelta(days=35)
    db.session.add(board1)
    db.session.commit()

    bm1 = BoardMember(board_id=board1.id, user_id=owner.id, role='owner', status='accepted')
    task1 = Task(id="task-oq01-expired", board_id=board1.id, title="Expired Task")
    db.session.add_all([bm1, task1])
    db.session.commit()

    # Calling GET /api/boards triggers 30-day purge of expired boards
    resp = client.get("/api/boards", headers=headers)
    assert resp.status_code == 200

    # Board and task should be purged
    assert db.session.get(Board, board1.id) is None
    assert db.session.get(Task, "task-oq01-expired") is None

    # 3. Test permanent delete of a board with active tasks
    board2 = Board(name="Active Board To Delete", owner_id=owner.id, columns=[{"id": "c1", "title": "C1"}])
    db.session.add(board2)
    db.session.commit()

    bm2 = BoardMember(board_id=board2.id, user_id=owner.id, role='owner', status='accepted')
    task2 = Task(id="task-oq01-active", board_id=board2.id, title="Active Task")
    db.session.add_all([bm2, task2])
    db.session.commit()

    del_resp = client.delete(f"/api/boards/{board2.id}", headers=headers)
    assert del_resp.status_code == 200
    assert db.session.get(Board, board2.id) is None
    assert db.session.get(Task, "task-oq01-active") is None


def test_oq_02_attachment_deletion_authorization_and_disk_cleanup(app, client, create_test_user, auth_headers):
    """
    OQ-02 / CD-01: Only the attachment author or a board admin/owner may delete an attachment.
    Non-author editors receive HTTP 403.
    When an attachment is removed, its physical file must be deleted from disk.
    """
    owner = create_test_user(email="oq02_owner@example.com")
    editor1 = create_test_user(email="oq02_editor1@example.com")
    editor2 = create_test_user(email="oq02_editor2@example.com")

    board = Board(name="Attachment Board", owner_id=owner.id, columns=[{"id": "c1", "title": "Col"}])
    db.session.add(board)
    db.session.commit()

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=owner.id, role='owner', status='accepted'),
        BoardMember(board_id=board.id, user_id=editor1.id, role='editor', status='accepted'),
        BoardMember(board_id=board.id, user_id=editor2.id, role='editor', status='accepted'),
    ])
    db.session.commit()

    # Create dummy upload file on disk
    from app.services.file_service import UPLOAD_FOLDER
    upload_folder = app.config.get('UPLOAD_FOLDER', UPLOAD_FOLDER)
    os.makedirs(upload_folder, exist_ok=True)
    filename = "oq02_test_attachment.pdf"
    file_path = os.path.join(upload_folder, filename)
    with open(file_path, "wb") as f:
        f.write(b"dummy pdf content for oq02 test")

    att_payload = {
        "id": "att-oq02-1",
        "name": "Report.pdf",
        "url": f"/api/files/{filename}",
        "uploaderId": str(editor1.id),
        "size": 31
    }

    task = Task(
        id="task-oq02",
        board_id=board.id,
        title="Task with Attachment",
        attachments=[att_payload]
    )
    db.session.add(task)
    db.session.commit()

    # 1. Editor 2 (not author, not admin/owner) tries to delete editor 1's attachment
    patch_resp1 = client.patch(
        f"/api/tasks/{task.id}",
        headers=auth_headers(editor2.id),
        data=json.dumps({"attachments": []}),
        content_type="application/json"
    )
    assert patch_resp1.status_code == 403
    assert os.path.exists(file_path), "File should not be deleted on unauthorized attempt"

    # 2. Editor 1 (author) deletes their own attachment -> succeeds and cleans up disk file
    patch_resp2 = client.patch(
        f"/api/tasks/{task.id}",
        headers=auth_headers(editor1.id),
        data=json.dumps({"attachments": []}),
        content_type="application/json"
    )
    assert patch_resp2.status_code == 200
    assert not os.path.exists(file_path), "File must be removed from disk when deleted"


def test_oq_20_former_member_cannot_delete_comment_or_note(client, create_test_user, auth_headers):
    """
    OQ-20 / CD-05: Comment and note deletion must verify active board membership as well as authorship.
    Former members receive HTTP 403.
    """
    owner = create_test_user(email="oq20_owner@example.com")
    member = create_test_user(email="oq20_member@example.com")

    board = Board(name="Membership Board", owner_id=owner.id, columns=[{"id": "c1", "title": "Col"}])
    db.session.add(board)
    db.session.commit()

    bm_owner = BoardMember(board_id=board.id, user_id=owner.id, role='owner', status='accepted')
    bm_member = BoardMember(board_id=board.id, user_id=member.id, role='editor', status='accepted')
    task = Task(id="task-oq20", board_id=board.id, title="Task for Comments")
    db.session.add_all([bm_owner, bm_member, task])
    db.session.commit()

    comment = Comment(task_id=task.id, user_id=member.id, content="Important comment")
    note = Note(board_id=board.id, user_id=member.id, title="Important note", content="Note content")
    db.session.add_all([comment, note])
    db.session.commit()

    # Member is removed from board (former member)
    db.session.delete(bm_member)
    db.session.commit()

    # 1. Former member attempts to delete their comment
    del_comment_resp = client.delete(f"/api/comments/{comment.id}", headers=auth_headers(member.id))
    assert del_comment_resp.status_code == 403

    # 2. Former member attempts to delete their note
    del_note_resp = client.delete(f"/api/notes/{note.id}", headers=auth_headers(member.id))
    assert del_note_resp.status_code == 403


def test_oq_15_cross_board_move_strips_comments_and_tags(client, create_test_user, auth_headers):
    """
    OQ-15 / Decision: On cross-board task move, strip comments and tags from the task.
    """
    user = create_test_user(email="oq15_editor@example.com")
    headers = auth_headers(user.id)

    board1 = Board(name="Source Board", owner_id=user.id, columns=[{"id": "b1_c1", "title": "Todo"}])
    board2 = Board(name="Target Board", owner_id=user.id, columns=[{"id": "b2_c1", "title": "Incoming"}])
    db.session.add_all([board1, board2])
    db.session.commit()

    db.session.add_all([
        BoardMember(board_id=board1.id, user_id=user.id, role='owner', status='accepted'),
        BoardMember(board_id=board2.id, user_id=user.id, role='owner', status='accepted'),
    ])
    db.session.commit()

    task = Task(
        id="task-oq15",
        board_id=board1.id,
        title="Moving Task",
        tags=[{"id": "tag1", "name": "Urgent", "color": "red"}]
    )
    db.session.add(task)
    db.session.commit()

    comment = Comment(task_id=task.id, user_id=user.id, content="Source board comment")
    db.session.add(comment)
    db.session.commit()

    # Move task to target board
    resp = client.patch(
        f"/api/tasks/{task.id}",
        headers=headers,
        data=json.dumps({"boardId": board2.id}),
        content_type="application/json"
    )
    assert resp.status_code == 200

    # Reload task and check comments & tags
    updated_task = db.session.get(Task, task.id)
    assert updated_task.board_id == board2.id
    assert updated_task.tags == [], "Task tags must be stripped on cross-board move"
    comments_count = Comment.query.filter_by(task_id=task.id).count()
    assert comments_count == 0, "Task comments must be stripped on cross-board move"


def test_oq_19_transfer_ownership_checks_new_owner_storage_quota(app, client, create_test_user, auth_headers):
    """
    OQ-19: In transfer_ownership, check the new owner's 500 MB quota against the board's attachment total
    and reject with a clear error (HTTP 400) if it would be exceeded.
    """
    owner = create_test_user(email="oq19_owner@example.com")
    new_owner = create_test_user(email="oq19_target@example.com")

    # Set owner quota to 1000 bytes for test
    app.config['MAX_OWNER_STORAGE_BYTES'] = 1000

    # New owner already owns a board with 600 bytes
    existing_board = Board(name="Existing Board", owner_id=new_owner.id, columns=[{"id": "c1", "title": "C1"}])
    db.session.add(existing_board)
    db.session.commit()
    db.session.add(BoardMember(board_id=existing_board.id, user_id=new_owner.id, role='owner', status='accepted'))

    existing_task = Task(
        id="task-oq19-existing",
        board_id=existing_board.id,
        title="Existing Task",
        attachments=[{"id": "a1", "size": 600, "url": "/api/files/existing.pdf"}]
    )
    db.session.add(existing_task)
    db.session.commit()

    # Board to transfer has 500 bytes (600 + 500 = 1100 > 1000)
    transfer_board = Board(name="Transfer Board", owner_id=owner.id, columns=[{"id": "c1", "title": "C1"}])
    db.session.add(transfer_board)
    db.session.commit()
    db.session.add_all([
        BoardMember(board_id=transfer_board.id, user_id=owner.id, role='owner', status='accepted'),
        BoardMember(board_id=transfer_board.id, user_id=new_owner.id, role='editor', status='accepted')
    ])
    transfer_task = Task(
        id="task-oq19-transfer",
        board_id=transfer_board.id,
        title="Transfer Task",
        attachments=[{"id": "a2", "size": 500, "url": "/api/files/transfer.pdf"}]
    )
    db.session.add(transfer_task)
    db.session.commit()

    # Attempt transfer
    resp = client.post(
        f"/api/boards/{transfer_board.id}/transfer-ownership",
        headers=auth_headers(owner.id),
        data=json.dumps({"userId": new_owner.id}),
        content_type="application/json"
    )
    assert resp.status_code == 400
    assert "quota" in resp.get_json()["error"].lower()

    # Verify ownership did NOT change
    board_after = db.session.get(Board, transfer_board.id)
    assert board_after.owner_id == owner.id


def test_oq_03_checklist_derives_progress_ignoring_manual_override(client, create_test_user, auth_headers):
    """
    OQ-03 / CD-02: When a task has checklist items, derive progress server-side and ignore a manually supplied progress value.
    """
    user = create_test_user(email="oq03_user@example.com")
    board = Board(name="Checklist Board", owner_id=user.id, columns=[{"id": "c1", "title": "C1"}])
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=user.id, role='owner', status='accepted'))

    task = Task(id="task-oq03", board_id=board.id, title="Checklist Task")
    db.session.add(task)
    db.session.commit()

    checklist_data = [
        {"id": "item1", "title": "Task 1", "completed": True},
        {"id": "item2", "title": "Task 2", "completed": False},
        {"id": "item3", "title": "Task 3", "completed": False},
        {"id": "item4", "title": "Task 4", "completed": False},
    ]

    # Update task with 1 of 4 completed (25%) but send manual progress: 99
    resp = client.patch(
        f"/api/tasks/{task.id}",
        headers=auth_headers(user.id),
        data=json.dumps({
            "checklist": checklist_data,
            "progress": 99
        }),
        content_type="application/json"
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["progress"] == 25, "Progress should be 25% (1/4), ignoring manual 99%"

    # Updating other fields or attempting manual progress override when checklist exists
    resp_override = client.patch(
        f"/api/tasks/{task.id}",
        headers=auth_headers(user.id),
        data=json.dumps({
            "title": "Renamed Checklist Task",
            "progress": 88
        }),
        content_type="application/json"
    )
    assert resp_override.status_code == 200
    assert resp_override.get_json()["progress"] == 25, "Manual progress override must be ignored when checklist exists"

    # Creation with checklist items also derives progress server-side
    resp_create = client.post(
        "/api/tasks",
        headers=auth_headers(user.id),
        data=json.dumps({
            "boardId": board.id,
            "title": "Created with Checklist",
            "checklist": [
                {"id": "c1", "title": "C1", "completed": True},
                {"id": "c2", "title": "C2", "completed": True},
            ],
            "progress": 10
        }),
        content_type="application/json"
    )
    assert resp_create.status_code == 201
    assert resp_create.get_json()["progress"] == 100, "Progress should be derived as 100% (2/2), ignoring 10"

    # If checklist is empty, manual progress is respected
    resp_empty = client.patch(
        f"/api/tasks/{task.id}",
        headers=auth_headers(user.id),
        data=json.dumps({
            "checklist": [],
            "progress": 42
        }),
        content_type="application/json"
    )
    assert resp_empty.status_code == 200
    assert resp_empty.get_json()["progress"] == 42

def test_oq_04_transfer_ownership_demotes_former_owner_to_admin(client, create_test_user, auth_headers):
    """
    OQ-04 / CD-04: Strict Single-Owner Model.
    When transferring ownership, the target member becomes 'owner' and the former owner's BoardMember.role
    must be demoted to 'admin'.
    """
    owner = create_test_user(email="oq04_owner@example.com")
    member = create_test_user(email="oq04_member@example.com")
    board = BoardService.create_board({"name": "OQ04 Board"}, owner.id)

    # Add member as editor
    BoardService.add_member(board.id, member.email, role="editor", actor_id=owner.id)
    # Accept invite so member is accepted
    bm_member = BoardMember.query.filter_by(board_id=board.id, user_id=member.id).first()
    bm_member.status = 'accepted'
    db.session.commit()

    # Pre-condition: owner has role 'owner', member has role 'editor'
    bm_owner = BoardMember.query.filter_by(board_id=board.id, user_id=owner.id).first()
    assert bm_owner.role == 'owner'
    assert BoardService.count_owners(board.id) == 1

    # Transfer ownership to member
    resp = client.post(
        f"/api/boards/{board.id}/transfer-ownership",
        headers=auth_headers(owner.id),
        data=json.dumps({"newOwnerId": member.id}),
        content_type="application/json"
    )
    assert resp.status_code == 200

    db.session.expire_all()
    updated_board = db.session.get(Board, board.id)
    assert updated_board.owner_id == member.id

    bm_member_after = BoardMember.query.filter_by(board_id=board.id, user_id=member.id).first()
    assert bm_member_after.role == 'owner'

    bm_owner_after = BoardMember.query.filter_by(board_id=board.id, user_id=owner.id).first()
    assert bm_owner_after.role == 'admin', "Former owner must be demoted to admin"
    assert BoardService.count_owners(board.id) == 1, "Only 1 owner should exist"

def test_oq_05_wip_limits_are_non_blocking_visual_telemetry(client, create_test_user, auth_headers):
    """
    OQ-05: WIP Limits as Soft Visual Telemetry.
    Columns with wipLimit do NOT block card creation or card moves on the server.
    """
    owner = create_test_user(email="oq05_owner@example.com")
    board = BoardService.create_board({
        "name": "OQ05 WIP Board",
        "columns": [
            {"id": "wip_col", "title": "WIP Column", "wipLimit": 1},
            {"id": "other_col", "title": "Other Column"}
        ]
    }, owner.id)

    # 1. Create 1st task in wip_col (meets limit)
    resp1 = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 1", "status": "wip_col"}),
        content_type="application/json"
    )
    assert resp1.status_code == 201

    # 2. Create 2nd task in wip_col (exceeds limit: 2 > 1) -> must not be blocked
    resp2 = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 2", "status": "wip_col"}),
        content_type="application/json"
    )
    assert resp2.status_code == 201, "Server must not block task creation when WIP limit is exceeded"

    # 3. Create 3rd task in other_col and move it to wip_col -> must not be blocked
    resp3 = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 3", "status": "other_col"}),
        content_type="application/json"
    )
    assert resp3.status_code == 201
    task3_id = resp3.get_json()["id"]

    resp_move = client.patch(
        f"/api/tasks/{task3_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"status": "wip_col"}),
        content_type="application/json"
    )
    assert resp_move.status_code == 200
    assert resp_move.get_json()["status"] == "wip_col", "Server must allow moving task into column exceeding WIP limit"

def test_oq_06_reorder_tasks_supports_progress_snapping_while_preserving_checklist(client, create_test_user, auth_headers):
    """
    OQ-06: Adaptive progress snapping during task reordering/movement.
    Server allows updating progress during reorder unless checklist items exist.
    """
    owner = create_test_user(email="oq06_owner@example.com")
    board = BoardService.create_board({"name": "OQ06 Progress Board"}, owner.id)

    # Create task without checklist
    resp = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Snapping Task", "status": "in_progress", "progress": 50}),
        content_type="application/json"
    )
    assert resp.status_code == 201
    task_id = resp.get_json()["id"]

    # Reorder task to done column with progress 100
    resp_snap_100 = client.patch(
        "/api/tasks/reorder",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "items": [{"id": task_id, "status": "done", "progress": 100, "position": 1000}]}),
        content_type="application/json"
    )
    assert resp_snap_100.status_code == 200
    db.session.expire_all()
    t = db.session.get(Task, task_id)
    assert t.status == "done"
    assert t.progress == 100

    # Reorder task to todo column with progress 0
    resp_snap_0 = client.patch(
        "/api/tasks/reorder",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "items": [{"id": task_id, "status": "todo", "progress": 0, "position": 1000}]}),
        content_type="application/json"
    )
    assert resp_snap_0.status_code == 200
    db.session.expire_all()
    t = db.session.get(Task, task_id)
    assert t.status == "todo"
    assert t.progress == 0

    # If checklist items exist, checklist derives progress and manual progress is ignored
    t.checklist = [{"id": "chk1", "title": "Check 1", "completed": True}]
    t.progress = 100
    db.session.commit()

    resp_snap_chk = client.patch(
        "/api/tasks/reorder",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "items": [{"id": task_id, "status": "todo", "progress": 0, "position": 1000}]}),
        content_type="application/json"
    )
    assert resp_snap_chk.status_code == 200
    db.session.expire_all()
    t = db.session.get(Task, task_id)
    assert t.progress == 100, "Checklist-locked progress priority must be preserved"



