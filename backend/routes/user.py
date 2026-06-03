from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, User, Post, Reply, Favorite, Message, Follow, Friend, Dynamic
from sqlalchemy import or_, and_

user_bp = Blueprint('user', __name__, url_prefix='/api/users')


@user_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    posts = user.posts.filter_by(status='normal').order_by(Post.created_at.desc()).limit(10).all()
    reply_count = user.replies.count()
    follower_count = user.follower_count
    following_count = user.following_count
    friend_count = user.friend_count
    dynamic_count = user.dynamic_count
    # 查询当前登录用户是否关注/好友
    is_following = False
    is_friend = False
    friend_pending = False
    if current_user.is_authenticated and current_user.id != user_id:
        is_following = Follow.query.filter_by(follower_id=current_user.id, following_id=user_id).first() is not None
        fr = Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
                and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
            )
        ).first()
        if fr and fr.status == 'accepted':
            is_friend = True
        elif fr and fr.status == 'pending':
            friend_pending = True
    return jsonify({
        'ok': True,
        'user': user.to_dict(),
        'posts': [p.to_dict() for p in posts],
        'reply_count': reply_count,
        'follower_count': follower_count,
        'following_count': following_count,
        'friend_count': friend_count,
        'dynamic_count': dynamic_count,
        'is_following': is_following,
        'is_friend': is_friend,
        'friend_pending': friend_pending,
    })


@user_bp.route('/<int:user_id>/dynamics', methods=['GET'])
def get_user_dynamics(user_id):
    User.query.get_or_404(user_id)
    page = request.args.get('page', 1, type=int)
    per_page = 15
    pagination = Dynamic.query.filter_by(author_id=user_id).order_by(
        Dynamic.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    dynamics = []
    for d in pagination.items:
        item = d.to_dict()
        if current_user.is_authenticated:
            from ..models import DynamicLike
            item['is_liked'] = DynamicLike.query.filter_by(
                user_id=current_user.id, dynamic_id=d.id).first() is not None
        else:
            item['is_liked'] = False
        dynamics.append(item)
    return jsonify({
        'ok': True,
        'dynamics': dynamics,
        'total': pagination.total,
    })


@user_bp.route('/<int:user_id>/favorites', methods=['GET'])
def get_user_favorites(user_id):
    user = User.query.get_or_404(user_id)
    page = request.args.get('page', 1, type=int)
    per_page = 15
    fav_query = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc())
    pagination = fav_query.paginate(page=page, per_page=per_page, error_out=False)
    favs = []
    for fav in pagination.items:
        post = Post.query.get(fav.post_id)
        if post and post.status == 'normal':
            favs.append({
                'id': fav.id,
                'post_id': post.id,
                'post_title': post.title,
                'post_author': post.author.username if post.author else '',
                'post_board': post.board.name if post.board else '',
                'post_board_id': post.board_id,
                'post_created_at': post.created_at.isoformat() if post.created_at else None,
                'fav_at': fav.created_at.isoformat() if fav.created_at else None,
            })
    return jsonify({
        'ok': True,
        'favorites': favs,
        'total': pagination.total,
    })


@user_bp.route('/<int:user_id>/replies', methods=['GET'])
def get_user_replies(user_id):
    user = User.query.get_or_404(user_id)
    page = request.args.get('page', 1, type=int)
    per_page = 15
    pagination = user.replies.order_by(Reply.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    replies_data = []
    for r in pagination.items:
        post = r.post
        if post and post.status == 'normal':
            replies_data.append({
                'id': r.id,
                'content': r.content[:200],
                'post_id': post.id,
                'post_title': post.title,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            })
    return jsonify({
        'ok': True,
        'replies': replies_data,
        'total': pagination.total,
    })


@user_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()
    # 基本资料
    if 'bio' in data:
        current_user.bio = (data.get('bio') or '').strip()
    if 'signature' in data:
        current_user.signature = (data.get('signature') or '').strip()[:200]
    if 'gender' in data:
        current_user.gender = (data.get('gender') or '').strip()
    if 'birthday' in data:
        current_user.birthday = (data.get('birthday') or '').strip()
    if 'occupation' in data:
        current_user.occupation = (data.get('occupation') or '').strip()
    if 'work_city' in data:
        current_user.work_city = (data.get('work_city') or '').strip()
    if 'avatar' in data:
        current_user.avatar = (data.get('avatar') or '').strip()
    if data.get('email'):
        current_user.email = data.get('email').strip()
    db.session.commit()
    return jsonify({'ok': True, 'user': current_user.to_dict()})


@user_bp.route('/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """通过URL设置头像"""
    data = request.get_json()
    avatar_url = (data.get('avatar_url') or '').strip()
    if avatar_url:
        current_user.avatar = avatar_url
        db.session.commit()
        return jsonify({'ok': True, 'user': current_user.to_dict()})
    return jsonify({'ok': False, 'msg': '头像URL不能为空'}), 400


@user_bp.route('/messages', methods=['GET'])
@login_required
def messages():
    recv = Message.query.filter_by(receiver_id=current_user.id).order_by(
        Message.created_at.desc()).limit(30).all()
    sent = Message.query.filter_by(sender_id=current_user.id).order_by(
        Message.created_at.desc()).limit(30).all()
    return jsonify({
        'ok': True,
        'recv': [m.to_dict() for m in recv],
        'sent': [m.to_dict() for m in sent],
    })


@user_bp.route('/messages/send', methods=['POST'])
@login_required
def send_message():
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    if receiver_id is not None:
        receiver_id = int(receiver_id)
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'ok': False, 'msg': '内容不能为空'}), 400
    receiver = User.query.get(receiver_id)
    if not receiver:
        return jsonify({'ok': False, 'msg': '用户不存在'}), 404
    msg = Message(sender_id=current_user.id, receiver_id=receiver_id, content=content)
    db.session.add(msg)
    db.session.commit()
    return jsonify({'ok': True})


@user_bp.route('/messages/<int:msg_id>/read', methods=['POST'])
@login_required
def read_message(msg_id):
    msg = Message.query.get_or_404(msg_id)
    if msg.receiver_id != current_user.id:
        return jsonify({'ok': False, 'msg': '无权操作'}), 403
    msg.is_read = True
    db.session.commit()
    return jsonify({'ok': True})


@user_bp.route('/unread_count', methods=['GET'])
@login_required
def unread_count():
    count = Message.query.filter_by(receiver_id=current_user.id, is_read=False).count()
    return jsonify({'ok': True, 'count': count})


@user_bp.route('/active', methods=['GET'])
def active_users():
    """公开接口：获取活跃用户（按积分排序）"""
    limit = request.args.get('limit', 8, type=int)
    users = User.query.filter_by(status='active').order_by(User.points.desc()).limit(limit).all()
    return jsonify({
        'ok': True,
        'users': [{
            'id': u.id, 'username': u.username, 'avatar': u.avatar,
            'signature': u.signature, 'points': u.points,
            'post_count': u.posts.filter_by(status='normal').count(),
        } for u in users],
    })
