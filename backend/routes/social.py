from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, Follow, Friend, Repost, Post, User, Notification
from sqlalchemy import or_, and_

social_bp = Blueprint('social', __name__, url_prefix='/api/social')


# ===== 关注 =====

@social_bp.route('/follow/<int:user_id>', methods=['POST'])
@login_required
def toggle_follow(user_id):
    if user_id == current_user.id:
        return jsonify({'ok': False, 'msg': '不能关注自己'}), 400
    target = User.query.get_or_404(user_id)
    existing = Follow.query.filter_by(follower_id=current_user.id, following_id=user_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'ok': True, 'following': False,
                        'follower_count': target.follower_count,
                        'following_count': current_user.following_count})
    f = Follow(follower_id=current_user.id, following_id=user_id)
    db.session.add(f)
    db.session.commit()
    return jsonify({'ok': True, 'following': True,
                    'follower_count': target.follower_count,
                    'following_count': current_user.following_count})


@social_bp.route('/is-following/<int:user_id>', methods=['GET'])
@login_required
def is_following(user_id):
    existing = Follow.query.filter_by(follower_id=current_user.id, following_id=user_id).first()
    return jsonify({'ok': True, 'following': existing is not None})


@social_bp.route('/followers/<int:user_id>', methods=['GET'])
def get_followers(user_id):
    user = User.query.get_or_404(user_id)
    follows = Follow.query.filter_by(following_id=user_id).order_by(Follow.created_at.desc()).all()
    result = []
    for f in follows:
        u = f.follower
        result.append({
            'id': u.id, 'username': u.username,
            'avatar': u.avatar, 'signature': u.signature,
        })
    return jsonify({'ok': True, 'followers': result})


@social_bp.route('/following/<int:user_id>', methods=['GET'])
def get_following(user_id):
    user = User.query.get_or_404(user_id)
    follows = Follow.query.filter_by(follower_id=user_id).order_by(Follow.created_at.desc()).all()
    result = []
    for f in follows:
        u = f.following
        result.append({
            'id': u.id, 'username': u.username,
            'avatar': u.avatar, 'signature': u.signature,
        })
    return jsonify({'ok': True, 'following': result})


# ===== 好友 =====

