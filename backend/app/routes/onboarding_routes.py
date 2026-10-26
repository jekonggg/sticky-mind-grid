from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models.board import Board
from app.services.onboarding_service import (
    OnboardingDisabledError,
    OnboardingService,
    OnboardingStateError,
)

bp = Blueprint('onboarding_routes', __name__, url_prefix='/api/users/me/onboarding')


def _state_payload(user_id):
    return OnboardingService.get_state(user_id)


def _start_payload(user_id, row, board):
    payload = {'onboarding': row.to_dict(enabled=OnboardingService.is_enabled())}
    if board:
        payload['board'] = board.to_dict(user_id=user_id)
    else:
        payload['board'] = None
    return payload


@bp.route('', methods=['GET'])
@jwt_required()
def get_onboarding():
    user_id = get_jwt_identity()
    return jsonify(_state_payload(user_id)), 200


@bp.route('/start', methods=['POST'])
@jwt_required()
def start_onboarding():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    template = data.get('template')
    try:
        row, board = OnboardingService.start(user_id, template)
        return jsonify(_start_payload(user_id, row, board)), 201
    except OnboardingDisabledError as exc:
        return jsonify({'error': str(exc)}), 403
    except OnboardingStateError as exc:
        return jsonify({'error': str(exc)}), 409
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400


@bp.route('/skip', methods=['POST'])
@jwt_required()
def skip_onboarding():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    reason = data.get('reason') or 'question'
    try:
        row = OnboardingService.skip(user_id, reason=reason)
        return jsonify({'onboarding': row.to_dict(enabled=OnboardingService.is_enabled())}), 200
    except OnboardingDisabledError as exc:
        return jsonify({'error': str(exc)}), 403
    except OnboardingStateError as exc:
        return jsonify({'error': str(exc)}), 409


@bp.route('/coach-marks/<mark_id>/seen', methods=['POST'])
@jwt_required()
def mark_coach_mark(mark_id):
    user_id = get_jwt_identity()
    try:
        row = OnboardingService.mark_coach_mark(user_id, mark_id)
        return jsonify({'onboarding': row.to_dict(enabled=OnboardingService.is_enabled())}), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400


@bp.route('/education', methods=['POST'])
@jwt_required()
def mark_education():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    version = data.get('version')
    dismiss_banner = bool(data.get('dismissBanner'))
    if not isinstance(version, int) or version < 0:
        return jsonify({'error': 'A non-negative version is required'}), 400
    row = OnboardingService.mark_education(user_id, version, dismiss_banner=dismiss_banner)
    return jsonify({'onboarding': row.to_dict(enabled=OnboardingService.is_enabled())}), 200


@bp.route('/replay', methods=['POST'])
@jwt_required()
def start_replay():
    user_id = get_jwt_identity()
    if not OnboardingService.is_enabled():
        return jsonify({'error': 'Onboarding is disabled'}), 403
    row = OnboardingService.start_replay(user_id)
    return jsonify({'onboarding': row.to_dict(enabled=True)}), 200

@bp.route('/reset', methods=['POST'])
@jwt_required()
def reset_onboarding():
    from flask import current_app
    app_env = (current_app.config.get('APP_ENV') or 'local').strip().lower()
    if app_env == 'production':
        return jsonify({'error': 'Onboarding reset is not permitted in production'}), 403

    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    status = data.get('status') or 'not_started'
    clean_starter_board = bool(data.get('cleanStarterBoard', True))
    clean_all_boards = bool(data.get('cleanAllBoards', False))
    reset_coach_marks = bool(data.get('resetCoachMarks', True))
    reset_whats_new = bool(data.get('resetWhatsNew', True))

    try:
        row = OnboardingService.reset_for_user(
            user_id=user_id,
            target_status=status,
            clean_starter_board=clean_starter_board,
            clean_all_boards=clean_all_boards,
            reset_coach_marks=reset_coach_marks,
            reset_whats_new=reset_whats_new,
        )
        return jsonify({'onboarding': row.to_dict(enabled=OnboardingService.is_enabled())}), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

