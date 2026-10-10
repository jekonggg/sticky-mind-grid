from datetime import datetime
from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.user import User
from app.models.activity import Activity
from app.models.notification import Notification
from app.utils.event_broadcaster import broadcaster
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY

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
    def count_owners(board_id):
        owners = set()
        board = db.session.get(Board, board_id)
        if board and board.owner_id:
            owners.add(str(board.owner_id))
        member_owners = BoardMember.query.filter_by(
            board_id=board_id, role='owner', status='accepted'
        ).all()
        for m in member_owners:
            owners.add(str(m.user_id))
        return len(owners)

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
        if 'columns' in data:
            new_columns = data['columns']
            if isinstance(new_columns, list):
                new_column_ids = {c.get('id') for c in new_columns if isinstance(c, dict) and 'id' in c}
                old_columns = board.columns or []
                for col in old_columns:
                    old_id = col.get('id') if isinstance(col, dict) else None
                    if old_id and old_id not in new_column_ids:
                        from app.models.task import Task
                        active_task = Task.query.filter_by(board_id=board_id, status=old_id, is_deleted=False).first()
                        if active_task:
                            raise ValueError(f"Cannot delete column '{col.get('title', old_id)}' because it contains active cards. Move or delete cards first.")
            board.columns = new_columns
        
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

    ALLOWED_INVITE_ROLES = ('admin', 'editor', 'commenter', 'viewer', 'member')
    ALLOWED_ROLES = ('owner', 'admin', 'editor', 'commenter', 'viewer', 'member')

    @staticmethod
    def add_member(board_id, email, role='editor', actor_id=None):
        if role not in BoardService.ALLOWED_INVITE_ROLES:
            return None, f"Invalid role '{role}'. Must be one of: {', '.join(BoardService.ALLOWED_INVITE_ROLES)}"

        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return None, "Only board admins or owners can send invites"

        if actor_level == ROLE_HIERARCHY['admin'] and role in ['owner', 'admin']:
            return None, "Admins cannot grant Admin or Owner roles. Only board owners can grant these roles."

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
    def resend_invitation(board_id, user_id, actor_id=None):
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return False, "Requires admin privileges to resend invitations"

        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id, status='pending').first()
        if not membership:
            return False, "Pending invitation not found"

        if actor_level == ROLE_HIERARCHY['admin'] and membership.role in ['owner', 'admin']:
            return False, "Admins cannot manage invitations for Admin or Owner roles"

        board = db.session.get(Board, board_id)
        user = db.session.get(User, user_id)
        if not board or not user:
            return False, "Board or user not found"

        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Admin"

        from app.services.notification_service import NotificationService
        NotificationService.create_notification(
            user_id=user.id,
            type='board_invite',
            title='Board Invitation Reminder',
            message=f'{actor_name} reminded you to join "{board.name}" as {membership.role.capitalize()}',
            link=f'/boards/{board_id}'
        )
        broadcaster.broadcast(board_id, "member:invite_resent", membership.to_dict())
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
        is_owner_target = membership.role == 'owner' or (board.owner_id and str(board.owner_id) == str(user_id))
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']

        if not is_self:
            # Require admin or owner privileges to remove other members
            if actor_level < ROLE_HIERARCHY['admin']:
                return False, "Requires admin privileges to remove other members"

            # Admin can only remove Editor and below (cannot remove Admin or Owner)
            if actor_level == ROLE_HIERARCHY['admin']:
                if membership.role in ['owner', 'admin'] or is_owner_target:
                    return False, "Admins can only remove members with Editor role or below. Admins cannot remove Admins or Owners."

        # Sole owner protection: applies both on self-leave and on removal
        if is_owner_target:
            if BoardService.count_owners(board_id) <= 1:
                return False, "A board must always have at least one Owner. The last Owner cannot leave or be removed. You must transfer ownership or delete the board."


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
            # Admin or Owner removed member
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

        # Automatically remove user from all assigned tasks on this board and log it
        from app.models.task import Task
        assigned_tasks = Task.query.filter_by(board_id=board_id, assigned_to=user_id, is_deleted=False).all()
        for t in assigned_tasks:
            t.assigned_to = None
            task_act = Activity(
                type='update',
                task_title=t.title,
                message=f'Removed assignee {user_name} from "{t.title}" because member was removed from the board',
                board_id=board_id,
                user_id=actor_id
            )
            db.session.add(task_act)
            broadcaster.broadcast(board_id, "task:updated", t.to_dict())
            broadcaster.broadcast(board_id, "activity:new", task_act.to_dict())

        db.session.delete(membership)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"userId": user_id})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def update_member_role(board_id, user_id, new_role, actor_id=None):
        if new_role not in BoardService.ALLOWED_ROLES:
            return None, "Invalid role specified"
            
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            return None, "Member not found on this board"

        board = db.session.get(Board, board_id)
        if not board:
            return None, "Board not found"

        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return None, "Requires admin privileges to change member roles"

        is_target_owner = membership.role == 'owner' or (board.owner_id and str(board.owner_id) == str(user_id))

        # Admin restrictions:
        # - Admins cannot change an Owner
        # - Admins can only change Editor and below (cannot change another Admin)
        # - Admins cannot grant Admin or Owner role
        if actor_level == ROLE_HIERARCHY['admin']:
            if membership.role in ['owner', 'admin'] or is_target_owner:
                return None, "Admins cannot change the role of Admins or Owners. Only board owners can manage these roles."
            if new_role in ['owner', 'admin']:
                return None, "Admins cannot grant Admin or Owner roles. Only board owners can grant these roles."

        # Demoting an Owner:
        if is_target_owner and new_role != 'owner':
            if BoardService.count_owners(board_id) <= 1:
                return None, "A board must always have at least one Owner. The last Owner cannot be demoted."

        membership.role = new_role

        # If target was board.owner_id and demoted, reassign board.owner_id to another owner
        if str(board.owner_id) == str(user_id) and new_role != 'owner':
            other_owner = BoardMember.query.filter(
                BoardMember.board_id == board_id,
                BoardMember.user_id != user_id,
                BoardMember.role == 'owner',
                BoardMember.status == 'accepted'
            ).first()
            if other_owner:
                board.owner_id = other_owner.user_id

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

        # If demoted below Editor (to commenter or viewer), automatically remove from all assigned tasks on this board and log it
        if ROLE_HIERARCHY[new_role] < ROLE_HIERARCHY['editor']:
            from app.models.task import Task
            assigned_tasks = Task.query.filter_by(board_id=board_id, assigned_to=user_id, is_deleted=False).all()
            for t in assigned_tasks:
                t.assigned_to = None
                task_act = Activity(
                    type='update',
                    task_title=t.title,
                    message=f'Removed assignee {user_name} from "{t.title}" because role was demoted to {new_role}',
                    board_id=board_id,
                    user_id=actor_id
                )
                db.session.add(task_act)
                broadcaster.broadcast(board_id, "task:updated", t.to_dict())
                broadcaster.broadcast(board_id, "activity:new", task_act.to_dict())

        try:
            db.session.commit()
            broadcaster.broadcast(board_id, "member:role_updated", membership.to_dict())
            broadcaster.broadcast(board_id, "activity:new", activity.to_dict())
            return membership, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def transfer_ownership(board_id, new_owner_id, actor_id=None):
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['owner']:
            return False, "Only board owners can transfer ownership"

        board = db.session.get(Board, board_id)
        if not board:
            return False, "Board not found"

        new_owner = db.session.get(User, new_owner_id)
        if not new_owner:
            return False, "Target user not found"

        target_membership = BoardMember.query.filter_by(board_id=board_id, user_id=new_owner_id).first()
        if not target_membership:
            target_membership = BoardMember(
                board_id=board_id,
                user_id=new_owner_id,
                role='owner',
                status='accepted'
            )
            db.session.add(target_membership)
        else:
            target_membership.role = 'owner'
            target_membership.status = 'accepted'

        board.owner_id = new_owner_id

        new_owner_name = new_owner.full_name or new_owner.email
        activity = Activity(
            type='update',
            task_title=board.name,
            message=f'Transferred board ownership to {new_owner_name}',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)
        db.session.commit()

        broadcaster.broadcast(board_id, "board:updated", board.to_dict())
        broadcaster.broadcast(board_id, "member:role_updated", target_membership.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())
        return True, None

    @staticmethod
    def get_board_members(board_id, actor_id=None):
        members = BoardMember.query.filter_by(board_id=board_id).all()
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        # Commenters and Viewers receive name and avatar only (emails redacted)
        redact = actor_level <= ROLE_HIERARCHY['commenter']
        return [member.to_dict(redact_user=redact) for member in members]

    @staticmethod
    def export_board_data(board_id, actor_id=None):
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return None, "Only board admins or owners can export board data"

        board = db.session.get(Board, board_id)
        if not board:
            return None, "Board not found"

        from app.models.task import Task
        tasks = Task.query.filter_by(board_id=board_id, is_deleted=False).all()
        members = BoardMember.query.filter_by(board_id=board_id).all()

        return {
            'board': board.to_dict(),
            'tasks': [t.to_dict() for t in tasks],
            'members': [m.to_dict() for m in members],
            'exportedAt': datetime.utcnow().isoformat() + 'Z'
        }, None
