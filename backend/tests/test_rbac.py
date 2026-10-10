import json
from datetime import datetime, timedelta
from app import db
from app.models.activity import Activity
from app.models.board_member import BoardMember
from app.models.comment import Comment
from app.models.task import Task
from flask_jwt_extended import create_access_token

def setup_rbac_board(create_test_user, create_test_board):
    board, owner = create_test_board(name="RBAC Test Board")

    admin = create_test_user(email="admin@example.com", full_name="Admin User")
    member = create_test_user(email="member@example.com", full_name="Member User")
    viewer = create_test_user(email="viewer@example.com", full_name="Viewer User")
    outsider = create_test_user(email="outsider@example.com", full_name="Outsider User")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=member.id, role="member", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    return board, owner, admin, member, viewer, outsider

def test_rbac_owner_can_delete_board(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(owner.id)

    response = client.delete(f"/api/boards/{board.id}", headers=headers)
    assert response.status_code == 200

def test_rbac_admin_cannot_delete_board(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(admin.id)

    response = client.delete(f"/api/boards/{board.id}", headers=headers)
    assert response.status_code == 403

def test_rbac_member_cannot_delete_board(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(member.id)

    response = client.delete(f"/api/boards/{board.id}", headers=headers)
    assert response.status_code == 403

def test_rbac_viewer_cannot_delete_board(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(viewer.id)

    response = client.delete(f"/api/boards/{board.id}", headers=headers)
    assert response.status_code == 403

def test_rbac_admin_can_invite_member(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    new_user = create_test_user(email="newinvite@example.com")
    headers = auth_headers(admin.id)

    response = client.post(
        f"/api/boards/{board.id}/members",
        headers=headers,
        data=json.dumps({"email": new_user.email, "role": "member"}),
        content_type="application/json"
    )
    assert response.status_code == 201

def test_rbac_member_cannot_invite_member(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    new_user = create_test_user(email="newinvite2@example.com")
    headers = auth_headers(member.id)

    response = client.post(
        f"/api/boards/{board.id}/members",
        headers=headers,
        data=json.dumps({"email": new_user.email, "role": "member"}),
        content_type="application/json"
    )
    assert response.status_code == 403

def test_rbac_viewer_cannot_create_task(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(viewer.id)

    response = client.post(
        "/api/tasks",
        headers=headers,
        data=json.dumps({
            "boardId": board.id,
            "title": "Viewer Task Attempt",
            "columnId": "todo"
        }),
        content_type="application/json"
    )
    assert response.status_code == 403

def test_rbac_member_can_create_task(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(member.id)

    response = client.post(
        "/api/tasks",
        headers=headers,
        data=json.dumps({
            "boardId": board.id,
            "title": "Member Valid Task",
            "columnId": "todo",
            "priority": "medium"
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "Member Valid Task"

def test_rbac_outsider_cannot_access_board(client, create_test_user, create_test_board, auth_headers):
    board, owner, admin, member, viewer, outsider = setup_rbac_board(create_test_user, create_test_board)
    headers = auth_headers(outsider.id)

    response = client.get(f"/api/boards/{board.id}", headers=headers)
    assert response.status_code == 403

def test_rbac_unauthenticated_cannot_access(client, create_test_board):
    board, owner = create_test_board()
    response = client.get(f"/api/boards/{board.id}")
    assert response.status_code == 401

# ---------------------------------------------------------------------------
# Pending-invitee access regression tests.
# A pending BoardMember row must grant NO access anywhere.
# ---------------------------------------------------------------------------

def _add_membership(board_id, user_id, role="member", status="pending"):
    membership = BoardMember(board_id=board_id, user_id=user_id, role=role, status=status)
    db.session.add(membership)
    db.session.commit()
    return membership

def test_pending_invitee_cannot_view_tasks(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending@example.com")
    _add_membership(board.id, pending.id, status="pending")

    response = client.get(f"/api/tasks?boardId={board.id}", headers=auth_headers(pending.id))
    assert response.status_code == 403

def test_pending_invitee_cannot_create_task(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending2@example.com")
    _add_membership(board.id, pending.id, status="pending")

    response = client.post(
        "/api/tasks",
        headers=auth_headers(pending.id),
        data=json.dumps({"boardId": board.id, "title": "Sneaky Task"}),
        content_type="application/json"
    )
    assert response.status_code == 403

def test_pending_invitee_cannot_view_trash(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending3@example.com")
    _add_membership(board.id, pending.id, status="pending")

    response = client.get(f"/api/boards/{board.id}/trash", headers=auth_headers(pending.id))
    assert response.status_code == 403

def test_pending_invitee_cannot_post_activities(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending4@example.com")
    _add_membership(board.id, pending.id, status="pending")

    response = client.post(
        "/api/activities",
        headers=auth_headers(pending.id),
        data=json.dumps({"type": "create", "message": "spoofed", "boardId": board.id}),
        content_type="application/json"
    )
    assert response.status_code == 403

def test_pending_invitee_cannot_restore_task(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending5@example.com")
    _add_membership(board.id, pending.id, status="pending")

    task = Task(board_id=board.id, title="Deleted Task", is_deleted=True)
    db.session.add(task)
    db.session.commit()

    response = client.patch(f"/api/tasks/{task.id}/restore", headers=auth_headers(pending.id))
    assert response.status_code == 403

def test_pending_invitee_cannot_subscribe_to_sse(client, create_test_user, create_test_board):
    from flask_jwt_extended import create_access_token as _cat
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    pending = create_test_user(email="pending6@example.com")
    _add_membership(board.id, pending.id, status="pending")

    token = _cat(identity=str(pending.id))
    response = client.get(f"/api/boards/{board.id}/events?token={token}")
    assert response.status_code == 403

def test_owner_without_membership_row_can_view_tasks(client, create_test_user, create_test_board, app):
    """Owners keep access even if their membership row is missing (legacy boards)."""
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)

    # Remove the owner's membership row to simulate a legacy board
    BoardMember.query.filter_by(board_id=board.id, user_id=owner.id).delete()
    db.session.commit()

    token = create_access_token(identity=str(owner.id))
    response = client.get(
        f"/api/tasks?boardId={board.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_declined_member_cannot_view_tasks(client, create_test_user, create_test_board, auth_headers):
    board, owner, *_ = setup_rbac_board(create_test_user, create_test_board)
    declined = create_test_user(email="declined@example.com")
    _add_membership(board.id, declined.id, status="declined")

    response = client.get(f"/api/tasks?boardId={board.id}", headers=auth_headers(declined.id))
    assert response.status_code == 403

def test_member_cannot_move_task_into_foreign_board(client, create_test_user, create_test_board, auth_headers):
    """A member of board A must not relocate tasks into board B they don't belong to."""
    owner_a = create_test_user(email="ownera_move@example.com")
    owner_b = create_test_user(email="ownerb_move@example.com")
    board_a, _ = create_test_board(owner=owner_a, name="Move Source Board")
    board_b, _ = create_test_board(owner=owner_b, name="Move Target Board")

    member = create_test_user(email="mover@example.com", full_name="Board A Member")
    _add_membership(board_a.id, member.id, role="member", status="accepted")

    task_res = client.post(
        "/api/tasks",
        headers=auth_headers(member.id),
        data=json.dumps({"boardId": board_a.id, "title": "A Task"}),
        content_type="application/json"
    )
    assert task_res.status_code == 201
    task_id = task_res.get_json()["id"]

    # Hijack attempt into board B -> blocked
    res = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(member.id),
        data=json.dumps({"boardId": board_b.id}),
        content_type="application/json"
    )
    assert res.status_code == 403

    # Task stayed on board A
    fetched = client.get(f"/api/tasks/{task_id}", headers=auth_headers(member.id))
    assert fetched.get_json()["boardId"] == board_a.id

    # Sanity: ordinary update within board A still works
    ok = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(member.id),
        data=json.dumps({"title": "Renamed In Place"}),
        content_type="application/json"
    )
    assert ok.status_code == 200

def test_five_roles_setup_and_permissions(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="5 Roles Board")
    admin = create_test_user(email="admin5@example.com")
    editor = create_test_user(email="editor5@example.com")
    commenter = create_test_user(email="commenter5@example.com")
    viewer = create_test_user(email="viewer5@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # 1. Commenter & Viewer member list redaction (name and avatar only, no email)
    res_viewer = client.get(f"/api/boards/{board.id}/members", headers=auth_headers(viewer.id))
    assert res_viewer.status_code == 200
    members_data = res_viewer.get_json()
    for m in members_data:
        if m.get('user'):
            assert 'email' not in m['user']
            assert 'fullName' in m['user']

    # Owner gets full details (includes email)
    res_owner = client.get(f"/api/boards/{board.id}/members", headers=auth_headers(owner.id))
    assert res_owner.status_code == 200
    for m in res_owner.get_json():
        if m.get('user'):
            assert 'email' in m['user']

    # 2. Card Creation: Editor can create, Commenter and Viewer cannot
    res_ed_task = client.post(
        "/api/tasks",
        headers=auth_headers(editor.id),
        data=json.dumps({"boardId": board.id, "title": "Editor Task"}),
        content_type="application/json"
    )
    assert res_ed_task.status_code == 201
    task_id = res_ed_task.get_json()["id"]

    res_comm_task = client.post(
        "/api/tasks",
        headers=auth_headers(commenter.id),
        data=json.dumps({"boardId": board.id, "title": "Commenter Task"}),
        content_type="application/json"
    )
    assert res_comm_task.status_code == 403

    res_view_task = client.post(
        "/api/tasks",
        headers=auth_headers(viewer.id),
        data=json.dumps({"boardId": board.id, "title": "Viewer Task"}),
        content_type="application/json"
    )
    assert res_view_task.status_code == 403

    # 3. Comments: Commenter can comment, Viewer cannot
    res_comm_comment = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(commenter.id),
        data=json.dumps({"content": "Commenter note"}),
        content_type="application/json"
    )
    assert res_comm_comment.status_code == 201

    res_view_comment = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(viewer.id),
        data=json.dumps({"content": "Viewer attempt"}),
        content_type="application/json"
    )
    assert res_view_comment.status_code == 403

    # 4. Permanent delete card: Only Admin/Owner can permanent delete, Editor cannot
    res_ed_perm_del = client.delete(
        f"/api/tasks/{task_id}/permanent",
        headers=auth_headers(editor.id)
    )
    assert res_ed_perm_del.status_code == 403

    res_admin_perm_del = client.delete(
        f"/api/tasks/{task_id}/permanent",
        headers=auth_headers(admin.id)
    )
    assert res_admin_perm_del.status_code == 200

def test_admin_role_restrictions(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Admin Restriction Board")
    admin1 = create_test_user(email="admin1@example.com")
    admin2 = create_test_user(email="admin2@example.com")
    editor = create_test_user(email="editor_target@example.com")
    new_user = create_test_user(email="invite_target@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin1.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=admin2.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
    ])
    db.session.commit()

    # 1. Admin cannot invite with Admin or Owner role
    inv_admin = client.post(
        f"/api/boards/{board.id}/members",
        headers=auth_headers(admin1.id),
        data=json.dumps({"email": new_user.email, "role": "admin"}),
        content_type="application/json"
    )
    assert inv_admin.status_code == 400
    assert "Admins cannot grant Admin or Owner roles" in inv_admin.get_json()["error"]

    # Admin CAN invite with Editor, Commenter, or Viewer
    inv_editor = client.post(
        f"/api/boards/{board.id}/members",
        headers=auth_headers(admin1.id),
        data=json.dumps({"email": new_user.email, "role": "editor"}),
        content_type="application/json"
    )
    assert inv_editor.status_code == 201

    # 2. Admin cannot change role of an Owner
    change_owner = client.patch(
        f"/api/boards/{board.id}/members/{owner.id}",
        headers=auth_headers(admin1.id),
        data=json.dumps({"role": "editor"}),
        content_type="application/json"
    )
    assert change_owner.status_code == 400
    assert "Admins cannot change the role of Admins or Owners" in change_owner.get_json()["error"]

    # Admin cannot change role of another Admin
    change_admin = client.patch(
        f"/api/boards/{board.id}/members/{admin2.id}",
        headers=auth_headers(admin1.id),
        data=json.dumps({"role": "editor"}),
        content_type="application/json"
    )
    assert change_admin.status_code == 400

    # Admin cannot promote an Editor to Admin or Owner
    promote_editor = client.patch(
        f"/api/boards/{board.id}/members/{editor.id}",
        headers=auth_headers(admin1.id),
        data=json.dumps({"role": "admin"}),
        content_type="application/json"
    )
    assert promote_editor.status_code == 400
    assert "Admins cannot grant Admin or Owner roles" in promote_editor.get_json()["error"]

    # Admin CAN change Editor to Commenter or Viewer
    ok_change = client.patch(
        f"/api/boards/{board.id}/members/{editor.id}",
        headers=auth_headers(admin1.id),
        data=json.dumps({"role": "commenter"}),
        content_type="application/json"
    )
    assert ok_change.status_code == 200

    # 3. Admin cannot remove Owner or another Admin
    rem_owner = client.delete(f"/api/boards/{board.id}/members/{owner.id}", headers=auth_headers(admin1.id))
    assert rem_owner.status_code == 400
    assert "Admins can only remove members with Editor role or below" in rem_owner.get_json()["error"]

    rem_admin = client.delete(f"/api/boards/{board.id}/members/{admin2.id}", headers=auth_headers(admin1.id))
    assert rem_admin.status_code == 400

    # Admin CAN remove Editor/Commenter
    rem_ed = client.delete(f"/api/boards/{board.id}/members/{editor.id}", headers=auth_headers(admin1.id))
    assert rem_ed.status_code == 200

def test_sole_owner_protection_and_transfer(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Sole Owner Board")
    user2 = create_test_user(email="user2@example.com")
    db.session.add(BoardMember(board_id=board.id, user_id=user2.id, role="editor", status="accepted"))
    db.session.commit()

    # Sole owner cannot demote themselves
    demote_res = client.patch(
        f"/api/boards/{board.id}/members/{owner.id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"role": "editor"}),
        content_type="application/json"
    )
    assert demote_res.status_code == 400
    assert "A board must always have at least one Owner" in demote_res.get_json()["error"]

    # Sole owner cannot leave the board
    leave_res = client.delete(f"/api/boards/{board.id}/members/{owner.id}", headers=auth_headers(owner.id))
    assert leave_res.status_code == 400
    assert "A board must always have at least one Owner" in leave_res.get_json()["error"]

    # Sole owner cannot be deleted by transfer ownership to user2
    transfer_res = client.post(
        f"/api/boards/{board.id}/transfer-ownership",
        headers=auth_headers(owner.id),
        data=json.dumps({"userId": user2.id}),
        content_type="application/json"
    )
    assert transfer_res.status_code == 200

    # Now that user2 is owner, original owner CAN now leave or demote themselves!
    leave_ok = client.delete(f"/api/boards/{board.id}/members/{owner.id}", headers=auth_headers(owner.id))
    assert leave_ok.status_code == 200

def test_delete_column_rules(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Column Rules Board")
    admin = create_test_user(email="admin_col@example.com")
    db.session.add(BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"))
    db.session.commit()

    # Create active card in 'todo' column
    client.post(
        "/api/tasks",
        headers=auth_headers(admin.id),
        data=json.dumps({"boardId": board.id, "title": "Task in Todo", "columnId": "todo"}),
        content_type="application/json"
    )

    # Attempt to delete 'todo' column while containing active tasks -> rejected with 400
    remaining_cols = [c for c in board.columns if c["id"] != "todo"]
    del_col_res = client.patch(
        f"/api/boards/{board.id}",
        headers=auth_headers(admin.id),
        data=json.dumps({"columns": remaining_cols}),
        content_type="application/json"
    )
    assert del_col_res.status_code == 400
    assert "Cannot delete column" in del_col_res.get_json()["error"]

    # Delete an empty column (e.g. 'archive' if empty) -> allowed
    remaining_empty = [c for c in board.columns if c["id"] != "archive"]
    del_ok = client.patch(
        f"/api/boards/{board.id}",
        headers=auth_headers(admin.id),
        data=json.dumps({"columns": remaining_empty}),
        content_type="application/json"
    )
    assert del_ok.status_code == 200

def test_export_board_rules(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Export Board")
    admin = create_test_user(email="admin_exp@example.com")
    editor = create_test_user(email="editor_exp@example.com")
    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
    ])
    db.session.commit()

    # Editor cannot export
    res_ed = client.get(f"/api/boards/{board.id}/export", headers=auth_headers(editor.id))
    assert res_ed.status_code == 403

    # Admin and Owner can export
    res_ad = client.get(f"/api/boards/{board.id}/export", headers=auth_headers(admin.id))
    assert res_ad.status_code == 200
    assert "board" in res_ad.get_json()
    assert "tasks" in res_ad.get_json()

def test_task_modal_trash_and_purge_permissions(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Trash Perms Board")
    admin = create_test_user(email="admin_trash@example.com")
    editor = create_test_user(email="editor_trash@example.com")
    commenter = create_test_user(email="commenter_trash@example.com")
    viewer = create_test_user(email="viewer_trash@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # Editor creates a card
    c_res = client.post(
        "/api/tasks",
        headers=auth_headers(editor.id),
        data=json.dumps({"boardId": board.id, "title": "Card to Trash", "columnId": "todo"}),
        content_type="application/json"
    )
    assert c_res.status_code == 201
    task_id = c_res.get_json()["id"]

    # Editor deletes the card (soft delete -> goes to trash)
    del_res = client.delete(f"/api/tasks/{task_id}", headers=auth_headers(editor.id))
    assert del_res.status_code == 200

    # Viewer cannot view trash
    v_trash = client.get(f"/api/boards/{board.id}/trash", headers=auth_headers(viewer.id))
    assert v_trash.status_code == 403

    # Commenter cannot view trash
    c_trash = client.get(f"/api/boards/{board.id}/trash", headers=auth_headers(commenter.id))
    assert c_trash.status_code == 403

    # Editor can view trash
    e_trash = client.get(f"/api/boards/{board.id}/trash", headers=auth_headers(editor.id))
    assert e_trash.status_code == 200
    assert len(e_trash.get_json()) >= 1

    # Editor cannot permanently delete (purge) the card
    e_purge = client.delete(f"/api/tasks/{task_id}/permanent", headers=auth_headers(editor.id))
    assert e_purge.status_code == 403

    # Editor can restore the card
    e_restore = client.put(f"/api/tasks/{task_id}/restore", headers=auth_headers(editor.id))
    assert e_restore.status_code == 200

    # Editor deletes it again so Admin can test purge
    client.delete(f"/api/tasks/{task_id}", headers=auth_headers(editor.id))

    # Admin can permanently purge the card
    a_purge = client.delete(f"/api/tasks/{task_id}/permanent", headers=auth_headers(admin.id))
    assert a_purge.status_code == 200

def test_task_modal_move_to_another_board_permissions(client, create_test_user, create_test_board, auth_headers):
    owner_a = create_test_user(email="owner_cb_a@example.com")
    owner_b = create_test_user(email="owner_cb_b@example.com")
    board_a, _ = create_test_board(owner=owner_a, name="Board A")
    board_b, _ = create_test_board(owner=owner_b, name="Board B")
    user = create_test_user(email="crossboard_user@example.com")

    # User is Editor on board_a
    db.session.add(BoardMember(board_id=board_a.id, user_id=user.id, role="editor", status="accepted"))

    # User is only Viewer on board_b
    db.session.add(BoardMember(board_id=board_b.id, user_id=user.id, role="viewer", status="accepted"))
    db.session.commit()

    # Create task on board_a
    c_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner_a.id),
        data=json.dumps({"boardId": board_a.id, "title": "Move Me", "columnId": "todo"}),
        content_type="application/json"
    )
    assert c_res.status_code == 201
    task_id = c_res.get_json()["id"]

    # User attempts to move task to board_b (where they are only Viewer) -> 403
    mv_fail = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(user.id),
        data=json.dumps({"boardId": board_b.id}),
        content_type="application/json"
    )
    assert mv_fail.status_code == 403

    # Promote user to Editor on board_b
    mem_b = BoardMember.query.filter_by(board_id=board_b.id, user_id=user.id).first()
    mem_b.role = "editor"
    db.session.commit()

    # User attempts to move task to board_b (now Editor on target) -> 200
    mv_ok = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(user.id),
        data=json.dumps({"boardId": board_b.id}),
        content_type="application/json"
    )
    assert mv_ok.status_code == 200
    assert mv_ok.get_json()["boardId"] == board_b.id


def test_task_modal_fields_and_actions_permissions(client, create_test_user, create_test_board, auth_headers):
    """
    Verifies that task modal elements follow the exact 5-role permission rules:
    - Open modal, read all fields & activity feed: Owner, Admin, Editor, Commenter, Viewer -> Yes
    - Edit title, status, priority, progress, assignees, due date, description, archive:
      Owner, Admin, Editor -> Yes; Commenter, Viewer -> No (403)
    - Soft delete task: Owner, Admin, Editor -> Yes; Commenter, Viewer -> No (403)
    """
    board, owner = create_test_board(name="Modal Fields RBAC Board")
    admin = create_test_user(email="admin_mf@example.com")
    editor = create_test_user(email="editor_mf@example.com")
    commenter = create_test_user(email="commenter_mf@example.com")
    viewer = create_test_user(email="viewer_mf@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # Create task as owner
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Field Test Task", "columnId": "todo"}),
        content_type="application/json"
    )
    assert t_res.status_code == 201
    task_id = t_res.get_json()["id"]

    # 1. Open modal / read task: allowed for all 5 roles
    for u in [owner, admin, editor, commenter, viewer]:
        r = client.get(f"/api/tasks/{task_id}", headers=auth_headers(u.id))
        assert r.status_code == 200, f"User {u.email} failed to read task"
        assert r.get_json()["id"] == task_id

    # 2. Mutating fields: Blocked for Commenter and Viewer (403)
    for u in [commenter, viewer]:
        # Edit title
        r_title = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"title": "Hacked Title"}),
            content_type="application/json"
        )
        assert r_title.status_code == 403

        # Change status (column move)
        r_status = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"status": "in_progress"}),
            content_type="application/json"
        )
        assert r_status.status_code == 403

        # Set priority
        r_pri = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"priority": "high"}),
            content_type="application/json"
        )
        assert r_pri.status_code == 403

        # Update progress
        r_prog = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"progress": 75}),
            content_type="application/json"
        )
        assert r_prog.status_code == 403

        # Set due date
        r_due = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"dueDate": "2026-12-31T00:00:00"}),
            content_type="application/json"
        )
        assert r_due.status_code == 403

        # Edit description
        r_desc = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"description": "Unauthorized note"}),
            content_type="application/json"
        )
        assert r_desc.status_code == 403

        # Archive task
        r_arch = client.patch(
            f"/api/tasks/{task_id}",
            headers=auth_headers(u.id),
            data=json.dumps({"status": "archive"}),
            content_type="application/json"
        )
        assert r_arch.status_code == 403

        # Soft delete task
        r_del = client.delete(f"/api/tasks/{task_id}", headers=auth_headers(u.id))
        assert r_del.status_code == 403

    # 3. Mutating fields: Allowed for Editor, Admin, Owner
    # Editor edits title and description
    r_ed = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(editor.id),
        data=json.dumps({"title": "Editor Updated Title", "description": "Valid editor note"}),
        content_type="application/json"
    )
    assert r_ed.status_code == 200
    assert r_ed.get_json()["title"] == "Editor Updated Title"

    # Admin updates priority and progress
    r_ad = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(admin.id),
        data=json.dumps({"priority": "urgent", "progress": 90}),
        content_type="application/json"
    )
    assert r_ad.status_code == 200
    assert r_ad.get_json()["priority"] == "urgent"
    assert r_ad.get_json()["progress"] == 90

    # Owner archives task
    r_ow = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"status": "archive"}),
        content_type="application/json"
    )
    assert r_ow.status_code == 200
    assert r_ow.get_json()["status"] == "archive"


