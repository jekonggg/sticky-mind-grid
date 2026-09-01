from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app.services.message_service import MessageService
from app.utils.event_broadcaster import broadcaster
from app import db

bp = Blueprint('message_routes', __name__, url_prefix='/api/messages')

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()
    conversations = MessageService.get_user_conversations(user_id)
    return jsonify(conversations), 200

@bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    conv_type = data.get('type', 'direct')
    if conv_type == 'direct':
        target_user_id = data.get('recipientId') or data.get('targetUserId')
        if not target_user_id:
            return jsonify({'error': 'recipientId is required for direct conversation'}), 400

        conv, error = MessageService.get_or_create_direct_conversation(user_id, target_user_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(conv), 201

    elif conv_type == 'group':
        title = data.get('title', 'Group Chat')
        participant_ids = data.get('participantIds', [])
        conv, error = MessageService.create_group_conversation(user_id, title, participant_ids)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(conv), 201

    return jsonify({'error': f'Unsupported conversation type: {conv_type}'}), 400

@bp.route('/conversations/<conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    user_id = get_jwt_identity()
    conv, error, status_code = MessageService.get_conversation(user_id, conversation_id)
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(conv), 200

@bp.route('/conversations/<conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    user_id = get_jwt_identity()
    limit = min(int(request.args.get('limit', 50)), 100)
    before_id = request.args.get('beforeId')

    messages, error, status_code = MessageService.get_conversation_messages(
        user_id, conversation_id, limit=limit, before_id=before_id
    )
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(messages), 200

@bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    content = data.get('content', '')
    attachments = data.get('attachments', [])
    reply_to_id = data.get('replyToId')

    message, error, status_code = MessageService.send_message(
        sender_id=user_id,
        conversation_id=conversation_id,
        content=content,
        attachments=attachments,
        reply_to_id=reply_to_id
    )
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(message), status_code

@bp.route('/conversations/<conversation_id>/read', methods=['POST'])
@jwt_required()
def mark_read(conversation_id):
    user_id = get_jwt_identity()
    res, error, status_code = MessageService.mark_as_read(user_id, conversation_id)
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(res), 200

@bp.route('/messages/<message_id>/reactions', methods=['POST'])
@jwt_required()
def toggle_reaction(message_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    emoji = data.get('emoji')

    res, error, status_code = MessageService.toggle_reaction(user_id, message_id, emoji)
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(res), 200

@bp.route('/messages/<message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    user_id = get_jwt_identity()
    res, error, status_code = MessageService.delete_message(user_id, message_id)
    if error:
        return jsonify({'error': error}), status_code
    return jsonify(res), 200

@bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    user_id = get_jwt_identity()
    count = MessageService.get_unread_count(user_id)
    return jsonify({'unreadCount': count}), 200

@bp.route('/stream', methods=['GET'])
def stream_user_messages():
    """Server-Sent Events stream for real-time messages for the authenticated user."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '') or request.args.get('token')
    if not token:
        return jsonify({'error': 'Authentication token is required'}), 401

    try:
        decoded = decode_token(token)
        user_id = decoded['sub']
    except Exception:
        return jsonify({'error': 'Invalid or expired token'}), 401

    # Release DB connection immediately for long-running SSE
    db.session.remove()

    def event_stream():
        user_channel = f"user:{user_id}"
        q = broadcaster.subscribe(user_channel)
        yield f"data: {{\"type\":\"connected\",\"userId\":\"{user_id}\"}}\n\n"
        try:
            while True:
                try:
                    msg = q.get(timeout=25.0)
                    yield msg
                except Exception:
                    yield ": ping\n\n"
        finally:
            broadcaster.unsubscribe(user_channel, q)

    return Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )
