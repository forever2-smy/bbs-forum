import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from .config import Config
from .models import db, User, Board

login_manager = LoginManager()
login_manager.session_protection = 'basic'


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    # 生产环境允许所有来源，本地开发限制具体端口
    allowed_origins = os.environ.get('CORS_ORIGINS', '').split(',')
    if allowed_origins == ['']:
        allowed_origins = [
            'http://localhost:5001', 'http://127.0.0.1:5001',
            'http://localhost:5000', 'http://127.0.0.1:5000',
        ]
    CORS(app, supports_credentials=True, origins=allowed_origins)
    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from .routes.auth import auth_bp
    from .routes.post import post_bp
    from .routes.board import board_bp
    from .routes.user import user_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(post_bp)
    app.register_blueprint(board_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)

    # 前端静态文件服务（生产环境可由 Nginx 提供）
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

    @app.route('/')
    def index():
        return send_from_directory(frontend_dir, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        file_path = os.path.join(frontend_dir, path)
        if os.path.isfile(file_path):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, 'index.html')

    with app.app_context():
        db.create_all()
        _init_data()

    return app


def _init_data():
    from werkzeug.security import generate_password_hash
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin', password_hash=generate_password_hash('admin123'),
            email='admin@bbs.com', role='admin', status='active', points=100
        )
        db.session.add(admin)

    if Board.query.count() == 0:
        boards = [
            Board(name='技术交流', description='编程·算法·工具讨论', icon='💻', sort_order=1),
            Board(name='校园生活', description='活动·资讯·互助', icon='🎓', sort_order=2),
            Board(name='职场求职', description='实习·就业·经验分享', icon='💼', sort_order=3),
            Board(name='灌水乐园', description='娱乐·八卦·放松区', icon='🎮', sort_order=4),
        ]
        for b in boards:
            db.session.add(b)

    db.session.commit()
