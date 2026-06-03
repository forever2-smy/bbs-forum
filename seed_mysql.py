"""
MySQL 数据库初始化 + 示例数据填充脚本
运行: python seed_mysql.py
"""
import os
import sys
import random
from datetime import datetime, timedelta

# 安装 pymysql 为 MySQLdb
import pymysql
pymysql.install_as_MySQLdb()

# 先创建数据库（如果还不存在）
DB_HOST = 'localhost'
DB_PORT = 3306
DB_USER = 'root'
DB_PASS = os.environ.get('MYSQL_ROOT_PASS', '2005')
DB_NAME = 'bbs_forum'

def create_database():
    conn = pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER,
        password=DB_PASS, charset='utf8mb4'
    )
    with conn.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.commit()
    conn.close()
    print(f"✅ 数据库 '{DB_NAME}' 已创建/已存在")

# 创建表和填充数据
from backend.app import create_app
from backend.models import db, User, Board, Post, Reply, Favorite, Message
from werkzeug.security import generate_password_hash

def seed_data():
    app = create_app()
    with app.app_context():
        # 清空旧数据（可选：如果只想增量则不删）
        db.drop_all()
        db.create_all()
        print("✅ 表结构已创建")

        # --- 创建用户 ---
        users_data = [
            {'username': 'admin', 'email': 'admin@bbs.com', 'password': 'admin123',
             'role': 'admin', 'points': 500, 'bio': '系统管理员'},
            {'username': 'zhangsan', 'email': 'zs@example.com', 'password': '123456',
             'role': 'moderator', 'points': 200, 'bio': '技术发烧友，热爱编程'},
            {'username': 'lisi', 'email': 'ls@example.com', 'password': '123456',
             'role': 'user', 'points': 100, 'bio': '在校学生，喜欢前端开发'},
            {'username': 'wangwu', 'email': 'ww@example.com', 'password': '123456',
             'role': 'user', 'points': 80, 'bio': '求职中的应届生'},
            {'username': 'zhaoliu', 'email': 'zl@example.com', 'password': '123456',
             'role': 'user', 'points': 60, 'bio': '游戏爱好者，偶尔灌水'},
            {'username': 'chenqi', 'email': 'cq@example.com', 'password': '123456',
             'role': 'user', 'points': 40, 'bio': '后端工程师，Python粉'},
            {'username': 'sunba', 'email': 'sb@example.com', 'password': '123456',
             'role': 'user', 'points': 30, 'bio': '数据分析师'},
            {'username': 'zhoujiu', 'email': 'zj@example.com', 'password': '123456',
             'role': 'user', 'points': 20, 'bio': '网络安全学习者'},
        ]
        users = []
        for u in users_data:
            user = User(
                username=u['username'], email=u['email'],
                password_hash=generate_password_hash(u['password']),
                role=u['role'], points=u['points'], bio=u['bio'],
                status='active', login_count=random.randint(1, 20)
            )
            db.session.add(user)
            users.append(user)
        db.session.commit()
        user_map = {u.username: u for u in users}
        print(f"✅ 创建了 {len(users)} 个用户")

        # --- 创建板块 ---
        boards_data = [
            {'name': '技术交流', 'description': '编程·算法·工具讨论', 'icon': '💻'},
            {'name': '校园生活', 'description': '活动·资讯·互助', 'icon': '🎓'},
            {'name': '职场求职', 'description': '实习·就业·经验分享', 'icon': '💼'},
            {'name': '灌水乐园', 'description': '娱乐·八卦·放松区', 'icon': '🎮'},
        ]
        boards = []
        for i, b in enumerate(boards_data):
            board = Board(name=b['name'], description=b['description'],
                          icon=b['icon'], sort_order=i+1)
            db.session.add(board)
            boards.append(board)
        db.session.commit()
        print(f"✅ 创建了 {len(boards)} 个板块")

        # --- 示例帖子数据 ---
        posts_data = {
            '技术交流': [
                {'title': 'Python Flask 入门教程：从零搭建一个Web应用',
                 'content': '''最近在学习 Flask，发现它非常轻量易上手。\n\n本文会一步步带你搭建一个简单的博客系统，包括路由、模板、数据库操作。\n\n首先安装 Flask：pip install flask\n然后创建 app.py...\n\n希望对大家有帮助，有问题欢迎交流！''',
                 'author': 'zhangsan', 'views': 342, 'replies': 12, 'likes': 28, 'essence': True},
                {'title': 'Docker 容器化部署最佳实践',
                 'content': '''分享一些Docker实战经验：\n1. 使用多阶段构建减小镜像体积\n2. 合理配置 .dockerignore\n3. 使用 docker-compose 管理多容器\n\n附上一个完整的 Dockerfile 示例...''',
                 'author': 'chenqi', 'views': 215, 'replies': 8, 'likes': 19},
                {'title': 'MySQL vs PostgreSQL，该如何选择？',
                 'content': '''两个都是优秀的关系型数据库，各有优劣。\n\nMySQL 胜在生态成熟、社区活跃，适合 Web 应用。\nPostgreSQL 功能更强大，支持 JSON、GIS 等高级特性。\n\n你的项目用的哪个？来说说理由吧。''',
                 'author': 'zhangsan', 'views': 189, 'replies': 15, 'likes': 22, 'top': True},
                {'title': '前端框架对比：Vue3 vs React18',
                 'content': '''Vue3 的组合式 API 和 React 的 Hooks 有很多相似之处。\n\nVue3 学习曲线更平缓，模板语法直观。\nReact 生态更丰富，TypeScript 支持更好。\n\n个人建议新手从 Vue3 入手。''',
                 'author': 'lisi', 'views': 276, 'replies': 20, 'likes': 35, 'essence': True},
                {'title': 'Git 常用命令速查表',
                 'content': '''整理了一份常用的 Git 命令：\n\ngit init - 初始化仓库\ngit clone <url> - 克隆仓库\ngit add . - 添加所有改动\ngit commit -m "msg" - 提交\ngit push origin main - 推送\ngit pull - 拉取更新\ngit branch - 查看分支\ngit checkout -b dev - 创建并切换分支\n\n建议收藏！''',
                 'author': 'admin', 'views': 512, 'replies': 6, 'likes': 45, 'top': True},
                {'title': 'Linux 服务器性能调优笔记',
                 'content': '''记录一下最近对服务器做性能调优的过程：\n\n1. 内核参数调整：net.core.somaxconn, tcp_tw_reuse\n2. Nginx 配置优化：worker_processes, keepalive_timeout\n3. MySQL 索引优化和慢查询分析\n\n调优后 QPS 提升了 40%。''',
                 'author': 'chenqi', 'views': 134, 'replies': 4, 'likes': 11},
                {'title': '推荐几个好用的 VS Code 插件',
                 'content': '''1. Python - 微软官方插件\n2. Pylance - 类型检查和高亮\n3. GitLens - 强大的 Git 增强\n4. Docker - 容器管理\n5. Thunder Client - 轻量 REST 客户端\n6. Prettier - 代码格式化\n\n还有什么好插件？评论区见！''',
                 'author': 'lisi', 'views': 198, 'replies': 10, 'likes': 17},
                {'title': '算法刷题心得：如何高效提升算法能力',
                 'content': '''刷题不在于数量，而在于质量。\n\n建议按专题刷：\n- 第一周：数组与字符串\n- 第二周：链表与树\n- 第三周：动态规划\n- 第四周：图论与搜索\n\n每天至少 2 题，坚持 3 个月会有质的飞跃。''',
                 'author': 'zhangsan', 'views': 423, 'replies': 18, 'likes': 56, 'essence': True},
            ],
            '校园生活': [
                {'title': '2025年校园十大歌手比赛报名开始啦！',
                 'content': '''一年一度的校园十大歌手大赛即将开幕！\n\n报名时间：6月1日-6月10日\n初赛时间：6月15日\n决赛时间：6月25日\n\n报名请登录学生活动中心网站，或者直接到302办公室现场报名。\n欢迎所有热爱音乐的同学参加！''',
                 'author': 'admin', 'views': 892, 'replies': 45, 'likes': 120, 'top': True},
                {'title': '图书馆期末考试期间延长开放时间通知',
                 'content': '''为方便同学们复习备考，图书馆将在期末考试期间延长开放时间：\n\n周一至周五：7:00 - 23:00\n周六周日：8:00 - 22:00\n\n自习室座位请提前在公众号预约。\n祝大家考试顺利！''',
                 'author': 'admin', 'views': 567, 'replies': 8, 'likes': 89},
                {'title': '求推荐学校附近好吃的餐厅',
                 'content': ''':thinking_face: 来学校快一年了，吃来吃去就那几家。\n\n求各位学长学姐推荐学校附近性价比高、味道好的餐厅！\n\n个人偏好：川菜、火锅、日料都可以，人均50以内最好。\n\n先谢过大家了！''',
                 'author': 'lisi', 'views': 234, 'replies': 22, 'likes': 15},
                {'title': '二手教材交易专区（持续更新）',
                 'content': '''出一些闲置教材，需要的同学请联系我：\n\n1. 《计算机网络（第7版）》谢希仁 - 9成新 - 25元\n2. 《算法导论》 - 8成新 - 40元\n3. 《Java核心技术 卷I》 - 95新 - 35元\n4. 《操作系统概念》 - 有笔记 - 20元\n\n支持校内面交，可小刀。''',
                 'author': 'wangwu', 'views': 156, 'replies': 14, 'likes': 8},
                {'title': '校运会报名指南及项目介绍',
                 'content': ''':athletic_shoe: 校运会来啦！\n\n比赛项目包括：\n- 田径：100m、200m、400m、800m、1500m、跳远、铅球\n- 团体：4x100m接力、拔河、趣味运动会\n\n报名截止日期：6月8日\n各学院体育部统一收集报名表。''',
                 'author': 'admin', 'views': 345, 'replies': 11, 'likes': 42},
                {'title': '宿舍网速太慢怎么办？求支招',
                 'content': '''宿舍的网真的太卡了，看视频都 buffering...\n\n有没有同学知道怎么优化？\n比如路由器怎么设置，或者有没有好的网线推荐？\n\n补充：我们用的是校园网，高峰期特别慢。''',
                 'author': 'zhaoliu', 'views': 198, 'replies': 16, 'likes': 6},
                {'title': '毕业照拍摄攻略：如何拍出好看的毕业照',
                 'content': ''':camera: 毕业季到了，分享一些拍照小技巧：\n\n1. 时间：上午9-10点或下午4-5点光线最好\n2. 服装：学士服配白衬衫，简约大方\n3. 地点：图书馆前、操场、林荫道都很出片\n4. 表情：自然微笑，不要僵硬\n\n祝学长学姐毕业快乐！''',
                 'author': 'lisi', 'views': 312, 'replies': 9, 'likes': 55, 'essence': True},
                {'title': '关于本学期选课系统使用的常见问题',
                 'content': ''':information_source: 汇总一下同学们常问的问题：\n\nQ1: 为什么课程显示已满还能选？\nA: 那是预选，正式选课前会筛选。\n\nQ2: 怎么退课？\nA: 在"已选课程"页面点击退选按钮。\n\nQ3: 学分上限是多少？\nA: 本学期最多选 28 学分。\n\n有问题可以评论区留言。''',
                 'author': 'admin', 'views': 678, 'replies': 25, 'likes': 73, 'top': True},
                {'title': '周末校园骑行活动招募队友',
                 'content': ''':bicyclist: 计划这周六从学校出发，骑行到附近的森林公园，来回约40公里。\n\n目前已经有3个人，还想再找2-3个队友。\n要求：有自行车，体力还可以，不鸽子。\n\n有兴趣的同学私信我！''',
                 'author': 'wangwu', 'views': 89, 'replies': 7, 'likes': 12},
            ],
            '职场求职': [
                {'title': '2025届春招内推码汇总（持续更新）',
                 'content': '''整理了一些大厂的内推码，有需要的自取：\n\n字节跳动：ABC1234\n腾讯：TX5678\n阿里巴巴：AL9999\n美团：MT2025\n京东：JD8888\n\n使用内推可以跳过简历筛选，直接进入笔试/面试环节。\n祝大家拿到心仪的 offer！''',
                 'author': 'admin', 'views': 1205, 'replies': 38, 'likes': 210, 'top': True, 'essence': True},
                {'title': '面经分享：字节跳动后端开发一面',
                 'content': '''上周刚面完字节一面，分享一下面试题：\n\n1. 自我介绍 + 项目深挖（20分钟）\n2. Go 和 Java 的 GC 机制对比\n3. Redis 持久化 AOF 和 RDB 的区别\n4. 手撕算法：最长无重复子串\n5. 系统设计：短链接服务\n\n整体感觉面试官很nice，一周后收到二面通知。''',
                 'author': 'chenqi', 'views': 567, 'replies': 24, 'likes': 89},
                {'title': '简历修改求助：投了30家都没回复',
                 'content': '''真的很焦虑...\n\n投了字节、腾讯、阿里、美团等30多家公司，要么简历挂，要么泡池子。\n\n求各位大佬帮我看看简历有什么问题？\n我把简历放在评论区了，不玻璃心，随便喷。''',
                 'author': 'wangwu', 'views': 432, 'replies': 31, 'likes': 45},
                {'title': '实习转正攻略：如何在实习期拿到转正offer',
                 'content': '''在腾讯实习了3个月，顺利拿到转正offer，分享一些心得：\n\n1. 主动承担任务，不要等mentor分配\n2. 多和团队沟通，了解业务全貌\n3. 做好代码review，学习组内的代码规范\n4. 每周写周报，记录自己的成长和产出\n\n最重要的一点是：靠谱！交代的事情要有结果。''',
                 'author': 'zhangsan', 'views': 389, 'replies': 15, 'likes': 67, 'essence': True},
                {'title': 'HR面常见问题及回答技巧',
                 'content': '''HR面虽然不像技术面那么难，但也不能掉以轻心。\n\n常见问题：\n1. 你为什么选择我们公司？\n2. 你的职业规划是什么？\n3. 你最大的优点和缺点？\n4. 期望薪资是多少？\n\n回答原则：真诚 + 与岗位匹配 + 展现稳定性。''',
                 'author': 'admin', 'views': 678, 'replies': 12, 'likes': 95},
                {'title': 'BAT大厂薪资爆料帖（2025届）',
                 'content': '''收集了身边同学拿到的一些 offer 信息，仅供参考：\n\n阿里：开发岗，白菜价 24k*16\n腾讯：后端岗，sp 26k*16 + 签字费3w\n字节：算法岗，ssp 32k*16\n美团：后端岗，白菜 22k*15.5\n\n不同部门、不同城市会有差异，具体以实际为准。''',
                 'author': 'sunba', 'views': 1567, 'replies': 56, 'likes': 234},
                {'title': '非科班转码经验分享：从土木到互联网',
                 'content': '''本人本科土木，研究生转计算机，分享一下转码经历：\n\n1. 补基础：数据结构、操作系统、计算机网络\n2. 学语言：Python 入门，然后 Java/Go\n3. 做项目：GitHub 上找开源项目练手\n4. 刷算法：LeetCode 300 题起步\n\n只要有决心，非科班也能进大厂！''',
                 'author': 'zhoujiu', 'views': 823, 'replies': 42, 'likes': 178, 'essence': True},
                {'title': '远程实习靠谱吗？有哪些注意事项',
                 'content': '''最近很多公司在招远程实习，来聊聊优缺点：\n\n优点：\n- 时间灵活，可以兼顾学业\n- 不受地域限制\n\n缺点：\n- 沟通效率低\n- 很难融入团队\n- 成长空间有限\n\n建议：优先选择 onsite 实习，远程实习可以作为备选。''',
                 'author': 'chenqi', 'views': 234, 'replies': 18, 'likes': 28},
            ],
            '灌水乐园': [
                {'title': '大家今天晚饭吃什么？来投票',
                 'content': ''':yum: 又到饭点了，选择困难症发作...\n\nA. 食堂二楼麻辣烫\nB. 校外兰州拉面\nC. 外卖炸鸡\nD. 自己煮泡面\n\n我投 B，拉面的汤真的绝了！''',
                 'author': 'zhaoliu', 'views': 123, 'replies': 28, 'likes': 8},
                {'title': '分享一张今天拍到的绝美晚霞',
                 'content': ''':sunset: 下午从图书馆出来，看到天空美炸了！\n\n虽然手机像素不行，但还是忍不住拍了几张。\n\n评论发不了图，大家用文字描述一下你见过的最美晚霞吧！''',
                 'author': 'lisi', 'views': 89, 'replies': 15, 'likes': 22},
                {'title': '如果中了500万，你会怎么花？',
                 'content': ''':moneybag: 周五了，来做个白日梦。\n\n我先来：\n1. 100万买房首付\n2. 50万给父母养老\n3. 30万买辆车\n4. 20万旅游基金\n5. 剩下的存银行吃利息\n\n你们的计划是什么？''',
                 'author': 'zhaoliu', 'views': 456, 'replies': 67, 'likes': 34},
                {'title': '你最喜欢的动漫/电视剧是哪部？',
                 'content': ''':tv: 最近剧荒了，求推荐！\n\n我先推荐几部：\n- 动漫：《进击的巨人》《鬼灭之刃》《咒术回战》\n- 美剧：《绝命毒师》《权力的游戏》《老友记》\n- 国产剧：《狂飙》《漫长的季节》《隐秘的角落》\n\n评论区留下你的推荐！''',
                 'author': 'wangwu', 'views': 234, 'replies': 41, 'likes': 19},
                {'title': '吐槽一下学校的选课系统',
                 'content': ''':face_with_symbols_on_mouth: 真的要疯了！\n\n选课系统一开放就崩溃，刷新半小时才能进去。\n进去之后想选的课全满了...\n\n这系统就不能好好优化一下吗？每年都是这样。''',
                 'author': 'zhaoliu', 'views': 567, 'replies': 89, 'likes': 156},
                {'title': '猫咪治愈系：晒一下我家主子',
                 'content': ''':cat: 养猫两年了，每天最幸福的时刻就是下班回家它蹭过来的时候。\n\n虽然它有时候很皮，半夜跑酷，但还是好爱它。\n\n养宠物真的能让人心情变好，推荐有条件的同学考虑一下！''',
                 'author': 'sunba', 'views': 178, 'replies': 23, 'likes': 45},
                {'title': '周末去爬山了，腿废了',
                 'content': ''':mountain: 昨天和室友去爬了附近的一座山，海拔800多米。\n\n上去的时候还好，下来的时候腿一直在抖...\n今天起床感觉腿不是自己的了。\n\n不过风景真的很美，下次还想来！（嘴硬）''',
                 'author': 'wangwu', 'views': 145, 'replies': 19, 'likes': 21},
                {'title': '大家考研/考公/就业怎么选？',
                 'content': ''':thinking_face: 大三了，面临人生选择...\n\n周围同学有的准备考研，有的考公，有的直接找工作。\n\n我自己有点迷茫，不知道哪条路更适合我。\n\n各位过来人给点建议吧，说说你们当时是怎么决定的。''',
                 'author': 'lisi', 'views': 389, 'replies': 52, 'likes': 38, 'top': True},
                {'title': '今日摸鱼语录',
                 'content': ''':coffee: 工作五分钟，摸鱼两小时。\n\n分享几个摸鱼网站：\n- 假装自己在写代码的打字网站\n- 在线数独\n- 各种小游戏的聚合站\n\n当然，还是建议大家好好学习，偶尔放松一下就好。''',
                 'author': 'zhaoliu', 'views': 678, 'replies': 34, 'likes': 89, 'essence': True},
                {'title': '天气热了，大家有什么降温妙招？',
                 'content': ''':hot_face: 夏天真的来了，宿舍没有空调快热死了...\n\n目前我的降温装备：\n1. 小风扇（必备）\n2. 凉席\n3. 冰垫\n4. 每天买冰镇饮料\n\n还有没有什么更硬核的降温方法？求分享！''',
                 'author': 'wangwu', 'views': 212, 'replies': 27, 'likes': 14},
            ],
        }

        # 创建帖子
        board_map = {b.name: b for b in boards}
        post_count = 0
        for board_name, posts in posts_data.items():
            board = board_map[board_name]
            for i, p in enumerate(posts):
                author = user_map[p['author']]
                # 分散时间，让帖子分布在过去30天内
                days_ago = random.randint(0, 30)
                hours_ago = random.randint(0, 23)
                created = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)

                post = Post(
                    board_id=board.id,
                    author_id=author.id,
                    title=p['title'],
                    content=p['content'],
                    view_count=p.get('views', random.randint(10, 200)),
                    reply_count=0,
                    like_count=p.get('likes', random.randint(0, 50)),
                    is_top=p.get('top', False),
                    is_essence=p.get('essence', False),
                    status='normal',
                    reward_points=random.choice([0, 0, 0, 5, 10]) if random.random() > 0.7 else 0,
                    created_at=created,
                    updated_at=created
                )
                db.session.add(post)
                db.session.flush()  # 先flush拿post.id
                post_count += 1

                # 添加一些回复
                reply_count = random.randint(1, 5)
                for r in range(reply_count):
                    reply_user = random.choice(users)
                    reply_created = created + timedelta(hours=random.randint(1, 72))
                    reply_content = random.choice([
                        '说得好，受教了！',
                        '确实是这样，我也有同感。',
                        '收藏了，以后用的上。',
                        '感谢分享，很有帮助！',
                        '补充一点：实际操作中还要注意...',
                        '学习了，mark一下。',
                        '这个我经历过，确实如此。',
                        '顶一下，让更多人看到。',
                        '请问还有更详细的资料吗？',
                        '太真实了，哈哈哈哈。',
                    ])
                    reply = Reply(
                        post_id=post.id,
                        author_id=reply_user.id,
                        content=reply_content,
                        created_at=reply_created
                    )
                    db.session.add(reply)
                    post.reply_count = reply_count

        db.session.commit()
        print(f"✅ 创建了 {post_count} 篇帖子 + 回复")

        # --- 创建一些收藏 ---
        for _ in range(20):
            u = random.choice(users)
            # 获取所有帖子ID
            all_posts = Post.query.all()
            if all_posts:
                p = random.choice(all_posts)
                existing = Favorite.query.filter_by(user_id=u.id, post_id=p.id).first()
                if not existing:
                    fav = Favorite(user_id=u.id, post_id=p.id)
                    db.session.add(fav)
        db.session.commit()
        print("✅ 创建了 20 条收藏记录")

        # --- 创建一些私信 ---
        messages_data = [
            ('zhangsan', 'lisi', 'hi，看到你发的Vue3教程，想请教几个问题可以吗？'),
            ('lisi', 'zhangsan', '当然可以，你问吧！'),
            ('wangwu', 'admin', '管理员好，请问如何申请版主？'),
            ('admin', 'wangwu', '私信功能测试一下，收到请回复'),
            ('zhaoliu', 'sunba', '你的数据分析帖子写得很好，能加个微信交流吗？'),
        ]
        for sender_name, receiver_name, content in messages_data:
            sender = user_map[sender_name]
            receiver = user_map[receiver_name]
            msg = Message(sender_id=sender.id, receiver_id=receiver.id,
                          content=content, is_read=False)
            db.session.add(msg)
        db.session.commit()
        print("✅ 创建了 5 条私信")

        print("\n🎉 数据初始化完成！")
        print(f"   用户: {User.query.count()} 位")
        print(f"   板块: {Board.query.count()} 个")
        print(f"   帖子: {Post.query.count()} 篇")
        print(f"   回复: {Reply.query.count()} 条")
        print(f"   收藏: {Favorite.query.count()} 条")
        print(f"   私信: {Message.query.count()} 条")

if __name__ == '__main__':
    create_database()
    seed_data()
