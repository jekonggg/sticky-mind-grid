from app import db
from app.models.board import Board

class BoardService:
    @staticmethod
    def get_all_boards():
        return Board.query.all()

    @staticmethod
    def get_board_by_id(board_id):
        return Board.query.get(board_id)

    @staticmethod
    def create_board(data):
        default_columns = [
            {"id": "todo", "title": "To Do", "emoji": "📝"},
            {"id": "in_progress", "title": "In Progress", "emoji": "⏳"},
            {"id": "done", "title": "Done", "emoji": "✅"},
            {"id": "archive", "title": "Archive", "emoji": "📦"}
        ]
        new_board = Board(
            name=data.get('name'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            color=data.get('color', 'bg-blue-500'),
            hero_image_url=data.get('heroImageUrl'),
            columns=data.get('columns', default_columns)
        )
        db.session.add(new_board)
        db.session.commit()
        return new_board

    @staticmethod
    def update_board(board_id, data):
        board = Board.query.get(board_id)
        if not board:
            return None
        
        if 'name' in data: board.name = data['name']
        if 'emoji' in data: board.emoji = data['emoji']
        if 'description' in data: board.description = data['description']
        if 'color' in data: board.color = data['color']
        if 'heroImageUrl' in data: board.hero_image_url = data['heroImageUrl']
        if 'columns' in data: board.columns = data['columns']
        
        db.session.commit()
        return board

    @staticmethod
    def delete_board(board_id):
        board = Board.query.get(board_id)
        if not board:
            return False
        db.session.delete(board)
        db.session.commit()
        return True
