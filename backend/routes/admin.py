from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, User, Board, Post

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def admin_required():
    if not current_user.is_authenticated or not current_user.is_admin:
        return False
    return True


@admin_bp.route('/dashboard', methods=['GET'])
@login_required
def dashboard():
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    return jsonify({
        'ok': True,
        'user_count': User.query.count(),
        'post_count': Post.query.filter_by(status='normal').count(),
        'board_count': Board.query.count(),
    })


@admin_bp.route('/users', methods=['GET'])
@login_required
def list_users():
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'ok': True, 'users': [u.to_dict() for u in users]})


@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@login_required
def ban_user(user_id):
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    user = User.query.get_or_404(user_id)
    if user.is_admin:
        return jsonify({'ok': False, 'msg': '不能封禁管理员'}), 400
    user.status = 'banned' if user.status == 'active' else 'active'
    db.session.commit()
    return jsonify({'ok': True, 'status': user.status})


@admin_bp.route('/users/<int:user_id>/role', methods=['POST'])
@login_required
def change_role(user_id):
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    new_role = data.get('role', 'user')
    if new_role not in ('user', 'moderator', 'admin'):
        return jsonify({'ok': False, 'msg': '无效角色'}), 400
    user.role = new_role
    db.session.commit()
    return jsonify({'ok': True, 'role': user.role})


@admin_bp.route('/boards', methods=['GET'])
@login_required
def list_boards():
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    boards = Board.query.order_by(Board.sort_order).all()
    return jsonify({'ok': True, 'boards': [b.to_dict() for b in boards]})


@admin_bp.route('/boards', methods=['POST'])
@login_required
def create_board():
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'ok': False, 'msg': '名称不能为空'}), 400
    board = Board(name=name, description=data.get('description', ''),
                  icon=data.get('icon', '💬'), sort_order=data.get('sort_order', 0))
    db.session.add(board)
    db.session.commit()
    return jsonify({'ok': True, 'board': board.to_dict()})


@admin_bp.route('/boards/<int:board_id>', methods=['PUT'])
@login_required
def update_board(board_id):
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    board.name = (data.get('name') or board.name).strip()
    board.description = data.get('description', board.description)
    board.icon = data.get('icon', board.icon)
    board.sort_order = data.get('sort_order', board.sort_order)
    db.session.commit()
    return jsonify({'ok': True})


@admin_bp.route('/boards/<int:board_id>', methods=['DELETE'])
@login_required
def delete_board(board_id):
    if not admin_required():
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    board = Board.query.get_or_404(board_id)
    if board.post_count > 0:
        return jsonify({'ok': False, 'msg': '板块下有帖子'}), 400
    db.session.delete(board)
    db.session.commit()
    return jsonify({'ok': True})
