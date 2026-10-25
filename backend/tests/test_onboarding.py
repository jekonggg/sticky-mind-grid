import json

import pytest

from app import db
from app.models.activity import Activity
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.user_onboarding import BoardRoleTip, OnboardingEvent, UserOnboarding
from app.services.board_service import BoardService
from app.services.onboarding_service import OnboardingService


def _register(client, email="onboard@example.com"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!"},
    )


def _make_onboarding_user(create_test_user, email, status="not_started"):
    user = create_test_user(email=email)
    row = UserOnboarding(user_id=user.id, status=status)
    db.session.add(row)
    db.session.commit()
    return user, row


def test_missing_onboarding_row_is_not_applicable(client, create_test_user, auth_headers):
    user = create_test_user(email="legacy-onboarding@example.com")
    response = client.get("/api/users/me/onboarding", headers=auth_headers(user.id))
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "not_applicable"
    assert data["enabled"] is True
    assert data["starterBoardId"] is None
    assert UserOnboarding.query.filter_by(user_id=user.id).first() is None


def test_registration_creates_not_started_and_skip_creates_no_board(
    client, create_test_user, auth_headers
):
    response = _register(client, "new-onboarding@example.com")
    assert response.status_code == 201

    user_id = response.get_json()["user"]["id"]
    row = UserOnboarding.query.filter_by(user_id=user_id).first()
    assert row is not None
    assert row.status == "not_started"

    skip = client.post(
        "/api/users/me/onboarding/skip",
        headers=auth_headers(user_id),
        json={"reason": "question"},
    )
    assert skip.status_code == 200
    assert skip.get_json()["onboarding"]["status"] == "skipped"
    assert Board.query.filter_by(owner_id=user_id).count() == 0

    state = client.get("/api/users/me/onboarding", headers=auth_headers(user_id)).get_json()
    assert state["status"] == "skipped"
    assert state["steps"][0]["completed"] is False


def test_start_is_idempotent_and_creates_one_starter_board(
    client, create_test_user, auth_headers
):
    user, _ = _make_onboarding_user(create_test_user, "starter-idempotent@example.com")

    first = client.post(
        "/api/users/me/onboarding/start",
        headers=auth_headers(user.id),
        json={"template": "personal", "userId": "someone-else", "stepTaskCompletedAt": "2026-01-01"},
    )
    assert first.status_code == 201
    payload = first.get_json()
    board_id = payload["board"]["id"]
    assert payload["onboarding"]["status"] == "in_progress"
    assert payload["onboarding"]["steps"][0]["completed"] is True
    assert payload["onboarding"]["steps"][1]["completed"] is False

    second = client.post(
        "/api/users/me/onboarding/start",
        headers=auth_headers(user.id),
        json={"template": "team"},
    )
    assert second.status_code == 201
    assert second.get_json()["board"]["id"] == board_id
    assert Board.query.filter_by(owner_id=user.id).count() == 1

    board = db.session.get(Board, board_id)
    assert board.owner_id == user.id
    assert any(col.get("isDone") for col in board.columns)
    assert sum(1 for col in board.columns if col.get("isDone")) == 1
    assert BoardMember.query.filter_by(board_id=board_id, user_id=user.id, role="owner").first()
    assert Activity.query.filter_by(board_id=board_id, type="create").first()

    state = client.get("/api/users/me/onboarding", headers=auth_headers(user.id)).get_json()
    assert state["starterBoardId"] == board_id
    assert state["template"] == "personal"


