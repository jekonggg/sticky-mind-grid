import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import (
    User, Board, BoardMember, Task, Activity,
    Comment, Notification, Note, UserPreference,
    Conversation, ConversationParticipant, Message
)

from sqlalchemy import inspect as sa_inspect

def init_database():
    app = create_app()
    with app.app_context():
        target = app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1] if '@' in app.config['SQLALCHEMY_DATABASE_URI'] else 'Local DB'
        print(f"Connecting to database: {target}")
        print("Creating all tables if they do not exist...")
        db.create_all()
        print("[OK] All tables verified and created successfully!")
        
        # Verify tables and columns in database
        inspector = sa_inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Tables currently in database ({len(tables)}): {', '.join(tables)}")

        # Ensure is_forwarded and is_pinned columns exist in messages table
        if 'messages' in tables:
            cols = [c['name'] for c in inspector.get_columns('messages')]
            from sqlalchemy import text
            if 'is_forwarded' not in cols:
                print("Adding missing column 'is_forwarded' to messages table...")
                db.session.execute(text("ALTER TABLE messages ADD COLUMN is_forwarded BOOLEAN DEFAULT FALSE NOT NULL"))
                db.session.commit()
                print("Column 'is_forwarded' added successfully.")
            if 'is_pinned' not in cols:
                print("Adding missing column 'is_pinned' to messages table...")
                db.session.execute(text("ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE NOT NULL"))
                db.session.commit()
                print("Column 'is_pinned' added successfully.")

if __name__ == "__main__":
    init_database()
