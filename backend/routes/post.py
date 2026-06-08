from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, Board, Post, Reply, Favorite, User
from datetime import datetime

post_bp = Blueprint('post', __name__, url_prefix='/api/posts')


@post_bp.route('', methods=['GET'])
def list_posts():
    board_id = request.args.get('board_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    q = request.args.get('q', '').strip()

    query = Post.query.filter_by(status='normal')
    if board_id:
        query = query.filter_by(board_id=board_id)
    if q:
        query = query.filter(Post.title.contains(q) | Post.content.contains(q))

    # 置顶排前面
    query = query.order_by(Post.is_top.desc(), Post.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'ok': True,
        'posts': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
    })


@post_bp.route('/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.status == 'deleted':
        return jsonify({'ok': False, 'msg': '帖子已删除'}), 404
    post.view_count = (post.view_count or 0) + 1
    db.session.commit()

    # 回复分页（只分页顶层回复，楼中楼跟着父回复）
    page = request.args.get('reply_page', 1, type=int)
    per_page = request.args.get('reply_per_page', 5, type=int)
    top_replies_query = post.replies_list.filter_by(parent_id=None).order_by(Reply.created_at.asc())
    replies_pagination = top_replies_query.paginate(page=page, per_page=per_page, error_out=False)

    # 组装回复列表：顶层回复 + 其子回复
    all_replies = []
    for r in replies_pagination.items:
        all_replies.append(r)
        children = Reply.query.filter_by(parent_id=r.id).order_by(Reply.created_at.asc()).all()
        all_replies.extend(children)

    is_fav = False
    if current_user.is_authenticated:
        is_fav = Favorite.query.filter_by(user_id=current_user.id, post_id=post_id).first() is not None

    return jsonify({
        'ok': True,
        'post': post.to_dict(include_content=True),
        'replies': [r.to_dict() for r in all_replies],
        'replies_total': replies_pagination.total,
        'replies_pages': replies_pagination.pages,
        'replies_page': page,
        'is_fav': is_fav,
    })


@post_bp.route('', methods=['POST'])
@login_required
def create_post():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    board_id = int(data.get('board_id')) if data.get('board_id') is not None else None
    reward = int(data.get('reward_points', 0)) if data.get('reward_points') is not None else 0

    if not title or not content:
        return jsonify({'ok': False, 'msg': '标题和内容不能为空'}), 400
    if current_user.status == 'banned':
        return jsonify({'ok': False, 'msg': '账号已被封禁'}), 403
    if reward > (current_user.points or 0):
        return jsonify({'ok': False, 'msg': '积分余额不足'}), 400

    post = Post(board_id=board_id, author_id=current_user.id,
                title=title, content=content, reward_points=reward)
    if reward > 0:
        current_user.points -= reward
    db.session.add(post)
    db.session.commit()
    return jsonify({'ok': True, 'post_id': post.id})


@post_bp.route('/<int:post_id>', methods=['PUT'])
@login_required
def update_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author_id != current_user.id and not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '无权编辑'}), 403
    data = request.get_json()
    post.title = (data.get('title') or post.title).strip()
    post.content = (data.get('content') or post.content).strip()
    post.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'ok': True})


@post_bp.route('/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author_id != current_user.id and not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '无权删除'}), 403
    post.status = 'deleted'
    db.session.commit()
    return jsonify({'ok': True})


@post_bp.route('/<int:post_id>/top', methods=['POST'])
@login_required
def toggle_top(post_id):
    post = Post.query.get_or_404(post_id)
    if not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    post.is_top = not post.is_top
    db.session.commit()
    return jsonify({'ok': True, 'is_top': post.is_top})


@post_bp.route('/<int:post_id>/essence', methods=['POST'])
@login_required
def toggle_essence(post_id):
    post = Post.query.get_or_404(post_id)
    if not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '权限不足'}), 403
    post.is_essence = not post.is_essence
    db.session.commit()
    return jsonify({'ok': True, 'is_essence': post.is_essence})


