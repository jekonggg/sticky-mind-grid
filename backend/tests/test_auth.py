import json

def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "newuser@example.com",
            "password": "password123",
            "fullName": "New User"
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["fullName"] == "New User"
    assert "token" in data

def test_register_duplicate_email(client, create_test_user):
    create_test_user(email="existing@example.com")
    response = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "existing@example.com",
            "password": "password123",
            "fullName": "Existing User"
        }),
        content_type="application/json"
    )
    assert response.status_code in [400, 409]
    data = response.get_json()
    assert "message" in data or "error" in data

def test_login_success(client, create_test_user):
    create_test_user(email="loginuser@example.com", password="secretpassword")
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "loginuser@example.com",
            "password": "secretpassword"
        }),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "token" in data
    assert data["user"]["email"] == "loginuser@example.com"

def test_login_invalid_password(client, create_test_user):
    create_test_user(email="loginuser2@example.com", password="correctpassword")
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "loginuser2@example.com",
            "password": "wrongpassword"
        }),
        content_type="application/json"
    )
    assert response.status_code == 401

def test_get_current_user_profile(client, create_test_user, auth_headers):
    user = create_test_user(email="profile@example.com", full_name="Profile User")
    headers = auth_headers(user.id)
    
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["email"] == "profile@example.com"
    assert data["fullName"] == "Profile User"

def test_get_profile_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
