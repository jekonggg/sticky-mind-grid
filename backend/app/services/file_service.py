import os
import json
import uuid
import base64
from werkzeug.utils import secure_filename
from flask import current_app, send_from_directory, abort

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
UPLOADER_META_PATH = os.path.join(UPLOAD_FOLDER, '.uploaders.json')

MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB strict limit for board banners
ALLOWED_BANNER_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
ALLOWED_BANNER_MIMES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'}

EICAR_SIGNATURE = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$' + b'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

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
    _uploaders_cache = {}

    @staticmethod
    def _record_uploader(stored_filename: str, user_id):
        if not user_id or not stored_filename:
            return
        FileService._uploaders_cache[stored_filename] = str(user_id)
        try:
            data = {}
            if os.path.exists(UPLOADER_META_PATH):
                with open(UPLOADER_META_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f) or {}
            data[stored_filename] = str(user_id)
            with open(UPLOADER_META_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f)
        except Exception:
            pass

    @staticmethod
    def _get_uploader(stored_filename: str):
        if stored_filename in FileService._uploaders_cache:
            return FileService._uploaders_cache[stored_filename]
        try:
            if os.path.exists(UPLOADER_META_PATH):
                with open(UPLOADER_META_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f) or {}
                if stored_filename in data:
                    FileService._uploaders_cache[stored_filename] = str(data[stored_filename])
                    return str(data[stored_filename])
        except Exception:
            pass
        return None

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
    def scan_bytes_for_malware(sample: bytes, ext: str = ''):
        """
        Perform signature and heuristic malware/virus scanning on file bytes in memory
        before writing to disk. Rejects EICAR test signatures, disguised executable binaries
        (PE/MZ, ELF, Mach-O, shell scripts), and embedded script payloads.
        """
        if not sample:
            return True, None

        # 1. Check EICAR antivirus signature
        if EICAR_SIGNATURE in sample:
            return False, "Virus/malware signature detected (EICAR)"

        # 2. Check disguised executable magic bytes
        if sample[:2] == b'MZ':
            return False, "Executable binary content (Windows PE/MZ) is not permitted"
        if sample[:4] == b'\x7fELF':
            return False, "Executable binary content (ELF) is not permitted"
        if sample[:4] in (b'\xfe\xed\xfa\xce', b'\xfe\xed\xfa\xcf', b'\xce\xfa\xed\xfe', b'\xcf\xfa\xed\xfe'):
            return False, "Executable binary content (Mach-O) is not permitted"
        if sample[:2] == b'#!':
            return False, "Executable script content (shebang) is not permitted"

        # 3. Check embedded <script> or javascript: payloads in text/image/document files
        lower_sample = sample[:65536].lower()
        if b'<script' in lower_sample or b'javascript:' in lower_sample:
            return False, "Embedded script payload detected in file"

        return True, None

    @staticmethod
    def scan_file_for_malware(filepath: str, ext: str = ''):
        try:
            with open(filepath, 'rb') as f:
                sample = f.read(2 * 1024 * 1024)
        except OSError:
            return False, "Unable to read file for virus scan"
        return FileService.scan_bytes_for_malware(sample, ext)

    @staticmethod
    def get_attachment_size_bytes(att: dict) -> int:
        if not isinstance(att, dict):
            return 0
        size_bytes = att.get('sizeBytes')
        if isinstance(size_bytes, int) and size_bytes >= 0:
            return size_bytes
        stored_name = att.get('storedName')
        if not stored_name and att.get('url') and '/api/files/' in str(att.get('url')):
            stored_name = str(att.get('url')).split('/api/files/', 1)[1].split('?', 1)[0]
        if stored_name:
            safe_name = secure_filename(stored_name)
            fpath = os.path.join(UPLOAD_FOLDER, safe_name)
            if os.path.exists(fpath):
                try:
                    return os.path.getsize(fpath)
                except OSError:
                    return 0
        return 0

    @staticmethod
    def get_board_storage_usage(board_id, exclude_task_id=None) -> int:
        if not board_id:
            return 0
        from app.models.task import Task
        tasks = Task.query.filter(Task.board_id == board_id, Task.attachments.isnot(None)).all()
        total = 0
        for t in tasks:
            if exclude_task_id and str(t.id) == str(exclude_task_id):
                continue
            if isinstance(t.attachments, list):
                for att in t.attachments:
                    total += FileService.get_attachment_size_bytes(att)
        return total

    @staticmethod
    def get_owner_storage_usage(owner_id, exclude_task_id=None) -> int:
        if not owner_id:
            return 0
        from app.models.board import Board
        from app.models.task import Task
        board_ids = [
            b.id for b in Board.query.filter_by(owner_id=owner_id, is_deleted=False).all()
        ]
        if not board_ids:
            return 0
        tasks = Task.query.filter(Task.board_id.in_(board_ids), Task.attachments.isnot(None)).all()
        total = 0
        for t in tasks:
            if exclude_task_id and str(t.id) == str(exclude_task_id):
                continue
            if isinstance(t.attachments, list):
                for att in t.attachments:
                    total += FileService.get_attachment_size_bytes(att)
        return total

    @staticmethod
    def check_board_and_owner_quota(board_id, candidate_attachments=None, additional_bytes=0, exclude_task_id=None):
        """
        Verify that adding `candidate_attachments` or `additional_bytes` to `board_id` does not exceed:
        - MAX_BOARD_STORAGE_BYTES (default 100 MB per board)
        - MAX_OWNER_STORAGE_BYTES (default 500 MB per board owner)
        """
        if not board_id:
            return True, None
        from app import db
        from app.models.board import Board
        board = db.session.get(Board, board_id)
        if not board:
            return True, None

        candidate_bytes = int(additional_bytes or 0)
        if isinstance(candidate_attachments, list):
            for att in candidate_attachments:
                candidate_bytes += FileService.get_attachment_size_bytes(att)

        max_board_bytes = current_app.config.get('MAX_BOARD_STORAGE_BYTES', 100 * 1024 * 1024)
        current_board_bytes = FileService.get_board_storage_usage(board_id, exclude_task_id=exclude_task_id)
        if current_board_bytes + candidate_bytes > max_board_bytes:
            return False, f"Board storage quota exceeded (limit: {format_size(max_board_bytes)})"

        if board.owner_id:
            max_owner_bytes = current_app.config.get('MAX_OWNER_STORAGE_BYTES', 500 * 1024 * 1024)
            current_owner_bytes = FileService.get_owner_storage_usage(board.owner_id, exclude_task_id=exclude_task_id)
            if current_owner_bytes + candidate_bytes > max_owner_bytes:
                return False, f"Owner storage quota exceeded (limit: {format_size(max_owner_bytes)})"

        return True, None

    @staticmethod
    def cleanup_task_attachments(task):
        """
        Delete physical attachment files from disk when a task is permanently deleted
        or purged after the 30-day Trash retention period, provided no other task references the file.
        """
        if not task or not isinstance(task.attachments, list):
            return
        from app.models.task import Task
        other_tasks = Task.query.filter(Task.id != task.id, Task.attachments.isnot(None)).all()
        referenced_names = set()
        for ot in other_tasks:
            if isinstance(ot.attachments, list):
                for att in ot.attachments:
                    if isinstance(att, dict):
                        if att.get('storedName'):
                            referenced_names.add(secure_filename(str(att['storedName'])))
                        elif att.get('url') and '/api/files/' in str(att['url']):
                            fname = str(att['url']).split('/api/files/', 1)[1].split('?', 1)[0]
                            referenced_names.add(secure_filename(fname))

        for att in task.attachments:
            if not isinstance(att, dict):
                continue
            stored_name = att.get('storedName')
            if not stored_name and att.get('url') and '/api/files/' in str(att.get('url')):
                stored_name = str(att.get('url')).split('/api/files/', 1)[1].split('?', 1)[0]
            if not stored_name:
                continue
            safe_name = secure_filename(str(stored_name))
            if not safe_name or safe_name in referenced_names:
                continue
            fpath = os.path.join(UPLOAD_FOLDER, safe_name)
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    import gc
                    gc.collect()
                    try:
                        os.remove(fpath)
                    except OSError:
                        pass

    @staticmethod
    def delete_attachment_file(att, exclude_task_id=None):
        """
        Delete a physical attachment file from disk when removed from a task,
        provided no other task references the same file.
        """
        if not isinstance(att, dict):
            return
        stored_name = att.get('storedName')
        if not stored_name and att.get('url') and '/api/files/' in str(att.get('url')):
            stored_name = str(att.get('url')).split('/api/files/', 1)[1].split('?', 1)[0]
        if not stored_name:
            return
        safe_name = secure_filename(str(stored_name))
        if not safe_name:
            return

        from app.models.task import Task
        query = Task.query.filter(Task.attachments.isnot(None))
        if exclude_task_id:
            query = query.filter(Task.id != exclude_task_id)
        other_tasks = query.all()
        for ot in other_tasks:
            if isinstance(ot.attachments, list):
                for a in ot.attachments:
                    if isinstance(a, dict):
                        o_name = a.get('storedName')
                        if not o_name and a.get('url') and '/api/files/' in str(a.get('url')):
                            o_name = str(a.get('url')).split('/api/files/', 1)[1].split('?', 1)[0]
                        if o_name and secure_filename(str(o_name)) == safe_name:
                            return

        try:
            upload_dir = current_app.config.get('UPLOAD_FOLDER', UPLOAD_FOLDER)
        except Exception:
            upload_dir = UPLOAD_FOLDER

        fpath = os.path.join(upload_dir, safe_name)
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except OSError:
                import gc
                gc.collect()
                try:
                    os.remove(fpath)
                except OSError:
                    pass

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

        is_clean, scan_err = FileService.scan_bytes_for_malware(raw_bytes)
        if not is_clean:
            return None, scan_err

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
    def save_file(file_storage, purpose=None, user_id=None, board_id=None):
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

        # Pre-write in-memory stream inspection for size, malware signatures, and quotas
        stream = getattr(file_storage, 'stream', file_storage)
        try:
            stream.seek(0)
            sample_bytes = stream.read(2 * 1024 * 1024)
            stream.seek(0)
        except Exception:
            sample_bytes = b''

        is_clean, scan_error = FileService.scan_bytes_for_malware(sample_bytes, ext)
        if not is_clean:
            return None, scan_error

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

        # Optional per-board / per-owner storage quota check if board_id is provided on upload
        if board_id:
            quota_ok, quota_err = FileService.check_board_and_owner_quota(board_id, additional_bytes=size_bytes)
            if not quota_ok:
                try:
                    os.remove(filepath)
                except OSError:
                    pass
                return None, quota_err

        if user_id:
            FileService._record_uploader(stored_filename, user_id)

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

        # 4. Unattached staging files: only accessible by the uploader who uploaded them
        uploader_id = FileService._get_uploader(safe_name)
        if uploader_id and str(uploader_id) != str(user_id):
            return False, "You do not have permission to access this file", 403

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

