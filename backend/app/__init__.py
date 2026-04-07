from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app) # Enable CORS for all routes

    from app.routes import board_routes
    from app.routes import task_routes
    from app.routes import activity_routes

    app.register_blueprint(board_routes.bp)
    app.register_blueprint(task_routes.bp)
    app.register_blueprint(activity_routes.bp)

    return app
