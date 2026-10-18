import io
import json
from unittest.mock import patch, MagicMock
import pytest
from flask import current_app
from app import db
from app.models.user import User
from app.models.task import Task
from app.models.board import Board
from app.services.file_service import FileService

def test_supabase_configured_status(app):
    with app.app_context():
        # Initially unconfigured
        app.config['SUPABASE_URL'] = None
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = None
        assert FileService.is_supabase_configured() is False

        # Configured
        app.config['SUPABASE_URL'] = 'https://mockproj.supabase.co'
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = 'mock-service-role-key'
        assert FileService.is_supabase_configured() is True

def test_local_fallback_when_supabase_unconfigured(app, client):
    with app.app_context():
        app.config['SUPABASE_URL'] = None
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = None

        file_content = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
        file_obj = (io.BytesIO(file_content), 'test_avatar.gif')

        # Local save avatar
        file_storage = MagicMock()
        file_storage.filename = 'test_avatar.gif'
        file_storage.content_type = 'image/gif'
        file_storage.stream = io.BytesIO(file_content)
        file_storage.save = lambda path: open(path, 'wb').write(file_content)

        result, err = FileService.save_file(file_storage, purpose='avatar')
        assert err is None
        assert result is not None
        assert result['url'].startswith('/api/files/')
        assert not result['storedName'].startswith('avatars/')

def test_supabase_avatar_upload_and_public_url(app):
    with app.app_context():
        app.config['SUPABASE_URL'] = 'https://mockproj.supabase.co'
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = 'mock-service-role-key'
        app.config['SUPABASE_STORAGE_AVATARS_BUCKET'] = 'avatars'

        file_content = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
        file_storage = MagicMock()
        file_storage.filename = 'my_avatar.gif'
        file_storage.content_type = 'image/gif'
        file_storage.stream = io.BytesIO(file_content)
        file_storage.save = lambda path: open(path, 'wb').write(file_content)

        with patch.object(FileService, 'upload_to_supabase', return_value=(True, None)) as mock_upload:
            result, err = FileService.save_file(file_storage, purpose='avatar')
            assert err is None
            assert result is not None
            assert result['storedName'].startswith('avatars/')
            assert 'https://mockproj.supabase.co/storage/v1/object/public/avatars/' in result['url']
            mock_upload.assert_called_once()
            args, _ = mock_upload.call_args
            assert args[1] == 'avatars'

def test_supabase_attachment_upload_and_signed_url_redirect(app, client):
    with app.app_context():
        app.config['SUPABASE_URL'] = 'https://mockproj.supabase.co'
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = 'mock-service-role-key'
        app.config['SUPABASE_STORAGE_ATTACHMENTS_BUCKET'] = 'attachments'

        # Create a user and board
        user = User(email='uploader@example.com', full_name='Uploader')
        user.set_password('Secret123!')
        db.session.add(user)
        db.session.commit()

        token = client.post('/api/auth/login', json={'email': 'uploader@example.com', 'password': 'Secret123!'}).get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        file_content = b'Document text content'
        with patch.object(FileService, 'upload_to_supabase', return_value=(True, None)):
            res = client.post(
                '/api/files/upload',
                data={'file': (io.BytesIO(file_content), 'document.txt')},
                headers=headers,
                content_type='multipart/form-data'
            )
            assert res.status_code == 201
            data = res.get_json()
            stored_name = data['storedName']
            assert stored_name.startswith('attachments/')
            unique_name = stored_name.replace('attachments/', '')

        # Accessing private attachment redirects to signed URL
        with patch.object(FileService, 'create_supabase_signed_url', return_value=('https://mockproj.supabase.co/signed-url-mock', None)) as mock_sign:
            res = client.get(f'/api/files/{unique_name}', headers=headers)
            assert res.status_code == 302
            assert res.location == 'https://mockproj.supabase.co/signed-url-mock'
            mock_sign.assert_called_once()

def test_user_to_dict_resolves_supabase_cdn_and_legacy_paths(app):
    with app.app_context():
        app.config['SUPABASE_URL'] = 'https://mockproj.supabase.co'
        app.config['SUPABASE_STORAGE_AVATARS_BUCKET'] = 'avatars'

        # Relative Supabase object path
        u1 = User(email='cdn@example.com', avatar_url='avatars/uuid-avatar.png')
        d1 = u1.to_dict()
        assert d1['avatarUrl'] == 'https://mockproj.supabase.co/storage/v1/object/public/avatars/uuid-avatar.png'

        # Legacy broken ephemeral /uploads/ path -> converted to None
        u2 = User(email='legacy@example.com', avatar_url='/uploads/old_avatar.png')
        d2 = u2.to_dict()
        assert d2['avatarUrl'] is None

        # External HTTP URL -> unchanged
        u3 = User(email='google@example.com', avatar_url='https://lh3.googleusercontent.com/photo.jpg')
        d3 = u3.to_dict()
        assert d3['avatarUrl'] == 'https://lh3.googleusercontent.com/photo.jpg'

def test_update_me_normalizes_avatar_and_deletes_old_object(app, client):
    with app.app_context():
        app.config['SUPABASE_URL'] = 'https://mockproj.supabase.co'
        app.config['SUPABASE_SERVICE_ROLE_KEY'] = 'mock-service-role-key'
        app.config['SUPABASE_STORAGE_AVATARS_BUCKET'] = 'avatars'

        user = User(email='changer@example.com', full_name='Changer', avatar_url='avatars/old-pic.png')
        user.set_password('Secret123!')
        db.session.add(user)
        db.session.commit()

        token = client.post('/api/auth/login', json={'email': 'changer@example.com', 'password': 'Secret123!'}).get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        with patch.object(FileService, 'delete_from_supabase') as mock_del:
            # Update avatar with full Supabase URL
            res = client.patch(
                '/api/auth/me',
                json={'avatarUrl': 'https://mockproj.supabase.co/storage/v1/object/public/avatars/new-pic.png'},
                headers=headers
            )
            assert res.status_code == 200
            user_reloaded = db.session.get(User, user.id)
            # Database stores object path, not full URL
            assert user_reloaded.avatar_url == 'avatars/new-pic.png'
            # Old avatar was deleted from Supabase
            mock_del.assert_called_once_with('avatars', 'old-pic.png')
