import io
import pytest
from app import db
from app.models.user import User
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.board_invitation import BoardInvitation
from app.models.task import Task
from app.models.comment import Comment
from app.models.activity import Activity
from app.services.board_service import BoardService
from app.services.user_service import UserService
from app.services.file_service import FileService

def test_guest_visibility_and_board_isolation(client, create_test_user, auth_headers):
    """Members only see other members of boards they belong to; no cross-board user leaking."""
    user1 = create_test_user(email="alice@company.com", full_name="Alice")
    user2 = create_test_user(email="bob@guest.com", full_name="Bob")
    user3 = create_test_user(email="charlie@other.com", full_name="Charlie")

    # Board A owned by Alice, Bob is a member
    board_a = Board(name="Board A", owner_id=user1.id)
    db.session.add(board_a)
    db.session.commit()
    BoardMember.query.filter_by(board_id=board_a.id, user_id=user1.id).delete()
    db.session.add(BoardMember(board_id=board_a.id, user_id=user1.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board_a.id, user_id=user2.id, role="viewer", status="accepted"))

    # Board B owned by Charlie (no Alice or Bob)
    board_b = Board(name="Board B", owner_id=user3.id)
    db.session.add(board_b)
    db.session.commit()
    db.session.add(BoardMember(board_id=board_b.id, user_id=user3.id, role="owner", status="accepted"))
    db.session.commit()

    # Bob asks for teammates
    res = client.get("/api/users/teammates", headers=auth_headers(user2.id))
    assert res.status_code == 200
    data = res.get_json()

    # Bob sees Alice (shares Board A)
    emails = [t["email"] for t in data]
    assert "alice@company.com" in emails
    # Bob MUST NOT see Charlie (who is only on Board B)
    assert "charlie@other.com" not in emails

def test_user_profile_leakage_redaction_for_viewers(client, create_test_user, auth_headers):
    """Viewers and commenters receive redacted email info (display name only)."""
    admin = create_test_user(email="admin@board.com", full_name="Admin User")
    viewer = create_test_user(email="viewer@guest.com", full_name="Guest Viewer")
    member = create_test_user(email="secret_member@corp.com", full_name="Member Dave")

    board = Board(name="Project Board", owner_id=admin.id)
    db.session.add(board)
    db.session.commit()

    db.session.add(BoardMember(board_id=board.id, user_id=admin.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=member.id, role="editor", status="accepted"))
    
    # Also an unregistered pending invite
    BoardService.add_member(board.id, "pending_external@vendor.com", role="viewer", actor_id=admin.id)
    db.session.commit()

    # 1. Admin gets members: full emails are visible
    admin_res = client.get(f"/api/boards/{board.id}/members", headers=auth_headers(admin.id))
    assert admin_res.status_code == 200
    admin_members = admin_res.get_json()
    dave_admin_view = next(m for m in admin_members if m["userId"] == member.id)
    assert dave_admin_view["user"]["email"] == "secret_member@corp.com"

    # 2. Viewer gets members: emails are redacted
    viewer_res = client.get(f"/api/boards/{board.id}/members", headers=auth_headers(viewer.id))
    assert viewer_res.status_code == 200
    viewer_members = viewer_res.get_json()
    dave_viewer_view = next(m for m in viewer_members if m["userId"] == member.id)
    assert "email" not in dave_viewer_view["user"] or dave_viewer_view["user"]["email"] is None
    assert dave_viewer_view["user"]["fullName"] == "Member Dave"

    # Pending invite seen by viewer must not leak raw email or username
    pending_viewer_view = next(m for m in viewer_members if m.get("isInvitation"))
    assert pending_viewer_view["user"]["email"] is None
    assert pending_viewer_view["user"]["fullName"] == "Invited Guest"

def test_account_deletion_auto_promotes_oldest_admin(create_test_user):
    """When a board owner deletes account, auto-promote oldest admin to owner."""
    owner = create_test_user(email="owner1@smg.com", full_name="Original Owner")
    admin1 = create_test_user(email="admin1@smg.com", full_name="First Admin")
    editor1 = create_test_user(email="editor1@smg.com", full_name="Editor Guy")

    board = Board(name="Multi Member Board", owner_id=owner.id)
    db.session.add(board)
    db.session.commit()

    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=admin1.id, role="admin", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=editor1.id, role="editor", status="accepted"))
    db.session.commit()

    # Owner deletes account
    success, err = UserService.delete_account(owner.id)
    assert success is True

    # Board still exists and admin1 is now owner
    refreshed_board = db.session.get(Board, board.id)
    assert refreshed_board is not None
    assert refreshed_board.owner_id == admin1.id

    admin1_membership = BoardMember.query.filter_by(board_id=board.id, user_id=admin1.id).first()
    assert admin1_membership.role == "owner"

