from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
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

    @app.errorhandler(Exception)
    def handle_global_exception(e):
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

    return app

def _auto_sync_schema(app):
    """Safely and idempotently ensure all tables and missing columns exist on startup."""
    with app.app_context():
        try:
            from sqlalchemy import inspect as sa_inspect, text
            db.create_all()
            inspector = sa_inspect(db.engine)
            tables = inspector.get_table_names()

            # Ensure missing columns in users table
            if 'users' in tables:
                user_cols = {c['name'] for c in inspector.get_columns('users')}
                if 'auth_provider' not in user_cols:
                    try:
                        db.session.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                if 'auth_provider_id' not in user_cols:
                    try:
                        db.session.execute(text("ALTER TABLE users ADD COLUMN auth_provider_id VARCHAR(255) NULL"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

            # Ensure missing columns in board_members table
            if 'board_members' in tables:
                bm_cols = {c['name'] for c in inspector.get_columns('board_members')}
                if 'status' not in bm_cols:
                    try:
                        db.session.execute(text("ALTER TABLE board_members ADD COLUMN status VARCHAR(20) DEFAULT 'accepted' NOT NULL"))
                        db.session.execute(text("UPDATE board_members SET status = 'accepted' WHERE status IS NULL OR status = ''"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

            # Ensure missing columns in messages table
            if 'messages' in tables:
                msg_cols = {c['name'] for c in inspector.get_columns('messages')}
                if 'is_forwarded' not in msg_cols:
                    try:
                        db.session.execute(text("ALTER TABLE messages ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE NOT NULL"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                if 'is_pinned' not in msg_cols:
                    try:
                        db.session.execute(text("ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE NOT NULL"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
        except Exception:
            # Non-blocking schema check
            pass
