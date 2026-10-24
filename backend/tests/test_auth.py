import json
from app import db

def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "newuser@example.com",
            "password": "Password123!",
            "fullName": "New User"
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["fullName"] == "New User"
    assert "token" not in data
    assert "message" in data

def test_register_password_complexity(client):
    # Too short (< 8 chars)
    res_short = client.post(
        "/api/auth/register",
        data=json.dumps({"email": "weak1@example.com", "password": "Pass1!"}),
        content_type="application/json"
    )
    assert res_short.status_code == 400

    # No uppercase
    res_no_upper = client.post(
        "/api/auth/register",
        data=json.dumps({"email": "weak2@example.com", "password": "password123!"}),
        content_type="application/json"
    )
    assert res_no_upper.status_code == 400

    # No digit
    res_no_digit = client.post(
        "/api/auth/register",
        data=json.dumps({"email": "weak3@example.com", "password": "Password!!!!"}),
        content_type="application/json"
    )
    assert res_no_digit.status_code == 400

    # No special symbol
    res_no_special = client.post(
        "/api/auth/register",
        data=json.dumps({"email": "weak4@example.com", "password": "Password123"}),
        content_type="application/json"
    )
    assert res_no_special.status_code == 400

def test_register_duplicate_email(client, create_test_user):
    create_test_user(email="existing@example.com")
    response = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "existing@example.com",
            "password": "Password123!",
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



def test_login_user_not_found(client):
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "nonexistent@example.com",
            "password": "Password123!"
        }),
        content_type="application/json"
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data["field"] == "email"
    assert data["code"] == "USER_NOT_FOUND"
    assert "no account found" in data["message"].lower()

def test_login_oauth_account_guidance(client, create_test_user):
    user = create_test_user(
        email="google_user@example.com",
        email_verified=True
    )
    user.auth_provider = "google"
    db.session.commit()
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "google_user@example.com",
            "password": "SomeLocalPassword123!"
        }),
        content_type="application/json"
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data["field"] == "oauth"
    assert data["provider"] == "google"
    assert data["code"] == "OAUTH_ACCOUNT"
    assert "google" in data["message"].lower()

def test_login_invalid_email_format(client):
    response = client.post(
        "/api/auth/login",
        data=json.dumps({
            "email": "invalid-email-without-at",
            "password": "Password123!"
        }),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["field"] == "email"
    assert data["code"] == "INVALID_EMAIL"

def test_verification_status_endpoint(client, create_test_user):
    # Nonexistent user -> 404
    r_not_found = client.get("/api/auth/verification-status?email=ghost@example.com")
    assert r_not_found.status_code == 404

    # Unverified user -> verified: False
    unverified = create_test_user(email="pending_verify@example.com", email_verified=False)
    r_unverified = client.get("/api/auth/verification-status?email=pending_verify@example.com")
    assert r_unverified.status_code == 200
    assert r_unverified.get_json()["verified"] is False

    # Verified user -> verified: True
    verified = create_test_user(email="already_verified@example.com", email_verified=True)
    r_verified = client.get("/api/auth/verification-status?email=already_verified@example.com")
    assert r_verified.status_code == 200
    assert r_verified.get_json()["verified"] is True
