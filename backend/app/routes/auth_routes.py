import uuid
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User
from app import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

SUPPORTED_OAUTH_PROVIDERS = {'google', 'github', 'microsoft'}

def handle_oauth_flow(provider: str, data: dict):
    try:
        provider = provider.lower()
        if provider not in SUPPORTED_OAUTH_PROVIDERS:
            return jsonify({'message': f'Unsupported provider: {provider}'}), 400

        profile = data.get('profile') or {}
        email = profile.get('email') or data.get('email')
        
        if not email:
            return jsonify({'message': 'Missing email in OAuth request'}), 400

        email = email.strip().lower()
        full_name = profile.get('fullName') or profile.get('name') or data.get('fullName') or email.split('@')[0]
        avatar_url = profile.get('avatarUrl') or profile.get('picture') or data.get('avatarUrl')
        provider_id = profile.get('providerId') or profile.get('id') or profile.get('sub') or data.get('providerId')

        print(f"DEBUG: OAuth {provider} attempt for email: {email}")
        user = User.query.filter_by(email=email).first()
        status_code = 200

        if not user:
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                auth_provider=provider,
                auth_provider_id=str(provider_id) if provider_id else None
            )
            user.set_password(str(uuid.uuid4()))
            db.session.add(user)
            db.session.commit()
            status_code = 201
            print(f"DEBUG: New OAuth user created: {user.email} (id: {user.id})")
        else:
            updated = False
            if not user.avatar_url and avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if not user.auth_provider or user.auth_provider == 'local':
                user.auth_provider = provider
                if provider_id:
                    user.auth_provider_id = str(provider_id)
                updated = True
            if updated:
                db.session.commit()
            print(f"DEBUG: Existing user logged in via OAuth {provider}: {user.email}")

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'user': user.to_dict(),
            'token': access_token,
            'provider': provider
        }), status_code
    except Exception as e:
        db.session.rollback()
        print(f"CRITICAL ERROR during OAuth flow: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'OAuth authentication failed', 'error': str(e)}), 500

@bp.route('/oauth/providers', methods=['GET'])
def get_oauth_providers():
    return jsonify({
        'google': {'name': 'Google', 'enabled': True},
        'github': {'name': 'GitHub', 'enabled': True},
        'microsoft': {'name': 'Microsoft', 'enabled': True}
    }), 200

@bp.route('/oauth', methods=['POST'])
def oauth_generic():
    data = request.get_json() or {}
    provider = data.get('provider', '').lower()
    if not provider:
        return jsonify({'message': 'Missing provider field'}), 400
    return handle_oauth_flow(provider, data)

@bp.route('/oauth/<provider>', methods=['POST'])
def oauth_provider(provider):
    data = request.get_json() or {}
    return handle_oauth_flow(provider, data)

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User already exists'}), 400
        
    user = User(
        email=data['email'],
        full_name=data.get('fullName', '')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'user': user.to_dict(),
        'token': access_token
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Missing email or password'}), 400
            
        print(f"DEBUG: Login attempt for email: {data['email']}")
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            print(f"DEBUG: User not found: {data['email']}")
            return jsonify({'message': 'Invalid credentials'}), 401
            
        if not user.check_password(data['password']):
            print(f"DEBUG: Password mismatch for user: {data['email']}")
            return jsonify({'message': 'Invalid credentials'}), 401
            
        print(f"DEBUG: User authenticated successfully: {user.email}")
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'user': user.to_dict(),
            'token': access_token
        }), 200
    except Exception as e:
        print(f"CRITICAL ERROR during login: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Internal Server Error', 'error': str(e)}), 500

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    return jsonify(user.to_dict()), 200

@bp.route('/me', methods=['PATCH', 'PUT'])
@jwt_required()
def update_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
        
    if 'fullName' in data:
        user.full_name = data['fullName'].strip()
    if 'avatarUrl' in data:
        user.avatar_url = data['avatarUrl']
    if 'password' in data and data['password']:
        current_password = data.get('currentPassword') or ''
        if not current_password or not user.check_password(current_password):
            return jsonify({'message': 'Current password is incorrect'}), 403
        user.set_password(data['password'])
        
    db.session.commit()
    return jsonify(user.to_dict()), 200

@bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([]), 200
        
    users = User.query.filter(
        (User.email.ilike(f'%{query}%')) | 
        (User.full_name.ilike(f'%{query}%'))
    ).limit(10).all()
    
    return jsonify([user.to_dict() for user in users]), 200


