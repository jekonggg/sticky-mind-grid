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

from app.services.oauth_service import OAuthService, SUPPORTED_OAUTH_PROVIDERS

def handle_oauth_flow(provider: str, data: dict):
    try:
        provider = provider.lower().strip()
        if provider not in SUPPORTED_OAUTH_PROVIDERS:
            return jsonify({'message': f'Unsupported provider: {provider}'}), 400

        code = data.get('code')
        redirect_uri = data.get('redirectUri') or data.get('redirect_uri')

        # Real OAuth Authorization Code Exchange
        if code:
            profile, error = OAuthService.exchange_code_for_profile(provider, code, redirect_uri)
            if error:
                return jsonify({'message': error}), 400
        else:
            # Fallback / Sandbox profile (used in testing or when provider credentials are not yet configured)
            profile = data.get('profile') or {}
            if not profile and not data.get('email'):
                return jsonify({'message': 'Missing email or authorization code in OAuth request'}), 400

        email = profile.get('email') or data.get('email')
        if not email:
            return jsonify({'message': 'Missing email in OAuth request'}), 400

        email = email.strip().lower()
        full_name = profile.get('fullName') or profile.get('name') or data.get('fullName') or email.split('@')[0]
        avatar_url = profile.get('avatarUrl') or profile.get('picture') or data.get('avatarUrl')
        provider_id = profile.get('providerId') or profile.get('id') or profile.get('sub') or data.get('providerId')

        if 'email_verified' in profile:
            provider_email_verified = bool(profile['email_verified'])
        elif 'emailVerified' in profile:
            provider_email_verified = bool(profile['emailVerified'])
        else:
            provider_email_verified = False if code else True
        user = User.query.filter_by(email=email).first()
        status_code = 200

        if not user:
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                auth_provider=provider,
                auth_provider_id=str(provider_id) if provider_id else None,
                email_verified=provider_email_verified,
                legacy_unverified=False,
                legacy_deadline=None
            )
            user.set_password(str(uuid.uuid4()))
            token = None
            if not provider_email_verified:
                token = secrets.token_urlsafe(32)
                user.verification_token = token
                user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
            db.session.add(user)
            db.session.commit()
            if provider_email_verified:
                attach_pending_invitations(user)
            else:
                try:
                    from app.services.email_service import EmailService
                    EmailService.send_verification_email(to_email=user.email, verification_token=token)
                except Exception as e:
                    logger.error(f"Failed to send verification for unverified OAuth account: {e}")
            status_code = 201
        else:
            updated = False
            if provider_email_verified and not getattr(user, 'email_verified', False):
                user.email_verified = True
                user.legacy_unverified = False
                user.legacy_deadline = None
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

        # Requirement 3: Only issue JWT if email is verified or legacy unverified
        if not getattr(user, 'email_verified', False) and not getattr(user, 'legacy_unverified', False):
            can_sign_up_again = not user_has_any_data(user.id)
            return jsonify({
                'message': 'Your OAuth email was not verified by the provider. Please verify your email before signing in.',
                'emailVerified': False,
                'email': user.email,
                'canSignUpAgain': can_sign_up_again
            }), 403

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'user': user.to_dict(),
            'token': access_token,
            'provider': provider
        }), status_code
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'OAuth authentication failed', 'error': str(e)}), 500

@bp.route('/oauth/providers', methods=['GET'])
def get_oauth_providers():
    return jsonify(OAuthService.get_providers_status()), 200

@bp.route('/oauth', methods=['POST'])
@limiter.limit("20 per minute")
def oauth_generic():
    data = request.get_json() or {}
    provider = data.get('provider', '').lower()
    if not provider:
        return jsonify({'message': 'Missing provider field'}), 400
    return handle_oauth_flow(provider, data)

@bp.route('/oauth/callback', methods=['POST'])
@limiter.limit("20 per minute")
def oauth_callback():
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

def user_has_any_data(user_id: str) -> bool:
    """Returns True if the user has created or joined any boards, or created tasks."""
    try:
        from app.models.board import Board
        from app.models.board_member import BoardMember
        from app.models.task import Task
        if Board.query.filter_by(owner_id=user_id).first():
            return True
        if BoardMember.query.filter_by(user_id=user_id).first():
            return True
        if Task.query.filter_by(created_by=user_id).first():
            return True
    except Exception:
        pass
    return False

