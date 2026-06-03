import os
import pymysql
pymysql.install_as_MySQLdb()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'bbs-forum-2025-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        os.environ.get(
            'MYSQL_URI',
            'mysql+pymysql://root:2005@localhost:3306/bbs_forum?charset=utf8mb4'
        )
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
