import hmac
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from app import db

bp = Blueprint('system_routes', __name__, url_prefix='/api')

def get_git_commit():
    commit = (
        os.getenv('RENDER_GIT_COMMIT')
        or os.getenv('VERCEL_GIT_COMMIT_SHA')
        or os.getenv('GIT_COMMIT')
    )
    if commit:
        return commit[:7]
    try:
        import subprocess
        return subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()
    except Exception:
        return 'dev'

@bp.route('/health', methods=['GET'])
def health_check():
    db_healthy = True
    db_error = None
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception as e:
        db_healthy = False
        db_error = str(e)
        current_app.logger.error(f"Database health check failed: {e}")

    payload = {
        'status': 'healthy' if db_healthy else 'degraded',
        'database': 'connected' if db_healthy else 'disconnected',
        'version': '1.3.0',
        'commit': get_git_commit(),
        'environment': (os.getenv('APP_ENV') or os.getenv('FLASK_ENV') or current_app.config.get('APP_ENV') or 'local').strip().lower(),
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    if not db_healthy and db_error:
        payload['database_error'] = db_error

    return jsonify(payload), 200 if db_healthy else 503


@bp.route('/internal/jobs/purge', methods=['POST'])
def run_internal_purge_job():
    """
    Secure internal maintenance endpoint to purge soft-deleted boards and tasks
    older than retention_days (default 30 days).
    Requires header X-Internal-Secret matching current_app.config['INTERNAL_JOB_SECRET'].
    """
    secret_configured = (current_app.config.get('INTERNAL_JOB_SECRET') or '').strip()
    if not secret_configured:
        return jsonify({
            'error': 'Internal job execution is disabled. INTERNAL_JOB_SECRET is not configured on the server.'
        }), 403

    # Check header X-Internal-Secret or Authorization: Bearer <secret>
    provided_secret = (request.headers.get('X-Internal-Secret') or '').strip()
    auth_header = (request.headers.get('Authorization') or '').strip()
    if not provided_secret and auth_header.startswith('Bearer '):
        provided_secret = auth_header[7:].strip()

    if not provided_secret or not hmac.compare_digest(provided_secret, secret_configured):
        return jsonify({
            'error': 'Unauthorized. Invalid or missing X-Internal-Secret.'
        }), 401

    # Parse optional retention_days parameter
    retention_days = 30
    if request.is_json and request.json and 'retention_days' in request.json:
        try:
            retention_days = int(request.json['retention_days'])
        except (ValueError, TypeError):
            pass
    elif 'retention_days' in request.args:
        try:
            retention_days = int(request.args['retention_days'])
        except (ValueError, TypeError):
            pass

    if retention_days < 1:
        return jsonify({'error': 'retention_days must be at least 1'}), 400

    from app.services.board_service import BoardService
    from app.services.task_service import TaskService

    try:
        purged_boards = BoardService.purge_expired_boards(retention_days=retention_days)
        purged_tasks = TaskService.purge_expired_tasks(retention_days=retention_days)
        
        return jsonify({
            'status': 'success',
            'job': 'purge_expired_data',
            'retention_days': retention_days,
            'purged_boards': purged_boards,
            'purged_tasks': purged_tasks,
            'total_purged': purged_boards + purged_tasks,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 200
    except Exception as e:
        current_app.logger.exception(f"Error during internal purge job: {e}")
        return jsonify({
            'status': 'error',
            'error': 'An error occurred during data purge execution'
        }), 500
