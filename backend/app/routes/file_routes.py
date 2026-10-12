from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity, decode_token
from app.services.file_service import FileService

bp = Blueprint('file_routes', __name__, url_prefix='/api/files')

def get_authenticated_user_id():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return str(identity)
    except Exception:
        pass

    token = request.args.get('token')
    if token:
        try:
            decoded = decode_token(token)
            if decoded and 'sub' in decoded:
                return str(decoded['sub'])
        except Exception:
            pass
    return None

@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    user_id = get_jwt_identity()
    purpose = request.args.get('purpose') or request.form.get('purpose')
    board_id = request.args.get('boardId') or request.form.get('boardId')
    result, error = FileService.save_file(file, purpose=purpose, user_id=user_id, board_id=board_id)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(result), 201

@bp.route('/<filename>', methods=['GET'])
def get_file(filename):
    user_id = get_authenticated_user_id()
    allowed, error, status = FileService.verify_file_access(filename, user_id)
    if not allowed:
        return jsonify({'error': error}), status
    return FileService.get_file(filename, as_attachment=False)

@bp.route('/<filename>/download', methods=['GET'])
def download_file(filename):
    user_id = get_authenticated_user_id()
    allowed, error, status = FileService.verify_file_access(filename, user_id)
    if not allowed:
        return jsonify({'error': error}), status
    orig_name = request.args.get('name')
    return FileService.get_file(filename, as_attachment=True, download_name=orig_name)

