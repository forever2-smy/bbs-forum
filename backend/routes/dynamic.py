from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, Dynamic, DynamicComment, DynamicLike, User

dynamic_bp = Blueprint('dynamic', __name__, url_prefix='/api/dynamics')


@dynamic_bp.route('', methods=['GET'])
def list_dynamics():
    """获取动态列表（关注的人 + 自己的，未登录则全部）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user_id = request.args.get('user_id', type=int)  # 指定用户的动态

    query = Dynamic.query
    if user_id:
        query = query.filter_by(author_id=user_id)
    elif current_user.is_authenticated:
        from ..models import Follow
        following_ids = [f.following_id for f in Follow.query.filter_by(follower_id=current_user.id).all()]
        following_ids.append(current_user.id)
        query = query.filter(Dynamic.author_id.in_(following_ids))
        # 如果没有关注任何人，显示全部
        if not following_ids or len(following_ids) <= 1:
            query = Dynamic.query

    query = query.order_by(Dynamic.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    dynamics = []
    for d in pagination.items:
        item = d.to_dict()
        # 是否已点赞
        if current_user.is_authenticated:
            item['is_liked'] = DynamicLike.query.filter_by(
                user_id=current_user.id, dynamic_id=d.id).first() is not None
        else:
            item['is_liked'] = False
        dynamics.append(item)
    return jsonify({
        'ok': True,
        'dynamics': dynamics,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
    })


@dynamic_bp.route('', methods=['POST'])
@login_required
def create_dynamic():
    data = request.get_json()
    content = (data.get('content') or '').strip()
    image = (data.get('image') or '').strip()
    if not content:
        return jsonify({'ok': False, 'msg': '内容不能为空'}), 400
    d = Dynamic(author_id=current_user.id, content=content, image=image)
    db.session.add(d)
    db.session.commit()
    return jsonify({'ok': True, 'dynamic_id': d.id})


@dynamic_bp.route('/<int:dynamic_id>', methods=['DELETE'])
@login_required
def delete_dynamic(dynamic_id):
    d = Dynamic.query.get_or_404(dynamic_id)
    if d.author_id != current_user.id and not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '无权删除'}), 403
    DynamicComment.query.filter_by(dynamic_id=dynamic_id).delete()
    DynamicLike.query.filter_by(dynamic_id=dynamic_id).delete()
    db.session.delete(d)
    db.session.commit()
    return jsonify({'ok': True})


@dynamic_bp.route('/<int:dynamic_id>/like', methods=['POST'])
@login_required
def like_dynamic(dynamic_id):
    d = Dynamic.query.get_or_404(dynamic_id)
    existing = DynamicLike.query.filter_by(user_id=current_user.id, dynamic_id=dynamic_id).first()
    if existing:
        db.session.delete(existing)
        d.like_count = max(0, (d.like_count or 0) - 1)
        db.session.commit()
        return jsonify({'ok': True, 'liked': False, 'like_count': d.like_count})
    like = DynamicLike(user_id=current_user.id, dynamic_id=dynamic_id)
    d.like_count = (d.like_count or 0) + 1
    db.session.add(like)
    db.session.commit()
    return jsonify({'ok': True, 'liked': True, 'like_count': d.like_count})


@dynamic_bp.route('/<int:dynamic_id>/comments', methods=['GET'])
def get_comments(dynamic_id):
    comments = DynamicComment.query.filter_by(dynamic_id=dynamic_id).order_by(
        DynamicComment.created_at.asc()).all()
    return jsonify({'ok': True, 'comments': [c.to_dict() for c in comments]})


@dynamic_bp.route('/<int:dynamic_id>/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(dynamic_id, comment_id):
    c = DynamicComment.query.get_or_404(comment_id)
    if c.author_id != current_user.id and not current_user.is_moderator:
        return jsonify({'ok': False, 'msg': '无权删除'}), 403
    d = Dynamic.query.get(dynamic_id)
    if d:
        d.comment_count = max(0, (d.comment_count or 0) - 1)
    db.session.delete(c)
    db.session.commit()
    return jsonify({'ok': True})


@dynamic_bp.route('/<int:dynamic_id>/comments', methods=['POST'])
@login_required
def create_comment(dynamic_id):
    d = Dynamic.query.get_or_404(dynamic_id)
    data = request.get_json()
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'ok': False, 'msg': '评论不能为空'}), 400
    c = DynamicComment(dynamic_id=dynamic_id, author_id=current_user.id, content=content)
    d.comment_count = (d.comment_count or 0) + 1
    db.session.add(c)
    db.session.commit()
    return jsonify({'ok': True, 'comment_id': c.id})