def test_assignee_eligibility_and_auto_unassign(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Assignee RBAC Board")
    admin = create_test_user(email="admin_asgn@example.com")
    editor = create_test_user(email="editor_asgn@example.com")
    commenter = create_test_user(email="commenter_asgn@example.com")
    viewer = create_test_user(email="viewer_asgn@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # Attempt to assign viewer -> 400
    res_v = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 1", "columnId": "todo", "assignedTo": viewer.id}),
        content_type="application/json"
    )
    assert res_v.status_code == 400
    assert "Editor role or above" in res_v.get_json()["error"]

    # Attempt to assign commenter -> 400
    res_c = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 1", "columnId": "todo", "assignedTo": commenter.id}),
        content_type="application/json"
    )
    assert res_c.status_code == 400

    # Assign editor -> 201
    res_e = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Task 1", "columnId": "todo", "assignedTo": editor.id}),
        content_type="application/json"
    )
    assert res_e.status_code == 201
    task_id = res_e.get_json()["id"]

    # Demote editor to commenter -> automatic unassign + log
    res_demote = client.patch(
        f"/api/boards/{board.id}/members/{editor.id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"role": "commenter"}),
        content_type="application/json"
    )
    assert res_demote.status_code == 200

    # Task assignee should now be None
    task = Task.query.get(task_id)
    assert task.assigned_to is None

    # Verify activity was logged
    act = Activity.query.filter_by(board_id=board.id, type="update").filter(Activity.message.like("%demoted to commenter%")).first()
    assert act is not None

    # Re-promote user to editor and re-assign
    client.patch(
        f"/api/boards/{board.id}/members/{editor.id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"role": "editor"}),
        content_type="application/json"
    )
    client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"assignedTo": editor.id}),
        content_type="application/json"
    )
    assert Task.query.get(task_id).assigned_to == editor.id

    # Remove editor from board -> automatic unassign + log
    res_remove = client.delete(
        f"/api/boards/{board.id}/members/{editor.id}",
        headers=auth_headers(owner.id)
    )
    assert res_remove.status_code == 200

    # Task assignee should now be None
    assert Task.query.get(task_id).assigned_to is None
    act_rem = Activity.query.filter(
        Activity.board_id == board.id,
        Activity.message.like("%removed from the board%")
    ).first()
    assert act_rem is not None


