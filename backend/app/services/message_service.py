from datetime import datetime
from app import db
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.user import User
from app.utils.event_broadcaster import broadcaster
from sqlalchemy.orm import selectinload
from sqlalchemy import func

class MessageService:
    @staticmethod
    def get_or_create_direct_conversation(user1_id: str, user2_id: str):
        if not user1_id or not user2_id:
            return None, "Both user IDs are required"

        if user1_id == user2_id:
            return None, "Cannot start a direct conversation with yourself"

        user1 = db.session.get(User, user1_id)
        user2 = db.session.get(User, user2_id)
        if not user1 or not user2:
            return None, "One or both users not found"

        # Look for existing direct conversation with exactly both participants
        direct_convs = (
            Conversation.query
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user)
            )
            .filter_by(type='direct')
            .join(ConversationParticipant)
            .filter(ConversationParticipant.user_id.in_([user1_id, user2_id]))
            .all()
        )

        for conv in direct_convs:
            participant_ids = {p.user_id for p in conv.participants}
            if participant_ids == {user1_id, user2_id}:
                return conv.to_dict(user1_id), None

        # Create new direct conversation
        conv = Conversation(type='direct', created_by=user1_id)
        db.session.add(conv)
        db.session.flush()

        p1 = ConversationParticipant(conversation_id=conv.id, user_id=user1_id, role='member')
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=user2_id, role='member')
        db.session.add_all([p1, p2])
        db.session.commit()

        conv_dict = conv.to_dict(user1_id)
        # Notify user2 of newly opened direct chat channel
        broadcaster.broadcast(f"user:{user2_id}", "conversation:created", conv.to_dict(user2_id))
        return conv_dict, None

    @staticmethod
    def create_group_conversation(creator_id: str, title: str, participant_ids: list):
        if not creator_id:
            return None, "Creator ID is required"

        clean_title = (title or "").strip() or "Group Chat"
        
        # Deduplicate and ensure creator is included
        all_user_ids = list(set([creator_id] + (participant_ids or [])))
        if len(all_user_ids) < 2:
            return None, "Group conversation requires at least 2 participants"

        # Validate that users exist
        existing_users = User.query.filter(User.id.in_(all_user_ids)).all()
        existing_user_ids = {u.id for u in existing_users}
        if creator_id not in existing_user_ids:
            return None, "Creator not found"

        conv = Conversation(title=clean_title, type='group', created_by=creator_id)
        db.session.add(conv)
        db.session.flush()

        participants = []
        for uid in existing_user_ids:
            role = 'admin' if uid == creator_id else 'member'
            participants.append(ConversationParticipant(conversation_id=conv.id, user_id=uid, role=role))

        db.session.add_all(participants)
        db.session.commit()

        conv_data = conv.to_dict(creator_id)
        # Broadcast to all participants
        for uid in existing_user_ids:
            broadcaster.broadcast(f"user:{uid}", "conversation:created", conv.to_dict(uid))

        return conv_data, None

    @staticmethod
    def get_user_conversations(user_id: str):
        participations = (
            ConversationParticipant.query
            .filter_by(user_id=user_id)
            .all()
        )
        conv_ids = [p.conversation_id for p in participations]
        if not conv_ids:
            return []

        conversations = (
            Conversation.query
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user)
            )
            .filter(Conversation.id.in_(conv_ids))
            .order_by(Conversation.last_message_at.desc())
            .all()
        )

        unread_counts = dict(
            db.session.query(
                Message.conversation_id,
                func.count(Message.id)
            )
            .join(
                ConversationParticipant,
                (ConversationParticipant.conversation_id == Message.conversation_id) &
                (ConversationParticipant.user_id == user_id)
            )
            .filter(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != user_id,
                Message.is_deleted == False,
                db.or_(
                    ConversationParticipant.last_read_at.is_(None),
                    Message.created_at > ConversationParticipant.last_read_at
                )
            )
            .group_by(Message.conversation_id)
            .all()
        )

        return [c.to_dict(user_id, unread_count=unread_counts.get(c.id, 0)) for c in conversations]

    @staticmethod
    def get_conversation(user_id: str, conversation_id: str):
        conv = (
            Conversation.query
            .options(
                selectinload(Conversation.participants).selectinload(ConversationParticipant.user)
            )
            .filter_by(id=conversation_id)
            .first()
        )
        if not conv:
            return None, "Conversation not found", 404

        participant = next((p for p in conv.participants if p.user_id == user_id), None)
        if not participant:
            return None, "You are not a participant in this conversation", 403

        return conv.to_dict(user_id), None, 200

    @staticmethod
    def get_conversation_messages(user_id: str, conversation_id: str, limit: int = 50, before_id: str = None):
        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=conversation_id, user_id=user_id)
            .first()
        )
        if not participant:
            return None, "You are not a participant in this conversation", 403

        query = Message.query.filter_by(conversation_id=conversation_id)

        if before_id:
            before_msg = db.session.get(Message, before_id)
            if before_msg:
                query = query.filter(Message.created_at < before_msg.created_at)

        messages = query.order_by(Message.created_at.asc()).limit(limit).all()
        return [m.to_dict() for m in messages], None, 200

    @staticmethod
    def send_message(sender_id: str, conversation_id: str, content: str = "", attachments: list = None, reply_to_id: str = None, is_forwarded: bool = False):
        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=conversation_id, user_id=sender_id)
            .first()
        )
        if not participant:
            return None, "You are not a participant in this conversation", 403

        conv = db.session.get(Conversation, conversation_id)
        if not conv:
            return None, "Conversation not found", 404

        content_clean = (content or "").strip()
        attachments_list = attachments or []

        if not content_clean and not attachments_list:
            return None, "Message must contain text content or at least one attachment", 400

        if reply_to_id:
            reply_target = db.session.get(Message, reply_to_id)
            if not reply_target or reply_target.conversation_id != conversation_id:
                reply_to_id = None

        now = datetime.utcnow()
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content_clean,
            attachments=attachments_list,
            reply_to_id=reply_to_id,
            is_forwarded=is_forwarded
        )
        db.session.add(message)

        # Update conversation timestamp & preview
        conv.last_message_at = now
        if content_clean:
            conv.last_message_preview = content_clean[:120]
        elif attachments_list:
            att_name = attachments_list[0].get('name', 'file')
            conv.last_message_preview = f"📎 Attached {att_name}"

        # Update sender read status
        participant.last_read_at = now

        db.session.commit()

        message_dict = message.to_dict()

        # Broadcast real-time events
        # 1. To conversation channel
        broadcaster.broadcast(f"conv:{conversation_id}", "message:new", message_dict)
        # 2. To all participants' user streams (for sidebar & conversation list live updating)
        for p in conv.participants:
            broadcaster.broadcast(f"user:{p.user_id}", "message:new", {
                "message": message_dict,
                "conversationId": conversation_id,
                "conversation": conv.to_dict(p.user_id)
            })

        return message_dict, None, 201

    @staticmethod
    def forward_message(user_id: str, message_id: str, target_conversation_ids: list):
        source_message = db.session.get(Message, message_id)
        if not source_message or source_message.is_deleted:
            return None, "Source message not found or unsent", 404

        # Verify user has access to source conversation
        src_participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=source_message.conversation_id, user_id=user_id)
            .first()
        )
        if not src_participant:
            return None, "Unauthorized to forward this message", 403

        if not target_conversation_ids:
            return None, "Target conversation IDs required", 400

        results = []
        for target_conv_id in target_conversation_ids:
            target_part = (
                ConversationParticipant.query
                .filter_by(conversation_id=target_conv_id, user_id=user_id)
                .first()
            )
            if not target_part:
                continue

            msg_dict, err, code = MessageService.send_message(
                sender_id=user_id,
                conversation_id=target_conv_id,
                content=source_message.content,
                attachments=source_message.attachments,
                is_forwarded=True
            )
            if msg_dict:
                results.append(msg_dict)

        if not results:
            return None, "Failed to forward message to selected conversations", 400

        return results, None, 200

    @staticmethod
    def mark_as_read(user_id: str, conversation_id: str):
        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=conversation_id, user_id=user_id)
            .first()
        )
        if not participant:
            return None, "Not a participant in this conversation", 403

        participant.last_read_at = datetime.utcnow()
        db.session.commit()

        broadcaster.broadcast(f"user:{user_id}", "conversation:read", {
            "conversationId": conversation_id,
            "readAt": participant.last_read_at.isoformat() + "Z"
        })

        return {"success": True, "conversationId": conversation_id}, None, 200

    @staticmethod
    def toggle_reaction(user_id: str, message_id: str, emoji: str):
        message = db.session.get(Message, message_id)
        if not message:
            return None, "Message not found", 404

        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=message.conversation_id, user_id=user_id)
            .first()
        )
        if not participant:
            return None, "Unauthorized", 403

        if not emoji:
            return None, "Emoji is required", 400

        current_reactions = dict(message.reactions or {})
        already_had_emoji = user_id in current_reactions.get(emoji, [])

        # Enforce single reaction per user: remove user from all existing emoji reactions
        cleaned_reactions = {}
        for em, uids in current_reactions.items():
            filtered = [u for u in uids if u != user_id]
            if filtered:
                cleaned_reactions[em] = filtered

        # If user did not already have this specific emoji, add it
        if not already_had_emoji:
            user_list = list(cleaned_reactions.get(emoji, []))
            user_list.append(user_id)
            cleaned_reactions[emoji] = user_list

        message.reactions = cleaned_reactions
        db.session.commit()

        msg_dict = message.to_dict()
        broadcaster.broadcast(f"conv:{message.conversation_id}", "message:reaction_updated", msg_dict)
        return msg_dict, None, 200

    @staticmethod
    def delete_message(user_id: str, message_id: str):
        message = db.session.get(Message, message_id)
        if not message:
            return None, "Message not found", 404

        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=message.conversation_id, user_id=user_id)
            .first()
        )
        if not participant:
            return None, "Unauthorized", 403

        # Allow sender or group admin to unsend/delete message
        if message.sender_id != user_id and participant.role != 'admin':
            return None, "Cannot unsend message sent by another user", 403

        message.is_deleted = True
        message.reactions = {}
        db.session.commit()

        msg_dict = message.to_dict()
        broadcaster.broadcast(f"conv:{message.conversation_id}", "message:deleted", msg_dict)
        return msg_dict, None, 200

    @staticmethod
    def toggle_pin(user_id: str, message_id: str):
        message = db.session.get(Message, message_id)
        if not message or message.is_deleted:
            return None, "Message not found or unsent", 404

        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=message.conversation_id, user_id=user_id)
            .first()
        )
        if not participant:
            return None, "Unauthorized", 403

        message.is_pinned = not message.is_pinned
        db.session.commit()

        msg_dict = message.to_dict()
        broadcaster.broadcast(f"conv:{message.conversation_id}", "message:pinned_updated", msg_dict)
        return msg_dict, None, 200

    @staticmethod
    def get_unread_count(user_id: str):
        participations = (
            ConversationParticipant.query
            .filter_by(user_id=user_id)
            .all()
        )
        if not participations:
            return 0

        total_unread = 0
        for p in participations:
            conv = p.conversation
            if not conv:
                continue
            if p.last_read_at:
                unread = (
                    Message.query
                    .filter(
                        Message.conversation_id == p.conversation_id,
                        Message.sender_id != user_id,
                        Message.created_at > p.last_read_at,
                        Message.is_deleted == False
                    )
                    .count()
                )
            else:
                unread = (
                    Message.query
                    .filter(
                        Message.conversation_id == p.conversation_id,
                        Message.sender_id != user_id,
                        Message.is_deleted == False
                    )
                    .count()
                )
            total_unread += unread

        return total_unread
