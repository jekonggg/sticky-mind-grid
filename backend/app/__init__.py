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
    
    # Initialize Flask-CORS with configurable origins
    cors_origins = app.config.get('CORS_ORIGINS') or [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]
    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    
    # CORS: Flask-CORS is the single source of truth. Only origins listed in
    # Config.CORS_ORIGINS receive Access-Control headers; preflights for other
    # origins are rejected by flask-cors itself.
    cors_origins = app.config.get('CORS_ORIGINS') or [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]
    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
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

    return app
