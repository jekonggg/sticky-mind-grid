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
    del_resp = client.delete(f"/api/boards/{board_id}", headers=auth_headers(owner.id))
    assert del_resp.status_code == 200

    # Verify board, task, and memberships are gone
    assert db.session.get(Board, board_id) is None
    assert db.session.get(Task, "task-to-cascade") is None
    assert BoardMember.query.filter_by(board_id=board_id).count() == 0
