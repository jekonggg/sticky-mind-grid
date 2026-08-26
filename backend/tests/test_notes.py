import json

def test_note_lifecycle(client, create_test_user, auth_headers):
    owner = create_test_user(email="noteowner@example.com")
    other_user = create_test_user(email="noteother@example.com")

    # Create board
    board_resp = client.post(
        "/api/boards",
        headers=auth_headers(owner.id),
        data=json.dumps({"name": "Notes Test Board"}),
        content_type="application/json"
    )
    board_id = board_resp.get_json()["id"]

    # Create note
    create_note_resp = client.post(
        f"/api/boards/{board_id}/notes",
        headers=auth_headers(owner.id),
        data=json.dumps({
            "title": "Meeting Notes",
            "content": "Discussing roadmap Q1",
            "color": "#fef3c7"
        }),
        content_type="application/json"
    )
    assert create_note_resp.status_code == 201
    note_data = create_note_resp.get_json()
    assert note_data["title"] == "Meeting Notes"
    assert note_data["content"] == "Discussing roadmap Q1"
    note_id = note_data["id"]

    # List notes
    list_resp = client.get(f"/api/boards/{board_id}/notes", headers=auth_headers(owner.id))
    assert list_resp.status_code == 200
    notes = list_resp.get_json()
    assert len(notes) == 1
    assert notes[0]["id"] == note_id

    # Update note
    update_resp = client.patch(
        f"/api/notes/{note_id}",
        headers=auth_headers(owner.id),
        data=json.dumps({
            "title": "Updated Meeting Notes",
            "color": "#e0f2fe"
        }),
        content_type="application/json"
    )
    assert update_resp.status_code == 200
    assert update_resp.get_json()["title"] == "Updated Meeting Notes"
    assert update_resp.get_json()["color"] == "#e0f2fe"

    # Other user without permission cannot delete note
    unauth_del = client.delete(f"/api/notes/{note_id}", headers=auth_headers(other_user.id))
    assert unauth_del.status_code in [403, 404]

    # Owner deletes note
    del_resp = client.delete(f"/api/notes/{note_id}", headers=auth_headers(owner.id))
    assert del_resp.status_code == 200

    # List is now empty
    empty_list = client.get(f"/api/boards/{board_id}/notes", headers=auth_headers(owner.id))
    assert len(empty_list.get_json()) == 0
