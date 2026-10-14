import json

def test_scratchpad_lifecycle_and_seeding(client, create_test_user, auth_headers):
    user1 = create_test_user(email="scratchpad_user1@example.com")
    user2 = create_test_user(email="scratchpad_user2@example.com")

    # 1. First fetch for user1 triggers seeding of 2 informative starter notes
    res = client.get("/api/scratchpads", headers=auth_headers(user1.id))
    assert res.status_code == 200
    notes = res.get_json()
    assert len(notes) == 2
    # Verify titles match informative onboarding
    titles = [n["title"] for n in notes]
    assert "👋 Welcome to your Scratchpad (Quick Tour)" in titles
    assert "📋 Daily Standup & Planner" in titles

    # Quick Tour note should be pinned
    tour_note = next(n for n in notes if "Tour" in n["title"])
    assert tour_note["pinned"] is True

    # 2. User 1 creates a new scratchpad note
    create_res = client.post(
        "/api/scratchpads",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "title": "My Private Thoughts",
            "content": "Secret project ideas",
            "color": "#d1fae5",
            "pinned": False
        }),
        content_type="application/json"
    )
    assert create_res.status_code == 201
    created_note = create_res.get_json()
    assert created_note["title"] == "My Private Thoughts"
    assert created_note["content"] == "Secret project ideas"
    assert created_note["color"] == "#d1fae5"
    assert created_note["pinned"] is False
    note_id = created_note["id"]

    # 3. User 1 updates the note
    patch_res = client.patch(
        f"/api/scratchpads/{note_id}",
        headers=auth_headers(user1.id),
        data=json.dumps({
            "title": "Updated Thoughts",
            "pinned": True
        }),
        content_type="application/json"
    )
    assert patch_res.status_code == 200
    updated_note = patch_res.get_json()
    assert updated_note["title"] == "Updated Thoughts"
    assert updated_note["pinned"] is True

    # 4. User 2 cannot access or update User 1's note
    unauth_patch = client.patch(
        f"/api/scratchpads/{note_id}",
        headers=auth_headers(user2.id),
        data=json.dumps({"title": "Hacked Title"}),
        content_type="application/json"
    )
    assert unauth_patch.status_code in (403, 404)

    unauth_del = client.delete(
        f"/api/scratchpads/{note_id}",
        headers=auth_headers(user2.id)
    )
    assert unauth_del.status_code in (403, 404)

    # 5. User 1 deletes the note
    del_res = client.delete(
        f"/api/scratchpads/{note_id}",
        headers=auth_headers(user1.id)
    )
    assert del_res.status_code == 200

    # Verify deleted note is no longer in list
    res_after_del = client.get("/api/scratchpads", headers=auth_headers(user1.id))
    remaining_ids = [n["id"] for n in res_after_del.get_json()]
    assert note_id not in remaining_ids
