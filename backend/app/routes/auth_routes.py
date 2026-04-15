from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User
from app import db
import logging

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

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
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    return jsonify(user.to_dict()), 200