@post_bp.route('/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    post = Post.query.get_or_404(post_id)
    post.like_count = (post.like_count or 0) + 1
    # 给帖主加 2 积分（不给自己点赞）
    if post.author_id != current_user.id and post.author:
        post.author.points = (post.author.points or 0) + 2
    db.session.commit()
    return jsonify({'ok': True, 'like_count': post.like_count})


@post_bp.route('/<int:post_id>/favorite', methods=['POST'])
@login_required
def toggle_favorite(post_id):
    post = Post.query.get_or_404(post_id)
    fav = Favorite.query.filter_by(user_id=current_user.id, post_id=post_id).first()
    if fav:
        db.session.delete(fav)
        # 取消收藏扣 1 分（不低于 0）
        if post.author_id != current_user.id and post.author:
            post.author.points = max(0, (post.author.points or 0) - 1)
        db.session.commit()
        return jsonify({'ok': True, 'favorited': False})
    fav = Favorite(user_id=current_user.id, post_id=post_id)
    db.session.add(fav)
    # 收藏给帖主加 1 积分（不给自己收藏）
    if post.author_id != current_user.id and post.author:
        post.author.points = (post.author.points or 0) + 1
    db.session.commit()
    return jsonify({'ok': True, 'favorited': True})


# --- 回复 ---

@post_bp.route('/<int:post_id>/replies', methods=['POST'])
@login_required
def create_reply(post_id):
    post = Post.query.get_or_404(post_id)
    if current_user.status == 'banned':
        return jsonify({'ok': False, 'msg': '账号已被封禁'}), 403
    data = request.get_json()
    content = (data.get('content') or '').strip()
    parent_id = data.get('parent_id') or None
    if not content:
        return jsonify({'ok': False, 'msg': '回复内容不能为空'}), 400

    # 楼中楼：找出被回复的用户
    reply_to_id = None
    if parent_id:
        parent = Reply.query.get(parent_id)
        if parent:
            reply_to_id = parent.author_id

    reply = Reply(post_id=post_id, author_id=current_user.id, content=content,
                  parent_id=parent_id, reply_to_id=reply_to_id)
    post.reply_count = (post.reply_count or 0) + 1
    # 积分规则
    current_user.points = (current_user.points or 0) + 1
    if parent_id and reply_to_id and reply_to_id != current_user.id:
        # 楼中楼回复：被回复者 +1 积分
        author = User.query.get(reply_to_id)
        if author:
            author.points = (author.points or 0) + 1
    elif not parent_id and post.author_id != current_user.id and post.author:
        # 直接回复帖子：帖主 +2 积分
        post.author.points = (post.author.points or 0) + 2
    db.session.add(reply)
    db.session.commit()
    return jsonify({'ok': True, 'reply_id': reply.id})


@post_bp.route('/replies/<int:reply_id>', methods=['DELETE'])
@login_required
def delete_reply(reply_id):
    reply = Reply.query.get_or_404(reply_id)
    if reply.author_id != current_user.id and not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '无权删除'}), 403
    post = reply.post
    post.reply_count = max(0, (post.reply_count or 0) - 1)
    db.session.delete(reply)
    db.session.commit()
    return jsonify({'ok': True})


@post_bp.route('/replies/<int:reply_id>/accept', methods=['POST'])
@login_required
def accept_reply(reply_id):
    reply = Reply.query.get_or_404(reply_id)
    post = reply.post
    if post.author_id != current_user.id:
        return jsonify({'ok': False, 'msg': '只有帖主可以采纳'}), 403
    pts = post.reward_points or 0
    if pts > 0:
        current_user.points += pts
        reply.author.points = (reply.author.points or 0) + pts
        post.reward_points = 0
    reply.is_accepted = True
    db.session.commit()
    return jsonify({'ok': True, 'rewarded': pts})
