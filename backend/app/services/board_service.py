from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user import User

class BoardService:
    @staticmethod
    def get_user_boards(user_id):
        return db.session.query(Board).join(BoardMember).filter(BoardMember.user_id == user_id).all()

    @staticmethod
    def get_board_by_id(board_id):
        return Board.query.get(board_id)

    @staticmethod
    def create_board(data, owner_id):
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
            color=data.get('color') or 'hsl(220, 80%, 56%)',
            hero_image_url=data.get('heroImageUrl'),
            columns=data.get('columns', default_columns),
            owner_id=owner_id
        )
        db.session.add(new_board)
        db.session.flush()
        
        # Create Owner Membership
        membership = BoardMember(
            board_id=new_board.id,
            user_id=owner_id,
            role='owner'
        )
        db.session.add(membership)
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
        
        try:
            db.session.commit()
            return board
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_board(board_id):
        board = Board.query.get(board_id)
        if not board:
            return False
        db.session.delete(board)
        db.session.commit()
        return True

    @staticmethod
    def add_member(board_id, email, role='member'):
        user = User.query.filter_by(email=email).first()
        if not user:
            return None, "User not found"
            
        existing = BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first()
        if existing:
            return None, "User is already a member of this board"
            
        membership = BoardMember(
            board_id=board_id,
            user_id=user.id,
            role=role
        )
        db.session.add(membership)
        db.session.commit()
        return membership, None

    @staticmethod
    def remove_member(board_id, user_id):
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return False
        
        if membership.role == 'owner':
            owner_count = BoardMember.query.filter_by(board_id=board_id, role='owner').count()
            if owner_count <= 1:
                return False # Cannot remove the last owner
                
        db.session.delete(membership)
        db.session.commit()
        return True

    @staticmethod
    def update_member_role(board_id, user_id, new_role):
        if new_role not in ['admin', 'member', 'viewer']:
            return None, "Invalid role specified"
            
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return None, "Member not found on this board"
            
        if membership.role == 'owner':
            return None, "Cannot change the role of the board owner"
            
        membership.role = new_role
        try:
            db.session.commit()
            return membership, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_board_members(board_id):
        return BoardMember.query.filter_by(board_id=board_id).all()