def test_checklist_steps_latch_after_task_creation_completion_and_deletion(
    client, create_test_user, auth_headers
):
    user, _ = _make_onboarding_user(create_test_user, "latch@example.com")
    start = client.post(
        "/api/users/me/onboarding/start",
        headers=auth_headers(user.id),
        json={"template": "team"},
    )
    board_id = start.get_json()["board"]["id"]

    task_response = client.post(
        "/api/tasks",
        headers=auth_headers(user.id),
        json={"boardId": board_id, "title": "My first task", "priority": "medium"},
    )
    assert task_response.status_code == 201
    task_id = task_response.get_json()["id"]

    after_create = client.get("/api/users/me/onboarding", headers=auth_headers(user.id)).get_json()
    assert after_create["steps"][1]["completed"] is True
    assert after_create["steps"][2]["completed"] is False

    moved = client.patch(
        f"/api/tasks/{task_id}",
        headers=auth_headers(user.id),
        json={"status": "done"},
    )
    assert moved.status_code == 200
    assert moved.get_json()["isDone"] is True
    assert moved.get_json()["progress"] == 100

    completed = client.get("/api/users/me/onboarding", headers=auth_headers(user.id)).get_json()
    assert completed["status"] == "completed"
    assert all(step["completed"] for step in completed["steps"])

    # Deleting the task and the board must never regress the latched steps.
    client.delete(f"/api/tasks/{task_id}", headers=auth_headers(user.id))
    db.session.get(Board, board_id).is_deleted = True
    db.session.commit()

    after_delete = client.get("/api/users/me/onboarding", headers=auth_headers(user.id)).get_json()
    assert after_delete["status"] == "completed"
    assert all(step["completed"] for step in after_delete["steps"])

    events = OnboardingEvent.query.filter_by(user_id=user.id).all()
    event_columns = {col.name for col in OnboardingEvent.__table__.columns}
    assert "board_name" not in event_columns
    assert "task_title" not in event_columns
    serialized = json.dumps([event.to_dict() for event in events])
    assert "My first task" not in serialized
    assert "Team Project" not in serialized
    assert any(event.event == "step_completed" and event.step == "task_completed" for event in events)


def test_pending_invitation_does_not_disqualify_onboarding(
    client, create_test_user, auth_headers
):
    owner = create_test_user(email="invite-owner@example.com")
    user, _ = _make_onboarding_user(create_test_user, "invited-onboarding@example.com")
    board = Board(name="Inviting Board", owner_id=owner.id)
    db.session.add(board)
    db.session.flush()
    db.session.add_all([
        BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"),
        BoardMember(board_id=board.id, user_id=user.id, role="viewer", status="pending"),
    ])
    db.session.commit()

    state = client.get("/api/users/me/onboarding", headers=auth_headers(user.id))
    assert state.status_code == 200
    assert state.get_json()["status"] == "not_started"

    started = client.post(
        "/api/users/me/onboarding/start",
        headers=auth_headers(user.id),
        json={"template": "ideas"},
    )
    assert started.status_code == 201
    assert started.get_json()["board"]["id"] != board.id


def test_manual_board_creation_blocked_until_skip_or_start(
    client, create_test_user, auth_headers
):
    user, _ = _make_onboarding_user(create_test_user, "guard@example.com")

    blocked = client.post(
        "/api/boards",
        headers=auth_headers(user.id),
        json={"name": "Too early"},
    )
    assert blocked.status_code == 409

    skipped = client.post(
        "/api/users/me/onboarding/skip",
        headers=auth_headers(user.id),
        json={"reason": "question"},
    )
    assert skipped.status_code == 200

    allowed = client.post(
        "/api/boards",
        headers=auth_headers(user.id),
        json={"name": "Normal board"},
    )
    assert allowed.status_code == 201


def test_skip_inside_checklist_keeps_starter_board(client, create_test_user, auth_headers):
    user, _ = _make_onboarding_user(create_test_user, "checklist-skip@example.com")
    start = client.post(
        "/api/users/me/onboarding/start",
        headers=auth_headers(user.id),
        json={"template": "product"},
    )
    board_id = start.get_json()["board"]["id"]

    skipped = client.post(
        "/api/users/me/onboarding/skip",
        headers=auth_headers(user.id),
        json={"reason": "checklist"},
    )
    assert skipped.status_code == 200
    assert skipped.get_json()["onboarding"]["status"] == "skipped"
    assert db.session.get(Board, board_id) is not None