def test_comment_matrix_edit_and_delete_permissions(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Comment Matrix Board")
    admin = create_test_user(email="admin_cm@example.com")
    editor = create_test_user(email="editor_cm@example.com")
    commenter = create_test_user(email="commenter_cm@example.com")
    viewer = create_test_user(email="viewer_cm@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # Create task
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Comment Task", "columnId": "todo"}),
        content_type="application/json"
    )
    task_id = t_res.get_json()["id"]

    # Viewer cannot add comment (403)
    c_v = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(viewer.id),
        data=json.dumps({"content": "Viewer comment attempt"}),
        content_type="application/json"
    )
    assert c_v.status_code == 403

    # Commenter adds comment
    c_c = client.post(
        f"/api/tasks/{task_id}/comments",
        headers=auth_headers(commenter.id),
        data=json.dumps({"content": "Original Comment"}),
        content_type="application/json"
    )
    assert c_c.status_code == 201
    comment_id = c_c.get_json()["id"]

    # Other user (editor) cannot edit commenter's comment
    c_edit_fail = client.patch(
        f"/api/comments/{comment_id}",
        headers=auth_headers(editor.id),
        data=json.dumps({"content": "Tampered comment"}),
        content_type="application/json"
    )
    assert c_edit_fail.status_code == 403

    # Author (commenter) can edit their own comment
    c_edit_ok = client.patch(
        f"/api/comments/{comment_id}",
        headers=auth_headers(commenter.id),
        data=json.dumps({"content": "Updated comment by author"}),
        content_type="application/json"
    )
    assert c_edit_ok.status_code == 200
    json_comment = c_edit_ok.get_json()
    assert json_comment["content"] == "Updated comment by author"
    assert json_comment["isEdited"] is True
    assert json_comment["originalContent"] == "Original Comment"

    # Editor cannot delete commenter's comment
    del_ed = client.delete(f"/api/comments/{comment_id}", headers=auth_headers(editor.id))
    assert del_ed.status_code == 403

    # Admin can delete commenter's comment
    del_ad = client.delete(f"/api/comments/{comment_id}", headers=auth_headers(admin.id))
    assert del_ad.status_code == 200