@social_bp.route('/friend-request/<int:user_id>', methods=['POST'])
@login_required
def send_friend_request(user_id):
    if user_id == current_user.id:
        return jsonify({'ok': False, 'msg': '不能加自己为好友'}), 400
    User.query.get_or_404(user_id)
    existing = Friend.query.filter(
        or_(
            and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
            and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
        )
    ).first()
    if existing:
        if existing.status == 'accepted':
            return jsonify({'ok': False, 'msg': '已经是好友了'}), 400
        if existing.status == 'pending':
            return jsonify({'ok': False, 'msg': '已发送申请，等待对方同意'}), 400
    f = Friend(user_id=current_user.id, friend_id=user_id, status='pending')
    db.session.add(f)
    db.session.flush()  # 先 flush 获取 f.id
    # 通知被添加方
    notif = Notification(
        user_id=user_id,
        type='friend_request',
        from_user_id=current_user.id,
        ref_id=f.id,
        content=f'{current_user.username} 请求添加你为好友'
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify({'ok': True, 'msg': '好友申请已发送'})


@social_bp.route('/friend-accept/<int:request_id>', methods=['POST'])
@login_required
def accept_friend_request(request_id):
    if request_id == 0:
        return jsonify({'ok': False, 'msg': '无效的申请记录，请重新发送好友申请'}), 400
    freq = Friend.query.get_or_404(request_id)
    if freq.friend_id != current_user.id:
        return jsonify({'ok': False, 'msg': '无权操作'}), 403
    freq.status = 'accepted'
    # 通知申请方
    notif = Notification(
        user_id=freq.user_id,
        type='friend_accepted',
        from_user_id=current_user.id,
        content=f'{current_user.username} 已接受你的好友请求'
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify({'ok': True})


@social_bp.route('/friend-reject/<int:request_id>', methods=['POST'])
@login_required
def reject_friend_request(request_id):
    if request_id == 0:
        return jsonify({'ok': False, 'msg': '无效的申请记录'}), 400
    freq = Friend.query.get_or_404(request_id)
    if freq.friend_id != current_user.id:
        return jsonify({'ok': False, 'msg': '无权操作'}), 403
    db.session.delete(freq)
    db.session.commit()
    return jsonify({'ok': True})


@social_bp.route('/friends/<int:user_id>', methods=['GET'])
def get_friends(user_id):
    User.query.get_or_404(user_id)
    friends_q = Friend.query.filter(
        or_(Friend.user_id == user_id, Friend.friend_id == user_id),
        Friend.status == 'accepted'
    ).all()
    result = []
    for f in friends_q:
        friend_u = f.friend_user if f.user_id == user_id else f.user
        result.append({
            'id': friend_u.id, 'username': friend_u.username,
            'avatar': friend_u.avatar, 'signature': friend_u.signature,
        })
    return jsonify({'ok': True, 'friends': result})


@social_bp.route('/friend-requests', methods=['GET'])
@login_required
def get_friend_requests():
    requests_q = Friend.query.filter_by(friend_id=current_user.id, status='pending').order_by(
        Friend.created_at.desc()).all()
    result = []
    for f in requests_q:
        result.append({
            'id': f.id,
            'user_id': f.user_id,
            'username': f.user.username if f.user else '',
            'avatar': f.user.avatar if f.user else '',
            'created_at': f.created_at.isoformat() if f.created_at else None,
        })
    return jsonify({'ok': True, 'requests': result})


@social_bp.route('/is-friend/<int:user_id>', methods=['GET'])
@login_required
def is_friend(user_id):
    existing = Friend.query.filter(
        or_(
            and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
            and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
        ),
        Friend.status == 'accepted'
    ).first()
    pending = Friend.query.filter(
        or_(
            and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
            and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
        ),
        Friend.status == 'pending'
    ).first()
    return jsonify({
        'ok': True,
        'is_friend': existing is not None,
        'pending': pending is not None,
    })


# ===== 转发 =====

@social_bp.route('/repost', methods=['POST'])
@login_required
def create_repost():
    data = request.get_json()
    post_id = data.get('post_id')
    comment = (data.get('comment') or '').strip()[:500]
    post = Post.query.get_or_404(post_id)
    r = Repost(user_id=current_user.id, post_id=post_id, comment=comment)
    db.session.add(r)
    # 转发给帖主加 1 积分（不给自己转发）
    if post.author_id != current_user.id and post.author:
        post.author.points = (post.author.points or 0) + 1
    db.session.commit()
    return jsonify({'ok': True, 'repost_id': r.id})


@social_bp.route('/reposts/<int:post_id>', methods=['GET'])
def get_reposts(post_id):
    reposts = Repost.query.filter_by(post_id=post_id).order_by(Repost.created_at.desc()).limit(30).all()
    return jsonify({'ok': True, 'reposts': [r.to_dict() for r in reposts]})


# ===== 用户卡片信息 =====

@social_bp.route('/user-card/<int:user_id>', methods=['GET'])
def user_card(user_id):
    u = User.query.get_or_404(user_id)
    result = {
        'id': u.id, 'username': u.username,
        'avatar': u.avatar, 'signature': u.signature,
        'occupation': u.occupation,
        'post_count': u.posts.filter_by(status='normal').count(),
        'follower_count': u.follower_count,
        'following_count': u.following_count,
    }
    if current_user.is_authenticated:
        result['is_following'] = Follow.query.filter_by(
            follower_id=current_user.id, following_id=user_id).first() is not None
        friend_rec = Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
                and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
            ),
            Friend.status == 'accepted'
        ).first()
        result['is_friend'] = friend_rec is not None
        pending = Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.id, Friend.friend_id == user_id),
                and_(Friend.user_id == user_id, Friend.friend_id == current_user.id)
            ),
            Friend.status == 'pending'
        ).first()
        result['friend_pending'] = pending is not None
    else:
        result['is_following'] = False
        result['is_friend'] = False
        result['friend_pending'] = False
    return jsonify({'ok': True, 'user': result})
