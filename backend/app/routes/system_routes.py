from flask import Blueprint, jsonify
from datetime import datetime
from app import db
import os

bp = Blueprint('system_routes', __name__, url_prefix='/api')

@bp.route('/health', methods=['GET'])
def health_check():
    db_healthy = True
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_healthy = False

    return jsonify({
        'status': 'healthy' if db_healthy else 'degraded',
        'database': 'connected' if db_healthy else 'disconnected',
        'version': '1.2.0',
        'environment': os.getenv('FLASK_ENV', 'development'),
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200 if db_healthy else 503