def test_account_deletion_no_admin_promotes_oldest_member(create_test_user):
    """When no admin exists, oldest editor/member is promoted to owner."""
    owner = create_test_user(email="owner2@smg.com", full_name="Owner Two")
    member = create_test_user(email="member2@smg.com", full_name="Member Two")

    board = Board(name="Member Board", owner_id=owner.id)
    db.session.add(board)
    db.session.commit()

    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=member.id, role="member", status="accepted"))
    db.session.commit()

    # Owner deletes account
    success, err = UserService.delete_account(owner.id)
    assert success is True

    refreshed_board = db.session.get(Board, board.id)
    assert refreshed_board is not None
    assert refreshed_board.owner_id == member.id

    member_membership = BoardMember.query.filter_by(board_id=board.id, user_id=member.id).first()
    assert member_membership.role == "owner"

def test_account_deletion_sole_owner_removes_board(create_test_user):
    """When a sole owner with no other members deletes account, board is cleanly deleted."""
    owner = create_test_user(email="soleowner@smg.com", full_name="Sole Owner")
    board = Board(name="Solo Board", owner_id=owner.id)
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.commit()

    success, err = UserService.delete_account(owner.id)
    assert success is True

    assert db.session.get(Board, board.id) is None

def test_authored_content_preserved_as_former_member(create_test_user):
    """Tasks, comments, and activities authored by deleted users are preserved as Former member."""
    author = create_test_user(email="author@smg.com", full_name="Author Alice")
    teammate = create_test_user(email="teammate@smg.com", full_name="Teammate Tom")

    board = Board(name="Content Board", owner_id=teammate.id)
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=teammate.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=author.id, role="editor", status="accepted"))
    db.session.commit()

    task = Task(board_id=board.id, title="Important RFC", created_by=author.id, assigned_to=author.id)
    db.session.add(task)
    db.session.commit()

    comment = Comment(task_id=task.id, user_id=author.id, content="Here is my feedback on the design.")
    db.session.add(comment)

    activity = Activity(type="create", task_title=task.title, message="Author Alice created task", board_id=board.id, user_id=author.id)
    db.session.add(activity)
    db.session.commit()

    # Author deletes account
    success, err = UserService.delete_account(author.id)
    assert success is True

    # 1. Task still exists and assignment is cleared, creator displays as Former member
    refreshed_task = db.session.get(Task, task.id)
    assert refreshed_task is not None
    assert refreshed_task.assigned_to is None
    task_dict = refreshed_task.to_dict()
    assert task_dict["creator"]["fullName"] == "Former member"

    # 2. Comment still exists and displays as Former member
    refreshed_comment = db.session.get(Comment, comment.id)
    assert refreshed_comment is not None
    comment_dict = refreshed_comment.to_dict()
    assert comment_dict["user"]["fullName"] == "Former member"
    assert comment_dict["content"] == "Here is my feedback on the design."

    # 3. Activity audit trail still exists and displays as Former member
    refreshed_activity = db.session.get(Activity, activity.id)
    assert refreshed_activity is not None
    activity_dict = refreshed_activity.to_dict()
    assert activity_dict["user"]["fullName"] == "Former member"

