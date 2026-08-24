from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.file_service import FileService

bp = Blueprint('file_routes', __name__, url_prefix='/api/files')

@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    result, error = FileService.save_file(file)
    if error:
        return jsonify({'error': error}), 400

    return jsonify(result), 201

@bp.route('/<filename>', methods=['GET'])
def get_file(filename):
    return FileService.get_file(filename, as_attachment=False)

@bp.route('/<filename>/download', methods=['GET'])
def download_file(filename):
    orig_name = request.args.get('name')
    return FileService.get_file(filename, as_attachment=True, download_name=orig_name)
