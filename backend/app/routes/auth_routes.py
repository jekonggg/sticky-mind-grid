import uuid
import secrets
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
try:
    from email_validator import validate_email, EmailNotValidError
except ImportError:
    validate_email = None
    EmailNotValidError = Exception
from app.models.user import User
from app import db, limiter

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

SUPPORTED_OAUTH_PROVIDERS = {'google', 'github', 'microsoft'}

def normalize_and_validate_email(email_str):
    if not email_str or not isinstance(email_str, str):
        return None, "Email is required"
    clean_email = email_str.strip().lower()
    if not clean_email:
        return None, "Email is required"
    if validate_email:
        try:
            valid = validate_email(clean_email, check_deliverability=False)
            return valid.normalized, None
        except EmailNotValidError as e:
            return None, f"Invalid email format: {str(e)}"
    else:
        import re
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', clean_email):
            return None, "Invalid email format"
        return clean_email, None

def attach_pending_invitations(user):
    try:
        from app.models.board_invitation import BoardInvitation
        from app.models.board_member import BoardMember
        from app.models.notification import Notification
        from datetime import datetime

        now = datetime.utcnow()
        clean_email = user.email.strip().lower()
        pending_invites = BoardInvitation.query.filter_by(email=clean_email, status='pending').all()

        for inv in pending_invites:
            if inv.expires_at and now > inv.expires_at:
                inv.status = 'expired'
                continue

            existing_m = BoardMember.query.filter_by(board_id=inv.board_id, user_id=user.id).first()
            if not existing_m:
                new_m = BoardMember(
                    board_id=inv.board_id,
                    user_id=user.id,
                    role=inv.role,
                    status='pending'
                )
                db.session.add(new_m)

            # In-App Notification
            board_name = inv.board.name if inv.board else "the board"
            inviter_name = (inv.inviter.full_name or inv.inviter.email) if inv.inviter else "An admin"
            notif = Notification(
                user_id=user.id,
                type='board_invite',
                title='Board Invitation',
                message=f'{inviter_name} invited you to join "{board_name}" as {inv.role.capitalize()}',
                link=f'/boards/{inv.board_id}'
            )
            db.session.add(notif)

        db.session.commit()
    except Exception as e:
        print(f"Error attaching pending invitations for {user.email}: {e}")

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
            attach_pending_invitations(user)
            status_code = 201
            print(f"DEBUG: New OAuth user created: {user.email} (id: {user.id})")
        else:
            updated = False
            if not getattr(user, 'email_verified', False):
                user.email_verified = True
                attach_pending_invitations(user)
                updated = True
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
@limiter.limit("20 per minute")
def oauth_generic():
    data = request.get_json() or {}
    provider = data.get('provider', '').lower()
    if not provider:
        return jsonify({'message': 'Missing provider field'}), 400
    return handle_oauth_flow(provider, data)

@bp.route('/oauth/<provider>', methods=['POST'])
@limiter.limit("20 per minute")
def oauth_provider(provider):
    data = request.get_json() or {}
    return handle_oauth_flow(provider, data)

def validate_password_complexity(password: str):
    if not password or not isinstance(password, str):
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter (A-Z)"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number (0-9)"
    import re
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]', password):
        return False, "Password must contain at least one special character (!@#$%^&*...)"
    return True, None

@bp.route('/register', methods=['POST'])
@limiter.limit("10 per minute")
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400

    clean_email, err = normalize_and_validate_email(data.get('email'))
    if err:
        return jsonify({'message': err}), 400

    valid, pass_err = validate_password_complexity(data.get('password'))
    if not valid:
        return jsonify({'message': pass_err}), 400
        
    if User.query.filter_by(email=clean_email).first():
        return jsonify({'message': 'User already exists'}), 400
        
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    user = User(
        email=clean_email,
        full_name=data.get('fullName', ''),
        email_verified=False
    )
    user.verification_token = token
    user.verification_token_expires_at = expires_at
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()

    # Dispatch verification email via EmailService
    try:
        from app.services.email_service import EmailService
        verify_url = f"/verify-email?token={token}"
        subject = "Verify your Sticky Mind Grid email address"
        body = (
            f"Hello {user.full_name or 'there'},\n\n"
            f"Please verify your email address to activate your account and link any pending board invitations:\n\n"
            f"Verification Token: {token}\n"
            f"Link: {verify_url}\n\n"
            f"This token expires in 24 hours.\n\n"
            f"If you did not request this, please ignore this email."
        )
        EmailService.send_email(to_email=user.email, subject=subject, text_body=body)
    except Exception as e:
        print(f"Warning: Failed to dispatch verification email to {user.email}: {e}")

    # Note: attach_pending_invitations is intentionally NOT called until email is verified (OQ-17)

    return jsonify({
        'message': 'Account created successfully. Please sign in to continue.',
        'user': user.to_dict()
    }), 201

