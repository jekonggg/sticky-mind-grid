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

def test_change_password_requires_current_password(client, create_test_user, auth_headers):
    user = create_test_user(email="pwchange1@example.com", password="oldpassword123")
    response = client.patch(
        "/api/auth/me",
        headers=auth_headers(user.id),
        data=json.dumps({"password": "newpassword123"}),
        content_type="application/json"
    )
    assert response.status_code == 403

    # Old password must still work
    login = client.post(
        "/api/auth/login",
        data=json.dumps({"email": "pwchange1@example.com", "password": "oldpassword123"}),
        content_type="application/json"
    )
    assert login.status_code == 200

def test_change_password_wrong_current(client, create_test_user, auth_headers):
    user = create_test_user(email="pwchange2@example.com", password="oldpassword123")
    response = client.patch(
        "/api/auth/me",
        headers=auth_headers(user.id),
        data=json.dumps({"password": "newpassword123", "currentPassword": "wrongpassword"}),
        content_type="application/json"
    )
    assert response.status_code == 403

    login = client.post(
        "/api/auth/login",
        data=json.dumps({"email": "pwchange2@example.com", "password": "oldpassword123"}),
        content_type="application/json"
    )
    assert login.status_code == 200

def test_change_password_with_correct_current(client, create_test_user, auth_headers):
    user = create_test_user(email="pwchange3@example.com", password="oldpassword123")
    response = client.patch(
        "/api/auth/me",
        headers=auth_headers(user.id),
        data=json.dumps({"password": "newpassword123", "currentPassword": "oldpassword123"}),
        content_type="application/json"
    )
    assert response.status_code == 200

    # New password logs in, old one is rejected
    new_login = client.post(
        "/api/auth/login",
        data=json.dumps({"email": "pwchange3@example.com", "password": "newpassword123"}),
        content_type="application/json"
    )
    assert new_login.status_code == 200

    old_login = client.post(
        "/api/auth/login",
        data=json.dumps({"email": "pwchange3@example.com", "password": "oldpassword123"}),
        content_type="application/json"
    )
    assert old_login.status_code == 401

def test_oauth_providers_endpoint(client):
    response = client.get("/api/auth/oauth/providers")
    assert response.status_code == 200
    data = response.get_json()
    assert "google" in data
    assert "github" in data
    assert "microsoft" in data

def test_oauth_google_signup_new_user(client):
    response = client.post(
        "/api/auth/oauth/google",
        data=json.dumps({
            "profile": {
                "email": "googleuser@gmail.com",
                "fullName": "Google User",
                "avatarUrl": "https://lh3.googleusercontent.com/a/test-avatar",
                "providerId": "google-123456"
            }
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["email"] == "googleuser@gmail.com"
    assert data["user"]["fullName"] == "Google User"
    assert data["user"]["avatarUrl"] == "https://lh3.googleusercontent.com/a/test-avatar"
    assert data["user"]["authProvider"] == "google"
    assert "token" in data

def test_oauth_github_existing_user_link_and_login(client, create_test_user):
    user = create_test_user(email="octocat@github.com", full_name="Octo Cat")
    
    response = client.post(
        "/api/auth/oauth",
        data=json.dumps({
            "provider": "github",
            "profile": {
                "email": "octocat@github.com",
                "fullName": "Octo Cat Updated",
                "avatarUrl": "https://avatars.githubusercontent.com/u/583231",
                "providerId": "gh-583231"
            }
        }),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["email"] == "octocat@github.com"
    assert data["user"]["avatarUrl"] == "https://avatars.githubusercontent.com/u/583231"
    assert data["user"]["authProvider"] == "github"
    assert "token" in data

def test_oauth_microsoft_signup(client):
    response = client.post(
        "/api/auth/oauth/microsoft",
        data=json.dumps({
            "profile": {
                "email": "msftuser@outlook.com",
                "fullName": "Microsoft User",
                "providerId": "ms-987654"
            }
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["email"] == "msftuser@outlook.com"
    assert data["user"]["authProvider"] == "microsoft"
    assert "token" in data

def test_oauth_missing_email(client):
    response = client.post(
        "/api/auth/oauth/google",
        data=json.dumps({
            "profile": {
                "fullName": "No Email User"
            }
        }),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_oauth_unsupported_provider(client):
    response = client.post(
        "/api/auth/oauth/unknownprovider",
        data=json.dumps({
            "profile": {
                "email": "unknown@example.com"
            }
        }),
        content_type="application/json"
    )
    assert response.status_code == 400

