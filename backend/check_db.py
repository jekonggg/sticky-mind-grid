from app import create_app, db
from app.models.user import User
from app.models.board import Board

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='test@example.com').first()
    if not user:
        print('User not found')
    else:
        print(f'User ID: {user.id}')
        boards = Board.query.filter_by(owner_id=user.id).all()
        print(f'Boards for user: {len(boards)}')
        for b in boards:
            print(f' - {b.name} (ID: {b.id})')
        
        all_boards = Board.query.all()
        print(f'Total Boards in DB: {len(all_boards)}')
