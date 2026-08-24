from app import db
from app.models.note import Note
from app.models.board import Board
from app.models.user import User
from app.models.activity import Activity
from app.utils.event_broadcaster import broadcaster
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

class NoteService:
    @staticmethod
    def get_board_notes(board_id):
        return Note.query.filter_by(board_id=board_id).order_by(Note.updated_at.desc()).all()

    @staticmethod
    def create_note(board_id, user_id, data):
        title = data.get('title', '').strip()
        if not title:
            return None, "Title is required"

        content = data.get('content', '')
        color = data.get('color', '#fef3c7')

        author = db.session.get(User, user_id)
        author_name = author.full_name or author.email if author else "User"

        note = Note(
            board_id=board_id,
            user_id=user_id,
            title=title,
            content=content,
            color=color
        )
        db.session.add(note)

        # Audit log
        activity = Activity(
            type='create',
            task_title=title,
            message=f'{author_name} created project note "{title}"',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        board = db.session.get(Board, board_id)
        if board:
            board.touch()

        db.session.commit()

        broadcaster.broadcast(board_id, "note:created", note.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return note, None

    @staticmethod
    def update_note(note_id, user_id, data):
        note = db.session.get(Note, note_id)
        if not note:
            return None, "Note not found"

        # Check permissions (member, admin, or owner with accepted membership)
        board_id = note.board_id
        level = get_effective_role(board_id, user_id)
        board = db.session.get(Board, board_id)

        if level < ROLE_HIERARCHY['viewer']:
            return None, "Unauthorized to edit notes on this board"

        if level < ROLE_HIERARCHY['member']:
            return None, "Viewers cannot edit notes"

        author = db.session.get(User, user_id)
        author_name = author.full_name or author.email if author else "User"

        if 'title' in data and data['title'].strip():
            note.title = data['title'].strip()
        if 'content' in data:
            note.content = data['content']
        if 'color' in data:
            note.color = data['color']

        activity = Activity(
            type='update',
            task_title=note.title,
            message=f'{author_name} updated note "{note.title}"',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        if board:
            board.touch()

        db.session.commit()

        broadcaster.broadcast(board_id, "note:updated", note.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return note, None

    @staticmethod
    def delete_note(note_id, user_id):
        note = db.session.get(Note, note_id)
        if not note:
            return False, "Note not found"

        board_id = note.board_id
        is_author = note.user_id == user_id
        is_admin_or_owner = get_effective_role(board_id, user_id) >= ROLE_HIERARCHY['admin']
        board = db.session.get(Board, board_id)
        if board and board.owner_id == user_id:
            is_admin_or_owner = True

        if not is_author and not is_admin_or_owner:
            return False, "You do not have permission to delete this note"

        author = db.session.get(User, user_id)
        author_name = author.full_name or author.email if author else "User"
        title = note.title

        activity = Activity(
            type='delete',
            task_title=title,
            message=f'{author_name} deleted note "{title}"',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.delete(note)
        db.session.commit()

        broadcaster.broadcast(board_id, "note:deleted", {"noteId": note_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None
