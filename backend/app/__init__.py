import os
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

    if config_class is not Config and 'APP_ENV' in getattr(config_class, '__dict__', {}):
        app_env = (app.config.get('APP_ENV') or 'local').strip().lower()
    else:
        app_env = (os.environ.get('APP_ENV') or os.environ.get('FLASK_ENV') or app.config.get('APP_ENV') or 'local').strip().lower()
    app.config['APP_ENV'] = app_env

    if app_env != 'local' and not app.config.get('TESTING', False):
        if app.config.get('SECRET_KEY') in (None, '', 'dev-secret-key', 'change-this-in-production-to-a-random-secret'):
            app.logger.warning(f"SECURITY WARNING: Default or empty SECRET_KEY is in use with APP_ENV='{app_env}'.")
        if app.config.get('JWT_SECRET_KEY') in (None, '', 'super-secret-jwt-key-for-development-32-chars-long'):
            app.logger.warning(f"SECURITY WARNING: Default or empty JWT_SECRET_KEY is in use with APP_ENV='{app_env}'.")

    db.init_app(app)
    migrate.init_app(app, db)

    # Attach engine-level connection listener to enable TCP keepalives on PyMySQL connections
    if not app.config.get('TESTING', False):
        try:
            from sqlalchemy import event
            with app.app_context():
                @event.listens_for(db.engine, "connect")
                def _set_db_connection_options(dbapi_connection, connection_record):
                    sock = getattr(dbapi_connection, '_sock', None) or getattr(dbapi_connection, 'sock', None)
                    if sock:
                        import socket
                        try:
                            sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                            if hasattr(socket, 'TCP_KEEPIDLE'):
                                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60)
                            if hasattr(socket, 'TCP_KEEPINTVL'):
                                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)
                            if hasattr(socket, 'TCP_KEEPCNT'):
                                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)
                        except Exception:
                            pass
        except Exception:
            pass
    
    # Initialize Flask-CORS with configurable origins and Vercel domains
    configured_origins = app.config.get('CORS_ORIGINS') or []
    base_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://sticky-mind-grid.vercel.app",
        r"https:\/\/sticky-mind-grid(-[a-z0-9-]+)?\.vercel\.app",
    ]
    # Merge unique origins preserving string and regex types
    all_origins = list(dict.fromkeys(configured_origins + base_origins))

    CORS(
        app,
        resources={r"/*": {"origins": all_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=86400
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
        try:
            db.session.rollback()
            db.session.remove()
        except Exception:
            pass
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
    from app.routes import scratchpad_routes
    from app.routes import presence_routes
    from app.routes import onboarding_routes
    from app.routes import role_tip_routes

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
    app.register_blueprint(scratchpad_routes.bp)
    app.register_blueprint(presence_routes.bp)
    app.register_blueprint(onboarding_routes.bp)
    app.register_blueprint(role_tip_routes.bp)

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

    @app.cli.command("purge-expired")
    def purge_expired_cli():
        """Purge soft-deleted boards and tasks older than 30 days."""
        from app.services.board_service import BoardService
        from app.services.task_service import TaskService
        purged_b = BoardService.purge_expired_boards(retention_days=30)
        purged_t = TaskService.purge_expired_tasks(retention_days=30)
        print(f"Purged {purged_b} expired board(s) and {purged_t} expired task(s).")

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

            cols_cache = {}
            indexes_cache = {}

            def _get_table_cols(table_name):
                if table_name not in cols_cache:
                    if table_name in tables:
                        cols_cache[table_name] = {c['name'] for c in inspector.get_columns(table_name)}
                    else:
                        cols_cache[table_name] = set()
                return cols_cache[table_name]

            def _get_table_indexes(table_name):
                if table_name not in indexes_cache:
                    if table_name in tables:
                        indexes_cache[table_name] = {idx['name'] for idx in inspector.get_indexes(table_name)}
                    else:
                        indexes_cache[table_name] = set()
                return indexes_cache[table_name]

            def _add_col_if_missing(table_name, col_name, col_ddl, post_sql=None):
                if table_name not in tables:
                    return
                existing_cols = _get_table_cols(table_name)
                if col_name not in existing_cols:
                    try:
                        db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_ddl}"))
                        if post_sql:
                            db.session.execute(text(post_sql))
                        db.session.commit()
                        existing_cols.add(col_name)
                    except Exception:
                        db.session.rollback()

            def _add_idx_if_missing(table_name, index_name, columns_sql):
                if table_name not in tables:
                    return
                existing_indexes = _get_table_indexes(table_name)
                if index_name not in existing_indexes:
                    try:
                        db.session.execute(text(f"CREATE INDEX {index_name} ON {table_name} ({columns_sql})"))
                        db.session.commit()
                        existing_indexes.add(index_name)
                    except Exception:
                        db.session.rollback()

            is_pg = db.engine.dialect.name == 'postgresql'
            dt_col = "TIMESTAMP NULL" if is_pg else "DATETIME NULL"

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
            _add_col_if_missing('users', 'verification_token_expires_at', dt_col)
            _add_col_if_missing('users', 'legacy_unverified', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('users', 'legacy_deadline', dt_col)
            _add_col_if_missing('users', 'pending_email', "VARCHAR(255) NULL")
            _add_col_if_missing('users', 'pending_email_token', "VARCHAR(100) NULL")
            _add_col_if_missing('users', 'pending_email_token_expires_at', dt_col)
            try:
                if is_pg:
                    db.session.execute(text("UPDATE users SET legacy_unverified = TRUE, legacy_deadline = (NOW() + INTERVAL '30 days') WHERE email_verified = FALSE AND (legacy_unverified = FALSE OR legacy_unverified IS NULL)"))
                elif db.engine.dialect.name == 'sqlite':
                    db.session.execute(text("UPDATE users SET legacy_unverified = 1, legacy_deadline = datetime('now', '+30 days') WHERE email_verified = 0 AND (legacy_unverified = 0 OR legacy_unverified IS NULL)"))
                else:
                    db.session.execute(text("UPDATE users SET legacy_unverified = TRUE, legacy_deadline = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE email_verified = FALSE AND (legacy_unverified = FALSE OR legacy_unverified IS NULL)"))
                db.session.commit()
            except Exception:
                db.session.rollback()

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
            _add_col_if_missing('boards', 'deleted_at', dt_col)

            # Ensure missing columns in tasks table
            _add_col_if_missing('tasks', 'emoji', "VARCHAR(50) NULL")
            _add_col_if_missing('tasks', 'created_by', "VARCHAR(36) NULL")
            _add_col_if_missing('tasks', 'position', "FLOAT DEFAULT 0.0 NOT NULL")
            _add_col_if_missing('tasks', 'checklist', "JSON NULL")
            _add_col_if_missing('tasks', 'tags', "JSON NULL")
            _add_col_if_missing('tasks', 'attachments', "JSON NULL")
            _add_col_if_missing('tasks', 'followers', "JSON NULL")
            _add_col_if_missing('tasks', 'is_deleted', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('tasks', 'deleted_at', dt_col)

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
                    comment_cols = _get_table_cols('comments')
                    if 'user_id' in comment_cols:
                        if is_pg:
                            db.session.execute(text("ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL"))
                        else:
                            db.session.execute(text("ALTER TABLE comments MODIFY COLUMN user_id VARCHAR(36) NULL"))
                        db.session.commit()
                except Exception:
                    db.session.rollback()

            # Ensure missing columns in messages table
            _add_col_if_missing('messages', 'is_forwarded', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('messages', 'is_pinned', "BOOLEAN DEFAULT FALSE NOT NULL")
            _add_col_if_missing('messages', 'is_deleted', "BOOLEAN DEFAULT FALSE NOT NULL")

            # Ensure missing columns in user_preferences table
            _add_col_if_missing('user_preferences', 'default_board_view', "VARCHAR(50) DEFAULT 'board' NOT NULL")
            _add_col_if_missing('user_preferences', 'timezone', "VARCHAR(100) DEFAULT 'UTC' NOT NULL")
            _add_col_if_missing('user_preferences', 'date_format', "VARCHAR(50) DEFAULT 'MM/DD/YYYY' NOT NULL")
            _add_col_if_missing('user_preferences', 'first_day_of_week', "INTEGER DEFAULT 0 NOT NULL")
            _add_col_if_missing('user_preferences', 'notify_mentions', "BOOLEAN DEFAULT TRUE NOT NULL")
            _add_col_if_missing('user_preferences', 'notify_assignments', "BOOLEAN DEFAULT TRUE NOT NULL")
            _add_col_if_missing('user_preferences', 'notify_invites', "BOOLEAN DEFAULT TRUE NOT NULL")
            _add_col_if_missing('user_preferences', 'notify_comments', "BOOLEAN DEFAULT TRUE NOT NULL")
            _add_col_if_missing(
                'user_preferences',
                'notify_card_moves',
                "BOOLEAN DEFAULT TRUE NOT NULL",
                "UPDATE user_preferences SET notify_card_moves = TRUE WHERE notify_card_moves IS NULL"
            )
            _add_col_if_missing('user_preferences', 'updated_at', dt_col)

            # Ensure missing columns in board_invitations table
            _add_col_if_missing('board_invitations', 'accepted_at', dt_col)
            _add_col_if_missing('board_invitations', 'revoked_at', dt_col)

            # Clean up legacy noisy task_move notifications
            if 'notifications' in tables:
                try:
                    db.session.execute(text("DELETE FROM notifications WHERE type = 'task_move'"))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            # Ensure performance indexes exist on foreign keys & high-traffic filter columns
            _add_idx_if_missing('boards', 'ix_boards_owner_deleted', 'owner_id, is_deleted')
            _add_idx_if_missing('tasks', 'ix_tasks_board_del_pos', 'board_id, is_deleted, position')
            _add_idx_if_missing('tasks', 'ix_tasks_assigned_del', 'assigned_to, is_deleted')
            _add_idx_if_missing('board_members', 'ix_board_members_user_status', 'user_id, status')
            _add_idx_if_missing('board_members', 'ix_board_members_board_user_status', 'board_id, user_id, status')
            _add_idx_if_missing('activities', 'ix_activities_board_timestamp', 'board_id, timestamp')
            _add_idx_if_missing('notifications', 'ix_notifications_user_created', 'user_id, created_at')
            _add_idx_if_missing('comments', 'ix_comments_task_created', 'task_id, created_at')
            _add_idx_if_missing('notes', 'ix_notes_board_updated', 'board_id, updated_at')
            _add_idx_if_missing('conversation_participants', 'ix_conv_participants_user', 'user_id')
            _add_idx_if_missing('messages', 'ix_messages_conv_created', 'conversation_id, created_at')
            _add_idx_if_missing('board_invitations', 'ix_board_invitations_email_status', 'email, status')
        except Exception:
            # Non-blocking schema check
            pass

