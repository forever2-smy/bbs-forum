# BBS论坛系统 - Web程序设计大作业

## 项目简介
基于 Python Flask + SQLite 的 BBS 论坛系统，前后端分离架构。

## 技术栈
- **后端**: Python Flask + Flask-Login + Flask-CORS + SQLAlchemy + SQLite
- **前端**: HTML5 + CSS3 + Vanilla JS (Fetch API)
- **数据库**: SQLite (零配置，文件存储)

## 功能列表
1. ✅ 用户注册/登录/退出
2. ✅ 发布帖子（支持积分奖励）
3. ✅ 回复帖子
4. ✅ 帖子置顶（分板块）
5. ✅ 帖子加精
6. ✅ 发布需求信息（设置积分奖励）
7. ✅ 管理员/作者修改帖子
8. ✅ 注册用户、维护个人资料（联系方式、工作性质、工作地点等）
9. ✅ 管理员设置板块
10. ✅ 私信功能
11. ✅ 点赞/收藏
12. ✅ 搜索帖子
13. ✅ 管理员后台（用户管理、板块管理）

## 快速启动

### 1. 安装依赖
```bash
cd bbs-forum
pip install -r backend/requirements.txt
```

### 2. 启动服务器
```bash
python run.py
```

### 3. 访问
浏览器打开: http://localhost:5000

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

可在注册页面创建新用户。

---

## 公网访问（ngrok 穿透）

### 方法一：ngrok（推荐，1分钟搞定）

1. 下载 ngrok: https://ngrok.com/download
2. 注册免费账号，获取 authtoken
3. 运行：
```bash
ngrok config add-authtoken 你的token
ngrok http 5000
```
4. ngrok 会显示一个公网地址，如 `https://xxxx.ngrok-free.app`
5. 用这个地址即可从任何地方访问论坛

### 方法二：Render.com（永久免费）

1. 将代码推送到 GitHub
2. 登录 https://render.com
3. 创建 Web Service，连接 GitHub 仓库
4. 设置：
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `python run.py`
5. 部署后会获得永久公网地址

---

## 项目结构
```
bbs-forum/
├── run.py                    # 启动入口
├── backend/
│   ├── app.py               # Flask 应用工厂
│   ├── config.py             # 配置
│   ├── models.py            # 数据库模型
│   ├── requirements.txt     # Python 依赖
│   ├── routes/
│   │   ├── auth.py          # 认证 API
│   │   ├── post.py          # 帖子 API
│   │   ├── board.py         # 板块 API
│   │   ├── user.py          # 用户/私信 API
│   │   └── admin.py         # 管理后台 API
│   └── bbs.db               # SQLite 数据库（自动生成）
├── frontend/
│   ├── index.html            # 主页面
│   ├── css/style.css         # 样式
│   └── js/app.js            # 前端逻辑
└── README.md
```

## 数据库
- 类型：SQLite（零配置，无需安装）
- 位置：`backend/bbs.db`（首次运行自动创建）
- 包含6张表：users, boards, posts, replies, favorites, messages
