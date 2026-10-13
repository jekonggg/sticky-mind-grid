from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["200 per minute"],
        storage_uri="memory://"
    )
except ImportError:
    class DummyLimiter:
        def init_app(self, app):
            pass
        def limit(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator
    limiter = DummyLimiter()
from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize Flask-CORS with configurable origins and Vercel domains
    configured_origins = app.config.get('CORS_ORIGINS') or []
    base_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://sticky-mind-grid.vercel.app",
        r"https:\/\/.*\.vercel\.app",
    ]
    # Merge unique origins preserving string and regex types
    all_origins = list(dict.fromkeys(configured_origins + base_origins))

    CORS(
        app,
        resources={r"/*": {"origins": all_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type", "Authorization"]
    )

    jwt.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)

    @app.errorhandler(429)
    def handle_rate_limit_exceeded(e):
        return jsonify({
            'error': 'Too many requests. Please try again later.',
            'message': str(getattr(e, 'description', e))
        }), 429

    @app.errorhandler(Exception)
    def handle_global_exception(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return jsonify({'error': e.description}), e.code
        import traceback
        traceback.print_exc()
        # Never leak internal error details to clients outside debug mode
        message = str(e) if app.debug else 'Internal server error'
        return jsonify({'error': message}), 500

    @app.errorhandler(413)
    def handle_request_entity_too_large(e):
        limit_mb = (app.config.get('MAX_CONTENT_LENGTH') or 0) / (1024 * 1024)
        return jsonify({'error': f'File too large. Maximum upload size is {limit_mb:.0f} MB'}), 413

    from app.routes import board_routes
    from app.routes import task_routes
    from app.routes import activity_routes
    from app.routes import auth_routes
    from app.routes import comment_routes
    from app.routes import notification_routes
    from app.routes import file_routes
    from app.routes import note_routes
    from app.routes import system_routes
    from app.routes import user_routes
    from app.routes import message_routes

    app.register_blueprint(board_routes.bp)
    app.register_blueprint(task_routes.bp)
    app.register_blueprint(activity_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(comment_routes.bp)
    app.register_blueprint(notification_routes.bp)
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(note_routes.bp)
    app.register_blueprint(system_routes.bp)
    app.register_blueprint(user_routes.bp)
    app.register_blueprint(message_routes.bp)

    # Automatically sync missing tables/columns in non-testing mode
    if not app.config.get('TESTING', False):
        _auto_sync_schema(app)

    # Start background scheduler if enabled and not in testing
    if app.config.get('SCHEDULER_ENABLED') and not app.config.get('TESTING', False):
        try:
            from app.services.scheduler_service import SchedulerService
            SchedulerService.start_scheduler(app)
        except Exception as e:
            app.logger.warning(f"Failed to start scheduler: {e}")

    return app

def _auto_sync_schema(app):
    """Safely and idempotently ensure all tables and missing columns exist on startup."""
    with app.app_context():
        try:
            from sqlalchemy import inspect as sa_inspect, text
            import app.models  # noqa: F401 - ensure all models are registered before create_all
            db.create_all()
            inspector = sa_inspect(db.engine)
            tables = inspector.get_table_names()

            def _add_col_if_missing(table_name, col_name, col_ddl, post_sql=None):
                if table_name not in tables:
                    return
                existing_cols = {c['name'] for c in inspector.get_columns(table_name)}
                if col_name not in existing_cols:
                    try:
                        db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_ddl}"))
                        if post_sql:
                            db.session.execute(text(post_sql))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

            # Ensure missing columns in users table
            _add_col_if_missing('users', 'avatar_url', "VARCHAR(500) NULL")
            _add_col_if_missing('users', 'auth_provider', "VARCHAR(50) DEFAULT 'local'")
            _add_col_if_missing('users', 'auth_provider_id', "VARCHAR(255) NULL")
            _add_col_if_missing(
                'users',
                'email_verified',
                "BOOLEAN DEFAULT TRUE NOT NULL",
                "UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL"
            )
            _add_col_if_missing('users', 'verification_token', "VARCHAR(100) NULL")
            _add_col_if_missing('users', 'verification_token_expires_at', "DATETIME NULL")

            # Ensure missing columns in board_members table
            _add_col_if_missing(
                'board_members',
                'status',
                "VARCHAR(20) DEFAULT 'accepted' NOT NULL",
                "UPDATE board_members SET status = 'accepted' WHERE status IS NULL OR status = ''"
            )
            _add_col_if_missing('board_members', 'is_muted', "BOOLEAN DEFAULT FALSE NOT NULL")

            # Ensure missing columns in boards table
            _add_col_if_missing('boards', 'owner_id', "VARCHAR(36) NULL")
            _add_col_if_missing('boards', 'workspace_id', "VARCHAR(36) NULL")
            _add_col_if_missing('boards', 'is_deleted', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('boards', 'deleted_at', "DATETIME NULL")

            # Ensure missing columns in tasks table
            _add_col_if_missing('tasks', 'emoji', "VARCHAR(50) NULL")
            _add_col_if_missing('tasks', 'created_by', "VARCHAR(36) NULL")
            _add_col_if_missing('tasks', 'position', "FLOAT DEFAULT 0.0 NOT NULL")
            _add_col_if_missing('tasks', 'checklist', "JSON NULL")
            _add_col_if_missing('tasks', 'tags', "JSON NULL")
            _add_col_if_missing('tasks', 'attachments', "JSON NULL")
            _add_col_if_missing('tasks', 'followers', "JSON NULL")
            _add_col_if_missing('tasks', 'is_deleted', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('tasks', 'deleted_at', "DATETIME NULL")

            # Ensure missing columns in activities table
            _add_col_if_missing('activities', 'target_type', "VARCHAR(50) DEFAULT 'task' NULL")
            _add_col_if_missing('activities', 'target_id', "VARCHAR(36) NULL")
            _add_col_if_missing('activities', 'before_value', "TEXT NULL")
            _add_col_if_missing('activities', 'after_value', "TEXT NULL")

            # Ensure missing columns in comments table
            _add_col_if_missing('comments', 'mentions', "JSON NULL")
            _add_col_if_missing('comments', 'is_edited', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('comments', 'original_content', "TEXT NULL")
            if 'comments' in tables:
                try:
                    comment_cols = {c['name']: c for c in inspector.get_columns('comments')}
                    if 'user_id' in comment_cols and not comment_cols['user_id'].get('nullable', True):
                        db.session.execute(text("ALTER TABLE comments MODIFY COLUMN user_id VARCHAR(36) NULL"))
                        db.session.commit()
                except Exception:
                    db.session.rollback()

            # Ensure missing columns in messages table
            _add_col_if_missing('messages', 'is_forwarded', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('messages', 'is_pinned', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('messages', 'is_deleted', "BOOLEAN DEFAULT FALSE NOT NULL")
        except Exception:
            # Non-blocking schema check
            pass

