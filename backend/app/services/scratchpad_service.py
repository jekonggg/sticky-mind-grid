from datetime import datetime
from app import db
from app.models.scratchpad_note import ScratchpadNote

TOUR_NOTE_CONTENT = """Welcome to your personal scratchpad!

🔒 Privacy First:
• Everything written here is completely private to you.
• Board collaborators and team members cannot see these notes.
• Synced securely to your account across all your devices.

⚡ Quick Tips to try right now:
1. 🎨 Change Colors — Click any color circle above to color-code your note.
2. 📌 Pin Important Notes — Click the "Pin" button to keep this note pinned at the top.
3. 📋 One-Click Copy — Click "Copy" to quickly grab the content and paste it into a board task or chat.
4. ➕ Create More — Click "+ New Note" in the top right to start a fresh draft anytime."""

STANDUP_TEMPLATE_CONTENT = """### 🎯 Today's Focus
- [ ] Top priority task for today: 
- [ ] Review pending pull requests or board cards

### 💬 Daily Standup Notes
• Yesterday: Completed initial research and wireframes
• Today: Implementing API routes & frontend components
• Blockers: None at the moment

### 💡 Quick Ideas / Later:
• Discuss board color themes with the design team"""

STARTER_NOTES = [
    {
        "title": "👋 Welcome to your Scratchpad (Quick Tour)",
        "content": TOUR_NOTE_CONTENT,
        "color": "#fef3c7",
        "pinned": True,
    },
    {
        "title": "📋 Daily Standup & Planner",
        "content": STANDUP_TEMPLATE_CONTENT,
        "color": "#e0f2fe",
        "pinned": False,
    },
]

class ScratchpadService:
    @staticmethod
    def get_user_notes(user_id: str):
        notes = ScratchpadNote.query.filter_by(user_id=user_id).order_by(
            ScratchpadNote.pinned.desc(),
            ScratchpadNote.updated_at.desc()
        ).all()

        # Seed starter notes on first view if user has no scratchpad notes
        if not notes:
            created_notes = []
            for item in STARTER_NOTES:
                note = ScratchpadNote(
                    user_id=user_id,
                    title=item["title"],
                    content=item["content"],
                    color=item["color"],
                    pinned=item["pinned"]
                )
                db.session.add(note)
                created_notes.append(note)
            db.session.commit()
            return ScratchpadNote.query.filter_by(user_id=user_id).order_by(
                ScratchpadNote.pinned.desc(),
                ScratchpadNote.updated_at.desc()
            ).all()

        return notes

    @staticmethod
    def create_note(user_id: str, data: dict):
        title = data.get('title', '').strip() if data else ''
        if not title:
            title = 'Untitled Scratchpad'

        content = data.get('content', '') if data else ''
        color = data.get('color', '#fef3c7') if data else '#fef3c7'
        pinned = bool(data.get('pinned', False)) if data else False

        note = ScratchpadNote(
            user_id=user_id,
            title=title,
            content=content,
            color=color,
            pinned=pinned
        )
        db.session.add(note)
        db.session.commit()
        return note, None

    @staticmethod
    def update_note(note_id: str, user_id: str, data: dict):
        note = db.session.get(ScratchpadNote, note_id)
        if not note:
            return None, "Scratchpad note not found"

        if str(note.user_id) != str(user_id):
            return None, "Unauthorized to access this note"

        if not data:
            return note, None

        if 'title' in data:
            title = str(data['title']).strip()
            note.title = title if title else 'Untitled Scratchpad'

        if 'content' in data:
            note.content = data['content']

        if 'color' in data:
            note.color = data['color']

        if 'pinned' in data:
            note.pinned = bool(data['pinned'])

        note.updated_at = datetime.utcnow()
        db.session.commit()
        return note, None

    @staticmethod
    def delete_note(note_id: str, user_id: str):
        note = db.session.get(ScratchpadNote, note_id)
        if not note:
            return False, "Scratchpad note not found"

        if str(note.user_id) != str(user_id):
            return False, "Unauthorized to delete this note"

        db.session.delete(note)
        db.session.commit()
        return True, None