def test_unified_status_column_move_logging(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Move Logging Board")
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Status Move Task", "columnId": "todo"}),
        content_type="application/json"
    )
    task_id = t_res.get_json()["id"]

    # Move via status dropdown patch (status equals column)
    res_patch = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({"columnId": "in-progress"}),
        content_type="application/json"
    )
    assert res_patch.status_code == 200

    act = Activity.query.filter_by(board_id=board.id, type="move").order_by(Activity.timestamp.desc()).first()
    assert act is not None
    assert "Moved \"Status Move Task\" from" in act.message


def test_cross_board_move_tenancy_and_assignee_rules(client, create_test_user, create_test_board, auth_headers):
    owner_a = create_test_user(email="cb_owner_a@example.com")
    owner_b = create_test_user(email="cb_owner_b@example.com")
    board_a, _ = create_test_board(owner=owner_a, name="Source Board")
    board_b, _ = create_test_board(owner=owner_b, name="Target Board")

    moving_user = create_test_user(email="cb_mover@example.com")
    source_assignee = create_test_user(email="cb_only_a@example.com")

    # moving_user is Editor on both boards
    db.session.add(BoardMember(board_id=board_a.id, user_id=moving_user.id, role="editor", status="accepted"))
    db.session.add(BoardMember(board_id=board_b.id, user_id=moving_user.id, role="editor", status="accepted"))

    # source_assignee is Editor only on board_a
    db.session.add(BoardMember(board_id=board_a.id, user_id=source_assignee.id, role="editor", status="accepted"))
    db.session.commit()

    # Create task on board_a assigned to source_assignee
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner_a.id),
        data=json.dumps({"boardId": board_a.id, "title": "Tenancy Task", "columnId": "todo", "assignedTo": source_assignee.id}),
        content_type="application/json"
    )
    task_id = t_res.get_json()["id"]

    # moving_user moves task to board_b
    mv_res = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(moving_user.id),
        data=json.dumps({"boardId": board_b.id}),
        content_type="application/json"
    )
    assert mv_res.status_code == 200
    moved_task = Task.query.get(task_id)
    assert moved_task.board_id == board_b.id
    # Tenancy rule: assignee removed because not member/editor of target board
    assert moved_task.assigned_to is None

    # Target board activity: "moved from another board" without source board name
    target_act = Activity.query.filter_by(board_id=board_b.id, type="move").filter(Activity.message.like("%moved from another board%")).first()
    assert target_act is not None
    assert "Card \"Tenancy Task\" moved from another board" in target_act.message
    assert "Source Board" not in target_act.message


