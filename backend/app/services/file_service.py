import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app, send_from_directory, abort

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

class FileService:
    @staticmethod
    def save_file(file_storage):
        if not file_storage or not file_storage.filename:
            return None, "No file provided"

        orig_filename = secure_filename(file_storage.filename) or "file"
        ext = os.path.splitext(orig_filename)[1].lower().lstrip('.')

        allowed = current_app.config.get('ALLOWED_UPLOAD_EXTENSIONS') or []
        if ext and allowed and ext not in allowed:
            return None, f"File type '.{ext}' is not allowed. Allowed types: {', .'.join(allowed[:12])} ..."

        unique_id = str(uuid.uuid4())
        stored_ext = f".{ext}" if ext else ""
        stored_filename = f"{unique_id}{stored_ext}"
        filepath = os.path.join(UPLOAD_FOLDER, stored_filename)

        file_storage.save(filepath)
        size_bytes = os.path.getsize(filepath)
        formatted_size = format_size(size_bytes)
        content_type = file_storage.content_type or 'application/octet-stream'

        url = f"/api/files/{stored_filename}"

        return {
            'id': unique_id,
            'name': orig_filename,
            'storedName': stored_filename,
            'url': url,
            'type': content_type,
            'size': formatted_size,
            'sizeBytes': size_bytes
        }, None

    @staticmethod
    def get_file(filename, as_attachment=False, download_name=None):
        safe_name = secure_filename(filename)
        if not os.path.exists(os.path.join(UPLOAD_FOLDER, safe_name)):
            return abort(404, description="File not found")

        return send_from_directory(
            UPLOAD_FOLDER,
            safe_name,
            as_attachment=as_attachment,
            download_name=download_name or safe_name
        )
