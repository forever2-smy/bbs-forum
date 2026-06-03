from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    avatar = db.Column(db.String(255), default='')
    bio = db.Column(db.Text, default='')
    signature = db.Column(db.String(200), default='')
    gender = db.Column(db.String(10), default='')
    birthday = db.Column(db.String(20), default='')
    occupation = db.Column(db.String(50), default='')
    work_city = db.Column(db.String(50), default='')
    points = db.Column(db.Integer, default=0)
    role = db.Column(db.String(20), default='user')
    status = db.Column(db.String(20), default='active')
    last_login = db.Column(db.DateTime)
    login_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    posts = db.relationship('Post', backref='author', lazy='dynamic')
    replies = db.relationship('Reply', backref='author', lazy='dynamic')

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_moderator(self):
        return self.role in ('moderator', 'admin')

    @property
    def avatar_display(self):
        if self.avatar:
            return self.avatar
        return ''

    def to_dict(self):
        return {
            'id': self.id, 'username': self.username, 'email': self.email,
            'avatar': self.avatar, 'bio': self.bio, 'signature': self.signature,
            'gender': self.gender, 'birthday': self.birthday,
            'occupation': self.occupation, 'work_city': self.work_city,
            'points': self.points, 'role': self.role,
            'status': self.status, 'last_login': self.last_login.isoformat() if self.last_login else None,
            'login_count': self.login_count or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'post_count': self.posts.filter_by(status='normal').count(),
        }


class Board(db.Model):
    __tablename__ = 'boards'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default='')
    icon = db.Column(db.String(50), default='💬')
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    posts = db.relationship('Post', backref='board', lazy='dynamic')

    @property
    def post_count(self):
        return self.posts.filter_by(status='normal').count()

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'description': self.description,
            'icon': self.icon, 'sort_order': self.sort_order,
            'post_count': self.post_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    view_count = db.Column(db.Integer, default=0)
    reply_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)
    is_top = db.Column(db.Boolean, default=False)
    is_essence = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='normal')
    reward_points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    replies_list = db.relationship('Reply', backref='post', lazy='dynamic',
                                   order_by='Reply.created_at.asc()')
    favorites = db.relationship('Favorite', backref='post', lazy='dynamic')

    def to_dict(self, include_content=False):
        d = {
            'id': self.id, 'board_id': self.board_id,
            'board_name': self.board.name if self.board else '',
            'author_id': self.author_id,
            'author_name': self.author.username if self.author else '',
            'title': self.title,
            'view_count': self.view_count or 0,
            'reply_count': self.reply_count or 0,
            'like_count': self.like_count or 0,
            'is_top': self.is_top, 'is_essence': self.is_essence,
            'status': self.status,
            'reward_points': self.reward_points or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_content:
            d['content'] = self.content
        return d


class Reply(db.Model):
    __tablename__ = 'replies'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    like_count = db.Column(db.Integer, default=0)
    is_accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'post_id': self.post_id,
            'author_id': self.author_id,
            'author_name': self.author.username if self.author else '',
            'content': self.content,
            'like_count': self.like_count or 0,
            'is_accepted': self.is_accepted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'post_id'),)


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.username if self.sender else '',
            'receiver_id': self.receiver_id,
            'receiver_name': self.receiver.username if self.receiver else '',
            'content': self.content,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
