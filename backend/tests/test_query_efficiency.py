import json
from app import db
from app.models.board import Board
from app.models.board_member import BoardMember
from app.models.task import Task
from app.models.user import User
from app.models.message import Conversation, ConversationParticipant, Message

def test_tasks_query_efficiency_no_n_plus_one(client, create_test_user, create_test_board, auth_headers, query_counter):
    """Verify that fetching tasks scales with O(1) constant queries regardless of item count."""
    owner = create_test_user(email="owner@efficiency.com", full_name="Board Owner")
    board, _ = create_test_board(owner=owner, name="Efficiency Board")

    assignee1 = create_test_user(email="u1@efficiency.com", full_name="User One")
    assignee2 = create_test_user(email="u2@efficiency.com", full_name="User Two")

    # Create 15 tasks across different assignees
    tasks = []
    for i in range(15):
        assignee = assignee1 if i % 2 == 0 else assignee2
        task = Task(
            board_id=board.id,
            title=f"Task {i}",
            status="todo" if i % 3 == 0 else "in_progress",
            priority="high",
            assigned_to=assignee.id,
            created_by=owner.id,
            position=float(i * 1000)
        )
        tasks.append(task)
    db.session.add_all(tasks)
    db.session.commit()

    headers = auth_headers(owner.id)

    with query_counter:
        res = client.get("/api/tasks", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert len(data) == 15
        # Verify shape integrity
        for item in data:
            assert "boardName" in item
            assert "assignee" in item
            if item["assignee"]:
                assert "fullName" in item["assignee"]
        
        # Must execute constant small number of queries (<= 3 queries), NOT 15-30+ queries
        assert query_counter.count <= 3, f"Expected <= 3 queries, got {query_counter.count}"

def test_invitations_query_efficiency_no_n_plus_one(client, create_test_user, create_test_board, auth_headers, query_counter):
    """Verify that fetching invitations doesn't query board and owner per invite in a loop."""
    invitee = create_test_user(email="invitee@efficiency.com", full_name="Invitee User")
    
    # Create 5 boards from 5 different owners inviting this user
    for i in range(5):
        owner = create_test_user(email=f"owner{i}@efficiency.com", full_name=f"Owner {i}")
        board, _ = create_test_board(owner=owner, name=f"Invited Board {i}")
        membership = BoardMember(
            board_id=board.id,
            user_id=invitee.id,
            role="member",
            status="pending"
        )
        db.session.add(membership)
    db.session.commit()

    headers = auth_headers(invitee.id)

    with query_counter:
        res = client.get("/api/boards/invitations", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert len(data) == 5
        for item in data:
            assert "board" in item
            assert item["board"]["ownerName"] is not None

        # Must execute constant small number of queries (<= 2 queries), NOT 1 + 2*5 = 11 queries
        assert query_counter.count <= 2, f"Expected <= 2 queries, got {query_counter.count}"

def test_conversations_query_efficiency_and_unread_count(client, create_test_user, auth_headers, query_counter):
    """Verify conversations list doesn't load all message rows into RAM or loop queries for unread count."""
    me = create_test_user(email="me@efficiency.com", full_name="Current User")
    
    for i in range(4):
        other = create_test_user(email=f"chatpartner{i}@efficiency.com", full_name=f"Partner {i}")
        conv = Conversation(type="direct", created_by=other.id)
        db.session.add(conv)
        db.session.flush()

        p1 = ConversationParticipant(conversation_id=conv.id, user_id=me.id, role="member")
        p2 = ConversationParticipant(conversation_id=conv.id, user_id=other.id, role="member")
        db.session.add_all([p1, p2])

        # Add 10 messages per conversation
        msgs = [
            Message(
                conversation_id=conv.id,
                sender_id=other.id,
                content=f"Message {m} from other"
            )
            for m in range(10)
        ]
        db.session.add_all(msgs)
    db.session.commit()

    headers = auth_headers(me.id)

    with query_counter:
        res = client.get("/api/messages/conversations", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert len(data) == 4
        for c in data:
            assert "unreadCount" in c
            assert c["unreadCount"] == 10
            assert "participants" in c
            assert len(c["participants"]) == 2

        # Must be efficient without N+1 per-conversation query explosions
        assert query_counter.count <= 6, f"Expected <= 6 queries, got {query_counter.count}"
