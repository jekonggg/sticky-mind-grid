from datetime import datetime
from app import db
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.user import User
from app.utils.event_broadcaster import broadcaster

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
            .filter(Conversation.id.in_(conv_ids))
            .order_by(Conversation.last_message_at.desc())
            .all()
        )

        return [c.to_dict(user_id) for c in conversations]

    @staticmethod
    def get_conversation(user_id: str, conversation_id: str):
        conv = db.session.get(Conversation, conversation_id)
        if not conv:
            return None, "Conversation not found", 404

        participant = (
            ConversationParticipant.query
            .filter_by(conversation_id=conversation_id, user_id=user_id)
            .first()
        )
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
    def send_message(sender_id: str, conversation_id: str, content: str = "", attachments: list = None, reply_to_id: str = None):
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
            reply_to_id=reply_to_id
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
        user_list = list(current_reactions.get(emoji, []))

        if user_id in user_list:
            user_list.remove(user_id)
            if user_list:
                current_reactions[emoji] = user_list
            else:
                current_reactions.pop(emoji, None)
        else:
            user_list.append(user_id)
            current_reactions[emoji] = user_list

        message.reactions = current_reactions
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

        # Allow sender or group admin to delete message
        if message.sender_id != user_id and participant.role != 'admin':
            return None, "Cannot delete message sent by another user", 403

        message.is_deleted = True
        db.session.commit()

        msg_dict = message.to_dict()
        broadcaster.broadcast(f"conv:{message.conversation_id}", "message:deleted", msg_dict)
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
