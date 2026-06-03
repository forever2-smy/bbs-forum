from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from ..models import db, User
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    if not username or not email or not password:
        return jsonify({'ok': False, 'msg': '所有字段均为必填'}), 400
    if len(password) < 6:
        return jsonify({'ok': False, 'msg': '密码至少6位'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'ok': False, 'msg': '用户名已存在'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'ok': False, 'msg': '邮箱已被注册'}), 400

    user = User(username=username, email=email,
                password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    return jsonify({'ok': True, 'msg': '注册成功'})


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'ok': False, 'msg': '用户名或密码错误'}), 401
    if user.status == 'banned':
        return jsonify({'ok': False, 'msg': '账号已被封禁'}), 403

    user.last_login = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.session.commit()
    login_user(user)
    return jsonify({'ok': True, 'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'ok': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    if current_user.is_authenticated:
        return jsonify({'ok': True, 'user': current_user.to_dict()})
    return jsonify({'ok': False, 'user': None})
