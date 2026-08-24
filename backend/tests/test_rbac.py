import json
from app import db
from app.models.board_member import BoardMember
from app.models.task import Task

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