def test_done_is_only_the_explicit_done_column(client, create_test_user, auth_headers):
    user = create_test_user(email="done-semantics@example.com")
    board = Board(
        name="Custom Workflow",
        owner_id=user.id,
        columns=[
            {"id": "todo", "title": "To Do"},
            {"id": "ship", "title": "Ready to Ship"},
            {"id": "done", "title": "Done"},
        ],
    )
    db.session.add(board)
    db.session.flush()
    db.session.add(BoardMember(board_id=board.id, user_id=user.id, role="owner", status="accepted"))
    db.session.commit()

    # Force cached progress to 100; it must not make the task done.
    task = Task(board_id=board.id, title="Not actually done", status="ship", progress=100)
    db.session.add(task)
    db.session.commit()
    assert task.is_done is False
    assert task.to_dict()["isDone"] is False

    done_task = Task(board_id=board.id, title="Actually done", status="done", progress=0)
    db.session.add(done_task)
    db.session.commit()
    assert done_task.is_done is True
    assert done_task.to_dict()["isDone"] is True

    board_data = board.to_dict()
    assert board_data["openTaskCount"] == 1


def test_role_tip_once_and_role_change_notice(client, create_test_user, auth_headers):
    owner = create_test_user(email="tips-owner@example.com")
    viewer = create_test_user(email="tips-viewer@example.com")
    board = Board(name="Role Tips Board", owner_id=owner.id)
    db.session.add(board)
    db.session.flush()
    db.session.add_all([
        BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"),
        BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted"),
    ])
    db.session.commit()

    first = client.get(f"/api/boards/{board.id}/role-tips", headers=auth_headers(viewer.id))
    assert first.status_code == 200
    data = first.get_json()
    assert data["role"] == "viewer"
    assert data["tip"]["role"] == "viewer"
    assert "cannot" in data["tip"]
    assert data["roleChange"] is None

    seen = client.post(f"/api/boards/{board.id}/role-tips/seen", headers=auth_headers(viewer.id))
    assert seen.status_code == 200

    second = client.get(f"/api/boards/{board.id}/role-tips", headers=auth_headers(viewer.id)).get_json()
    assert second["tip"] is None

    BoardService.update_member_role(board.id, viewer.id, "editor", actor_id=owner.id)

    changed = client.get(f"/api/boards/{board.id}/role-tips", headers=auth_headers(viewer.id)).get_json()
    assert changed["role"] == "editor"
    assert changed["roleChange"]["fromRole"] == "viewer"
    assert changed["roleChange"]["toRole"] == "editor"
    assert changed["tip"] is None

    client.post(
        f"/api/boards/{board.id}/role-tips/role-change/seen",
        headers=auth_headers(viewer.id),
    )
    after = client.get(f"/api/boards/{board.id}/role-tips", headers=auth_headers(viewer.id)).get_json()
    assert after["roleChange"] is None


def test_removed_user_receives_no_role_tip(client, create_test_user, auth_headers):
    owner = create_test_user(email="removed-owner@example.com")
    viewer = create_test_user(email="removed-viewer@example.com")
    board = Board(name="Removed Board", owner_id=owner.id)
    db.session.add(board)
    db.session.flush()
    membership = BoardMember(board_id=board.id, user_id=viewer.id, role="viewer", status="accepted")
    db.session.add_all([
        BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"),
        membership,
    ])
    db.session.commit()

    db.session.delete(membership)
    db.session.commit()

    response = client.get(f"/api/boards/{board.id}/role-tips", headers=auth_headers(viewer.id))
    assert response.status_code == 403


def test_accounts_created_with_flag_off_are_not_applicable_when_reenabled(
    client, app, create_test_user, auth_headers
):
    app.config['ONBOARDING_ENABLED'] = False
    response = _register(client, "flag-off@example.com")
    assert response.status_code == 201
    user_id = response.get_json()["user"]["id"]

    row = UserOnboarding.query.filter_by(user_id=user_id).first()
    assert row.status == "not_applicable"

    app.config['ONBOARDING_ENABLED'] = True
    state = client.get("/api/users/me/onboarding", headers=auth_headers(user_id)).get_json()
    assert state["status"] == "not_applicable"

    board_response = client.post(
        "/api/boards",
        headers=auth_headers(user_id),
        json={"name": "Flag-off board"},
    )
    assert board_response.status_code == 201
