import os
import sys
from app import create_app, db, bcrypt
from app.models.user import User
from app.models.board import Board
from app.models.task import Task
from app.models.activity import Activity

# Add the current directory to sys.path so we can import from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_migration_admin():
    app = create_app()
    with app.app_context():
        admin_email = 'admin@system.local'
        admin_password = 'migration_admin_pass' # Basic password as requested
        
        # 1. Create Migration Admin User
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            print(f"Creating Migration Admin: {admin_email}...")
            admin = User(
                email=admin_email,
                full_name='System Migration Admin'
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print("Migration Admin created successfully.")
        else:
            print("Migration Admin already exists.")

        # 2. Assign Orphaned Boards
        orphaned_boards = Board.query.filter(Board.owner_id == None).all()
        if orphaned_boards:
            print(f"Assigning {len(orphaned_boards)} orphaned boards to admin...")
            for board in orphaned_boards:
                board.owner_id = admin.id
            db.session.commit()
            print("Boards assigned.")
        else:
            print("No orphaned boards found.")

        # 3. Assign Orphaned Tasks
        orphaned_tasks = Task.query.filter(Task.created_by == None).all()
        if orphaned_tasks:
            print(f"Assigning {len(orphaned_tasks)} orphaned tasks to admin...")
            for task in orphaned_tasks:
                task.created_by = admin.id
            db.session.commit()
            print("Tasks assigned.")
        else:
            print("No orphaned tasks found.")

        # 4. Assign Orphaned Activities
        orphaned_activities = Activity.query.filter(Activity.user_id == None).all()
        if orphaned_activities:
            print(f"Assigning {len(orphaned_activities)} orphaned activities to admin...")
            for activity in orphaned_activities:
                activity.user_id = admin.id
            db.session.commit()
            print("Activities assigned.")
        else:
            print("No orphaned activities found.")

if __name__ == "__main__":
    create_migration_admin()
