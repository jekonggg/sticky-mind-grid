import pytest
from app import db
from app.models.user import User
from app.models.board import Board
from app.models.user_onboarding import UserOnboarding
from app.services.onboarding_service import OnboardingService


def _make_user_with_onboarding(create_test_user, email, status="not_started"):
    user = create_test_user(email=email)
    row = UserOnboarding(user_id=user.id, status=status)
    db.session.add(row)
    db.session.commit()
    return user, row


def test_onboarding_reset_service(client, create_test_user):
    user, _ = _make_user_with_onboarding(create_test_user, email="reset-user@example.com")
    
    # 1. Start onboarding
    row, board = OnboardingService.start(user.id, "personal")
    assert row.status == "in_progress"
    assert row.starter_board_id == board.id

    # 2. Add coach marks
    OnboardingService.mark_coach_mark(user.id, "board-columns")
    row = OnboardingService.get_row(user.id)
    assert "board-columns" in row.seen_coach_marks

    # 3. Reset onboarding to not_started
    reset_row = OnboardingService.reset_for_user(
        user_id=user.id,
        target_status="not_started",
        clean_starter_board=True,
        clean_all_boards=False,
        reset_coach_marks=True,
        reset_whats_new=True,
    )
    assert reset_row.status == "not_started"
    assert reset_row.starter_board_id is None
    assert "board-columns" not in reset_row.seen_coach_marks
    assert db.session.get(Board, board.id) is None


def test_onboarding_reset_endpoint_success(client, create_test_user, auth_headers, monkeypatch):
    monkeypatch.setenv("APP_ENV", "dev")
    user, _ = _make_user_with_onboarding(create_test_user, email="api-reset@example.com")
    OnboardingService.start(user.id, "team")

    resp = client.post(
        "/api/users/me/onboarding/reset",
        headers=auth_headers(user.id),
        json={"status": "not_started", "cleanStarterBoard": True}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["onboarding"]["status"] == "not_started"


def test_onboarding_reset_endpoint_forbidden_in_production(client, create_test_user, auth_headers, monkeypatch):
    user, _ = _make_user_with_onboarding(create_test_user, email="prod-user@example.com")
    
    # Force APP_ENV to production
    from flask import current_app
    old_env = current_app.config.get("APP_ENV")
    current_app.config["APP_ENV"] = "production"
    try:
        resp = client.post(
            "/api/users/me/onboarding/reset",
            headers=auth_headers(user.id),
            json={"status": "not_started"}
        )
        assert resp.status_code == 403
        data = resp.get_json()
        assert "not permitted in production" in data["error"]
    finally:
        current_app.config["APP_ENV"] = old_env


def test_dev_auto_verify_registration(client, monkeypatch):
    from flask import current_app
    old_env = current_app.config.get("APP_ENV")
    current_app.config["APP_ENV"] = "dev"
    try:
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "auto-verify@test.local",
                "password": "Password123!",
                "fullName": "Auto Verifier"
            }
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data.get("emailVerified") is True
        
        user = User.query.filter_by(email="auto-verify@test.local").first()
        assert user is not None
        assert user.email_verified is True
    finally:
        current_app.config["APP_ENV"] = old_env
