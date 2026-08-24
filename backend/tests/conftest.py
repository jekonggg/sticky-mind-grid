import pytest
import os
import sys
from datetime import timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models.user import User
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from flask_jwt_extended import create_access_token
from config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = 'test-jwt-secret-key-1234567890'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    SECRET_KEY = 'test-secret-key'

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

def make_auth_headers(user_id):
    token = create_access_token(identity=str(user_id))
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

@pytest.fixture
def auth_headers():
    return make_auth_headers

@pytest.fixture
def create_test_user(app):
    def _create_user(email="testuser@example.com", password="password123", full_name="Test User"):
        user = User(email=email, full_name=full_name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    return _create_user

@pytest.fixture
def create_test_board(app, create_test_user):
    def _create_board(owner=None, name="Test Board"):
        if not owner:
            owner = create_test_user(email="boardowner@example.com", full_name="Board Owner")
        
        board = Board(
            name=name,
            owner_id=owner.id,
            color="hsl(220, 80%, 56%)",
            emoji="📋"
        )
        db.session.add(board)
        db.session.flush()

        member = BoardMember(
            board_id=board.id,
            user_id=owner.id,
            role="owner",
            status="accepted"
        )
        db.session.add(member)
        db.session.commit()
        return board, owner
    return _create_board
