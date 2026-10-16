def test_health_endpoint(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['database'] == 'connected'
    assert 'version' in data
    assert 'timestamp' in data


def test_cors_preflight_headers(client):
    response = client.open(
        '/api/boards',
        method='OPTIONS',
        headers={
            'Origin': 'https://sticky-mind-grid.vercel.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
    )
    assert response.status_code == 200
    assert response.headers.get('Access-Control-Allow-Origin') == 'https://sticky-mind-grid.vercel.app'
    assert response.headers.get('Access-Control-Allow-Credentials') == 'true'
    assert response.headers.get('Access-Control-Max-Age') == '86400'

