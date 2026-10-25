from datetime import datetime, timedelta
from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.board_invitation import BoardInvitation
from app.models.user import User
from app.models.activity import Activity
from app.models.notification import Notification
from app.utils.event_broadcaster import broadcaster
from app.utils.decorators import get_effective_role, ROLE_HIERARCHY
from app.utils.column_utils import normalize_columns

class BoardService:
    @staticmethod
    def purge_expired_boards(retention_days=30):
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        expired_boards = Board.query.filter(
            Board.is_deleted.is_(True),
            Board.deleted_at.isnot(None),
            Board.deleted_at < cutoff
        ).all()
        purged_count = len(expired_boards)
        if expired_boards:
            from app.services.file_service import FileService
            for b in expired_boards:
                for task in (b.tasks or []):
                    FileService.cleanup_task_attachments(task)
                db.session.delete(b)
            db.session.commit()
        return purged_count

    @staticmethod
    def get_user_boards(user_id):
        from sqlalchemy.orm import selectinload, joinedload
        from sqlalchemy.exc import OperationalError

        for attempt in range(2):
            try:
                BoardService.purge_expired_boards(retention_days=30)
                return db.session.query(Board).options(
                    joinedload(Board.owner),
                    selectinload(Board.memberships).joinedload(BoardMember.user),
                    selectinload(Board.tasks)
                ).join(BoardMember).filter(
                    BoardMember.user_id == user_id,
                    BoardMember.status == 'accepted',
                    Board.is_deleted.is_(False)
                ).all()
            except (OperationalError, Exception) as e:
                db.session.rollback()
                db.session.remove()
                err_str = str(e).lower()
                is_conn_error = any(msg in err_str for msg in [
                    "lost connection", "server has gone away", "2013", "2006", "connection reset"
                ])
                if attempt == 0 and is_conn_error:
                    continue
                raise


    @staticmethod
    def get_user_invitations(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return []

        now = datetime.utcnow()
        user_email = (user.email or '').strip().lower()
        active_invites = []
        invitation_board_ids = set()

        # 1. Fetch pending invitations matching user email
        from sqlalchemy.orm import joinedload
        invitations = (
            BoardInvitation.query.options(
                joinedload(BoardInvitation.board).joinedload(Board.owner),
                joinedload(BoardInvitation.inviter)
            )
            .filter_by(email=user_email)
            .all()
        )
        all_invitation_board_ids = {inv.board_id for inv in invitations}
        has_mutations = False

        for inv in invitations:
            # Check 7-day expiration
            if inv.status == 'pending' and inv.expires_at and now > inv.expires_at:
                inv.status = 'expired'
                has_mutations = True
                # Also synchronize any matching BoardMember
                bm = BoardMember.query.filter_by(board_id=inv.board_id, user_id=user_id, status='pending').first()
                if bm:
                    bm.status = 'expired'
                continue

            if inv.status == 'pending':
                board = inv.board
                if not board:
                    continue
                inviter_user = inv.inviter or board.owner
                owner_name = (inviter_user.full_name or inviter_user.email) if inviter_user else "Board Owner"
                active_invites.append({
                    'id': inv.id,
                    'boardId': inv.board_id,
                    'role': inv.role,
                    'status': inv.status,
                    'inviterId': inv.inviter_id,
                    'inviterName': owner_name,
                    'createdAt': inv.created_at.isoformat() + 'Z' if inv.created_at else None,
                    'expiresAt': inv.expires_at.isoformat() + 'Z' if inv.expires_at else None,
                    'board': {
                        'id': board.id,
                        'name': board.name,
                        'emoji': board.emoji,
                        'color': board.color,
                        'ownerName': owner_name
                    }
                })

        # 2. Backward compatibility: check standalone BoardMember rows where no BoardInvitation exists
        memberships = (
            BoardMember.query.options(
                joinedload(BoardMember.board).joinedload(Board.owner)
            )
            .filter_by(user_id=user_id, status='pending')
            .all()
        )
        for m in memberships:
            if m.board_id in all_invitation_board_ids:
                continue
            # Check 7-day expiration on standalone BoardMember
            if m.created_at and now > (m.created_at + timedelta(days=7)):
                m.status = 'expired'
                has_mutations = True
                continue

            board = m.board
            if not board:
                continue
            owner = board.owner
            owner_name = (owner.full_name or owner.email) if owner else "Board Owner"
            active_invites.append({
                'id': m.id,
                'boardId': m.board_id,
                'role': m.role,
                'status': m.status,
                'inviterId': board.owner_id,
                'inviterName': owner_name,
                'createdAt': m.created_at.isoformat() + 'Z' if m.created_at else None,
                'expiresAt': (m.created_at + timedelta(days=7)).isoformat() + 'Z' if m.created_at else None,
                'board': {
                    'id': board.id,
                    'name': board.name,
                    'emoji': board.emoji,
                    'color': board.color,
                    'ownerName': owner_name
                }
            })

        if has_mutations:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()

        return active_invites

    @staticmethod
    def get_sent_invitations(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return []

        now = datetime.utcnow()

        memberships = BoardMember.query.filter(
            BoardMember.user_id == user_id,
            BoardMember.status == 'accepted',
            BoardMember.role.in_(['owner', 'admin'])
        ).all()
        board_ids = {m.board_id for m in memberships}

        owned_boards = Board.query.filter_by(owner_id=user_id, is_deleted=False).all()
        for b in owned_boards:
            board_ids.add(b.id)

        if not board_ids:
            invitations = BoardInvitation.query.filter(
                BoardInvitation.inviter_id == user_id,
                BoardInvitation.status == 'pending'
            ).order_by(BoardInvitation.created_at.desc()).all()
        else:
            invitations = BoardInvitation.query.filter(
                (BoardInvitation.board_id.in_(board_ids)) | (BoardInvitation.inviter_id == user_id),
                BoardInvitation.status == 'pending'
            ).order_by(BoardInvitation.created_at.desc()).all()

        res = []
        seen_keys = set()
        for inv in invitations:
            if not inv.board or inv.board.is_deleted:
                continue
            if inv.status == 'pending' and inv.expires_at and now > inv.expires_at:
                inv.status = 'expired'
                continue
            key = (inv.board_id, inv.email.strip().lower())
            if key not in seen_keys:
                seen_keys.add(key)
                res.append(inv.to_dict())

        return res

    @staticmethod
    def get_board_by_id(board_id, include_deleted=False):
        from sqlalchemy.orm import selectinload, joinedload
        from sqlalchemy.exc import OperationalError

        for attempt in range(2):
            try:
                board = db.session.query(Board).options(
                    joinedload(Board.owner),
                    selectinload(Board.memberships).joinedload(BoardMember.user),
                    selectinload(Board.tasks)
                ).filter(Board.id == board_id).first()
                if not board:
                    return None
                if board.is_deleted and not include_deleted:
                    return None
                return board
            except (OperationalError, Exception) as e:
                db.session.rollback()
                db.session.remove()
                err_str = str(e).lower()
                is_conn_error = any(msg in err_str for msg in [
                    "lost connection", "server has gone away", "2013", "2006", "connection reset"
                ])
                if attempt == 0 and is_conn_error:
                    continue
                raise


    ALLOWED_BANNER_HOSTS = {'images.unsplash.com', 'plus.unsplash.com'}

    @staticmethod
    def validate_hero_image_url(raw_url):
        if raw_url is None:
            return None
        trimmed = str(raw_url).strip()
        if not trimmed:
            return None

        if trimmed.startswith('data:image/'):
            from app.services.file_service import FileService
            stored_url, error = FileService.save_base64_image(trimmed)
            if error:
                raise ValueError(error)
            return stored_url

        if '/api/files/' in trimmed:
            from werkzeug.utils import secure_filename
            after_files = trimmed.split('/api/files/', 1)[1].split('?', 1)[0].split('#', 1)[0]
            safe_name = secure_filename(after_files)
            if not safe_name:
                raise ValueError("Invalid board banner file reference")
            return f"/api/files/{safe_name}"

        from urllib.parse import urlparse
        parsed = urlparse(trimmed)
        if parsed.scheme != 'https' or (parsed.hostname or '').lower() not in BoardService.ALLOWED_BANNER_HOSTS:
            raise ValueError(
                "Remote banner URLs are restricted to prevent third-party tracking. Please upload an image or choose a preset banner."
            )
        return trimmed

    @staticmethod
    def _validate_columns_wip_limits(columns):
        if not isinstance(columns, list):
            return
        for col in columns:
            if not isinstance(col, dict):
                continue
            if 'wipLimit' in col:
                raw_limit = col['wipLimit']
                if raw_limit is None or raw_limit == '':
                    col['wipLimit'] = None
                elif isinstance(raw_limit, bool) or not isinstance(raw_limit, int) or raw_limit < 1:
                    raise ValueError("Column WIP limit must be a positive integer")

    @staticmethod
    def create_board(data, owner_id, commit=True, board_id=None, is_onboarding_starter=False):
        if not is_onboarding_starter:
            from app.services.onboarding_service import OnboardingRequiredError, OnboardingService
            if OnboardingService.blocks_manual_board_creation(owner_id):
                raise OnboardingRequiredError(
                    "Finish or skip onboarding before creating another board"
                )

        default_columns = [
            {"id": "todo", "title": "To Do", "emoji": "📝", "isDone": False},
            {"id": "in_progress", "title": "In Progress", "emoji": "⏳", "isDone": False},
            {"id": "done", "title": "Done", "emoji": "✅", "isDone": True},
            {"id": "archive", "title": "Archive", "emoji": "📦", "isDone": False}
        ]
        columns = data.get('columns', default_columns)
        if isinstance(columns, list):
            non_archive = [c for c in columns if isinstance(c, dict) and c.get('id') != 'archive']
            if len(non_archive) < 1:
                raise ValueError("Board must have at least 1 workflow column")
            BoardService._validate_columns_wip_limits(columns)
            columns = normalize_columns(columns)

        validated_hero_url = BoardService.validate_hero_image_url(data.get('heroImageUrl'))

        board_kwargs = {}
        if board_id:
            board_kwargs['id'] = board_id
        new_board = Board(
            name=data.get('name'),
            emoji=data.get('emoji'),
            description=data.get('description'),
            color=data.get('color') or 'hsl(220, 80%, 56%)',
            hero_image_url=validated_hero_url,
            columns=columns,
            owner_id=owner_id,
            **board_kwargs
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

        if commit:
            db.session.commit()
        else:
            db.session.flush()
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
        if 'heroImageUrl' in data:
            board.hero_image_url = BoardService.validate_hero_image_url(data['heroImageUrl'])
        if 'columns' in data:
            if user_id:
                actor_level = get_effective_role(board_id, user_id)
                if actor_level < ROLE_HIERARCHY['admin']:
                    raise ValueError("Requires admin privileges to modify board columns")
            new_columns = data['columns']
            if isinstance(new_columns, list):
                non_archive = [c for c in new_columns if isinstance(c, dict) and c.get('id') != 'archive']
                if len(non_archive) < 1:
                    raise ValueError("Board must have at least 1 workflow column")
                BoardService._validate_columns_wip_limits(new_columns)
                new_columns = normalize_columns(new_columns)
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
    def soft_delete_board(board_id, actor_id=None):
        board = db.session.get(Board, board_id)
        if not board:
            return False
        board.is_deleted = True
        board.deleted_at = datetime.utcnow()
        activity = Activity(
            type='delete',
            task_title=board.name,
            message=f'Moved board "{board.name}" to trash (30-day grace period)',
            board_id=board.id,
            user_id=actor_id
        )
        db.session.add(activity)
        db.session.commit()
        broadcaster.broadcast(board_id, "board:deleted", {"boardId": board_id})
        return True

    @staticmethod
    def get_trashed_boards(user_id):
        from sqlalchemy import or_
        from sqlalchemy.orm import selectinload, joinedload
        from sqlalchemy.exc import OperationalError

        for attempt in range(2):
            try:
                BoardService.purge_expired_boards(retention_days=30)
                owned_via_membership = db.session.query(BoardMember.board_id).filter(
                    BoardMember.user_id == user_id,
                    BoardMember.role == 'owner',
                    BoardMember.status == 'accepted'
                )
                return db.session.query(Board).options(
                    joinedload(Board.owner),
                    selectinload(Board.memberships).joinedload(BoardMember.user),
                    selectinload(Board.tasks)
                ).filter(
                    Board.is_deleted.is_(True),
                    or_(
                        Board.owner_id == user_id,
                        Board.id.in_(owned_via_membership)
                    )
                ).all()
            except (OperationalError, Exception) as e:
                db.session.rollback()
                db.session.remove()
                err_str = str(e).lower()
                is_conn_error = any(msg in err_str for msg in [
                    "lost connection", "server has gone away", "2013", "2006", "connection reset"
                ])
                if attempt == 0 and is_conn_error:
                    continue
                raise

    @staticmethod
    def restore_board(board_id, user_id):
        board = db.session.get(Board, board_id)
        if not board or not board.is_deleted:
            return None
        if get_effective_role(board_id, user_id) < ROLE_HIERARCHY['owner']:
            return None
        board.is_deleted = False
        board.deleted_at = None
        activity = Activity(
            type='update',
            task_title=board.name,
            message=f'Restored board "{board.name}" from trash',
            board_id=board.id,
            user_id=user_id
        )
        db.session.add(activity)
        db.session.commit()
        return board

    @staticmethod
    def delete_board(board_id):
        board = db.session.get(Board, board_id)
        if not board:
            return False
        from app.services.file_service import FileService
        for task in (board.tasks or []):
            FileService.cleanup_task_attachments(task)
        db.session.delete(board)
        db.session.commit()
        broadcaster.broadcast(board_id, "board:deleted", {"boardId": board_id})
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

        board = db.session.get(Board, board_id)
        if not board:
            return None, "Board not found"

        if not email or not isinstance(email, str):
            return None, "Email is required"

        clean_email = email.strip().lower()
        try:
            from email_validator import validate_email, EmailNotValidError
            try:
                valid = validate_email(clean_email, check_deliverability=False)
                clean_email = valid.normalized
            except EmailNotValidError as e:
                return None, f"Invalid email format: {str(e)}"
        except ImportError:
            import re
            if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', clean_email):
                return None, "Invalid email format"

        # Spam protection: Rate-limit invites per user per day (max 20 per 24 hours)
        if actor_id:
            one_day_ago = datetime.utcnow() - timedelta(days=1)
            recent_invites_count = BoardInvitation.query.filter(
                BoardInvitation.inviter_id == actor_id,
                BoardInvitation.created_at >= one_day_ago
            ).count()
            if recent_invites_count >= 20:
                return None, "Daily invitation limit reached (maximum 20 invites per day). Please try again tomorrow."

        user = User.query.filter_by(email=clean_email).first()

        # Check if user is already an active accepted member
        if user:
            existing_m = BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first()
            if existing_m and existing_m.status == 'accepted':
                return None, "User is already an active member of this board"

        now = datetime.utcnow()
        expires_at = now + timedelta(days=7)

        # Duplicate invites: One active invite per email per board; re-inviting updates the existing one
        existing_invite = BoardInvitation.query.filter_by(board_id=board_id, email=clean_email).first()
        if existing_invite:
            existing_invite.role = role
            existing_invite.status = 'pending'
            existing_invite.created_at = now
            existing_invite.expires_at = expires_at
            existing_invite.revoked_at = None
            invitation = existing_invite
        else:
            invitation = BoardInvitation(
                board_id=board_id,
                email=clean_email,
                inviter_id=actor_id or board.owner_id,
                role=role,
                expires_at=expires_at
            )
            db.session.add(invitation)

        membership = None
        if user:
            existing_bm = BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first()
            if existing_bm:
                existing_bm.status = 'pending'
                existing_bm.role = role
                membership = existing_bm
            else:
                membership = BoardMember(
                    board_id=board_id,
                    user_id=user.id,
                    role=role,
                    status='pending'
                )
                db.session.add(membership)

            # In-App Notification to Invited Registered User
            from app.services.notification_service import NotificationService
            actor = db.session.get(User, actor_id) if actor_id else None
            actor_name = (actor.full_name or actor.email) if actor else "Board Owner"
            NotificationService.create_notification(
                user_id=user.id,
                type='board_invite',
                title='Board Invitation',
                message=f'{actor_name} invited you to join "{board.name}" as {role.capitalize()}',
                link=f'/boards/{board_id}'
            )

        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Owner"
        display_name = (user.full_name or clean_email) if user else clean_email

        # Audit log
        activity = Activity(
            type='update',
            task_title=display_name,
            message=f'Invited {display_name} as {role} (Pending acceptance, expires in 7 days)',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)

        db.session.commit()

        # Outbound email invitation (never send to unverified legacy email)
        try:
            is_legacy_unverified = user and getattr(user, 'legacy_unverified', False) and not user.email_verified
            if not is_legacy_unverified:
                from app.services.email_service import EmailService
                import os
                base_url = os.environ.get("FRONTEND_URL", "http://localhost:8080").rstrip("/")
                invite_link = f"{base_url}/invite/{invitation.id}" if invitation else None
                EmailService.send_board_invitation(
                    to_email=clean_email,
                    board_name=board.name,
                    inviter_name=actor_name,
                    role=role,
                    invite_link=invite_link
                )
        except Exception as e:
            logger.error(f"Failed to send invitation email to {clean_email}: {e}")

        # Real-time broadcasts
        broadcast_payload = membership.to_dict() if membership else invitation.to_dict()
        broadcaster.broadcast(board_id, "member:invited", broadcast_payload)
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return (membership or invitation), None

    @staticmethod
    def accept_invitation(board_id, user_id):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"

        clean_user_email = (user.email or '').strip().lower()
        now = datetime.utcnow()

        # 1. Match by BoardInvitation
        invitation = BoardInvitation.query.filter_by(
            board_id=board_id,
            email=clean_user_email
        ).first()

        # 2. Or fallback to matching BoardMember
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()

        if not invitation and not membership:
            # Check if there is an invitation for another email on this board
            other_invite = BoardInvitation.query.filter_by(board_id=board_id).filter(
                BoardInvitation.status == 'pending'
            ).first()
            if other_invite and other_invite.email != clean_user_email:
                return None, "Email mismatch: This invitation was sent to another email address"
            return None, "Invitation not found"

        if invitation:
            # Security Rule: The invite must be bound to a verified email matching the invite
            if clean_user_email != invitation.email.strip().lower():
                return None, "Email mismatch: This invitation was sent to another email address"

            # Check expiration
            if invitation.is_expired:
                invitation.status = 'expired'
                db.session.commit()
                return None, "This invitation has expired. Please ask a board admin to resend it"

            # Check revocation
            if invitation.status == 'revoked':
                return None, "This invitation has been revoked by an administrator"

            invitation.status = 'accepted'
            invitation.accepted_at = now
            role_to_grant = invitation.role
        else:
            role_to_grant = membership.role if membership else 'member'

        if not membership:
            membership = BoardMember(
                board_id=board_id,
                user_id=user_id,
                role=role_to_grant,
                status='accepted'
            )
            db.session.add(membership)
        else:
            membership.status = 'accepted'
            if invitation:
                membership.role = invitation.role

        user_name = (user.full_name or user.email)
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
        user = db.session.get(User, user_id)
        if not user:
            return False, "User not found"

        clean_user_email = (user.email or '').strip().lower()
        invitation = BoardInvitation.query.filter_by(board_id=board_id, email=clean_user_email).first()
        if invitation:
            invitation.status = 'declined'
            invitation.revoked_at = datetime.utcnow()

        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership and not invitation:
            return False, "Invitation not found"

        user_name = user.full_name or user.email
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

        if membership:
            membership.status = 'declined'
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"boardId": str(board_id), "userId": str(user_id)})
        broadcaster.disconnect_user(board_id, user_id)
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def report_invitation(board_id, user_id):
        user = db.session.get(User, user_id)
        if not user:
            return False, "User not found"

        clean_user_email = (user.email or '').strip().lower()
        invitation = BoardInvitation.query.filter_by(board_id=board_id, email=clean_user_email).first()
        inviter_id = invitation.inviter_id if invitation else None

        if invitation:
            invitation.status = 'declined'
            invitation.revoked_at = datetime.utcnow()

        # Also decline all other pending invitations from the same inviter to this user
        if inviter_id:
            other_spam_invites = BoardInvitation.query.filter_by(
                inviter_id=inviter_id,
                email=clean_user_email,
                status='pending'
            ).all()
            for spam_inv in other_spam_invites:
                spam_inv.status = 'declined'
                spam_inv.revoked_at = datetime.utcnow()
                spam_bm = BoardMember.query.filter_by(board_id=spam_inv.board_id, user_id=user_id, status='pending').first()
                if spam_bm:
                    spam_bm.status = 'declined'

        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership and not invitation:
            return False, "Invitation not found"

        if membership and membership.status == 'pending':
            membership.status = 'declined'

        user_name = user.full_name or user.email
        activity = Activity(
            type='update',
            task_title=user_name,
            message=f'{user_name} declined and reported the invitation as spam',
            board_id=board_id,
            user_id=user_id
        )
        db.session.add(activity)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"boardId": str(board_id), "userId": str(user_id)})
        broadcaster.disconnect_user(board_id, user_id)
        return True, None

    @staticmethod
    def resend_invitation(board_id, target_id_or_email, actor_id=None):
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return False, "Requires admin privileges to resend invitations"

        board = db.session.get(Board, board_id)
        if not board:
            return False, "Board not found"

        invitation = db.session.get(BoardInvitation, target_id_or_email)
        if not invitation:
            if '@' in str(target_id_or_email):
                invitation = BoardInvitation.query.filter_by(board_id=board_id, email=str(target_id_or_email).strip().lower()).first()
            else:
                user = db.session.get(User, target_id_or_email)
                if user:
                    invitation = BoardInvitation.query.filter_by(board_id=board_id, email=user.email.strip().lower()).first()

        membership = None
        user = None
        if invitation:
            user = User.query.filter_by(email=invitation.email).first()
            if user:
                membership = BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first()
        else:
            user = db.session.get(User, target_id_or_email)
            if user:
                membership = BoardMember.query.filter_by(board_id=board_id, user_id=user.id, status='pending').first()

        target_role = invitation.role if invitation else (membership.role if membership else 'editor')

        if actor_level == ROLE_HIERARCHY['admin'] and target_role in ['owner', 'admin']:
            return False, "Admins cannot manage invitations for Admin or Owner roles"

        now = datetime.utcnow()
        expires_at = now + timedelta(days=7)

        if invitation:
            # Transition: Expired to Pending or refresh Pending
            invitation.status = 'pending'
            invitation.expires_at = expires_at
            invitation.revoked_at = None
        elif membership and user:
            invitation = BoardInvitation(
                board_id=board_id,
                email=user.email.strip().lower(),
                inviter_id=actor_id or board.owner_id,
                role=membership.role,
                expires_at=expires_at
            )
            db.session.add(invitation)
        else:
            return False, "Pending invitation not found"

        if membership:
            membership.status = 'pending'

        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Admin"

        if user:
            from app.services.notification_service import NotificationService
            NotificationService.create_notification(
                user_id=user.id,
                type='board_invite',
                title='Board Invitation Reminder',
                message=f'{actor_name} reminded you to join "{board.name}" as {target_role.capitalize()}',
                link=f'/boards/{board_id}'
            )

        db.session.commit()

        # Outbound reminder email
        try:
            from app.services.email_service import EmailService
            import os
            base_url = os.environ.get("FRONTEND_URL", "http://localhost:8080").rstrip("/")
            target_email = invitation.email if invitation else (user.email if user else None)
            target_u = user if user else (User.query.filter_by(email=target_email).first() if target_email else None)
            is_legacy_unverified = target_u and getattr(target_u, 'legacy_unverified', False) and not target_u.email_verified
            invite_link = f"{base_url}/invite/{invitation.id}" if invitation else None
            if target_email and not is_legacy_unverified:
                EmailService.send_board_invitation(
                    to_email=target_email,
                    board_name=board.name,
                    inviter_name=actor_name,
                    role=target_role,
                    invite_link=invite_link
                )
        except Exception as e:
            logger.error(f"Failed to resend invitation email: {e}")

        broadcaster.broadcast(board_id, "member:invite_resent", invitation.to_dict())
        return True, None

    @staticmethod
    def revoke_invitation(board_id, target_id_or_email, actor_id=None):
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        if actor_level < ROLE_HIERARCHY['admin']:
            return False, "Requires admin privileges to revoke invitations"

        board = db.session.get(Board, board_id)
        if not board:
            return False, "Board not found"

        invitation = db.session.get(BoardInvitation, target_id_or_email)
        if not invitation:
            if '@' in str(target_id_or_email):
                invitation = BoardInvitation.query.filter_by(board_id=board_id, email=str(target_id_or_email).strip().lower()).first()
            else:
                user = db.session.get(User, target_id_or_email)
                if user:
                    invitation = BoardInvitation.query.filter_by(board_id=board_id, email=user.email.strip().lower()).first()

        target_role = invitation.role if invitation else 'editor'
        if actor_level == ROLE_HIERARCHY['admin'] and target_role in ['owner', 'admin']:
            return False, "Admins cannot manage invitations for Admin or Owner roles"

        actor = db.session.get(User, actor_id) if actor_id else None
        actor_name = (actor.full_name or actor.email) if actor else "Board Admin"
        target_label = invitation.email if invitation else "invitee"

        if invitation:
            invitation.status = 'revoked'
            invitation.revoked_at = datetime.utcnow()
            user = User.query.filter_by(email=invitation.email).first()
            if user:
                bm = BoardMember.query.filter_by(board_id=board_id, user_id=user.id, status='pending').first()
                if bm:
                    db.session.delete(bm)
                Notification.query.filter_by(user_id=user.id, type='board_invite', link=f'/boards/{board_id}').delete()
        else:
            user = db.session.get(User, target_id_or_email)
            if user:
                target_label = user.full_name or user.email
                bm = BoardMember.query.filter_by(board_id=board_id, user_id=user.id, status='pending').first()
                if bm:
                    db.session.delete(bm)
                Notification.query.filter_by(user_id=user.id, type='board_invite', link=f'/boards/{board_id}').delete()
            else:
                return False, "Invitation not found"

        activity = Activity(
            type='update',
            task_title=target_label,
            message=f'{actor_name} revoked invitation for {target_label}',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"invitationId": invitation.id if invitation else None, "email": target_label})
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def remove_member(board_id, user_id, actor_id=None):
        membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not membership:
            # Check if this user_id is actually an invitation id to revoke
            invitation = db.session.get(BoardInvitation, user_id)
            if invitation and invitation.board_id == board_id:
                return BoardService.revoke_invitation(board_id, user_id, actor_id=actor_id)
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

        # If pending, also mark BoardInvitation revoked and clean up original invite notification
        is_pending = membership.status == 'pending'
        user_obj = db.session.get(User, user_id)
        if is_pending:
            if user_obj:
                inv = BoardInvitation.query.filter_by(board_id=board_id, email=user_obj.email.strip().lower()).first()
                if inv:
                    inv.status = 'revoked'
                    inv.revoked_at = datetime.utcnow()
                Notification.query.filter_by(user_id=user_obj.id, type='board_invite', link=f'/boards/{board_id}').delete()

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
        elif is_pending:
            # Revoking a pending invitation
            target_email = user_obj.email if user_obj else user_name
            activity = Activity(
                type='update',
                task_title=target_email,
                message=f'{actor_name} revoked invitation for {target_email}',
                board_id=board_id,
                user_id=actor_id
            )
            db.session.add(activity)
            # Suppress member_removed notification for pending invitees
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

        # Automatically remove user from all assigned tasks and followers on this board and log it
        from app.models.task import Task
        board_tasks = Task.query.filter_by(board_id=board_id, is_deleted=False).all()
        for t in board_tasks:
            if t.followers and isinstance(t.followers, list) and str(user_id) in [str(f) for f in t.followers]:
                t.followers = [str(f) for f in t.followers if str(f) != str(user_id)]
            if str(t.assigned_to) == str(user_id):
                t.assigned_to = None
                task_act = Activity(
                    type='update',
                    target_type='task',
                    target_id=t.id,
                    task_title=t.title,
                    before_value=user_name,
                    after_value='Unassigned',
                    message=f'Removed assignee {user_name} from "{t.title}" because member was removed from the board',
                    board_id=board_id,
                    user_id=actor_id
                )
                db.session.add(task_act)
                broadcaster.broadcast(board_id, "task:updated", t.to_dict())
                broadcaster.broadcast(board_id, "activity:new", task_act.to_dict())

        db.session.delete(membership)
        db.session.commit()

        broadcaster.broadcast(board_id, "member:removed", {"boardId": str(board_id), "userId": str(user_id)})
        broadcaster.disconnect_user(board_id, user_id)
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())

        return True, None

    @staticmethod
    def set_board_mute(board_id, user_id, is_muted: bool):
        board = db.session.get(Board, board_id)
        if not board or board.is_deleted:
            return None, "Board not found"

        membership = BoardMember.query.filter_by(
            board_id=board_id, user_id=user_id, status='accepted'
        ).first()
        if not membership:
            if str(board.owner_id) == str(user_id):
                membership = BoardMember(
                    board_id=board_id,
                    user_id=user_id,
                    role='owner',
                    status='accepted',
                    is_muted=bool(is_muted)
                )
                db.session.add(membership)
            else:
                return None, "Active board membership not found"
        else:
            membership.is_muted = bool(is_muted)

        db.session.commit()
        return membership, None

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

        old_role = membership.role
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
            target_type='member',
            target_id=str(user_id),
            task_title=user_name,
            before_value=old_role,
            after_value=new_role,
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
                    target_type='task',
                    target_id=t.id,
                    task_title=t.title,
                    before_value=user_name,
                    after_value='Unassigned',
                    message=f'Removed assignee {user_name} from "{t.title}" because role was demoted to {new_role}',
                    board_id=board_id,
                    user_id=actor_id
                )
                db.session.add(task_act)
                broadcaster.broadcast(board_id, "task:updated", t.to_dict())
                broadcaster.broadcast(board_id, "activity:new", task_act.to_dict())

        try:
            db.session.commit()
            broadcaster.broadcast(board_id, "member:role_updated", {
                **membership.to_dict(),
                "actorId": str(actor_id) if actor_id else None
            })
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

        # Check new owner storage quota against the board's attachment total
        if str(board.owner_id) != str(new_owner_id):
            from app.services.file_service import FileService, format_size
            from flask import current_app
            max_owner_bytes = current_app.config.get('MAX_OWNER_STORAGE_BYTES', 500 * 1024 * 1024)
            current_target_bytes = FileService.get_owner_storage_usage(new_owner_id)
            board_bytes = FileService.get_board_storage_usage(board_id)
            if current_target_bytes + board_bytes > max_owner_bytes:
                return False, f"Transfer would exceed new owner storage quota (limit: {format_size(max_owner_bytes)})"

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

        old_owner_id = board.owner_id
        former_owner_membership = None
        if old_owner_id and str(old_owner_id) != str(new_owner_id):
            former_owner_membership = BoardMember.query.filter_by(board_id=board_id, user_id=old_owner_id).first()
            if former_owner_membership:
                former_owner_membership.role = 'admin'
            else:
                former_owner_membership = BoardMember(
                    board_id=board_id,
                    user_id=old_owner_id,
                    role='admin',
                    status='accepted'
                )
                db.session.add(former_owner_membership)

        board.owner_id = new_owner_id

        new_owner_name = new_owner.full_name or new_owner.email
        activity = Activity(
            type='update',
            target_type='board',
            target_id=str(board_id),
            task_title=board.name,
            after_value=new_owner_name,
            message=f'Transferred board ownership to {new_owner_name}',
            board_id=board_id,
            user_id=actor_id
        )
        db.session.add(activity)
        db.session.commit()

        broadcaster.broadcast(board_id, "board:updated", board.to_dict())
        broadcaster.broadcast(board_id, "member:role_updated", target_membership.to_dict())
        if former_owner_membership:
            broadcaster.broadcast(board_id, "member:role_updated", former_owner_membership.to_dict())
        broadcaster.broadcast(board_id, "activity:new", activity.to_dict())
        return True, None

    @staticmethod
    def get_board_members(board_id, actor_id=None):
        from sqlalchemy.orm import joinedload
        members = (
            BoardMember.query.options(joinedload(BoardMember.user))
            .filter(BoardMember.board_id == board_id, BoardMember.status != 'declined')
            .all()
        )
        actor_level = get_effective_role(board_id, actor_id) if actor_id else ROLE_HIERARCHY['owner']
        # Commenters and Viewers receive name and avatar only (emails redacted)
        redact = actor_level <= ROLE_HIERARCHY['commenter']
        member_list = [member.to_dict(redact_user=redact) for member in members]

        existing_user_emails = {
            m.get('user', {}).get('email', '').strip().lower()
            for m in member_list if m.get('user') and m.get('user', {}).get('email')
        }

        has_mutations = False
        pending_invitations = BoardInvitation.query.filter_by(board_id=board_id, status='pending').all()
        for inv in pending_invitations:
            if inv.is_expired:
                inv.status = 'expired'
                has_mutations = True
                continue
            if inv.email.strip().lower() not in existing_user_emails:
                member_list.append({
                    'id': inv.id,
                    'boardId': inv.board_id,
                    'userId': inv.id,
                    'role': inv.role,
                    'status': 'pending',
                    'user': {
                        'id': None,
                        'fullName': inv.email.split('@')[0] if not redact else 'Invited Guest',
                        'email': inv.email if not redact else None,
                        'avatarUrl': None
                    },
                    'createdAt': inv.created_at.isoformat() + 'Z' if inv.created_at else None,
                    'expiresAt': inv.expires_at.isoformat() + 'Z' if inv.expires_at else None,
                    'isInvitation': True
                })

        if has_mutations:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()

        return member_list

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

    @staticmethod
    def get_invitation_by_id(invitation_id):
        inv = db.session.get(BoardInvitation, invitation_id)
        if not inv:
            return None

        now = datetime.utcnow()
        if inv.status == 'pending' and inv.expires_at and now > inv.expires_at:
            inv.status = 'expired'
            db.session.commit()

        board = inv.board
        inviter = inv.inviter or (board.owner if board else None)
        inviter_name = (inviter.full_name or inviter.email) if inviter else "Board Owner"

        return {
            'id': inv.id,
            'boardId': inv.board_id,
            'boardName': board.name if board else 'Unknown Board',
            'boardEmoji': board.emoji if board else '📋',
            'boardColor': board.color if board else '#3b82f6',
            'inviterName': inviter_name,
            'invitedEmail': inv.email,
            'role': inv.role,
            'status': inv.status,
            'isExpired': inv.is_expired,
            'expiresAt': inv.expires_at.isoformat() + 'Z' if inv.expires_at else None,
            'createdAt': inv.created_at.isoformat() + 'Z' if inv.created_at else None,
        }

    @staticmethod
    def accept_invitation_by_id(invitation_id, user_id):
        inv = db.session.get(BoardInvitation, invitation_id)
        if not inv:
            return None, "Invitation not found"

        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"

        clean_user_email = (user.email or '').strip().lower()
        if clean_user_email != inv.email.strip().lower():
            return None, "Email mismatch: This invitation was sent to another email address"

        return BoardService.accept_invitation(inv.board_id, user_id)

    @staticmethod
    def decline_invitation_by_id(invitation_id, user_id):
        inv = db.session.get(BoardInvitation, invitation_id)
        if not inv:
            return False, "Invitation not found"

        user = db.session.get(User, user_id)
        if not user:
            return False, "User not found"

        clean_user_email = (user.email or '').strip().lower()
        if clean_user_email != inv.email.strip().lower():
            return False, "Email mismatch: This invitation was sent to another email address"

        return BoardService.decline_invitation(inv.board_id, user_id)

