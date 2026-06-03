import os
import pymysql
pymysql.install_as_MySQLdb()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'bbs-forum-2025-secret-key')

    # Railway 提供的 DATABASE_URL 格式为 mysql://，需要替换为 mysql+pymysql://
    _db_url = os.environ.get('DATABASE_URL', '') or os.environ.get('MYSQL_URI', '')
    if _db_url and _db_url.startswith('mysql://'):
        _db_url = _db_url.replace('mysql://', 'mysql+pymysql://', 1)
    if not _db_url:
        _db_url = 'mysql+pymysql://root:2005@localhost:3306/bbs_forum?charset=utf8mb4'

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
