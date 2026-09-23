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
