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

test_db_url = os.environ.get('TEST_DATABASE_URL') or os.environ.get('TEST_DATABASE_URI')

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = test_db_url or 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    } if test_db_url and 'sqlite' not in test_db_url else {}
    JWT_SECRET_KEY = 'test-jwt-secret-key-1234567890'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    SECRET_KEY = 'test-secret-key'
    RATELIMIT_ENABLED = False
    SCHEDULER_ENABLED = False
    SUPABASE_URL = None
    SUPABASE_SERVICE_ROLE_KEY = None

@pytest.fixture
def app():
    current_test_db = os.environ.get('TEST_DATABASE_URL') or os.environ.get('TEST_DATABASE_URI')
    if current_test_db:
        # Guard: Never run tests against primary development database
        if 'mysql' in current_test_db and 'sticky_mind_grid' in current_test_db and not current_test_db.endswith('_test') and '_test?' not in current_test_db and os.environ.get('ALLOW_TESTS_ON_DEV_DB') != '1':
            raise RuntimeError(
                f"Refusing to run tests against database URI '{current_test_db}'. "
                "Target database must be a test database (e.g. 'sticky_mind_grid_test') to prevent data loss."
            )
        TestConfig.SQLALCHEMY_DATABASE_URI = current_test_db
        if 'sqlite' not in current_test_db:
            TestConfig.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 280,
            }
        else:
            TestConfig.SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        TestConfig.SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
        TestConfig.SQLALCHEMY_ENGINE_OPTIONS = {}

    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        if db.engine.dialect.name == 'mysql':
            with db.engine.connect() as conn:
                conn.execute(db.text("SET FOREIGN_KEY_CHECKS = 0;"))
                conn.commit()
            db.drop_all()
            with db.engine.connect() as conn:
                conn.execute(db.text("SET FOREIGN_KEY_CHECKS = 1;"))
                conn.commit()
        else:
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
    def _create_board(owner=None, name="Test Board", columns=None):
        if not owner:
            owner = create_test_user(email="boardowner@example.com", full_name="Board Owner")
        
        default_columns = [
            {"id": "todo", "title": "To Do", "emoji": "📝"},
            {"id": "in_progress", "title": "In Progress", "emoji": "⏳"},
            {"id": "done", "title": "Done", "emoji": "✅"},
            {"id": "archive", "title": "Archive", "emoji": "📦"}
        ]
        board = Board(
            name=name,
            owner_id=owner.id,
            color="hsl(220, 80%, 56%)",
            emoji="📋",
            columns=columns if columns is not None else default_columns
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
