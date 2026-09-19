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