def test_permission_checked_file_attachments(client, create_test_user, auth_headers):
    """File attachment URLs require authentication and check board membership."""
    alice = create_test_user(email="alice_files@smg.com", full_name="Alice Files")
    bob = create_test_user(email="bob_files@smg.com", full_name="Bob Files")
    stranger = create_test_user(email="stranger@other.com", full_name="Stranger Steve")

    board = Board(name="Attachment Board", owner_id=alice.id)
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=alice.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=bob.id, role="viewer", status="accepted"))
    db.session.commit()

    # Upload file
    upload_res = client.post(
        "/api/files/upload",
        headers={"Authorization": f"Bearer {auth_headers(alice.id)['Authorization'].split()[1]}"},
        data={"file": (io.BytesIO(b"Confidential Report Content"), "report.pdf")},
        content_type="multipart/form-data"
    )
    assert upload_res.status_code == 201
    file_info = upload_res.get_json()
    stored_name = file_info["storedName"]

    # Attach to task on Board
    task = Task(
        board_id=board.id,
        title="Review confidential report",
        attachments=[file_info]
    )
    db.session.add(task)
    db.session.commit()

    # 1. Unauthenticated request -> 401
    unauth_res = client.get(f"/api/files/{stored_name}")
    assert unauth_res.status_code == 401

    # 2. Stranger (not on board) -> 403 Forbidden
    stranger_res = client.get(f"/api/files/{stored_name}", headers=auth_headers(stranger.id))
    assert stranger_res.status_code == 403

    # 3. Board member (Bob) -> 200 OK
    bob_res = client.get(f"/api/files/{stored_name}", headers=auth_headers(bob.id))
    assert bob_res.status_code == 200
    assert bob_res.data == b"Confidential Report Content"

    # 4. If Bob is removed from board, subsequent access returns 403
    BoardService.remove_member(board.id, bob.id, actor_id=alice.id)
    db.session.commit()

    bob_removed_res = client.get(f"/api/files/{stored_name}", headers=auth_headers(bob.id))
    assert bob_removed_res.status_code == 403

def test_board_workspace_id_field(create_test_user):
    """Board supports optional workspace_id for multi-tenancy organization scaling."""
    user = create_test_user(email="ws_owner@smg.com", full_name="Workspace Owner")
    board = Board(name="Company Board", owner_id=user.id, workspace_id="workspace-uuid-123")
    db.session.add(board)
    db.session.commit()

    saved_board = db.session.get(Board, board.id)
    assert saved_board.workspace_id == "workspace-uuid-123"
    assert saved_board.to_dict()["workspaceId"] == "workspace-uuid-123"


def test_section_f_mentions_followers_mute_and_comment_audit(client, create_test_user, auth_headers):
    """
    Section F:
    - @mentions only notify and resolve accepted board members (never non-members or pending invitees).
    - Card followers receive task_comment and task_move notifications.
    - Per-board mute suppresses notifications for that board.
    - Comment edits and deletions record original content in the immutable Activity audit log.
    - Viewers cannot post comments (403).
    """
    from app.models.notification import Notification

    owner = create_test_user(email="f_owner@smg.com", full_name="Owner Olivia")
    editor = create_test_user(email="f_editor@smg.com", full_name="Editor Ethan")
    viewer = create_test_user(email="f_viewer@smg.com", full_name="Viewer Vicky")
    outsider = create_test_user(email="f_outsider@smg.com", full_name="Outsider Oscar")

    board = Board(
        name="Section F Board",
        owner_id=owner.id,
        columns=[
            {"id": "todo", "title": "To Do"},
            {"id": "done", "title": "Done"},
        ],
    )
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"))
    db.session.commit()

    # Create task as owner
    task_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        json={"boardId": board.id, "title": "Design Notifications", "status": "todo"},
    )
    assert task_res.status_code == 201
    task_id = task_res.get_json()["id"]

    # Viewer cannot comment (403)
    viewer_comment_res = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(viewer.id),
        json={"content": "Can I comment?"},
    )
    assert viewer_comment_res.status_code == 403

    # Viewer can follow the card
    follow_res = client.post(
        f"/api/tasks/{task_id}/follow",
        headers=auth_headers(viewer.id),
        json={"follow": True},
    )
    assert follow_res.status_code == 200
    assert viewer.id in follow_res.get_json()["followers"]

    # Editor posts a comment mentioning @Editor Ethan (self), @Owner Olivia (member), and @Outsider Oscar (non-member)
    comment_res = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(editor.id),
        json={"content": "Hello @Owner Olivia and @Outsider Oscar!"},
    )
    assert comment_res.status_code == 201
    comment_data = comment_res.get_json()
    assert owner.id in comment_data["mentions"]
    assert outsider.id not in comment_data["mentions"]

    # Outsider MUST NOT receive a mention notification
    assert Notification.query.filter_by(user_id=outsider.id).count() == 0
    # Owner received a mention notification
    assert Notification.query.filter_by(user_id=owner.id, type="mention").count() == 1
    # Viewer (following the card) received a task_comment notification
    assert Notification.query.filter_by(user_id=viewer.id, type="task_comment").count() == 1

    # Viewer mutes the board
    mute_res = client.patch(
        f"/api/boards/{board.id}/mute",
        headers=auth_headers(viewer.id),
        json={"isMuted": True},
    )
    assert mute_res.status_code == 200
    # Editor moves card from To Do to Done -> Owner (creator/follower with notifyCardMoves=True by default) gets task_move, but muted Viewer does NOT
    move_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(editor.id),
        json={"status": "done"},
    )
    assert move_res.status_code == 200
    assert Notification.query.filter_by(user_id=owner.id, type="task_move").count() == 1
    assert Notification.query.filter_by(user_id=viewer.id, type="task_move").count() == 0

    # Editor edits their comment -> shows isEdited and logs before_value / after_value in Activity
    comment_id = comment_data["id"]
    edit_res = client.patch(
        f"/api/comments/{comment_id}",
        headers=auth_headers(editor.id),
        json={"content": "Updated comment text"},
    )
    assert edit_res.status_code == 200
    edited_comment = edit_res.get_json()
    assert edited_comment["isEdited"] is True
    assert edited_comment["originalContent"] == "Hello @Owner Olivia and @Outsider Oscar!"

    # Owner deletes Editor's comment -> original text preserved in Activity audit log
    del_res = client.delete(
        f"/api/comments/{comment_id}",
        headers=auth_headers(owner.id),
    )
    assert del_res.status_code == 200

    activities = Activity.query.filter_by(board_id=board.id, target_type="comment").all()
    assert any(a.before_value == "Hello @Owner Olivia and @Outsider Oscar!" and a.after_value == "Updated comment text" for a in activities)
    assert any(a.type == "delete" and a.before_value == "Hello @Owner Olivia and @Outsider Oscar!" for a in activities)


