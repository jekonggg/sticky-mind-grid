import pytest
import json
from app import create_app, db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user import User
from config import Config

class RateLimitTestConfig(Config):
    TESTING = True
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"

@pytest.fixture
def rate_limited_client():
    app = create_app(RateLimitTestConfig)
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

def test_auth_login_rate_limit_throttles_excessive_attempts(rate_limited_client):
    """
    POST /api/auth/login must be rate-limited to 10 requests per minute.
    Requests exceeding the threshold must receive HTTP 429 Too Many Requests.
    """
    for _ in range(10):
        resp = rate_limited_client.post(
            "/api/auth/login",
            data=json.dumps({"email": "attacker@example.com", "password": "wrong"}),
            content_type="application/json"
        )
        assert resp.status_code in (400, 401)

    # 11th request exceeds limit
    blocked_resp = rate_limited_client.post(
        "/api/auth/login",
        data=json.dumps({"email": "attacker@example.com", "password": "wrong"}),
        content_type="application/json"
    )
    assert blocked_resp.status_code == 429
    data = blocked_resp.get_json()
    assert "Too many requests" in data.get("error", "")

def test_board_invite_rate_limit_throttles_excessive_invites(rate_limited_client):
    """
    POST /api/boards/<board_id>/members must be rate-limited to 20 requests per minute.
    """
    from flask_jwt_extended import create_access_token

    # Create owner and board
    owner = User(email="owner_rate@example.com", full_name="Board Owner")
    owner.set_password("pass123")
    db.session.add(owner)
    db.session.commit()

    board = Board(name="Rate Limit Board", owner_id=owner.id, columns=[{"id": "c1", "title": "Todo"}])
    db.session.add(board)
    db.session.commit()

    db.session.add(BoardMember(board_id=board.id, user_id=owner.id, role="owner", status="accepted"))
    db.session.commit()

    token = create_access_token(identity=owner.id)
    headers = {"Authorization": f"Bearer {token}"}

    for i in range(20):
        resp = rate_limited_client.post(
            f"/api/boards/{board.id}/members",
            headers=headers,
            data=json.dumps({"email": f"invitee_{i}@example.com", "role": "editor"}),
            content_type="application/json"
        )
        assert resp.status_code == 201

    # 21st request should be blocked
    blocked_resp = rate_limited_client.post(
        f"/api/boards/{board.id}/members",
        headers=headers,
        data=json.dumps({"email": "invitee_excess@example.com", "role": "editor"}),
        content_type="application/json"
    )
    assert blocked_resp.status_code == 429
