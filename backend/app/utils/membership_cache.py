from flask import request, has_request_context
from app import db

def get_active_board_user_ids(board_id):
    """
    Returns a set of user IDs (strings) who are active accepted members or the owner of board_id.
    Caches the result on Flask's request object for the lifetime of the HTTP request,
    preventing N+1 queries when serializing multiple tasks, activities, or comments.
    """
    if not board_id:
        return set()

    board_id_str = str(board_id)

    if has_request_context():
        if not hasattr(request, '_active_board_user_ids'):
            request._active_board_user_ids = {}
        if board_id_str in request._active_board_user_ids:
            return request._active_board_user_ids[board_id_str]

    from app.models.board_member import BoardMember
    from app.models.board import Board

    members = BoardMember.query.filter_by(board_id=board_id_str, status='accepted').all()
    active_ids = {str(m.user_id) for m in members if m.user_id}

    board = db.session.get(Board, board_id_str)
    if board and board.owner_id:
        active_ids.add(str(board.owner_id))

    if has_request_context():
        request._active_board_user_ids[board_id_str] = active_ids

    return active_ids
