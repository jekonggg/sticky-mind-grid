from app import create_app, db
from app.models.board import Board
from app.models.task import Task
from datetime import datetime
import time

app = create_app()

def seed_database():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()

        print("Seeding Boards...")
        default_columns = [
            {"id": "todo", "title": "To Do"},
            {"id": "in_progress", "title": "In Progress"},
            {"id": "done", "title": "Done"},
            {"id": "archive", "title": "Archive"}
        ]
        
        board1 = Board(
            id="board-1",
            name="Product Launch",
            description="Q3 product launch planning and execution",
            color="bg-blue-500",
            hero_image_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
            columns=default_columns
        )
        board2 = Board(
            id="board-2",
            name="Engineering Sprint",
            description="Current sprint tasks and bugs",
            color="bg-purple-500",
            hero_image_url="https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=800&auto=format&fit=crop",
            columns=default_columns
        )
        
        db.session.add_all([board1, board2])
        db.session.commit()

        print("Seeding Tasks...")
        task1 = Task(id="1", board_id="board-1", title="Design landing page", description="Create wireframes and high-fidelity mockups for the new landing page.", status="todo", priority="high", progress=0)
        task2 = Task(id="task-2", board_id="board-1", title="Feature prioritization", description="Align with stakeholders on Q3 roadmap", status="in_progress", priority="medium", progress=0)
        task3 = Task(id="task-3", board_id="board-1", title="Design mocks review", description="Finalize visual language for the dashboard", status="todo", priority="high", progress=0)
        task4 = Task(id="task-4", board_id="board-2", title="Setup CI/CD pipeline", status="todo", priority="low", progress=0)
        task5 = Task(id="task-5", board_id="board-2", title="API documentation", description="Export Swagger definitions for core services", status="done", priority="medium", progress=100)

        db.session.add_all([task1, task2, task3, task4, task5])
        db.session.commit()
        
        print("Database seeding completed.")

if __name__ == "__main__":
    seed_database()