@bp.route('/verify-email', methods=['POST'])
@limiter.limit("20 per minute")
def verify_email():
    data = request.get_json() or {}
    token = data.get('token')
    if not token:
        return jsonify({'message': 'Missing verification token'}), 400

    now = datetime.utcnow()
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({'message': 'Invalid verification token'}), 400

    if user.verification_token_expires_at and now > user.verification_token_expires_at:
        return jsonify({'message': 'Verification token has expired'}), 400

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.session.commit()

    # Link pending board invitations now that the email is verified
    attach_pending_invitations(user)

    return jsonify({
        'message': 'Email verified successfully',
        'user': user.to_dict()
    }), 200

@bp.route('/resend-verification', methods=['POST'])
@limiter.limit("5 per minute")
def resend_verification():
    data = request.get_json() or {}
    email = data.get('email')
    user = None

    if email:
        clean_email = email.strip().lower()
        user = User.query.filter_by(email=clean_email).first()
    else:
        try:
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request(optional=True)
            current_id = get_jwt_identity()
            if current_id:
                user = User.query.get(current_id)
        except Exception:
            pass

    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user.email_verified:
        return jsonify({'message': 'Email is already verified', 'emailVerified': True}), 200

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
    db.session.commit()

    try:
        from app.services.email_service import EmailService
        verify_url = f"/verify-email?token={token}"
        subject = "Verify your Sticky Mind Grid email address"
        body = (
            f"Hello {user.full_name or 'there'},\n\n"
            f"Here is your new email verification token:\n\n"
            f"Verification Token: {token}\n"
            f"Link: {verify_url}\n\n"
            f"This token expires in 24 hours."
        )
        EmailService.send_email(to_email=user.email, subject=subject, text_body=body)
    except Exception as e:
        print(f"Warning: Failed to resend verification email: {e}")

    return jsonify({'message': 'Verification email resent successfully'}), 200

@bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Missing email or password'}), 400
            
        clean_email = (data.get('email') or '').strip().lower()
        print(f"DEBUG: Login attempt for email: {clean_email}")
        user = User.query.filter_by(email=clean_email).first()
        
        if not user:
            print(f"DEBUG: User not found: {clean_email}")
            return jsonify({'message': 'Invalid credentials'}), 401
            
        if not user.check_password(data['password']):
            print(f"DEBUG: Password mismatch for user: {clean_email}")
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
        import os
        from app.services.file_service import FileService
        from flask import current_app

        raw_avatar = data['avatarUrl']
        new_avatar = None
        if raw_avatar:
            raw_str = str(raw_avatar).strip()
            if '/storage/v1/object/public/' in raw_str:
                # e.g. https://<url>/storage/v1/object/public/avatars/<filename> -> avatars/<filename>
                after_public = raw_str.split('/storage/v1/object/public/', 1)[1].split('?', 1)[0]
                new_avatar = after_public if after_public.startswith('avatars/') else f"avatars/{after_public}"
            elif raw_str.startswith('avatars/'):
                new_avatar = raw_str
            else:
                new_avatar = raw_str

        # If user had an existing Supabase avatar and is updating or removing it, delete the old file
        old_avatar = user.avatar_url
        if old_avatar and old_avatar != new_avatar and FileService.is_supabase_configured():
            if 'avatars/' in str(old_avatar) or not str(old_avatar).startswith('/'):
                bucket = current_app.config.get('SUPABASE_STORAGE_AVATARS_BUCKET', 'avatars')
                old_clean = os.path.basename(str(old_avatar))
                try:
                    FileService.delete_from_supabase(bucket, old_clean)
                except Exception:
                    pass

        user.avatar_url = new_avatar
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


