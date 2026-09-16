from datetime import datetime
from app import db
from app.models.user import User
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.board_invitation import BoardInvitation
from app.models.task import Task
from app.models.comment import Comment
from app.models.activity import Activity
from app.utils.event_broadcaster import broadcaster

class UserService:
    @staticmethod
    def delete_account(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return False, "User not found"

        user_id = str(user_id)
        user_name = user.full_name or user.email

        # 1. Handle owned boards (Tenancy Edge Case 3: Account vs. board ownership)
        owned_boards = Board.query.filter_by(owner_id=user_id).all()
        for board in owned_boards:
            # Check for oldest Admin to auto-promote
            successor = BoardMember.query.filter(
                BoardMember.board_id == board.id,
                BoardMember.user_id != user_id,
                BoardMember.status == 'accepted',
                BoardMember.role == 'admin'
            ).order_by(BoardMember.created_at.asc()).first()

            if not successor:
                # If no admin, check for oldest active editor or member
                successor = BoardMember.query.filter(
                    BoardMember.board_id == board.id,
                    BoardMember.user_id != user_id,
                    BoardMember.status == 'accepted',
                    BoardMember.role.in_(['editor', 'member', 'commenter', 'viewer'])
                ).order_by(BoardMember.created_at.asc()).first()

            if successor:
                successor.role = 'owner'
                board.owner_id = successor.user_id
                successor_name = (successor.user.full_name or successor.user.email) if successor.user else "New Owner"
                activity = Activity(
                    type='update',
                    task_title=board.name,
                    message=f'Auto-promoted {successor_name} to Owner following account deletion of former owner',
                    board_id=board.id,
                    user_id=successor.user_id
                )
                db.session.add(activity)
                broadcaster.broadcast(board.id, "member:role_updated", {"userId": successor.user_id, "role": "owner"})
                broadcaster.broadcast(board.id, "activity:new", activity.to_dict())
            else:
                # Sole owner with no other members: delete orphaned board cleanly
                db.session.delete(board)

        # 2. Boards where user is an accepted or pending member
        memberships = BoardMember.query.filter_by(user_id=user_id).all()
        for m in memberships:
            db.session.delete(m)

        # 3. Task assignments: clear assignee so tasks remain unassigned
        assigned_tasks = Task.query.filter_by(assigned_to=user_id).all()
        for t in assigned_tasks:
            t.assigned_to = None

        # 4. Content authored by user: KEEP tasks and comments! (Tenancy Edge Case 4)
        # Detach foreign keys so comments and activities remain intact as 'Former member'
        user_comments = Comment.query.filter_by(user_id=user_id).all()
        for c in user_comments:
            c.user_id = None

        user_activities = Activity.query.filter_by(user_id=user_id).all()
        for a in user_activities:
            a.user_id = None

        # 5. Clean up pending invitations sent by this user
        BoardInvitation.query.filter_by(inviter_id=user_id).delete(synchronize_session=False)

        # 6. Delete user record
        db.session.delete(user)
        db.session.commit()
        return True, None