def test_activity_feed_board_vs_card_permissions(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Activity Perms Board")
    admin = create_test_user(email="admin_act@example.com")
    editor = create_test_user(email="editor_act@example.com")
    commenter = create_test_user(email="commenter_act@example.com")
    viewer = create_test_user(email="viewer_act@example.com")

    db.session.add_all([
        BoardMember(board_id=board.id, user_id=admin.id, role="admin", status="accepted"),
        BoardMember(board_id=board.id, user_id=editor.id, role="editor", status="accepted"),
        BoardMember(board_id=board.id, user_id=commenter.id, role="commenter", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    # Full board activity feed: Owner and Admin -> 200; Editor, Commenter, Viewer -> 403
    for u in [owner, admin]:
        r = client.get(f"/api/activities?boardId={board.id}", headers=auth_headers(u.id))
        assert r.status_code == 200

    for u in [editor, commenter, viewer]:
        r = client.get(f"/api/activities?boardId={board.id}", headers=auth_headers(u.id))
        assert r.status_code == 403

    # Card-specific history (?taskTitle=...): Allowed for all 5 roles
    for u in [owner, admin, editor, commenter, viewer]:
        r = client.get(f"/api/activities?boardId={board.id}&taskTitle=Sample", headers=auth_headers(u.id))
        assert r.status_code == 200

    # Immutability: Delete / clear log entries is blocked (403) for all roles
    for u in [owner, admin, editor, commenter, viewer]:
        r_del = client.delete(f"/api/activities?boardId={board.id}", headers=auth_headers(u.id))
        assert r_del.status_code == 403


def test_soft_delete_30_day_purge_rule(client, create_test_user, create_test_board, auth_headers):
    board, owner = create_test_board(name="Trash Purge Board")

    # Create task
    t_res = client.post(
        "/api/tasks",
        headers=auth_headers(owner.id),
        data=json.dumps({"boardId": board.id, "title": "Old Deleted Task", "columnId": "todo"}),
        content_type="application/json"
    )
    task_id = t_res.get_json()["id"]

    # Soft delete task
    client.delete(f"/api/tasks/{task_id}", headers=auth_headers(owner.id))

    # Manually backdate deleted_at to 31 days ago
    task = Task.query.get(task_id)
    task.deleted_at = datetime.utcnow() - timedelta(days=31)
    db.session.commit()

    # When querying trash, tasks older than 30 days are automatically purged
    r = client.get(f"/api/boards/{board.id}/trash", headers=auth_headers(owner.id))
    assert r.status_code == 200
    # Task should have been purged from DB
    assert Task.query.get(task_id) is None




