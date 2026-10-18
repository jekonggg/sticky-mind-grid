import json
from unittest.mock import patch
from app.services.oauth_service import OAuthService

def test_is_provider_configured(app):
    with app.app_context():
        # Initially empty
        assert OAuthService.is_provider_configured('google') is False
        assert OAuthService.is_provider_configured('github') is False
        assert OAuthService.is_provider_configured('microsoft') is False
        assert OAuthService.is_provider_configured('invalid') is False

        # Set Google credentials
        app.config['GOOGLE_CLIENT_ID'] = 'google-id'
        app.config['GOOGLE_CLIENT_SECRET'] = 'google-secret'
        assert OAuthService.is_provider_configured('google') is True

        # Clear
        app.config['GOOGLE_CLIENT_ID'] = ''
        app.config['GOOGLE_CLIENT_SECRET'] = ''

def test_get_providers_status(app):
    with app.app_context():
        app.config['GOOGLE_CLIENT_ID'] = 'test-g-id'
        app.config['GOOGLE_CLIENT_SECRET'] = 'test-g-secret'
        
        status = OAuthService.get_providers_status()
        assert status['google']['configured'] is True
        assert status['google']['clientId'] == 'test-g-id'
        assert status['github']['configured'] is False
        assert status['github']['clientId'] is None

        # Clean up
        app.config['GOOGLE_CLIENT_ID'] = ''
        app.config['GOOGLE_CLIENT_SECRET'] = ''

@patch('app.services.oauth_service._http_post')
@patch('app.services.oauth_service._http_get')
def test_google_code_exchange_success(mock_get, mock_post, app):
    with app.app_context():
        app.config['GOOGLE_CLIENT_ID'] = 'google-client-id'
        app.config['GOOGLE_CLIENT_SECRET'] = 'google-client-secret'

        mock_post.return_value = ({
            'access_token': 'mock-google-access-token',
            'token_type': 'Bearer'
        }, None)

        mock_get.return_value = ({
            'sub': 'google-1092830192',
            'email': 'realgoogle@example.com',
            'name': 'Real Google User',
            'picture': 'https://example.com/photo.jpg',
            'email_verified': True
        }, None)

        profile, err = OAuthService.exchange_code_for_profile('google', 'valid-code-123', 'http://localhost:8080/auth/callback')
        assert err is None
        assert profile is not None
        assert profile['email'] == 'realgoogle@example.com'
        assert profile['fullName'] == 'Real Google User'
        assert profile['providerId'] == 'google-1092830192'

        # Clean up
        app.config['GOOGLE_CLIENT_ID'] = ''
        app.config['GOOGLE_CLIENT_SECRET'] = ''

@patch('app.services.oauth_service._http_post')
@patch('app.services.oauth_service._http_get')
def test_github_code_exchange_with_private_email(mock_get, mock_post, app):
    with app.app_context():
        app.config['GITHUB_CLIENT_ID'] = 'github-client-id'
        app.config['GITHUB_CLIENT_SECRET'] = 'github-client-secret'

        mock_post.return_value = ({'access_token': 'gho_mock_token'}, None)

        user_mock_data = {
            'id': 1234567,
            'login': 'octodev',
            'name': 'Octo Developer',
            'avatar_url': 'https://github.com/images/avatar.png',
            'email': None
        }

        emails_mock_data = [
            {'email': 'secondary@example.com', 'primary': False, 'verified': True},
            {'email': 'octo.primary@github.com', 'primary': True, 'verified': True}
        ]

        mock_get.side_effect = [(user_mock_data, None), (emails_mock_data, None)]

        profile, err = OAuthService.exchange_code_for_profile('github', 'gh-code-abc', 'http://localhost:8080/auth/callback')
        assert err is None
        assert profile is not None
        assert profile['email'] == 'octo.primary@github.com'
        assert profile['fullName'] == 'Octo Developer'
        assert profile['providerId'] == '1234567'

        app.config['GITHUB_CLIENT_ID'] = ''
        app.config['GITHUB_CLIENT_SECRET'] = ''

@patch('app.services.oauth_service._http_post')
@patch('app.services.oauth_service._http_get')
def test_microsoft_code_exchange_success(mock_get, mock_post, app):
    with app.app_context():
        app.config['MICROSOFT_CLIENT_ID'] = 'ms-client-id'
        app.config['MICROSOFT_CLIENT_SECRET'] = 'ms-client-secret'
        app.config['MICROSOFT_TENANT_ID'] = 'common'

        mock_post.return_value = ({'access_token': 'ms_mock_token'}, None)

        mock_get.return_value = ({
            'id': 'ms-user-999',
            'displayName': 'Morgan MSFT',
            'mail': 'morgan@outlook.com',
            'userPrincipalName': 'morgan@outlook.com'
        }, None)

        profile, err = OAuthService.exchange_code_for_profile('microsoft', 'ms-code-xyz', 'http://localhost:8080/auth/callback')
        assert err is None
        assert profile is not None
        assert profile['email'] == 'morgan@outlook.com'
        assert profile['fullName'] == 'Morgan MSFT'
        assert profile['providerId'] == 'ms-user-999'

        app.config['MICROSOFT_CLIENT_ID'] = ''
        app.config['MICROSOFT_CLIENT_SECRET'] = ''

def test_exchange_code_unconfigured_provider(app):
    with app.app_context():
        profile, err = OAuthService.exchange_code_for_profile('google', 'code-123', 'http://localhost:8080/auth/callback')
        assert profile is None
        assert "not configured" in err

@patch('app.services.oauth_service.OAuthService.exchange_code_for_profile')
def test_oauth_endpoint_with_code_success(mock_exchange, client):
    mock_exchange.return_value = ({
        'email': 'realuser@gmail.com',
        'fullName': 'Verified Real User',
        'avatarUrl': 'https://example.com/avatar.jpg',
        'providerId': 'real-sub-123',
        'email_verified': True
    }, None)

    response = client.post(
        "/api/auth/oauth/google",
        data=json.dumps({
            "code": "auth-code-returned-by-google",
            "redirectUri": "http://localhost:8080/auth/callback"
        }),
        content_type="application/json"
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["email"] == "realuser@gmail.com"
    assert data["user"]["fullName"] == "Verified Real User"
    assert data["provider"] == "google"
    assert "token" in data

@patch('app.services.oauth_service.OAuthService.exchange_code_for_profile')
def test_oauth_endpoint_with_code_error(mock_exchange, client):
    mock_exchange.return_value = (None, "Invalid authorization code")

    response = client.post(
        "/api/auth/oauth/google",
        data=json.dumps({
            "code": "bad-code",
            "redirectUri": "http://localhost:8080/auth/callback"
        }),
        content_type="application/json"
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid authorization code" in data["message"]
