from app import create_app, db
from app.models.board import Board
from app.models.task import Task
from app.models.activity import Activity
from datetime import datetime, timedelta
import uuid

app = create_app()

def generate_id():
    return str(uuid.uuid4())

def seed_database():
    with app.app_context():
        # Clear existing data
        print("Clearing database...")
        db.drop_all()
        db.create_all()

        print("Seeding Strategic Showcase Board...")
        
        # CURRENT TIME as base
        now = datetime(2026, 4, 8, 10, 0, 0)
        
        # Board 0: PRIMARY SHOWCASE
        board0 = Board(
            id="board-showcase",
            name="Showcase: Sticky Mind Grid Core",
            emoji="🚀",
            description="Demonstrating the full Trello-style cycle: ticket creation, stage transitions (To Do ➔ Done), and persistent audit trails.",
            color="bg-primary",
            hero_image_url="https://images.unsplash.com/photo-1484417894907-623942c8ee29?q=80&w=1200&auto=format&fit=crop",
            columns=[
                {"id": "todo", "title": "To Do", "emoji": "📝"},
                {"id": "in_progress", "title": "In Progress", "emoji": "⏳"},
                {"id": "qa", "title": "Quality Assurance", "emoji": "🔍"},
                {"id": "done", "title": "Done", "emoji": "✅"},
                {"id": "archive", "title": "Archive", "emoji": "📦"}
            ],
            created_at=now + timedelta(minutes=10),
            updated_at=now + timedelta(minutes=10)
        )

        print("Seeding Support Boards...")
        
        # Board 1: Product Roadmap
        board1 = Board(
            id="board-1",
            name="Platform Engine - Road Map",
            emoji="🏗️",
            description="Engineering roadmap for foundational platform services.",
            color="bg-indigo-600",
            hero_image_url="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
            columns=[
                {"id": "backlog", "title": "Backlog", "emoji": "📂"},
                {"id": "design", "title": "Architecture", "emoji": "📐"},
                {"id": "implementation", "title": "Implementation", "emoji": "👨‍💻"},
                {"id": "testing", "title": "QA/Testing", "emoji": "🧪"},
                {"id": "done", "title": "Released", "emoji": "🚀"}
            ],
            created_at=now,
            updated_at=now
        )

        # Board 2: Growth Strategy
        board2 = Board(
            id="board-2",
            name="Q4 Marketing Strategy",
            emoji="📈",
            description="Growth campaign to increase user acquisition by 30%.",
            color="bg-rose-500",
            hero_image_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
            columns=[
                {"id": "todo", "title": "To Do", "emoji": "📋"},
                {"id": "content", "title": "Content Creation", "emoji": "🎨"},
                {"id": "review", "title": "Legal Review", "emoji": "⚖️"},
                {"id": "active", "title": "Running Ads", "emoji": "🔥"}
            ],
            created_at=now - timedelta(minutes=5),
            updated_at=now - timedelta(minutes=5)
        )

        db.session.add_all([board0, board1, board2])
        db.session.commit()

        print("Seeding Showcase Tasks...")
        showcase_tasks = [
            Task(id=generate_id(), board_id="board-showcase", title="Move me to Done!", emoji="🎯", description="Drag this ticket across columns to see the progress auto-snap (0% ➔ 100%).", status="todo", priority="high", progress=0, due_date=now + timedelta(days=2)),
            Task(id=generate_id(), board_id="board-showcase", title="Check my History sidebar", emoji="📜", description="I've already been moved once. Click me to see my journey.", status="in_progress", priority="medium", progress=30),
            Task(id=generate_id(), board_id="board-showcase", title="Dynamic Dashboard Insights", emoji="💡", description="Look at the Overview tab!", status="qa", priority="low", progress=60),
            Task(id=generate_id(), board_id="board-showcase", title="Full-Scale Image Support", emoji="🖼️", description="I'm a ticket with detailed content.", status="done", priority="medium", progress=100, due_date=now - timedelta(days=1)),
        ]

        print("Seeding Engineering Tasks...")
        tasks1 = [
            Task(id=generate_id(), board_id="board-1", title="Define GraphQL Mesh Schema", status="design", priority="high", progress=30, due_date=now + timedelta(days=5)),
            Task(id=generate_id(), board_id="board-1", title="OAuth2.0 Flow Integration", status="implementation", priority="high", progress=60, due_date=now + timedelta(days=12)),
            Task(id=generate_id(), board_id="board-1", title="Audit logging middleware", status="implementation", priority="medium", progress=45),
            Task(id=generate_id(), board_id="board-1", title="Dockerize legacy services", status="backlog", priority="low", progress=0),
        ]

        print("Seeding Marketing Tasks...")
        tasks2 = [
            Task(id=generate_id(), board_id="board-2", title="Influencer Outreach List", status="content", priority="high", progress=40, due_date=now + timedelta(days=4)),
            Task(id=generate_id(), board_id="board-2", title="A/B Test Landing Page Hero", status="todo", priority="low", progress=0, due_date=now + timedelta(days=1)),
        ]

        db.session.add_all(showcase_tasks + tasks1 + tasks2)
        db.session.commit()

        # Seed initial showcase activities
        print("Seeding Audit Trail...")
        activities = [
            Activity(id=generate_id(), board_id="board-showcase", type="create", task_title="Move me to 'Done'!", message="Created task StickyMind Requirement", timestamp=now),
            Activity(id=generate_id(), board_id="board-showcase", type="move", task_title="Check my History sidebar", message="Moved from To Do ➔ In Progress", timestamp=now + timedelta(minutes=1)),
            Activity(id=generate_id(), board_id="board-showcase", type="update", task_title="Full-Scale Image Support", message="Set due date to April 7, 2026", timestamp=now + timedelta(minutes=2)),
        ]
        db.session.add_all(activities)
        db.session.commit()
        
        print("Final reseeding completed. Showcase is LIVE and FIRST.")

if __name__ == "__main__":
    seed_database()

if __name__ == "__main__":
    seed_database()
