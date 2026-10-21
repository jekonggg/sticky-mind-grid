import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from flask import current_app

logger = logging.getLogger(__name__)

SUPPORTED_OAUTH_PROVIDERS = {'google', 'github', 'microsoft'}

def _http_post(url: str, data_dict: dict, headers: dict = None, is_json: bool = False):
    """Standard library HTTP POST helper returning (json_data, error_message)."""
    headers = dict(headers or {})
    headers.setdefault('User-Agent', 'StickyMindGrid-OAuth/1.0')
    headers.setdefault('Accept', 'application/json')

    if is_json:
        encoded_data = json.dumps(data_dict).encode('utf-8')
        headers.setdefault('Content-Type', 'application/json')
    else:
        encoded_data = urllib.parse.urlencode(data_dict).encode('utf-8')
        headers.setdefault('Content-Type', 'application/x-www-form-urlencoded')

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8')
            return json.loads(raw), None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore') if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get('error_description') or err_json.get('error') or body
        except Exception:
            msg = body or str(e)
        return None, f"HTTP {e.code}: {msg}"
    except urllib.error.URLError as e:
        return None, f"Network error connecting to OAuth server: {str(e.reason)}"
    except Exception as e:
        return None, f"Failed to complete OAuth request: {str(e)}"

def _http_get(url: str, headers: dict = None):
    """Standard library HTTP GET helper returning (json_data, error_message)."""
    headers = dict(headers or {})
    headers.setdefault('User-Agent', 'StickyMindGrid-OAuth/1.0')
    headers.setdefault('Accept', 'application/json')

    req = urllib.request.Request(url, headers=headers, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8')
            return json.loads(raw), None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore') if e.fp else str(e)
        try:
            err_json = json.loads(body)
            msg = err_json.get('error_description') or err_json.get('error') or body
        except Exception:
            msg = body or str(e)
        return None, f"HTTP {e.code}: {msg}"
    except urllib.error.URLError as e:
        return None, f"Network error connecting to OAuth server: {str(e.reason)}"
    except Exception as e:
        return None, f"Failed to retrieve user profile: {str(e)}"

class OAuthService:
    @staticmethod
    def is_provider_configured(provider: str) -> bool:
        """Returns True if the provider has both client ID and client secret configured."""
        provider = (provider or '').lower().strip()
        if not current_app:
            return False

        if provider == 'google':
            return bool(
                current_app.config.get('GOOGLE_CLIENT_ID') and
                current_app.config.get('GOOGLE_CLIENT_SECRET')
            )
        elif provider == 'github':
            return bool(
                current_app.config.get('GITHUB_CLIENT_ID') and
                current_app.config.get('GITHUB_CLIENT_SECRET')
            )
        elif provider == 'microsoft':
            return bool(
                current_app.config.get('MICROSOFT_CLIENT_ID') and
                current_app.config.get('MICROSOFT_CLIENT_SECRET')
            )
        return False

    @staticmethod
    def get_providers_status() -> dict:
        """Returns metadata and public client IDs for all supported OAuth providers."""
        google_client_id = (current_app.config.get('GOOGLE_CLIENT_ID') or '').strip() if current_app else ''
        github_client_id = (current_app.config.get('GITHUB_CLIENT_ID') or '').strip() if current_app else ''
        ms_client_id = (current_app.config.get('MICROSOFT_CLIENT_ID') or '').strip() if current_app else ''
        ms_tenant = (current_app.config.get('MICROSOFT_TENANT_ID') or 'common').strip() if current_app else 'common'

        return {
            'google': {
                'name': 'Google',
                'enabled': True,
                'configured': OAuthService.is_provider_configured('google'),
                'clientId': google_client_id or None,
            },
            'github': {
                'name': 'GitHub',
                'enabled': True,
                'configured': OAuthService.is_provider_configured('github'),
                'clientId': github_client_id or None,
            },
            'microsoft': {
                'name': 'Microsoft',
                'enabled': True,
                'configured': OAuthService.is_provider_configured('microsoft'),
                'clientId': ms_client_id or None,
                'tenantId': ms_tenant,
            }
        }

    @staticmethod
    def exchange_code_for_profile(provider: str, code: str, redirect_uri: str):
        """
        Exchanges an OAuth authorization code with the provider for an access token,
        and retrieves the verified user profile information.

        Returns: (profile_dict, error_message)
        """
        provider = (provider or '').lower().strip()
        if provider not in SUPPORTED_OAUTH_PROVIDERS:
            return None, f"Unsupported OAuth provider: {provider}"

        if not code or not str(code).strip():
            return None, "Authorization code is required"

        if not OAuthService.is_provider_configured(provider):
            return None, f"OAuth provider '{provider}' is not configured on this server (missing Client ID or Secret in environment)"

        if provider == 'google':
            return OAuthService._exchange_google_code(code.strip(), redirect_uri)
        elif provider == 'github':
            return OAuthService._exchange_github_code(code.strip(), redirect_uri)
        elif provider == 'microsoft':
            return OAuthService._exchange_microsoft_code(code.strip(), redirect_uri)

        return None, f"Unsupported OAuth provider: {provider}"

    @staticmethod
    def _exchange_google_code(code: str, redirect_uri: str):
        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
        client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')

        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri or current_app.config.get('OAUTH_REDIRECT_URI', 'http://localhost:8080/auth/callback')
        }

        token_json, err = _http_post(token_url, token_data)
        if err:
            logger.error(f"Google token exchange failed: {err}")
            return None, f"Google token exchange failed: {err}"

        access_token = token_json.get('access_token') if isinstance(token_json, dict) else None
        if not access_token:
            return None, "Google token response did not include an access_token"

        # Fetch user info
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        user_data, err = _http_get(userinfo_url, headers={'Authorization': f'Bearer {access_token}'})
        if err or not isinstance(user_data, dict):
            return None, f"Failed to retrieve user details from Google: {err}"

        email = user_data.get('email')
        if not email:
            return None, "Google account does not have a primary email address"

        return {
            'email': email.strip().lower(),
            'fullName': user_data.get('name') or user_data.get('given_name') or email.split('@')[0],
            'avatarUrl': user_data.get('picture'),
            'providerId': str(user_data.get('sub') or ''),
            'email_verified': bool(user_data.get('email_verified', False))
        }, None

    @staticmethod
    def _exchange_github_code(code: str, redirect_uri: str):
        client_id = current_app.config.get('GITHUB_CLIENT_ID')
        client_secret = current_app.config.get('GITHUB_CLIENT_SECRET')

        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
        }
        if redirect_uri:
            token_data['redirect_uri'] = redirect_uri

        token_json, err = _http_post(
            token_url,
            token_data,
            headers={'Accept': 'application/json'},
            is_json=True
        )
        if err:
            logger.error(f"GitHub token exchange failed: {err}")
            return None, f"GitHub token exchange failed: {err}"

        if not isinstance(token_json, dict) or 'error' in token_json:
            error_desc = token_json.get('error_description') if isinstance(token_json, dict) else err
            return None, f"GitHub token exchange rejected: {error_desc or 'Unknown error'}"

        access_token = token_json.get('access_token')
        if not access_token:
            return None, "GitHub token response did not include an access_token"

        api_headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/vnd.github.v3+json',
        }

        # 1. Fetch public profile
        user_data, err = _http_get("https://api.github.com/user", headers=api_headers)
        if err or not isinstance(user_data, dict):
            return None, f"Failed to retrieve profile from GitHub: {err}"

        email = user_data.get('email')

        # 2. If email is private/hidden, fetch emails from /user/emails
        if not email:
            emails_data, _ = _http_get("https://api.github.com/user/emails", headers=api_headers)
            if isinstance(emails_data, list):
                # Prioritize primary & verified
                primary_verified = [e.get('email') for e in emails_data if e.get('primary') and e.get('verified')]
                if primary_verified:
                    email = primary_verified[0]
                else:
                    verified = [e.get('email') for e in emails_data if e.get('verified')]
                    if verified:
                        email = verified[0]
                    elif emails_data:
                        email = emails_data[0].get('email')

        if not email:
            return None, "Unable to obtain a verified email address from your GitHub account"

        full_name = user_data.get('name') or user_data.get('login') or email.split('@')[0]
        avatar_url = user_data.get('avatar_url')
        provider_id = str(user_data.get('id') or '')

        return {
            'email': email.strip().lower(),
            'fullName': full_name,
            'avatarUrl': avatar_url,
            'providerId': provider_id,
            'email_verified': True
        }, None

    @staticmethod
    def _exchange_microsoft_code(code: str, redirect_uri: str):
        client_id = current_app.config.get('MICROSOFT_CLIENT_ID')
        client_secret = current_app.config.get('MICROSOFT_CLIENT_SECRET')
        tenant = (current_app.config.get('MICROSOFT_TENANT_ID') or 'common').strip()

        token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri or current_app.config.get('OAUTH_REDIRECT_URI', 'http://localhost:8080/auth/callback'),
            'scope': 'openid email profile User.Read'
        }

        token_json, err = _http_post(token_url, token_data)
        if err:
            logger.error(f"Microsoft token exchange failed: {err}")
            return None, f"Microsoft token exchange failed: {err}"

        access_token = token_json.get('access_token') if isinstance(token_json, dict) else None
        if not access_token:
            return None, "Microsoft token response did not include an access_token"

        # Fetch user profile from Microsoft Graph
        graph_url = "https://graph.microsoft.com/v1.0/me"
        user_data, err = _http_get(graph_url, headers={'Authorization': f'Bearer {access_token}'})
        if err or not isinstance(user_data, dict):
            return None, f"Failed to retrieve user details from Microsoft Graph: {err}"

        email = user_data.get('mail') or user_data.get('userPrincipalName')
        if not email:
            return None, "Microsoft account does not have an associated email address"

        return {
            'email': email.strip().lower(),
            'fullName': user_data.get('displayName') or email.split('@')[0],
            'avatarUrl': None,
            'providerId': str(user_data.get('id') or ''),
            'email_verified': True
        }, None