def mask_email(email: str) -> str:
    """Masks an email for security display (e.g., j***@example.com)."""
    if not email or '@' not in email:
        return '***'
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 1:
        masked_local = local_part + '***'
    elif len(local_part) == 2:
        masked_local = local_part[0] + '***'
    else:
        masked_local = local_part[0] + '***' + local_part[-1]
    return f"{masked_local}@{domain}"

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
        
    existing_user = User.query.filter_by(email=clean_email).first()
    if existing_user:
        if existing_user.email_verified:
            return jsonify({'message': 'An account with this email already exists. Please sign in.'}), 400
        
        # Requirement 6: Re-registering with an unverified email resends verification.
        # Never overwrite password or user data.
        token = secrets.token_urlsafe(32)
        existing_user.verification_token = token
        existing_user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.session.commit()
        try:
            from app.services.email_service import EmailService
            EmailService.send_verification_email(to_email=existing_user.email, verification_token=token)
        except Exception as e:
            logger.error(f"Failed to resend verification email on duplicate register: {e}")
        return jsonify({
            'message': 'An unverified account with this email already exists. A new verification link has been sent to your inbox.',
            'emailResent': True,
            'user': existing_user.to_dict()
        }), 200

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    user = User(
        email=clean_email,
        full_name=data.get('fullName', ''),
        email_verified=False,
        legacy_unverified=False,
        legacy_deadline=None
    )
    user.verification_token = token
    user.verification_token_expires_at = expires_at
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()

    # Dispatch verification email via EmailService
    try:
        from app.services.email_service import EmailService
        EmailService.send_verification_email(to_email=user.email, verification_token=token)
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
    is_link_flow = False
    old_email = None

    if not user:
        # Check pending email token from link-email flow
        user = User.query.filter_by(pending_email_token=token).first()
        if user:
            is_link_flow = True
            if user.pending_email_token_expires_at and now > user.pending_email_token_expires_at:
                return jsonify({'message': 'Verification token has expired'}), 400
            old_email = user.email
            user.email = user.pending_email
            user.pending_email = None
            user.pending_email_token = None
            user.pending_email_token_expires_at = None
        else:
            return jsonify({'message': 'Invalid verification token'}), 400
    else:
        if user.verification_token_expires_at and now > user.verification_token_expires_at:
            return jsonify({'message': 'Verification token has expired'}), 400
        user.verification_token = None
        user.verification_token_expires_at = None

    user.email_verified = True
    user.legacy_unverified = False
    user.legacy_deadline = None
    db.session.commit()

    # Link pending board invitations now that the email is verified
    attach_pending_invitations(user)

    # Dispatch confirmation notice to the verified email and notice to old email if link flow
    try:
        from app.services.email_service import EmailService
        EmailService.send_verification_confirmation(to_email=user.email)
        if is_link_flow and old_email:
            masked = mask_email(user.email)
            EmailService.send_email_change_alert(to_email=old_email, masked_new_email=masked)
    except Exception as e:
        logger.error(f"Failed to dispatch post-verification email notices: {e}")

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
        EmailService.send_verification_email(to_email=user.email, verification_token=token)
    except Exception as e:
        print(f"Warning: Failed to resend verification email: {e}")

    return jsonify({'message': 'Verification email resent successfully'}), 200

@bp.route('/verification-status', methods=['GET'])
@limiter.limit("60 per minute")
def get_verification_status():
    email = request.args.get('email', '').strip().lower()
    if not email:
        return jsonify({'message': 'Missing email parameter'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'verified': False, 'exists': False, 'message': 'User not found'}), 404

    return jsonify({
        'verified': bool(getattr(user, 'email_verified', False)),
        'exists': True,
        'email': user.email
    }), 200

@bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            missing = []
            if not data or not data.get('email'):
                missing.append('email')
            if not data or not data.get('password'):
                missing.append('password')
            field = missing[0] if len(missing) == 1 else 'general'
            return jsonify({
                'message': 'Missing email or password' if len(missing) > 1 else f"{missing[0].capitalize()} is required",
                'field': field,
                'code': 'MISSING_FIELDS'
            }), 400
            
        clean_email = (data.get('email') or '').strip().lower()
        if '@' not in clean_email or '.' not in clean_email.split('@')[-1]:
            return jsonify({
                'message': 'Please enter a valid email address.',
                'field': 'email',
                'code': 'INVALID_EMAIL'
            }), 400

        user = User.query.filter_by(email=clean_email).first()
        
        if not user:
            return jsonify({
                'message': 'No account found with this email address.',
                'field': 'email',
                'code': 'USER_NOT_FOUND'
            }), 401
            
        if not user.check_password(data['password']):
            if user.auth_provider and user.auth_provider != 'local':
                provider_title = user.auth_provider.title()
                return jsonify({
                    'message': f'This account was registered using {provider_title}. Please sign in with {provider_title}.',
                    'field': 'oauth',
                    'provider': user.auth_provider,
                    'code': 'OAUTH_ACCOUNT'
                }), 401
            return jsonify({
                'message': 'Incorrect password. Please try again.',
                'field': 'password',
                'code': 'INVALID_PASSWORD'
            }), 401

        # Check verification status & legacy unverified grandfathering (Req 1, 2, 9)
        if not getattr(user, 'email_verified', False):
            if getattr(user, 'legacy_unverified', False):
                now = datetime.utcnow()
                if user.legacy_deadline and now > user.legacy_deadline:
                    return jsonify({
                        'message': 'Your verification deadline has passed. Please link a verified email to unlock your account.',
                        'legacyExpired': True,
                        'email': user.email
                    }), 403
                # Legacy unverified users before deadline can still log in
            else:
                # New unverified accounts: strictly blocked from logging in (Req 2, 4)
                can_sign_up_again = not user_has_any_data(user.id)
                return jsonify({
                    'message': 'Please verify your email address before signing in.',
                    'emailVerified': False,
                    'email': user.email,
                    'canSignUpAgain': can_sign_up_again
                }), 403
            
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

    # Protect session restore for unverified accounts
    if not getattr(user, 'email_verified', False):
        if getattr(user, 'legacy_unverified', False):
            now = datetime.utcnow()
            if user.legacy_deadline and now > user.legacy_deadline:
                return jsonify({
                    'message': 'Your verification deadline has passed. Please link a verified email to unlock your account.',
                    'legacyExpired': True,
                    'email': user.email
                }), 403
        else:
            return jsonify({
                'message': 'Please verify your email address before accessing this service.',
                'emailVerified': False,
                'email': user.email
            }), 403
        
    return jsonify(user.to_dict()), 200

@bp.route('/link-email/request', methods=['POST'])
@limiter.limit("5 per minute")
def request_link_email():
    """
    Initiates linking a new contact email to an existing account.
    Can be called by an authenticated legacy user (via JWT) or a locked-out user
    providing originalEmail + password for account unlock.
    """
    data = request.get_json() or {}
    new_email = data.get('newEmail')
    if not new_email:
        return jsonify({'message': 'Missing new email address'}), 400

    clean_new_email, err = normalize_and_validate_email(new_email)
    if err:
        return jsonify({'message': err}), 400

    # Determine user identity: from JWT or credentials
    user = None
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        current_id = get_jwt_identity()
        if current_id:
            user = db.session.get(User, current_id)
    except Exception:
        pass

    if not user:
        orig_email = (data.get('originalEmail') or '').strip().lower()
        password = data.get('password')
        if not orig_email or not password:
            return jsonify({'message': 'Authentication or account credentials required'}), 401
        candidate = User.query.filter_by(email=orig_email).first()
        if candidate and candidate.check_password(password):
            user = candidate

    if not user:
        return jsonify({'message': 'Invalid credentials'}), 401

    # Privacy guarantee: Never reveal if new_email is already registered
    existing = User.query.filter_by(email=clean_new_email).first()
    if existing and existing.id != user.id:
        logger.info(f"Link email requested for already-registered address {clean_new_email}; silently suppressed disclosure.")
        return jsonify({'message': 'If this email address is eligible, a verification link has been sent.'}), 200

    token = secrets.token_urlsafe(32)
    user.pending_email = clean_new_email
    user.pending_email_token = token
    user.pending_email_token_expires_at = datetime.utcnow() + timedelta(hours=24)
    db.session.commit()

    try:
        from app.services.email_service import EmailService
        EmailService.send_link_email_verification(to_email=clean_new_email, verification_token=token)
    except Exception as e:
        logger.error(f"Failed to dispatch link email verification to {clean_new_email}: {e}")

    return jsonify({'message': 'If this email address is eligible, a verification link has been sent.'}), 200

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


