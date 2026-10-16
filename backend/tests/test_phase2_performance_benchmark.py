import pytest
import json
from app import db
from app.models.board import Board
from app.models.task import Task
from app.models.board_member import BoardMember
from app.models.message import Conversation, ConversationParticipant, Message
from app.services.message_service import MessageService
from app.services.task_service import TaskService
from sqlalchemy import event

def test_phase2_task_serialization_eliminates_n_plus_1(client, create_test_user, auth_headers):
    """Verify that serializing multiple tasks executes a constant, minimal number of SQL queries instead of N+1."""
    owner = create_test_user(email="bench_owner@example.com")
    member = create_test_user(email="bench_member@example.com")
    headers = auth_headers(owner.id)

    # Create board and membership
    create_resp = client.post(
        "/api/boards",
        headers=headers,
        data=json.dumps({"name": "Perf Board"}),
        content_type="application/json"
    )
    board_id = create_resp.get_json()["id"]

    bm = BoardMember(board_id=board_id, user_id=member.id, role='editor', status='accepted')
    db.session.add(bm)
    db.session.commit()

    # Create 10 tasks on the board
    for i in range(10):
        t = Task(
            board_id=board_id,
            title=f"Task {i}",
            status="todo",
            created_by=member.id,
            assigned_to=member.id
        )
        db.session.add(t)
    db.session.commit()

    # Clear session to ensure we measure real queries and not in-memory identity map cache
    db.session.expire_all()

    query_count = [0]
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        query_count[0] += 1

    event.listen(db.engine, "before_cursor_execute", before_cursor_execute)
    try:
        resp = client.get(f"/api/tasks?boardId={board_id}", headers=headers)
        assert resp.status_code == 200
        tasks_data = resp.get_json()
        assert len(tasks_data) == 10
        # Without joinedload + membership cache, this would execute 1 (tasks) + 10 (assignee) + 10 (creator) + 10 (BoardMember) = 31+ queries.
        # With joinedload + request context membership cache, it executes <= 3 queries!
        assert query_count[0] <= 4, f"Expected <= 4 queries with Phase 2 optimizations, but got {query_count[0]}"
    finally:
        event.remove(db.engine, "before_cursor_execute", before_cursor_execute)


def test_phase2_unread_message_count_single_query(client, create_test_user):
    """Verify that MessageService.get_unread_count executes exactly 1 query regardless of number of conversations."""
    user = create_test_user(email="unread_bench@example.com")
    other = create_test_user(email="other_bench@example.com")

    # Create 5 conversations with messages
    for i in range(5):
        conv = Conversation(type='direct')
        db.session.add(conv)
        db.session.flush()

        p1 = ConversationParticipant(conversation_id=conv.id, user_id=user.id)
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=other.id)
        db.session.add_all([p1, p2])

        msg = Message(conversation_id=conv.id, sender_id=other.id, content=f"Hello {i}")
        db.session.add(msg)
    user_id = user.id
    db.session.expire_all()

    statements = []
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(db.engine, "before_cursor_execute", before_cursor_execute)
    try:
        count = MessageService.get_unread_count(user_id)
        assert count == 5
        # Must execute exactly 1 single SQL query with JOIN!
        select_statements = [s for s in statements if s.strip().upper().startswith("SELECT")]
        assert len(select_statements) == 1, f"Expected exactly 1 SELECT query, but executed {len(select_statements)}: {statements}"
    finally:
        event.remove(db.engine, "before_cursor_execute", before_cursor_execute)
