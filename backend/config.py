import os


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'bbs-forum-2025-secret-key')

    # 优先读取环境变量（部署用），没有则用本地数据库
    _db_url = os.environ.get('DATABASE_URL', '') or os.environ.get('MYSQL_URI', '')
    _engine_options = {}

    if _db_url:
        # Railway/Render 提供的格式为 mysql://，需替换为 mysql+pymysql://
        if _db_url.startswith('mysql://'):
            _db_url = _db_url.replace('mysql://', 'mysql+pymysql://', 1)
        import pymysql
        pymysql.install_as_MySQLdb()
        # Railway MySQL 使用自签名证书，跳过证书验证
        _engine_options = {
            'connect_args': {
                'ssl': {
                    'verify_cert': False,
                    'check_hostname': False
                }
            }
        }
    else:
        # 本地开发优先用 MySQL，没有则用 SQLite
        try:
            import pymysql
            pymysql.install_as_MySQLdb()
            _db_url = 'mysql+pymysql://root:2005@localhost:3306/bbs_forum?charset=utf8mb4'
        except ImportError:
            _db_url = 'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bbs_forum.db')

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _engine_options
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
