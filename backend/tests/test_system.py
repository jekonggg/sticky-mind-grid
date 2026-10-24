from app.services.email_service import ConsoleEmailProvider, EmailService


def test_health_endpoint(client, monkeypatch):
    monkeypatch.delenv('APP_ENV', raising=False)
    monkeypatch.delenv('FLASK_ENV', raising=False)
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['database'] == 'connected'
    assert data['version'] == '1.3.0'
    assert data['environment'] == 'local'
    assert 'commit' in data
    assert 'timestamp' in data


def test_health_endpoint_environment_reporting(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'dev')
    resp_dev = client.get('/api/health')
    assert resp_dev.status_code == 200
    assert resp_dev.get_json()['environment'] == 'dev'

    monkeypatch.setenv('APP_ENV', 'production')
    resp_prod = client.get('/api/health')
    assert resp_prod.status_code == 200
    assert resp_prod.get_json()['environment'] == 'production'


def test_cors_preflight_headers(client):
    allowed_origins = [
        'https://sticky-mind-grid.vercel.app',
        'https://sticky-mind-grid-dev.vercel.app',
        'https://sticky-mind-grid-git-develop-team.vercel.app',
    ]
    for origin in allowed_origins:
        response = client.open(
            '/api/boards',
            method='OPTIONS',
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization, Content-Type'
            }
        )
        assert response.status_code == 200
        assert response.headers.get('Access-Control-Allow-Origin') == origin
        assert response.headers.get('Access-Control-Allow-Credentials') == 'true'
        assert response.headers.get('Access-Control-Max-Age') == '86400'


def test_cors_preflight_rejects_untrusted_vercel_origin(client):
    response = client.open(
        '/api/boards',
        method='OPTIONS',
        headers={
            'Origin': 'https://evil-attacker.vercel.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
    )
    assert response.headers.get('Access-Control-Allow-Origin') is None


def test_oauth_disabled_via_env(client, monkeypatch):
    monkeypatch.setenv('OAUTH_ENABLED', 'false')

    providers_resp = client.get('/api/auth/oauth/providers')
    assert providers_resp.status_code == 200
    providers_data = providers_resp.get_json()
    for key in ('google', 'github', 'microsoft'):
        assert providers_data[key]['enabled'] is False
        assert providers_data[key]['configured'] is False
        assert providers_data[key]['clientId'] is None

    oauth_post_resp = client.post(
        '/api/auth/oauth/google',
        json={'email': 'devuser@example.com', 'fullName': 'Dev User'}
    )
    assert oauth_post_resp.status_code == 403
    assert 'disabled' in oauth_post_resp.get_json()['message'].lower()


def test_email_subject_prefix(app, monkeypatch):
    provider = ConsoleEmailProvider()
    ConsoleEmailProvider.clear_outbox()
    EmailService.set_provider(provider)

    try:
        monkeypatch.setenv('EMAIL_SUBJECT_PREFIX', '[DEV]')
        with app.app_context():
            EmailService.send_email(
                to_email='tester@example.com',
                subject='Verify your email address',
                text_body='Body text'
            )
            EmailService.send_email(
                to_email='tester@example.com',
                subject='[DEV] Already prefixed subject',
                text_body='Body text 2'
            )

        outbox = ConsoleEmailProvider.get_outbox()
        assert len(outbox) == 2
        assert outbox[0]['subject'] == '[DEV] Verify your email address'
        assert outbox[1]['subject'] == '[DEV] Already prefixed subject'
    finally:
        ConsoleEmailProvider.clear_outbox()
        EmailService.set_provider(None)