def test_section_g_malware_scan_quotas_and_file_retention(client, app, create_test_user, auth_headers):
    """
    Section G:
    - Virus/malware scan rejects EICAR signature, PE executables, and script payloads.
    - Storage quotas per board and per owner are enforced.
    - Staging files are only accessible to their uploader.
    - Files remain intact when archived or soft-deleted in Trash, and are deleted from disk upon permanent deletion.
    """
    import os
    from app.services.file_service import UPLOAD_FOLDER

    owner = create_test_user(email="g_owner@smg.com", full_name="Owner Grace")
    other = create_test_user(email="g_other@smg.com", full_name="Other User")

    board = Board(name="Section G Board", owner_id=owner.id)
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.commit()

    # 1. EICAR virus test file rejected
    eicar_bytes = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    eicar_res = client.post(
        "/api/files/upload",
        headers=auth_headers(owner.id),
        data={"file": (io.BytesIO(eicar_bytes), "infected.txt")},
        content_type="multipart/form-data",
    )
    assert eicar_res.status_code == 400
    assert "EICAR" in eicar_res.get_json()["error"]

    # 2. Disguised Windows PE executable rejected
    pe_res = client.post(
        "/api/files/upload",
        headers=auth_headers(owner.id),
        data={"file": (io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00"), "disguised.pdf")},
        content_type="multipart/form-data",
    )
    assert pe_res.status_code == 400
    assert "Executable" in pe_res.get_json()["error"]

    # 3. Clean file upload succeeds and unattached staging file is restricted to uploader
    clean_res = client.post(
        f"/api/files/upload?boardId={board.id}",
        headers=auth_headers(owner.id),
        data={"file": (io.BytesIO(b"Clean attachment content 12345"), "notes.txt")},
        content_type="multipart/form-data",
    )
    assert clean_res.status_code == 201
    att_info = clean_res.get_json()
    stored_name = att_info["storedName"]
    disk_path = os.path.join(UPLOAD_FOLDER, stored_name)
    assert os.path.exists(disk_path)

    # Other user cannot access unattached staging file
    other_staging_res = client.get(f"/api/files/{stored_name}", headers=auth_headers(other.id))
    assert other_staging_res.status_code == 403

    # Uploader can access staging file
    owner_staging_res = client.get(f"/api/files/{stored_name}", headers=auth_headers(owner.id))
    assert owner_staging_res.status_code == 200
    owner_staging_res.close()

    # 4. Storage quota check
    orig_board_quota = app.config.get("MAX_BOARD_STORAGE_BYTES")
    try:
        app.config["MAX_BOARD_STORAGE_BYTES"] = 10  # 10 bytes quota
        quota_res = client.post(
            "/api/tasks",
            headers=auth_headers(owner.id),
            json={"boardId": board.id, "title": "Over Quota Task", "attachments": [att_info]},
        )
        assert quota_res.status_code == 400
        assert "quota exceeded" in quota_res.get_json()["error"].lower()
    finally:
        app.config["MAX_BOARD_STORAGE_BYTES"] = orig_board_quota

    # 5. File retention on archive / soft-delete vs permanent delete
    task_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        json={"boardId": board.id, "title": "Retention Task", "attachments": [att_info]},
    )
    assert task_res.status_code == 201
    task_id = task_res.get_json()["id"]

    # Archive task -> file still exists
    client.patch(f"/api/tasks/{task_id}", headers=auth_headers(owner.id), json={"status": "archive"})
    assert os.path.exists(disk_path)

    # Soft delete to trash -> file still exists (for 30-day retention)
    client.delete(f"/api/tasks/{task_id}", headers=auth_headers(owner.id))
    assert os.path.exists(disk_path)

    # Permanent delete -> physical file removed from disk
    perm_res = client.delete(f"/api/tasks/{task_id}/permanent", headers=auth_headers(owner.id))
    assert perm_res.status_code == 200
    assert not os.path.exists(disk_path)


def test_section_h_immutable_activity_log_former_member_and_visibility(client, create_test_user, auth_headers):
    """
    Section H:
    - Activity log is append-only and immutable (DELETE/PUT/PATCH return 403 even for Owner).
    - Leaving a board anonymizes historical Activity, Comment, and Task creator entries as 'Former member'.
    - Full board log is restricted to Admin/Owner (403 for Viewer/Editor), while card history is accessible to Viewer+.
    """
    owner = create_test_user(email="h_owner@smg.com", full_name="Owner Henry")
    editor = create_test_user(email="h_editor@smg.com", full_name="Editor Emma")
    viewer = create_test_user(email="h_viewer@smg.com", full_name="Viewer Victor")

    board = Board(name="Section H Board", owner_id=owner.id)
    db.session.add(board)
    db.session.commit()
    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"))
    db.session.add(BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"))
    db.session.commit()

    # Editor creates a task and comments on it
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(editor.id),
        json={"boardId": board.id, "title": "Audit Card"},
    )
    assert t_res.status_code == 201
    task_id = t_res.get_json()["id"]

    c_res = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(editor.id),
        json={"content": "Editor comment before leaving"},
    )
    assert c_res.status_code == 201

    # 1. Immutability: Owner cannot DELETE, PUT, or PATCH /api/activities
    assert client.delete(f"/api/activities?boardId={board.id}", headers=auth_headers(owner.id)).status_code == 403
    assert client.put("/api/activities", headers=auth_headers(owner.id), json={}).status_code == 403
    assert client.patch("/api/activities", headers=auth_headers(owner.id), json={}).status_code == 403

    # 2. Visibility: Viewer and Editor get 403 on full board log, but 200 on card-specific history
    assert client.get(f"/api/activities?boardId={board.id}", headers=auth_headers(viewer.id)).status_code == 403
    assert client.get(f"/api/activities?boardId={board.id}", headers=auth_headers(editor.id)).status_code == 403
    assert client.get(f"/api/activities?boardId={board.id}", headers=auth_headers(owner.id)).status_code == 200

    card_hist_res = client.get(
        f"/api/activities?boardId={board.id}&taskId={task_id}",
        headers=auth_headers(viewer.id),
    )
    assert card_hist_res.status_code == 200
    card_hist = card_hist_res.get_json()
    assert len(card_hist) >= 2

    # 3. Editor leaves the board -> historical Activity, Comment, and Task creator show as 'Former member'
    leave_res = client.delete(f"/api/boards/{board.id}/members/{editor.id}", headers=auth_headers(editor.id))
    assert leave_res.status_code == 200

    after_leave_hist = client.get(
        f"/api/activities?boardId={board.id}&taskId={task_id}",
        headers=auth_headers(viewer.id),
    ).get_json()
    editor_acts = [a for a in after_leave_hist if a["userId"] == editor.id]
    assert len(editor_acts) >= 1
    assert all(a["user"]["fullName"] == "Former member" for a in editor_acts)

    after_leave_comments = client.get(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(viewer.id),
    ).get_json()
    assert after_leave_comments[0]["user"]["fullName"] == "Former member"

    after_leave_task = client.get(
        f"/api/tasks/{task_id}",
        headers=auth_headers(viewer.id),
    ).get_json()
    assert after_leave_task["creator"]["fullName"] == "Former member"

