from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user import User
from app.models.activity import Activity
from app.models.notification import Notification
from app.utils.event_broadcaster import broadcaster

class BoardService:
    @staticmethod
    def get_user_boards(user_id):
        return db.session.query(Board).join(BoardMember).filter(
            BoardMember.user_id == user_id,
            BoardMember.status == 'accepted'
        ).all()

    @staticmethod
    def get_user_invitations(user_id):
        memberships = BoardMember.query.filter_by(user_id=user_id, status='pending').all()
        invites = []
        for m in memberships:
            board = m.board
            if not board:
                continue
            owner = board.owner
            owner_name = (owner.full_name or owner.email) if owner else "Board Owner"
            invites.append({
                'id': m.id,
                'boardId': m.board_id,
                'role': m.role,
                'status': m.status,
                'createdAt': m.created_at.isoformat() + 'Z' if m.created_at else None,
                'board': {
                    'id': board.id,
                    'name': board.name,
                    'emoji': board.emoji,
                    'description': board.description,
                    'color': board.color,
                    'heroImageUrl': board.hero_image_url,
                    'ownerName': owner_name
                }
            })
        return invites

    @staticmethod
    def get_board_by_id(board_id):
        return db.session.get(Board, board_id)

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
        
        # Create Owner Membership (Accepted by default)
        membership = BoardMember(
            board_id=new_board.id,
            user_id=owner_id,
            role='owner',
            status='accepted'
        )
        db.session.add(membership)

        # Audit log
        activity = Activity(
            type='create',
            task_title=new_board.name,
            message=f'Created board "{new_board.name}"',
            board_id=new_board.id,
            user_id=owner_id
        )
        db.session.add(activity)

        db.session.commit()
        return new_board

    @staticmethod
    def update_board(board_id, data, user_id=None):
        board = db.session.get(Board, board_id)
        if not board:
            return None
        
        if 'name' in data: board.name = data['name']
        if 'emoji' in data: board.emoji = data['emoji']
        if 'description' in data: board.description = data['description']
        if 'color' in data: board.color = data['color']
        if 'heroImageUrl' in data: board.hero_image_url = data['heroImageUrl']
        if 'columns' in data: board.columns = data['columns']
        
        # Audit log for board update
        activity = Activity(
            type='update',
            task_title=board.name,
            message=f'Updated board settings for "{board.name}"',
            board_id=board.id,
            user_id=user_id
        )
        db.session.add(activity)

        try:
            db.session.commit()
            broadcaster.broadcast(board_id, "board:updated", board.to_dict())
            broadcaster.broadcast(board_id, "activity:new", activity.to_dict())
            return board
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_board(board_id):
        board = db.session.get(Board, board_id)
        if not board:
            return False
        db.session.delete(board)
        db.session.commit()
        return True

    ALLOWED_INVITE_ROLES = ('admin', 'member', 'viewer')

    @staticmethod
    def add_member(board_id, email, role='member', actor_id=None):
        if role not in BoardService.ALLOWED_INVITE_ROLES:
            return None, f"Invalid role '{role}'. Must be one of: {', '.join(BoardService.ALLOWED_INVITE_ROLES)}"

        user = User.query.filter_by(email=email).first()
        if not user:
            return None, "User not found"
            
        board = db.session.get(Board, board_id)
        if not board:
            return None, "Board not found"

        existing = BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first()
        if existing:
            if existing.status == 'accepted':
                return None, "User is already an active member of this board"
            elif existing.status == 'pending':
                return None, "An invitation is already pending for this user"
            else:
                # Re-invite if previously declined
                existing.status = 'pending'
                existing.role = role
                membership = existing
        else:
            membership = BoardMember(
                board_id=board_id,
                user_id=user.id,
                role=role,
                status='pending'
            )
            db.session.add(membership)

        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Owner"
        user_name = user.full_name or user.email

        # In-App Notification to Invited User
        from app.services.notification_service import NotificationService
        NotificationService.create_notification(
            user_id=user.id,
            type='board_invite',
            title='Board Invitation',
            message=f'{actor_name} invited you to join "{board.name}" as {role.capitalize()}',
            link=f'/boards/{board_id}'
        )

        # Audit log
        activity = Activity(
            type='update',
            task_title=user_name,
            message=f'Invited {user_name} as {role} (Pending acceptance)',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)

        db.session.commit()

        broadcaster.broadcast(board_id, "member:invited", membership.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return membership, None

    @staticmethod
    def accept_invitation(board_id, user_id):
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return None, "Invitation not found"
        if membership.status == 'accepted':
            return membership, None

        membership.status = 'accepted'
        user = db.session.get(User, user_id)
        user_name = (user.full_name or user.email) if user else "A user"
        board = db.session.get(Board, board_id)
        board_name = board.name if board else "the board"

        # In-App Notification to Board Owner
        if board and board.owner_id and board.owner_id != user_id:
            owner_notif = Notification(
                user_id=board.owner_id,
                type='invite_accepted',
                title='Invitation Accepted',
                message=f'{user_name} accepted your invitation to join "{board_name}".',
                link=f'/boards/{board_id}'
            )
            db.session.add(owner_notif)

        # Audit log
        activity = Activity(
            type='update',
            task_title=user_name,
            message=f'{user_name} accepted the invitation and joined the board',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.commit()

        broadcaster.broadcast(board_id, "member:joined", membership.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return membership, None

    @staticmethod
    def decline_invitation(board_id, user_id):
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return False, "Invitation not found"

        user = db.session.get(User, user_id)
        user_name = (user.full_name or user.email) if user else "A user"
        board = db.session.get(Board, board_id)
        board_name = board.name if board else "the board"

        # In-App Notification to Board Owner
        if board and board.owner_id and board.owner_id != user_id:
            owner_notif = Notification(
                user_id=board.owner_id,
                type='invite_declined',
                title='Invitation Declined',
                message=f'{user_name} declined the invitation to join "{board_name}".',
                link=f'/boards/{board_id}'
            )
            db.session.add(owner_notif)

        # Audit log
        activity = Activity(
            type='update',
            task_title=user_name,
            message=f'{user_name} declined the invitation to join the board',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)

        db.session.delete(membership)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"userId": user_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def remove_member(board_id, user_id, actor_id=None):
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return False, "Member not found on this board"

        board = db.session.get(Board, board_id)
        if not board:
            return False, "Board not found"

        is_self = str(user_id) == str(actor_id)

        # Sole owner protection
        if membership.role == 'owner' or (board.owner_id and str(board.owner_id) == str(user_id)):
            owner_count = BoardMember.query.filter_by(board_id=board_id, role='owner').count()
            if owner_count <= 1:
                return False, "The board owner cannot leave the board. You must transfer ownership or delete the board."

        user_name = membership.user.full_name or membership.user.email if membership.user else "Member"
        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Admin"

        if is_self:
            # Voluntary leave
            activity = Activity(
                type='update',
                task_title=user_name,
                message=f'{user_name} left the board',
                board_id=board_id,
                user_id=actor_id
            )
            db.session.add(activity)

            # Notify board owner
            if board.owner_id and str(board.owner_id) != str(user_id):
                owner_notif = Notification(
                    user_id=board.owner_id,
                    type='member_left',
                    title='Member Left Board',
                    message=f'{user_name} has left "{board.name}".',
                    link=f'/boards/{board_id}'
                )
                db.session.add(owner_notif)
        else:
            # Admin removed member
            activity = Activity(
                type='update',
                task_title=user_name,
                message=f'{actor_name} removed member {user_name}',
                board_id=board_id,
                user_id=actor_id
            )
            db.session.add(activity)

            # Notify the removed user
            removed_notif = Notification(
                user_id=user_id,
                type='member_removed',
                title='Removed from Board',
                message=f'{actor_name} removed you from "{board.name}".'
            )
            db.session.add(removed_notif)

        db.session.delete(membership)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"userId": user_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def update_member_role(board_id, user_id, new_role, actor_id=None):
        if new_role not in ['admin', 'member', 'viewer']:
            return None, "Invalid role specified"
            
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return None, "Member not found on this board"
            
        if membership.role == 'owner':
            return None, "Cannot change the role of the board owner"
            
        membership.role = new_role
        user_name = membership.user.full_name or membership.user.email if membership.user else "Member"

        # Audit log
        activity = Activity(
            type='update',
            task_title=user_name,
            message=f'Updated role for {user_name} to {new_role}',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)

        try:
            db.session.commit()
            broadcaster.broadcast(board_id, "member:role_updated", membership.to_dict())
            broadcaster.broadcast(board_id, "activity:new", activity.to_dict())
            return membership, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_board_members(board_id):
        return BoardMember.query.filter_by(board_id=board_id).all()
