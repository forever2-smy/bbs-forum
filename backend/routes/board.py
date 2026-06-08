from flask import Blueprint, request, jsonify
from ..models import db, Board, User, Post

board_bp = Blueprint('board', __name__, url_prefix='/api/boards')


@board_bp.route('', methods=['GET'])
def list_boards():
    boards = Board.query.order_by(Board.sort_order).all()
    return jsonify({'ok': True, 'boards': [b.to_dict() for b in boards]})


@board_bp.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        'ok': True,
        'post_count': Post.query.filter_by(status='normal').count(),
        'board_count': Board.query.count(),
        'user_count': User.query.count(),
    })


@board_bp.route('/<int:board_id>', methods=['GET'])
def get_board(board_id):
    board = Board.query.get_or_404(board_id)
    return jsonify({'ok': True, 'board': board.to_dict()})


@board_bp.route('', methods=['POST'])
def create_board():
    from flask_login import current_user
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'ok': False, 'msg': '名称不能为空'}), 400
    board = Board(name=name, description=data.get('description', ''),
                  icon=data.get('icon', '💬'), sort_order=data.get('sort_order', 0))
    db.session.add(board)
    db.session.commit()
    return jsonify({'ok': True, 'board_id': board.id})


@board_bp.route('/<int:board_id>', methods=['PUT'])
def update_board(board_id):
    from flask_login import current_user
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    board.name = (data.get('name') or board.name).strip()
    board.description = data.get('description', board.description)
    board.icon = data.get('icon', board.icon)
    board.sort_order = data.get('sort_order', board.sort_order)
    db.session.commit()
    return jsonify({'ok': True})


@board_bp.route('/<int:board_id>', methods=['DELETE'])
def delete_board(board_id):
    from flask_login import current_user
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    board = Board.query.get_or_404(board_id)
    if board.post_count > 0:
        return jsonify({'ok': False, 'msg': '板块下有帖子，无法删除'}), 400
    db.session.delete(board)
    db.session.commit()
    return jsonify({'ok': True})
