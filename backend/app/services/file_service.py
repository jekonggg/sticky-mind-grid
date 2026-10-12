import os
import uuid
import base64
from werkzeug.utils import secure_filename
from flask import current_app, send_from_directory, abort

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB strict limit for board banners
ALLOWED_BANNER_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
ALLOWED_BANNER_MIMES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'}

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
    def is_valid_image_bytes(data: bytes) -> bool:
        if not data or len(data) < 12:
            return False
        # JPEG: FF D8 FF
        if data[:3] == b'\xff\xd8\xff':
            return True
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            return True
        # GIF: GIF87a or GIF89a
        if data[:6] in (b'GIF87a', b'GIF89a'):
            return True
        # WebP: RIFF....WEBP
        if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            return True
        return False

    @staticmethod
    def save_base64_image(data_url: str):
        """Validate and persist a data:image/*;base64 string to UPLOAD_FOLDER so it is permission-checked like attachments."""
        if not data_url or not data_url.startswith('data:image/'):
            return None, "Invalid image data URL"
        try:
            header, encoded = data_url.split(',', 1)
            mime_part = header.split(';')[0].replace('data:', '').strip().lower()
            if mime_part not in ALLOWED_BANNER_MIMES:
                return None, f"Unsupported banner image type '{mime_part}'. Allowed: JPG, PNG, WebP, GIF"
            raw_bytes = base64.b64decode(encoded, validate=True)
        except Exception:
            return None, "Malformed base64 image data"

        if len(raw_bytes) > MAX_BANNER_SIZE_BYTES:
            return None, "Banner image exceeds the 5MB maximum size limit"

        if not FileService.is_valid_image_bytes(raw_bytes):
            return None, "Uploaded file content is not a valid raster image (JPG, PNG, WebP, or GIF)"

        ext_map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
        }
        ext = ext_map.get(mime_part, 'jpg')
        unique_id = str(uuid.uuid4())
        stored_filename = f"{unique_id}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, stored_filename)
        with open(filepath, 'wb') as f:
            f.write(raw_bytes)

        return f"/api/files/{stored_filename}", None

    @staticmethod
    def save_file(file_storage, purpose=None):
        if not file_storage or not file_storage.filename:
            return None, "No file provided"

        orig_filename = secure_filename(file_storage.filename) or "file"
        ext = os.path.splitext(orig_filename)[1].lower().lstrip('.')
        content_type = (file_storage.content_type or 'application/octet-stream').lower()

        if purpose == 'banner':
            if not ext or ext not in ALLOWED_BANNER_EXTENSIONS:
                return None, f"Banner file type '.{ext or 'unknown'}' is not allowed. Allowed types: JPG, PNG, WebP, GIF"
            if content_type != 'application/octet-stream' and content_type not in ALLOWED_BANNER_MIMES:
                return None, f"Banner MIME type '{content_type}' is not allowed. Allowed types: JPG, PNG, WebP, GIF"
        else:
            allowed = current_app.config.get('ALLOWED_UPLOAD_EXTENSIONS') or []
            if not ext or (allowed and ext not in allowed):
                return None, f"File type '.{ext or 'unknown'}' is not allowed. Allowed types: {', .'.join(allowed[:12])} ..."

        unique_id = str(uuid.uuid4())
        stored_ext = f".{ext}" if ext else ""
        stored_filename = f"{unique_id}{stored_ext}"
        filepath = os.path.join(UPLOAD_FOLDER, stored_filename)

        file_storage.save(filepath)
        size_bytes = os.path.getsize(filepath)

        max_bytes = MAX_BANNER_SIZE_BYTES if purpose == 'banner' else current_app.config.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024)
        if size_bytes > max_bytes:
            try:
                os.remove(filepath)
            except OSError:
                pass
            limit_mb = max_bytes // (1024 * 1024)
            return None, f"File size exceeds the {limit_mb}MB maximum limit"

        if purpose == 'banner':
            try:
                with open(filepath, 'rb') as f:
                    header_bytes = f.read(16)
            except OSError:
                header_bytes = b''
            if not FileService.is_valid_image_bytes(header_bytes):
                try:
                    os.remove(filepath)
                except OSError:
                    pass
                return None, "File content is not a valid image (JPG, PNG, WebP, or GIF)"

        formatted_size = format_size(size_bytes)
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
    def verify_file_access(filename, user_id):
        safe_name = secure_filename(filename)
        from app.models.user import User

        # 0. User avatars are public profile pictures - accessible without authentication
        if User.query.filter(User.avatar_url.like(f"%{safe_name}%")).first():
            return True, None, 200

        if not user_id:
            return False, "Authentication required to access attachments", 401

        from app.models.task import Task
        from app.models.board import Board
        from app.utils.decorators import get_effective_role

        # 1. Check if the file is attached to any task
        # Search active and deleted tasks for attachment record
        all_tasks = Task.query.filter(Task.attachments.isnot(None)).all()
        matched_tasks = []
        for t in all_tasks:
            if not t.attachments or not isinstance(t.attachments, list):
                continue
            for att in t.attachments:
                if isinstance(att, dict) and (
                    att.get('storedName') == safe_name or
                    att.get('id') == safe_name or
                    (att.get('url') and safe_name in att.get('url'))
                ):
                    matched_tasks.append(t)
                    break

        if matched_tasks:
            # User must have active membership on at least one board containing this task
            has_access = any(get_effective_role(t.board_id, user_id) > 0 for t in matched_tasks)
            if not has_access:
                return False, "You do not have permission to access attachments from this board", 403
            return True, None, 200

        # 2. Check if the file is in a chat message
        from app.models.message import Message, ConversationParticipant
        all_messages = Message.query.filter(Message.attachments.isnot(None)).all()
        matched_conv_ids = set()
        for m in all_messages:
            if not m.attachments or not isinstance(m.attachments, list):
                continue
            for att in m.attachments:
                if isinstance(att, dict) and (
                    att.get('storedName') == safe_name or
                    att.get('id') == safe_name or
                    (att.get('url') and safe_name in att.get('url'))
                ):
                    matched_conv_ids.add(m.conversation_id)
                    break

        if matched_conv_ids:
            is_participant = ConversationParticipant.query.filter(
                ConversationParticipant.conversation_id.in_(list(matched_conv_ids)),
                ConversationParticipant.user_id == user_id
            ).first() is not None
            if not is_participant:
                return False, "You do not have permission to access message attachments from this conversation", 403
            return True, None, 200

        # 3. Check if file is a board hero image
        hero_boards = Board.query.filter(Board.hero_image_url.isnot(None)).all()
        matched_hero_boards = [b for b in hero_boards if b.hero_image_url and safe_name in b.hero_image_url]
        if matched_hero_boards:
            has_hero_access = any(get_effective_role(b.id, user_id) > 0 for b in matched_hero_boards)
            if not has_hero_access:
                return False, "You do not have permission to access board assets", 403
            return True, None, 200

        # 4. User avatars and newly uploaded staging files: permitted for authenticated users
        return True, None, 200

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
