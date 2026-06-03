const API = '';

const App = {
  user: null,
  _userCardEl: null,  // 用户卡片弹窗元素

  async init() {
    await this.checkAuth();
    this.bindNav();
    this.route();
    window.addEventListener('hashchange', () => this.route());
    // 点击空白关闭用户卡片
    document.addEventListener('click', (e) => {
      if (this._userCardEl && !e.target.closest('.user-card-popup') && !e.target.closest('.dynamic-avatar') && !e.target.closest('.post-avatar') && !e.target.closest('.reply-avatar-click')) {
        this._userCardEl.remove();
        this._userCardEl = null;
      }
    });
  },

  async api(path, opts = {}) {
    try {
      const res = await fetch(API + path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        method: opts.method || 'GET',
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok && data.msg) this.toast(data.msg, 'error');
      return data;
    } catch (err) {
      this.toast('请求失败，请检查网络或后端是否运行', 'error');
      return { ok: false };
    }
  },

  async checkAuth() {
    const data = await this.api('/api/auth/me');
    this.user = data.ok ? data.user : null;
  },

  async renderNav() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    let userArea = '';
    if (this.user) {
      const unreadRes = await this.api('/api/users/unread_count').catch(() => ({ count: 0 }));
      const unread = unreadRes.count || 0;
      userArea = `
        <div class="user-area" onclick="App.toggleUserDropdown(event)">
          <div class="avatar">${this.user.username[0]}</div>
          <div class="user-dropdown" id="user-dropdown" onclick="event.stopPropagation()">
            <div style="padding: 12px 18px; border-bottom: 1px solid var(--gray-100);">
              <div style="font-weight: 700; color: var(--dark);">${this.esc(this.user.username)}</div>
              <div style="font-size: .75rem; color: var(--gray-400); margin-top: 2px;">
                ${this.user.points} 积分 · ${this.user.role === 'admin' ? '管理员' : '用户'}
              </div>
            </div>
            <a href="#/profile/${this.user.id}">👤 个人主页</a>
            <a href="#/dynamics">🌐 动态</a>
            <a href="#/messages">✉️ 私信${unread ? ` <span style="color:var(--danger);font-weight:700;">(${unread})</span>` : ''}</a>
            <a href="javascript:void(0)" onclick="App.showMyPosts()">📝 我的帖子</a>
            <a href="javascript:void(0)" onclick="App.showMyFavs()">⭐ 我的收藏</a>
            ${this.user.role === 'admin' ? '<a href="#/admin">⚙️ 管理后台</a>' : ''}
            <div style="border-top: 1px solid var(--gray-100); margin-top: 4px;"></div>
            <a href="javascript:void(0)" onclick="App.logout()" style="color: var(--danger);">🚪 退出登录</a>
          </div>
        </div>`;
    } else {
      userArea = `
        <div class="user-area">
          <a href="#/login" style="color:rgba(255,255,255,.8);font-size:.9rem;padding:8px 14px;border-radius:var(--radius-sm);transition:all .2s;">登录</a>
          <a href="#/register" style="color:rgba(255,255,255,.8);font-size:.9rem;padding:8px 14px;border-radius:var(--radius-sm);transition:all .2s;">注册</a>
        </div>`;
    }
    const isAdmin = this.user && this.user.role === 'admin';
    nav.innerHTML = `
      <a class="brand" href="#/"><span>💬</span> BBS论坛</a>
      <div class="nav-links">
        <a href="#/">首页</a>
        <a href="#/dynamics">动态</a>
        ${isAdmin ? '<a href="#/admin">管理</a>' : ''}
      </div>
      ${userArea}`;
  },

  toggleUserDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    if (!dd) return;
    const show = dd.style.display !== 'block';
    dd.style.display = show ? 'block' : 'none';
    if (show) {
      const close = (ev) => {
        if (!ev.target.closest('.user-area')) {
          dd.style.display = 'none';
          document.removeEventListener('click', close);
        }
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    }
  },

  async showMyPosts() {
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.style.display = 'none';
    location.hash = `#/profile/${this.user.id}`;
  },

  async showMyFavs() {
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.style.display = 'none';
    location.hash = `#/profile/${this.user.id}`;
    setTimeout(() => {
      const tabs = document.querySelectorAll('.profile-tab');
      if (tabs[2]) tabs[2].click();
    }, 400);
  },

  bindNav() {},

  route() {
    const hash = location.hash.slice(1) || '/';
    const routes = {
      '/': () => this.pageHome(),
      '/login': () => this.pageLogin(),
      '/register': () => this.pageRegister(),
      '/board': () => this.pageBoard(),
      '/post': () => this.pagePost(),
      '/new-post': () => this.pageNewPost(),
      '/edit-post': () => this.pageEditPost(),
      '/profile': () => this.pageProfile(),
      '/messages': () => this.pageMessages(),
      '/admin': () => this.pageAdmin(),
      '/dynamics': () => this.pageDynamics(),
    };
    const base = hash.split('?')[0].split('/').slice(0, 2).join('/') || '/';
    const fn = routes[base];
    if (fn) fn(); else this.pageHome();
    this.renderNav();
  },

  getParams() {
    const hash = location.hash.slice(1);
    const [path, qs] = hash.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    return { parts, params, path };
  },

  // ===== 用户卡片弹窗 =====
  async showUserCard(userId, event) {
    event.stopPropagation();
    event.preventDefault();
    // 移除旧卡片
    if (this._userCardEl) { this._userCardEl.remove(); this._userCardEl = null; }
    const data = await this.api(`/api/social/user-card/${userId}`);
    if (!data.ok) return;
    const u = data.user;
    const rect = event.target.getBoundingClientRect();
    // 头像颜色背景
    const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
    const colorIdx = u.id % colors.length;
    const bgColor = colors[colorIdx];

    const avatarHtml = u.avatar
      ? `<img src="${this.esc(u.avatar)}" class="user-card-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="user-card-avatar" style="display:none;">${u.username[0]}</div>`
      : `<div class="user-card-avatar">${u.username[0]}</div>`;

    const card = document.createElement('div');
    card.className = 'user-card-popup';
    // 位置计算
    let top = rect.bottom + 8;
    let left = rect.left;
    if (top + 300 > window.innerHeight) top = rect.top - 300;
    if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
    if (left < 10) left = 10;
    card.style.top = top + 'px';
    card.style.left = left + 'px';

    const isMe = this.user && this.user.id === u.id;
    let actionHtml = '';
    if (!isMe && this.user) {
      const followText = u.is_following ? '✅ 已关注' : '➕ 关注';
      const followClass = u.is_following ? 'btn-sm btn-outline' : 'btn-sm btn-primary';
      const friendText = u.is_friend ? '✅ 好友' : u.friend_pending ? '⏳ 申请中' : '🤝 加好友';
      const friendClass = u.is_friend ? 'btn-sm btn-outline' : u.friend_pending ? 'btn-sm btn-outline' : 'btn-sm btn-outline';
      actionHtml = `
        <button class="${followClass}" onclick="App.toggleFollow(${u.id}, this)">${followText}</button>
        <button class="${friendClass}" onclick="App.sendFriendReq(${u.id}, this)" ${u.is_friend || u.friend_pending ? 'disabled' : ''}>${friendText}</button>
        <a href="#/messages?to=${u.id}" class="btn btn-sm btn-outline" onclick="App.closeUserCard()">✉️ 私信</a>`;
    } else if (!this.user) {
      actionHtml = `<a href="#/login" class="btn btn-sm btn-primary">登录后操作</a>`;
    } else {
      actionHtml = `<a href="#/profile/${u.id}" class="btn btn-sm btn-primary" onclick="App.closeUserCard()">👤 查看主页</a>`;
    }

    card.innerHTML = `
      <div class="user-card-banner" style="background:linear-gradient(135deg, ${bgColor}, ${bgColor}cc);"></div>
      <div class="user-card-avatar-wrap">${avatarHtml}</div>
      <div class="user-card-info">
        <div class="user-card-name">${this.esc(u.username)}</div>
        ${u.signature ? `<div class="user-card-signature">"${this.esc(u.signature)}"</div>` : ''}
        ${u.occupation ? `<div style="font-size:.8rem;color:var(--gray-500);margin-top:2px;">💼 ${this.esc(u.occupation)}</div>` : ''}
      </div>
      <div class="user-card-stats">
        <div class="stat"><strong>${u.post_count}</strong><span>帖子</span></div>
        <div class="stat"><strong>${u.follower_count}</strong><span>粉丝</span></div>
        <div class="stat"><strong>${u.following_count}</strong><span>关注</span></div>
      </div>
      <div class="user-card-actions">${actionHtml}</div>
    `;
    document.body.appendChild(card);
    this._userCardEl = card;
  },

  closeUserCard() {
    if (this._userCardEl) { this._userCardEl.remove(); this._userCardEl = null; }
  },

  // ===== 动态页面 =====
  async pageDynamics() {
    if (!this.user) { location.hash = '#/login'; return; }
    const data = await this.api('/api/dynamics?per_page=20');
    if (!data.ok) return;
    const dynamics = data.dynamics || [];

    let html = `
      <div class="section-title">🌐 动态广场</div>
      <div class="card mb-3">
        <div class="dynamic-publish">
          <textarea id="dynamic-content" placeholder="分享你的想法..." rows="3"></textarea>
          <div class="dynamic-publish-row">
            <input type="text" id="dynamic-image" class="form-control" style="width:60%;margin:0;" placeholder="图片URL（可选）">
            <button class="btn btn-primary btn-sm" onclick="App.publishDynamic()">发布动态</button>
          </div>
        </div>`;
    if (dynamics.length === 0) {
      html += '<div class="empty-state" style="padding:40px;">📭 暂无动态，发布第一条吧！</div>';
    }
    for (const d of dynamics) {
      html += this.renderDynamicItem(d);
    }
    html += '</div>';
    this.setContent(html);
  },

  renderDynamicItem(d) {
    const avatarHtml = d.author_avatar
      ? `<img src="${this.esc(d.author_avatar)}" class="dynamic-avatar" onclick="App.showUserCard(${d.author_id}, event)">`
      : `<div class="dynamic-avatar" onclick="App.showUserCard(${d.author_id}, event)">${d.author_name[0]}</div>`;
    return `
      <div class="dynamic-item" id="dynamic-${d.id}">
        <div class="dynamic-header">
          ${avatarHtml}
          <span class="dynamic-author" onclick="location.hash='#/profile/${d.author_id}'">${this.esc(d.author_name)}</span>
          <span class="dynamic-time">${this.timeAgo(d.created_at)}</span>
        </div>
        <div class="dynamic-content">${this.esc(d.content)}</div>
        ${d.image ? `<img src="${this.esc(d.image)}" class="dynamic-image" onerror="this.style.display='none'">` : ''}
        <div class="dynamic-actions">
          <button class="${d.is_liked ? 'liked' : ''}" onclick="App.likeDynamic(${d.id}, this)">
            ${d.is_liked ? '❤️' : '🤍'} ${d.like_count}
          </button>
          <button onclick="App.toggleDynComments(${d.id})">💬 ${d.comment_count}</button>
          ${this.user && this.user.id === d.author_id ? `<button onclick="App.deleteDynamic(${d.id})" style="color:var(--danger);">🗑️ 删除</button>` : ''}
        </div>
        <div id="dyn-comments-${d.id}" style="display:none;"></div>
      </div>`;
  },

  async publishDynamic() {
    const content = document.getElementById('dynamic-content').value.trim();
    const image = document.getElementById('dynamic-image').value.trim();
    if (!content) { this.toast('动态内容不能为空', 'error'); return; }
    const data = await this.api('/api/dynamics', { method: 'POST', body: { content, image } });
    if (data.ok) { this.toast('发布成功！'); this.pageDynamics(); }
  },

  async likeDynamic(id, btn) {
    const data = await this.api(`/api/dynamics/${id}/like`, { method: 'POST' });
    if (data.ok) {
      btn.className = data.liked ? 'liked' : '';
      btn.innerHTML = `${data.liked ? '❤️' : '🤍'} ${data.like_count}`;
    }
  },

  async toggleDynComments(id) {
    const el = document.getElementById(`dyn-comments-${id}`);
    if (!el) return;
    if (el.style.display === 'none') {
      el.style.display = '';
      const data = await this.api(`/api/dynamics/${id}/comments`);
      if (!data.ok) return;
      const comments = data.comments || [];
      let html = '<div class="dynamic-comments">';
      for (const c of comments) {
        html += `<div class="dynamic-comment-item">
          <span class="dc-author" onclick="App.showUserCard(${c.author_id}, event)">${this.esc(c.author_name)}</span>
          <span style="color:var(--gray-600);"> ${this.esc(c.content)}</span>
          <span style="color:var(--gray-400);font-size:.75rem;margin-left:6px;">${this.timeAgo(c.created_at)}</span>
        </div>`;
      }
      html += `<div class="dynamic-comment-input">
        <input id="dyn-comment-input-${id}" placeholder="写评论..." onkeydown="if(event.key==='Enter')App.submitDynComment(${id})">
        <button onclick="App.submitDynComment(${id})">发送</button>
      </div></div>`;
      el.innerHTML = html;
    } else {
      el.style.display = 'none';
    }
  },

  async submitDynComment(id) {
    const input = document.getElementById(`dyn-comment-input-${id}`);
    const content = (input.value || '').trim();
    if (!content) return;
    const data = await this.api(`/api/dynamics/${id}/comments`, { method: 'POST', body: { content } });
    if (data.ok) { this.toast('评论成功'); this.toggleDynComments(id); this.toggleDynComments(id); input.value = ''; }
  },

  async deleteDynamic(id) {
    if (!confirm('确定删除此动态？')) return;
    const data = await this.api(`/api/dynamics/${id}`, { method: 'DELETE' });
    if (data.ok) { this.toast('已删除'); this.pageDynamics(); }
  },

  // ===== 社交操作 =====
  async toggleFollow(userId, btn) {
    const data = await this.api(`/api/social/follow/${userId}`, { method: 'POST' });
    if (data.ok) {
      if (data.following) {
        btn.className = 'btn-sm btn-outline';
        btn.textContent = '✅ 已关注';
      } else {
        btn.className = 'btn-sm btn-primary';
        btn.textContent = '➕ 关注';
      }
      this.toast(data.following ? '已关注' : '已取关');
    }
  },

  async sendFriendReq(userId, btn) {
    const data = await this.api(`/api/social/friend-request/${userId}`, { method: 'POST' });
    if (data.ok) {
      btn.textContent = '⏳ 申请中';
      btn.disabled = true;
      this.toast('好友申请已发送');
    }
  },

  // ===== 转发 =====
  showRepostModal(postId, postTitle, authorName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'repost-modal';
    modal.innerHTML = `
      <div class="modal-box" style="width:480px;">
        <div class="modal-header">
          <h3>🔄 转发帖子</h3>
          <button class="modal-close" onclick="document.getElementById('repost-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="repost-quote">
            <div class="rq-title">${this.esc(postTitle)}</div>
            <div class="rq-author">by ${this.esc(authorName)}</div>
          </div>
          <div class="form-group">
            <textarea id="repost-comment" class="form-control" rows="3" placeholder="说点什么...（可选）" maxlength="500"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('repost-modal').remove()">取消</button>
          <button class="btn btn-primary" onclick="App.submitRepost(${postId})">转发</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async submitRepost(postId) {
    const comment = document.getElementById('repost-comment').value.trim();
    const data = await this.api('/api/social/repost', { method: 'POST', body: { post_id: postId, comment } });
    if (data.ok) {
      this.toast('转发成功！');
      document.getElementById('repost-modal').remove();
    }
  },

  // ===== Pages =====
  async pageHome() {
    const data = await this.api('/api/boards');
    if (!data.ok) return;
    const boards = data.boards;

    // 获取热门帖子和活跃用户
    const hotPostsRes = await this.api('/api/posts?per_page=8');
    const hotPosts = hotPostsRes.ok ? (hotPostsRes.posts || []) : [];
    const activeUsersRes = await this.api('/api/users/active?limit=6');
    const activeUsers = activeUsersRes.ok ? (activeUsersRes.users || []) : [];

    let html = `
      <div class="hero-search">
        <h1>🔍 发现精彩内容</h1>
        <p class="subtitle">探索 ${boards.length} 个板块，与社区一起成长</p>
        <div class="search-bar">
          <select id="search-category">
            <option value="all">全部板块</option>
            ${boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
          <input type="text" id="search-input" placeholder="搜索帖子、话题、内容..." onkeydown="if(event.key==='Enter')App.search()">
          <button onclick="App.search()">🔍</button>
        </div>
        <div class="search-tags">
          <span>热门搜索</span>
          <a href="javascript:void(0)" onclick="App.quickSearch('Python')">Python</a>
          <a href="javascript:void(0)" onclick="App.quickSearch('求职')">求职</a>
          <a href="javascript:void(0)" onclick="App.quickSearch('校园')">校园</a>
          <a href="javascript:void(0)" onclick="App.quickSearch('面试')">面试</a>
          <a href="javascript:void(0)" onclick="App.quickSearch('技术栈')">技术栈</a>
        </div>
      </div>

      <div class="home-layout">
        <!-- 左侧边栏 -->
        <div class="home-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-card-title">📢 公告</div>
            <div class="sidebar-notice">
              🎉 欢迎来到BBS论坛！
              <div class="sn-date">2026-06-01</div>
            </div>
            <div class="sidebar-notice">
              📝 新增动态和关注功能
              <div class="sn-date">2026-06-02</div>
            </div>
            <div class="sidebar-notice">
              🔔 发帖即可获得积分奖励
              <div class="sn-date">2026-06-03</div>
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-title">🔥 热门标签</div>
            <div class="sidebar-tags-wrap">
              <span class="sidebar-tag" onclick="App.quickSearch('Python')">Python</span>
              <span class="sidebar-tag" onclick="App.quickSearch('Java')">Java</span>
              <span class="sidebar-tag" onclick="App.quickSearch('前端')">前端</span>
              <span class="sidebar-tag" onclick="App.quickSearch('算法')">算法</span>
              <span class="sidebar-tag" onclick="App.quickSearch('面试')">面试</span>
              <span class="sidebar-tag" onclick="App.quickSearch('游戏')">游戏</span>
              <span class="sidebar-tag" onclick="App.quickSearch('美食')">美食</span>
              <span class="sidebar-tag" onclick="App.quickSearch('电影')">电影</span>
              <span class="sidebar-tag" onclick="App.quickSearch('手机')">手机</span>
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-title">📊 论坛统计</div>
            <div style="padding:10px 16px 14px;font-size:.85rem;color:var(--gray-600);line-height:2;">
              📝 帖子：<strong>${hotPostsRes.total || 0}</strong><br>
              📋 板块：<strong>${boards.length}</strong><br>
              👥 用户：<strong>${activeUsersRes.ok ? (activeUsersRes.users || []).length : '?'}</strong>
            </div>
          </div>
        </div>

        <!-- 中间主内容 -->
        <div>
          <div class="section-title">🏠 论坛板块</div>
          <div class="boards-grid">`;
    for (const b of boards) {
      html += `
        <div class="card board-card" onclick="location.hash='#/board?id=${b.id}'">
          <div class="board-bg-icon">${b.icon || '💬'}</div>
          <div class="card-body">
            <div class="board-icon">${b.icon || '💬'}</div>
            <div class="board-name">${b.name}</div>
            <div class="board-desc">${b.description}</div>
            <div class="board-stats">
              <span>📝 ${b.post_count} 帖</span>
            </div>
          </div>
        </div>`;
    }
    html += `</div>
        </div>

        <!-- 右侧边栏 -->
        <div class="home-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-card-title">🔥 热门帖子</div>`;
    for (const p of hotPosts.slice(0, 6)) {
      html += `
            <div class="sidebar-item" onclick="location.hash='#/post?id=${p.id}'">
              <div class="si-title">${this.esc(p.title)}</div>
              <div class="si-count">💬${p.reply_count || 0}</div>
            </div>`;
    }
    if (!hotPosts.length) html += '<div style="padding:16px;color:var(--gray-400);font-size:.85rem;">暂无帖子</div>';
    html += `
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-title">⭐ 活跃用户</div>`;
    for (const u of activeUsers) {
      const avatarHtml = u.avatar
        ? `<img src="${this.esc(u.avatar)}" class="si-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="si-avatar" style="display:none;">${u.username[0]}</div>`
        : `<div class="si-avatar">${u.username[0]}</div>`;
      html += `
            <div class="sidebar-item" onclick="location.hash='#/profile/${u.id}'">
              ${avatarHtml}
              <div class="si-title">${u.username}</div>
              <div class="si-count">${u.points}分</div>
            </div>`;
    }
    html += `
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-title">💡 小贴士</div>
            <div style="padding:10px 16px 14px;font-size:.82rem;color:var(--gray-500);line-height:1.6;">
              💬 发帖可获得积分<br>
              ⭐ 采纳回复奖励积分<br>
              🔄 一键转发好帖<br>
              👥 关注好友动态
            </div>
          </div>
        </div>
      </div>`;

    if (this.user) {
      html += `<a href="#/new-post" class="fab" title="发布新帖">✏️</a>`;
    }
    this.setContent(html);
  },

  async pageBoard() {
    const { params } = this.getParams();
    const boardId = params.get('id');
    const page = params.get('page') || 1;
    const boardRes = await this.api(`/api/boards/${boardId}`);
    const postsRes = await this.api(`/api/posts?board_id=${boardId}&page=${page}`);
    if (!postsRes.ok) return;
    const board = boardRes.board;
    const posts = postsRes.posts;
    let html = `
      <div class="breadcrumb-nav">
        <a href="#/">首页</a><span class="sep">/</span>
        <span>${board ? board.name : ''}</span>
      </div>
      <div class="section-title">${board ? board.icon : ''} ${board ? board.name : '板块'}</div>
      <p style="color:var(--gray-500);margin-bottom:16px;">${board ? board.description : ''}</p>`;
    if (this.user) {
      html += `<a href="#/new-post?board_id=${boardId}" class="btn btn-primary btn-sm mb-2">✏️ 发帖</a>`;
    }
    html += '<div class="card">';
    if (posts.length === 0) {
      html += '<div class="empty-state"><div class="icon">📭</div><p>暂无帖子，快来发布第一篇吧！</p></div>';
    }
    for (const p of posts) {
      html += `
        <div class="post-item">
          <div class="post-avatar" style="cursor:pointer;" onclick="App.showUserCard(${p.author_id}, event)">${p.author_name ? p.author_name[0] : '?'}</div>
          <div class="post-main">
            <div class="post-title">
              ${p.is_top ? '<span class="badge badge-top">置顶</span>' : ''}
              ${p.is_essence ? '<span class="badge badge-essence">精华</span>' : ''}
              ${p.reward_points ? `<span class="badge badge-reward">${p.reward_points}分</span>` : ''}
              <a href="#/post?id=${p.id}">${this.esc(p.title)}</a>
            </div>
            <div class="post-meta">
              <span>${p.author_name}</span>
              <span>${this.timeAgo(p.created_at)}</span>
              <span>👁 ${p.view_count}</span>
              <span>💬 ${p.reply_count}</span>
              <span>👍 ${p.like_count}</span>
            </div>
          </div>
        </div>`;
    }
    html += '</div>';
    this.setContent(html);
  },

  async pagePost() {
    const { params } = this.getParams();
    const postId = params.get('id');
    const data = await this.api(`/api/posts/${postId}`);
    if (!data.ok) return;
    const p = data.post;
    const replies = data.replies;
    // 获取转发列表
    const repostData = await this.api(`/api/social/reposts/${postId}`);
    const reposts = repostData.ok ? (repostData.reposts || []) : [];

    let html = `
      <div class="breadcrumb-nav">
        <a href="#/">首页</a><span class="sep">/</span>
        <a href="#/board?id=${p.board_id}">${p.board_name}</a><span class="sep">/</span>
        <span>${this.esc(p.title).slice(0,20)}</span>
      </div>
      <div class="card mb-3">
        <div class="card-body">
          <div class="flex justify-between items-center mb-1">
            <h2 style="font-size:1.3rem;font-weight:700;">
              ${p.is_top ? '<span class="badge badge-top">置顶</span>' : ''}
              ${p.is_essence ? '<span class="badge badge-essence">精华</span>' : ''}
              ${p.reward_points ? `<span class="badge badge-reward">${p.reward_points}积分奖励</span>` : ''}
              ${this.esc(p.title)}
            </h2>
          </div>
          <div style="color:var(--gray-500);font-size:.85rem;margin-bottom:12px;">
            <span class="post-avatar reply-avatar-click" style="width:28px;height:28px;font-size:11px;display:inline-flex;vertical-align:middle;margin-right:4px;cursor:pointer;" onclick="App.showUserCard(${p.author_id}, event)">${p.author_name[0]}</span>
            <a href="#/profile/${p.author_id}" style="font-weight:600;">${p.author_name}</a>
            &nbsp;·&nbsp;${this.timeAgo(p.created_at)}
            &nbsp;·&nbsp;👁 ${p.view_count} &nbsp;💬 ${p.reply_count} &nbsp;👍 ${p.like_count}
          </div>
          <div style="white-space:pre-wrap;line-height:1.8;font-size:.95rem;">${this.esc(p.content)}</div>
        </div>
        <div class="card-footer flex gap-2">
          ${this.user ? `
            <button class="btn btn-sm btn-outline" onclick="App.likePost(${p.id})">👍 点赞</button>
            <button class="btn btn-sm btn-outline" onclick="App.favPost(${p.id})">${data.is_fav ? '⭐ 已收藏' : '☆ 收藏'}</button>
            <button class="btn btn-sm btn-outline" onclick="App.showRepostModal(${p.id}, '${this.esc(p.title).replace(/'/g, "\\'")}', '${this.esc(p.author_name).replace(/'/g, "\\'")}')">🔄 转发</button>
          ` : ''}
          ${this.user && (this.user.id === p.author_id || this.user.role !== 'user') ? `
            <a href="#/edit-post?id=${p.id}" class="btn btn-sm btn-outline">✏️ 编辑</a>
            <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="App.deletePost(${p.id})">🗑 删除</button>
          ` : ''}
          ${this.user && this.user.role !== 'user' ? `
            <button class="btn btn-sm btn-outline" onclick="App.toggleTop(${p.id})">${p.is_top ? '📌 取消置顶' : '📌 置顶'}</button>
            <button class="btn btn-sm btn-outline" onclick="App.toggleEssence(${p.id})">${p.is_essence ? '⭐ 取消精华' : '⭐ 加精'}</button>
          ` : ''}
        </div>
      </div>

      ${reposts.length > 0 ? `
        <div class="section-title">🔄 转发 (${reposts.length})</div>
        <div class="card mb-3">
          ${reposts.map(r => `
            <div class="post-item">
              <div class="post-avatar" style="cursor:pointer;" onclick="App.showUserCard(${r.user_id}, event)">${r.user_name[0]}</div>
              <div class="post-main">
                <div class="post-title"><a href="#/profile/${r.user_id}">${this.esc(r.user_name)}</a> <span style="font-weight:400;color:var(--gray-500);font-size:.85rem;">转发了此帖</span></div>
                ${r.comment ? `<div style="font-size:.9rem;color:var(--gray-700);margin-top:4px;">${this.esc(r.comment)}</div>` : ''}
                <div class="post-meta"><span>${this.timeAgo(r.created_at)}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="section-title">💬 回复 (${p.reply_count})</div>
      <div class="card mb-3">`;
    if (replies.length === 0) {
      html += '<div class="empty-state" style="padding:24px;"><p>暂无回复</p></div>';
    }
    for (const r of replies) {
      html += `
        <div class="reply-item ${r.is_accepted ? 'accepted' : ''}">
          <div class="reply-header">
            <div class="reply-author">
              <span class="post-avatar reply-avatar-click" style="width:28px;height:28px;font-size:11px;cursor:pointer;" onclick="App.showUserCard(${r.author_id}, event)">${r.author_name[0]}</span>
              <a href="#/profile/${r.author_id}">${r.author_name}</a>
              ${r.is_accepted ? '<span class="badge badge-reward">已采纳</span>' : ''}
            </div>
            <span style="color:var(--gray-400);font-size:.8rem;">${this.timeAgo(r.created_at)}</span>
          </div>
          <div class="reply-content">${this.esc(r.content)}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
            ${this.user && p.reward_points > 0 && p.author_id === this.user.id && !r.is_accepted ? `
              <button class="btn btn-sm btn-success" onclick="App.acceptReply(${r.id})">✅ 采纳 (${p.reward_points}分)</button>
            ` : ''}
            ${this.user && (this.user.id === r.author_id || this.user.role === 'admin') ? `
              <button class="btn btn-sm btn-outline" style="color:var(--danger);font-size:.75rem;padding:2px 8px;" onclick="App.deleteReply(${r.id}, ${p.id})">🗑 删除</button>
            ` : ''}
          </div>
        </div>`;
    }
    html += '</div>';

    if (this.user) {
      html += `
        <div class="card mb-3">
          <div class="card-body">
            <h4 style="font-size:1rem;font-weight:700;margin-bottom:12px;">发表回复</h4>
            <textarea id="reply-content" class="form-control" rows="4" placeholder="写下你的回复..."></textarea>
            <button class="btn btn-primary mt-2" onclick="App.submitReply(${p.id})">发送回复</button>
          </div>
        </div>`;
    }
    this.setContent(html);
  },

  async pageNewPost() {
    if (!this.user) { location.hash = '#/login'; return; }
    const { params } = this.getParams();
    const boardId = params.get('board_id') || 1;
    const boardsRes = await this.api('/api/boards');
    const boards = boardsRes.boards || [];
    let html = `
      <div class="breadcrumb-nav"><a href="#/">首页</a><span class="sep">/</span><span>发布新帖</span></div>
      <div class="section-title">✏️ 发布新帖</div>
      <div class="card"><div class="card-body">
        <div class="form-group"><label>选择板块</label>
          <select id="post-board" class="form-control">
            ${boards.map(b => `<option value="${b.id}" ${b.id == boardId ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>帖子标题</label>
          <input type="text" id="post-title" class="form-control" placeholder="请输入标题" maxlength="200">
        </div>
        <div class="form-group"><label>帖子内容</label>
          <textarea id="post-content" class="form-control" rows="10" placeholder="请输入内容..."></textarea>
        </div>
        <div class="form-group"><label>积分奖励（0=无奖励）</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="number" id="post-reward" class="form-control" value="0" min="0" style="width:120px;">
            <span style="font-size:.85rem;color:var(--gray-500);">当前余额: ${this.user.points}分</span>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="App.submitPost()">📤 发布</button>
        <a href="javascript:history.back()" class="btn btn-outline btn-lg" style="margin-left:8px;">取消</a>
      </div></div>`;
    this.setContent(html);
  },

  async pageEditPost() {
    if (!this.user) { location.hash = '#/login'; return; }
    const { params } = this.getParams();
    const postId = params.get('id');
    const data = await this.api(`/api/posts/${postId}`);
    if (!data.ok) return;
    const p = data.post;
    if (this.user.id !== p.author_id && this.user.role === 'user') {
      this.toast('无权编辑此帖子', 'error');
      location.hash = `#/post?id=${postId}`;
      return;
    }
    const boardsRes = await this.api('/api/boards');
    const boards = boardsRes.boards || [];
    let html = `
      <div class="breadcrumb-nav"><a href="#/">首页</a><span class="sep">/</span><a href="#/post?id=${postId}">${this.esc(p.title).slice(0,20)}</a><span class="sep">/</span><span>编辑帖子</span></div>
      <div class="section-title">✏️ 编辑帖子</div>
      <div class="card"><div class="card-body">
        <div class="form-group"><label>选择板块</label>
          <select id="post-board" class="form-control">
            ${boards.map(b => `<option value="${b.id}" ${b.id == p.board_id ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>帖子标题</label>
          <input type="text" id="post-title" class="form-control" value="${this.esc(p.title)}" maxlength="200">
        </div>
        <div class="form-group"><label>帖子内容</label>
          <textarea id="post-content" class="form-control" rows="10">${this.esc(p.content)}</textarea>
        </div>
        <div class="form-group"><label>积分奖励</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="number" id="post-reward" class="form-control" value="${p.reward_points || 0}" min="0" style="width:120px;">
            <span style="font-size:.85rem;color:var(--gray-500);">当前余额: ${this.user.points}分</span>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="App.submitEditPost(${postId})">💾 保存修改</button>
        <a href="#/post?id=${postId}" class="btn btn-outline btn-lg" style="margin-left:8px;">取消</a>
      </div></div>`;
    this.setContent(html);
  },

  async submitEditPost(postId) {
    const board_id = parseInt(document.getElementById('post-board').value);
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const reward_points = parseInt(document.getElementById('post-reward').value) || 0;
    if (!title || !content) { this.toast('标题和内容不能为空', 'error'); return; }
    const data = await this.api(`/api/posts/${postId}`, { method: 'PUT', body: { board_id, title, content, reward_points } });
    if (data.ok) { this.toast('编辑成功！'); location.hash = `#/post?id=${postId}`; }
  },

  async pageLogin() {
    if (this.user) { location.hash = '#/'; return; }
    this.setContent(`
      <div class="auth-page">
        <div class="auth-card card">
          <div class="card-body">
            <h2>👋 欢迎回来</h2>
            <p class="subtitle">登录你的BBS账号</p>
            <div class="form-group"><label>用户名</label>
              <input type="text" id="login-username" class="form-control" placeholder="请输入用户名">
            </div>
            <div class="form-group"><label>密码</label>
              <input type="password" id="login-password" class="form-control" placeholder="请输入密码"
                     onkeydown="if(event.key==='Enter')App.doLogin()">
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="App.doLogin()">登录</button>
            <div class="divider">还没有账号？<a href="#/register">去注册</a></div>
            <p style="text-align:center;color:var(--gray-400);font-size:.8rem;">测试账号: admin / admin123</p>
          </div>
        </div>
      </div>`);
  },

  async pageRegister() {
    if (this.user) { location.hash = '#/'; return; }
    this.setContent(`
      <div class="auth-page">
        <div class="auth-card card">
          <div class="card-body">
            <h2>✨ 创建账号</h2>
            <p class="subtitle">加入BBS论坛社区</p>
            <div class="form-group"><label>用户名</label>
              <input type="text" id="reg-username" class="form-control" placeholder="3-50个字符">
            </div>
            <div class="form-group"><label>邮箱</label>
              <input type="email" id="reg-email" class="form-control" placeholder="your@email.com">
            </div>
            <div class="form-group"><label>密码</label>
              <input type="password" id="reg-password" class="form-control" placeholder="至少6位">
            </div>
            <div class="form-group"><label>确认密码</label>
              <input type="password" id="reg-confirm" class="form-control" placeholder="再次输入密码"
                     onkeydown="if(event.key==='Enter')App.doRegister()">
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="App.doRegister()">注册</button>
            <div class="divider">已有账号？<a href="#/login">去登录</a></div>
          </div>
        </div>
      </div>`);
  },

  async pageProfile() {
    const { parts } = this.getParams();
    const userId = parts[1] || (this.user ? this.user.id : 0);
    const data = await this.api(`/api/users/${userId}`);
    if (!data.ok) return;
    const u = data.user;
    const posts = data.posts || [];
    const replyCount = data.reply_count || 0;
    const isMe = this.user && this.user.id == u.id;
    const followerCount = data.follower_count || 0;
    const followingCount = data.following_count || 0;
    const friendCount = data.friend_count || 0;
    const dynamicCount = data.dynamic_count || 0;
    const isFollowing = data.is_following || false;
    const isFriend = data.is_friend || false;
    const friendPending = data.friend_pending || false;

    const avatarHtml = u.avatar
      ? `<img src="${this.esc(u.avatar)}" class="avatar-lg" style="object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="avatar-lg" style="display:none;">${u.username[0]}</div>`
      : `<div class="avatar-lg">${u.username[0]}</div>`;

    const genderIcon = u.gender === '男' ? '👨' : u.gender === '女' ? '👩' : '';

    // 社交操作按钮
    let socialBtns = '';
    if (!isMe && this.user) {
      const followText = isFollowing ? '✅ 已关注' : '➕ 关注';
      const followClass = isFollowing ? 'btn btn-sm btn-outline' : 'btn btn-sm btn-primary';
      const friendText = isFriend ? '✅ 好友' : friendPending ? '⏳ 申请中' : '🤝 加好友';
      const friendDisabled = isFriend || friendPending ? 'disabled' : '';
      socialBtns = `
        <button class="${followClass}" onclick="App.toggleFollow(${u.id}, this)">${followText}</button>
        <button class="btn btn-sm btn-outline" onclick="App.sendFriendReq(${u.id}, this)" ${friendDisabled}>${friendText}</button>
        <a href="#/messages?to=${u.id}" class="btn btn-sm btn-outline">✉️ 私信</a>`;
    }

    let html = `
      <div class="card mb-3 profile-card">
        <div class="profile-banner"></div>
        <div class="profile-header">
          <div class="profile-avatar-wrap">
            ${avatarHtml}
            ${u.role === 'admin' ? '<span class="profile-role-badge">管理员</span>' : ''}
            ${u.role === 'moderator' ? '<span class="profile-role-badge mod">版主</span>' : ''}
          </div>
          <div class="info" style="flex:1;">
            <h2>${this.esc(u.username)} ${genderIcon}</h2>
            ${u.signature ? `<div class="profile-signature">"${this.esc(u.signature)}"</div>` : ''}
            <div class="profile-meta">
              ${u.occupation ? `<span>💼 ${this.esc(u.occupation)}</span>` : ''}
              ${u.work_city ? `<span>📍 ${this.esc(u.work_city)}</span>` : ''}
              ${u.gender ? `<span>${genderIcon} ${u.gender}</span>` : ''}
              ${u.birthday ? `<span>🎂 ${u.birthday}</span>` : ''}
            </div>
            ${u.bio ? `<div class="profile-bio">${this.esc(u.bio)}</div>` : ''}
            <div class="profile-stats">
              <div class="stat-item"><strong>${u.post_count}</strong><span>帖子</span></div>
              <div class="stat-item"><strong>${dynamicCount}</strong><span>动态</span></div>
              <div class="stat-item"><strong>${replyCount}</strong><span>回复</span></div>
              <div class="stat-item"><strong>${followerCount}</strong><span>粉丝</span></div>
              <div class="stat-item"><strong>${followingCount}</strong><span>关注</span></div>
              <div class="stat-item"><strong>${friendCount}</strong><span>好友</span></div>
              <div class="stat-item"><strong>${u.points}</strong><span>积分</span></div>
            </div>
            <div class="profile-joined">注册于 ${u.created_at ? u.created_at.slice(0,10) : '-'}</div>
            <div class="profile-social-row">${socialBtns}</div>
          </div>
          <div class="profile-actions">
            ${isMe ? `<button class="btn btn-primary btn-sm" onclick="App.showEditProfile()">✏️ 编辑资料</button>` : ''}
          </div>
        </div>
      </div>

      <div class="profile-tabs">
        <button class="profile-tab active" onclick="App.profileTab('posts',${userId})">📝 帖子</button>
        <button class="profile-tab" onclick="App.profileTab('dynamics',${userId})">🌐 动态</button>
        <button class="profile-tab" onclick="App.profileTab('replies',${userId})">💬 回复</button>
        <button class="profile-tab" onclick="App.profileTab('favs',${userId})">⭐ 收藏</button>
        <button class="profile-tab" onclick="App.profileTab('followers',${userId})">👥 粉丝</button>
        <button class="profile-tab" onclick="App.profileTab('following',${userId})">👀 关注</button>
      </div>

      <div id="profile-posts" class="profile-tab-content">
        <div class="card">
          ${posts.length === 0 ? '<div class="empty-state" style="padding:24px;">📭 暂无帖子</div>' : ''}
          ${posts.map(p => `
            <div class="post-item">
              <div class="post-main">
                <div class="post-title">
                  ${p.is_top ? '<span class="badge badge-top">置顶</span>' : ''}
                  ${p.is_essence ? '<span class="badge badge-essence">精华</span>' : ''}
                  <a href="#/post?id=${p.id}">${this.esc(p.title)}</a>
                </div>
                <div class="post-meta">
                  <span>${this.timeAgo(p.created_at)}</span>
                  <span>👁 ${p.view_count}</span>
                  <span>💬 ${p.reply_count}</span>
                  <span>👍 ${p.like_count}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="profile-dynamics" class="profile-tab-content" style="display:none;"></div>
      <div id="profile-replies" class="profile-tab-content" style="display:none;"></div>
      <div id="profile-favs" class="profile-tab-content" style="display:none;"></div>
      <div id="profile-followers" class="profile-tab-content" style="display:none;"></div>
      <div id="profile-following" class="profile-tab-content" style="display:none;"></div>
    `;
    this.setContent(html);
  },

  async profileTab(tab, userId) {
    document.querySelectorAll('.profile-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.profile-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`profile-${tab}`).style.display = '';

    // 动态
    if (tab === 'dynamics' && !document.getElementById('profile-dynamics').dataset.loaded) {
      const res = await this.api(`/api/users/${userId}/dynamics`);
      if (!res.ok) return;
      const dynamics = res.dynamics || [];
      let html = '<div class="card">';
      if (!dynamics.length) html += '<div class="empty-state" style="padding:24px;">🌐 暂无动态</div>';
      for (const d of dynamics) {
        html += this.renderDynamicItem(d);
      }
      html += '</div>';
      document.getElementById('profile-dynamics').innerHTML = html;
      document.getElementById('profile-dynamics').dataset.loaded = '1';
    }

    if (tab === 'replies' && !document.getElementById('profile-replies').dataset.loaded) {
      const res = await this.api(`/api/users/${userId}/replies`);
      if (!res.ok) return;
      const replies = res.replies || [];
      let html = '<div class="card">';
      if (!replies.length) html += '<div class="empty-state" style="padding:24px;">📭 暂无回复</div>';
      for (const r of replies) {
        html += `<div class="post-item">
          <div class="post-main">
            <div class="post-title"><a href="#/post?id=${r.post_id}">${this.esc(r.post_title)}</a></div>
            <div style="font-size:.85rem;color:var(--gray-600);margin-top:4px;white-space:pre-wrap;">${this.esc(r.content)}</div>
            <div class="post-meta"><span>${this.timeAgo(r.created_at)}</span></div>
          </div>
        </div>`;
      }
      html += '</div>';
      document.getElementById('profile-replies').innerHTML = html;
      document.getElementById('profile-replies').dataset.loaded = '1';
    }

    if (tab === 'favs' && !document.getElementById('profile-favs').dataset.loaded) {
      const res = await this.api(`/api/users/${userId}/favorites`);
      if (!res.ok) return;
      const favs = res.favorites || [];
      let html = '<div class="card">';
      if (!favs.length) html += '<div class="empty-state" style="padding:24px;">⭐ 暂无收藏</div>';
      for (const f of favs) {
        html += `<div class="post-item">
          <div class="post-main">
            <div class="post-title"><a href="#/post?id=${f.post_id}">${this.esc(f.post_title)}</a></div>
            <div class="post-meta">
              <span>${this.esc(f.post_board)}</span>
              <span>by ${this.esc(f.post_author)}</span>
              <span>收藏于 ${this.timeAgo(f.fav_at)}</span>
            </div>
          </div>
        </div>`;
      }
      html += '</div>';
      document.getElementById('profile-favs').innerHTML = html;
      document.getElementById('profile-favs').dataset.loaded = '1';
    }

    // 粉丝
    if (tab === 'followers' && !document.getElementById('profile-followers').dataset.loaded) {
      const res = await this.api(`/api/social/followers/${userId}`);
      if (!res.ok) return;
      const followers = res.followers || [];
      let html = '<div class="card">';
      if (!followers.length) html += '<div class="empty-state" style="padding:24px;">👥 暂无粉丝</div>';
      for (const f of followers) {
        const avatarHtml = f.avatar
          ? `<img src="${this.esc(f.avatar)}" class="su-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="su-avatar" style="display:none;">${f.username[0]}</div>`
          : `<div class="su-avatar">${f.username[0]}</div>`;
        html += `<div class="social-user-item" onclick="location.hash='#/profile/${f.id}'" style="cursor:pointer;">
          ${avatarHtml}
          <div class="su-info">
            <div class="su-name">${this.esc(f.username)}</div>
            ${f.signature ? `<div class="su-sig">"${this.esc(f.signature)}"</div>` : ''}
          </div>
        </div>`;
      }
      html += '</div>';
      document.getElementById('profile-followers').innerHTML = html;
      document.getElementById('profile-followers').dataset.loaded = '1';
    }

    // 关注
    if (tab === 'following' && !document.getElementById('profile-following').dataset.loaded) {
      const res = await this.api(`/api/social/following/${userId}`);
      if (!res.ok) return;
      const following = res.following || [];
      let html = '<div class="card">';
      if (!following.length) html += '<div class="empty-state" style="padding:24px;">👀 暂未关注任何人</div>';
      for (const f of following) {
        const avatarHtml = f.avatar
          ? `<img src="${this.esc(f.avatar)}" class="su-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="su-avatar" style="display:none;">${f.username[0]}</div>`
          : `<div class="su-avatar">${f.username[0]}</div>`;
        html += `<div class="social-user-item" onclick="location.hash='#/profile/${f.id}'" style="cursor:pointer;">
          ${avatarHtml}
          <div class="su-info">
            <div class="su-name">${this.esc(f.username)}</div>
            ${f.signature ? `<div class="su-sig">"${this.esc(f.signature)}"</div>` : ''}
          </div>
        </div>`;
      }
      html += '</div>';
      document.getElementById('profile-following').innerHTML = html;
      document.getElementById('profile-following').dataset.loaded = '1';
    }
  },

  showEditProfile() {
    const u = this.user;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'edit-profile-modal';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>✏️ 编辑个人资料</h3>
          <button class="modal-close" onclick="document.getElementById('edit-profile-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="edit-avatar-row">
            <div class="edit-avatar-preview" id="avatar-preview">
              ${u.avatar ? `<img src="${this.esc(u.avatar)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="display:none;width:72px;height:72px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;">${u.username[0]}</div>` : `<div style="width:72px;height:72px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;">${u.username[0]}</div>`}
            </div>
            <div style="flex:1;">
              <div class="form-group" style="margin-bottom:8px;"><label>头像URL</label>
                <input type="text" id="edit-avatar" class="form-control" value="${this.esc(u.avatar || '')}" placeholder="粘贴图片链接，如 https://..." oninput="App.previewAvatar(this.value)">
              </div>
              <div style="font-size:.75rem;color:var(--gray-400);">支持任意图片URL，留空则显示默认头像</div>
            </div>
          </div>
          <div class="form-group"><label>个性签名</label>
            <input type="text" id="edit-signature" class="form-control" value="${this.esc(u.signature || '')}" placeholder="一句话介绍自己" maxlength="200">
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1;"><label>昵称</label>
              <input type="text" id="edit-username" class="form-control" value="${this.esc(u.username)}" disabled style="background:var(--gray-100);">
            </div>
            <div class="form-group" style="flex:1;"><label>邮箱</label>
              <input type="email" id="edit-email" class="form-control" value="${this.esc(u.email || '')}" placeholder="your@email.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1;"><label>性别</label>
              <select id="edit-gender" class="form-control">
                <option value="" ${!u.gender ? 'selected' : ''}>未设置</option>
                <option value="男" ${u.gender === '男' ? 'selected' : ''}>男</option>
                <option value="女" ${u.gender === '女' ? 'selected' : ''}>女</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;"><label>生日</label>
              <input type="date" id="edit-birthday" class="form-control" value="${u.birthday || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1;"><label>职业</label>
              <input type="text" id="edit-occupation" class="form-control" value="${this.esc(u.occupation || '')}" placeholder="如：学生/工程师/设计师">
            </div>
            <div class="form-group" style="flex:1;"><label>城市</label>
              <input type="text" id="edit-city" class="form-control" value="${this.esc(u.work_city || '')}" placeholder="如：北京">
            </div>
          </div>
          <div class="form-group"><label>个人简介</label>
            <textarea id="edit-bio" class="form-control" rows="3" placeholder="介绍一下自己...">${this.esc(u.bio || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('edit-profile-modal').remove()">取消</button>
          <button class="btn btn-primary" onclick="App.saveProfile()">💾 保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  previewAvatar(url) {
    const preview = document.getElementById('avatar-preview');
    if (url.trim()) {
      preview.innerHTML = `<img src="${this.esc(url.trim())}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='<div style=\\'width:72px;height:72px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;\\'>${this.user.username[0]}</div>'">`;
    } else {
      preview.innerHTML = `<div style="width:72px;height:72px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;">${this.user.username[0]}</div>`;
    }
  },

  async saveProfile() {
    const data = {
      avatar: document.getElementById('edit-avatar').value.trim(),
      signature: document.getElementById('edit-signature').value.trim(),
      email: document.getElementById('edit-email').value.trim(),
      gender: document.getElementById('edit-gender').value,
      birthday: document.getElementById('edit-birthday').value,
      occupation: document.getElementById('edit-occupation').value.trim(),
      work_city: document.getElementById('edit-city').value.trim(),
      bio: document.getElementById('edit-bio').value.trim(),
    };
    const res = await this.api('/api/users/profile', { method: 'PUT', body: data });
    if (res.ok) {
      this.user = res.user;
      this.toast('资料已更新');
      document.getElementById('edit-profile-modal').remove();
      this.route();
    }
  },

  async pageMessages() {
    if (!this.user) { location.hash = '#/login'; return; }
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const toUserId = params.get('to');
    const data = await this.api('/api/users/messages');
    const recv = data.recv || [];
    const sent = data.sent || [];
    let html = `
      <div class="section-title">✉️ 私信</div>
      <div class="card mb-3" style="padding:16px;">
        <h4 style="font-size:.95rem;font-weight:700;margin-bottom:10px;">发送私信</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="number" id="msg-to" class="form-control" style="width:120px;" placeholder="用户ID" value="${toUserId || ''}">
          <input type="text" id="msg-content" class="form-control" style="flex:1;" placeholder="输入私信内容..." onkeydown="if(event.key==='Enter')App.sendMsg()">
          <button class="btn btn-primary" onclick="App.sendMsg()">发送</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="btn btn-sm btn-primary" id="tab-recv" onclick="App.msgTab('recv')">收件箱 (${recv.length})</button>
        <button class="btn btn-sm btn-outline" id="tab-sent" onclick="App.msgTab('sent')">已发送 (${sent.length})</button>
      </div>
      <div id="msg-recv" class="card">`;
    for (const m of recv) {
      html += `<div class="post-item" style="${!m.is_read ? 'background:#fffbeb;' : ''}">
        <div class="post-avatar" style="cursor:pointer;" onclick="App.showUserCard(${m.sender_id}, event)">${m.sender_name[0]}</div>
        <div class="post-main">
          <div class="post-title"><a href="#/profile/${m.sender_id}">${m.sender_name}</a>
            ${!m.is_read ? '<span style="color:var(--danger);font-size:.75rem;margin-left:4px;">● 新消息</span>' : ''}
          </div>
          <div style="font-size:.9rem;margin-top:2px;">${this.esc(m.content)}</div>
          <div class="post-meta"><span>${this.timeAgo(m.created_at)}</span>
            <a href="javascript:void(0)" onclick="document.getElementById('msg-to').value=${m.sender_id};document.getElementById('msg-content').focus();" style="color:var(--primary);">回复</a>
          </div>
        </div>
      </div>`;
    }
    if (!recv.length) html += '<div class="empty-state" style="padding:24px;">暂无私信</div>';
    html += `</div><div id="msg-sent" class="card" style="display:none;">`;
    for (const m of sent) {
      html += `<div class="post-item">
        <div class="post-avatar" style="background:var(--success);cursor:pointer;" onclick="App.showUserCard(${m.receiver_id}, event)">${m.receiver_name[0]}</div>
        <div class="post-main">
          <div class="post-title">发给 <a href="#/profile/${m.receiver_id}">${m.receiver_name}</a></div>
          <div style="font-size:.9rem;margin-top:2px;">${this.esc(m.content)}</div>
          <div class="post-meta"><span>${this.timeAgo(m.created_at)}</span></div>
        </div>
      </div>`;
    }
    if (!sent.length) html += '<div class="empty-state" style="padding:24px;">暂无发送的私信</div>';
    html += '</div>';
    this.setContent(html);
  },

  async sendMsg() {
    const receiver_id = parseInt(document.getElementById('msg-to').value);
    const content = document.getElementById('msg-content').value.trim();
    if (!receiver_id) { this.toast('请输入收信人ID', 'error'); return; }
    if (!content) { this.toast('请输入内容', 'error'); return; }
    const data = await this.api('/api/users/messages/send', { method: 'POST', body: { receiver_id, content } });
    if (data.ok) { this.toast('私信已发送'); this.pageMessages(); }
  },

  msgTab(tab) {
    document.getElementById('msg-recv').style.display = tab === 'recv' ? '' : 'none';
    document.getElementById('msg-sent').style.display = tab === 'sent' ? '' : 'none';
    document.getElementById('tab-recv').className = `btn btn-sm ${tab === 'recv' ? 'btn-primary' : 'btn-outline'}`;
    document.getElementById('tab-sent').className = `btn btn-sm ${tab === 'sent' ? 'btn-primary' : 'btn-outline'}`;
  },

  async pageAdmin() {
    if (!this.user || this.user.role !== 'admin') { this.toast('权限不足', 'error'); location.hash = '#/'; return; }
    const dash = await this.api('/api/admin/dashboard');
    const usersRes = await this.api('/api/admin/users');
    const boardsRes = await this.api('/api/admin/boards');
    const postsRes = await this.api('/api/admin/posts');
    const dynamicsRes = await this.api('/api/admin/dynamics');
    let html = `
      <div class="section-title">⚙️ 后台管理（超级管理员）</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
        <div class="stat-card bg-primary"><h3>${dash.user_count || 0}</h3><p>注册用户</p></div>
        <div class="stat-card bg-success"><h3>${dash.post_count || 0}</h3><p>帖子总数</p></div>
        <div class="stat-card bg-accent"><h3>${dash.board_count || 0}</h3><p>板块数量</p></div>
        <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;"><h3>${dynamicsRes.total || 0}</h3><p>动态总数</p></div>
      </div>

      <!-- 管理标签页 -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <button class="btn btn-primary" id="admin-tab-users" onclick="App.adminTab('users')">👥 用户管理</button>
        <button class="btn btn-outline" id="admin-tab-posts" onclick="App.adminTab('posts')">📝 帖子管理</button>
        <button class="btn btn-outline" id="admin-tab-dynamics" onclick="App.adminTab('dynamics')">🌐 动态管理</button>
        <button class="btn btn-outline" id="admin-tab-boards" onclick="App.adminTab('boards')">📁 板块管理</button>
      </div>

      <!-- 用户管理 -->
      <div id="admin-users">
        <div class="table-wrapper mb-3">
          <table class="data-table">
            <thead><tr><th>ID</th><th>用户名</th><th>邮箱</th><th>角色</th><th>状态</th><th>积分</th><th>操作</th></tr></thead>
            <tbody>`;
    for (const u of (usersRes.users || [])) {
      html += `<tr>
        <td>${u.id}</td><td>${u.username}</td><td>${u.email}</td>
        <td>
          <select onchange="App.changeRole(${u.id},this.value)" class="form-control" style="width:auto;padding:2px 6px;font-size:.8rem;" ${u.role==='admin'?'disabled':''}>
            <option value="user" ${u.role==='user'?'selected':''}>用户</option>
            <option value="moderator" ${u.role==='moderator'?'selected':''}>版主</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>管理员</option>
          </select>
        </td>
        <td>${u.status === 'active' ? '<span style="color:var(--success);">正常</span>' : '<span style="color:var(--danger);">封禁</span>'}</td>
        <td>${u.points}</td>
        <td>${u.role !== 'admin' ? `<button class="btn btn-sm ${u.status==='active'?'btn-danger':'btn-success'}" onclick="App.banUser(${u.id})">${u.status==='active'?'封禁':'解封'}</button>` : '<span style="color:var(--primary);font-weight:600;">👑 最高权限</span>'}</td>
      </tr>`;
    }
    html += `</tbody></table></div>
      </div>

      <!-- 帖子管理 -->
      <div id="admin-posts" style="display:none;">
        <div class="table-wrapper mb-3">
          <table class="data-table">
            <thead><tr><th>ID</th><th>标题</th><th>作者</th><th>板块</th><th>回复</th><th>点赞</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>`;
    for (const p of (postsRes.posts || [])) {
      const statusBadges = [];
      if (p.is_top) statusBadges.push('<span style="color:var(--primary);">📌置顶</span>');
      if (p.is_essence) statusBadges.push('<span style="color:#f59e0b;">⭐精华</span>');
      html += `<tr>
        <td>${p.id}</td>
        <td><a href="#/post?id=${p.id}" style="color:var(--dark);font-weight:500;">${this.esc(p.title)}</a></td>
        <td>${p.author_name || '-'}</td>
        <td>${p.board_name || '-'}</td>
        <td>${p.reply_count || 0}</td>
        <td>${p.like_count || 0}</td>
        <td>${statusBadges.length ? statusBadges.join(' ') : '<span style="color:var(--gray-400);">普通</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick="App.adminToggleTop(${p.id})">${p.is_top ? '取消置顶' : '📌置顶'}</button>
          <button class="btn btn-sm btn-outline" onclick="App.adminToggleEssence(${p.id})">${p.is_essence ? '取消精华' : '⭐精华'}</button>
          <button class="btn btn-sm btn-danger" onclick="App.adminDeletePost(${p.id})">🗑️删除</button>
        </td>
      </tr>`;
    }
    if (!(postsRes.posts || []).length) html += '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--gray-400);">暂无帖子</td></tr>';
    html += `</tbody></table></div>
      </div>

      <!-- 动态管理 -->
      <div id="admin-dynamics" style="display:none;">
        <div class="table-wrapper mb-3">
          <table class="data-table">
            <thead><tr><th>ID</th><th>作者</th><th>内容</th><th>点赞</th><th>评论</th><th>时间</th><th>操作</th></tr></thead>
            <tbody>`;
    for (const d of (dynamicsRes.dynamics || [])) {
      html += `<tr>
        <td>${d.id}</td>
        <td>${d.author_name || '-'}</td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.esc(d.content)}</td>
        <td>${d.like_count || 0}</td>
        <td>${d.comment_count || 0}</td>
        <td>${this.timeAgo(d.created_at)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="App.adminDeleteDynamic(${d.id})">🗑️删除</button></td>
      </tr>`;
    }
    if (!(dynamicsRes.dynamics || []).length) html += '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-400);">暂无动态</td></tr>';
    html += `</tbody></table></div>
      </div>

      <!-- 板块管理 -->
      <div id="admin-boards" style="display:none;">
        <div class="card mb-3"><div class="card-body">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
            <div class="form-group" style="margin:0;flex:1;min-width:120px;"><input id="nb-name" class="form-control" placeholder="板块名称"></div>
            <div class="form-group" style="margin:0;flex:2;min-width:200px;"><input id="nb-desc" class="form-control" placeholder="板块简介"></div>
            <button class="btn btn-success" onclick="App.createBoard()">+ 创建</button>
          </div>
        </div></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>ID</th><th>图标</th><th>名称</th><th>简介</th><th>帖子数</th><th>排序</th><th>操作</th></tr></thead>
            <tbody>`;
    for (const b of (boardsRes.boards || [])) {
      html += `<tr>
        <td>${b.id}</td><td>${b.icon}</td><td>${b.name}</td><td>${b.description}</td>
        <td>${b.post_count}</td><td>${b.sort_order}</td>
        <td>${b.post_count === 0 ? `<button class="btn btn-sm btn-danger" onclick="App.deleteBoard(${b.id})">删除</button>` : '-'}</td>
      </tr>`;
    }
    html += '</tbody></table></div></div>';
    this.setContent(html);
  },

  adminTab(tab) {
    ['users', 'posts', 'dynamics', 'boards'].forEach(t => {
      const el = document.getElementById('admin-' + t);
      if (el) el.style.display = t === tab ? '' : 'none';
      const btn = document.getElementById('admin-tab-' + t);
      if (btn) btn.className = 'btn ' + (t === tab ? 'btn-primary' : 'btn-outline');
    });
  },

  async adminToggleTop(id) {
    const data = await this.api(`/api/admin/posts/${id}/top`, { method: 'POST' });
    if (data.ok) { this.toast(data.is_top ? '已置顶' : '已取消置顶'); this.pageAdmin(); }
  },

  async adminToggleEssence(id) {
    const data = await this.api(`/api/admin/posts/${id}/essence`, { method: 'POST' });
    if (data.ok) { this.toast(data.is_essence ? '已加精' : '已取消精华'); this.pageAdmin(); }
  },

  async adminDeletePost(id) {
    if (!confirm('确定删除此帖子？此操作不可恢复！')) return;
    const data = await this.api(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (data.ok) { this.toast('帖子已删除'); this.pageAdmin(); }
  },

  async adminDeleteDynamic(id) {
    if (!confirm('确定删除此动态？')) return;
    const data = await this.api(`/api/admin/dynamics/${id}`, { method: 'DELETE' });
    if (data.ok) { this.toast('动态已删除'); this.pageAdmin(); }
  },

  // ===== Actions =====
  async doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const data = await this.api('/api/auth/login', { method: 'POST', body: { username, password } });
    if (data.ok) { this.user = data.user; this.toast('登录成功！'); location.hash = '#/'; }
  },

  async doRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    if (password !== confirm) { this.toast('两次密码不一致', 'error'); return; }
    const data = await this.api('/api/auth/register', { method: 'POST', body: { username, email, password } });
    if (data.ok) { this.toast('注册成功，请登录！'); location.hash = '#/login'; }
  },

  async logout() {
    await this.api('/api/auth/logout', { method: 'POST' });
    this.user = null;
    this.toast('已退出登录', 'info');
    location.hash = '#/';
  },

  async submitPost() {
    const board_id = parseInt(document.getElementById('post-board').value);
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const reward_points = parseInt(document.getElementById('post-reward').value) || 0;
    if (!title || !content) { this.toast('标题和内容不能为空', 'error'); return; }
    const data = await this.api('/api/posts', { method: 'POST', body: { board_id, title, content, reward_points } });
    if (data.ok) { this.toast('发布成功！'); location.hash = `#/post?id=${data.post_id}`; }
  },

  async submitReply(postId) {
    const content = document.getElementById('reply-content').value.trim();
    if (!content) { this.toast('回复内容不能为空', 'error'); return; }
    const data = await this.api(`/api/posts/${postId}/replies`, { method: 'POST', body: { content } });
    if (data.ok) { this.toast('回复成功！'); this.pagePost(); }
  },

  async likePost(id) {
    const data = await this.api(`/api/posts/${id}/like`, { method: 'POST' });
    if (data.ok) { this.toast(`👍 已点赞 (${data.like_count})`); this.pagePost(); }
  },

  async favPost(id) {
    const data = await this.api(`/api/posts/${id}/favorite`, { method: 'POST' });
    if (data.ok) { this.toast(data.favorited ? '已收藏' : '已取消收藏'); this.pagePost(); }
  },

  async toggleTop(id) {
    const data = await this.api(`/api/posts/${id}/top`, { method: 'POST' });
    if (data.ok) { this.toast(data.is_top ? '已置顶' : '已取消置顶'); this.pagePost(); }
  },

  async toggleEssence(id) {
    const data = await this.api(`/api/posts/${id}/essence`, { method: 'POST' });
    if (data.ok) { this.toast(data.is_essence ? '已加精' : '已取消精华'); this.pagePost(); }
  },

  async deletePost(id) {
    if (!confirm('确定删除此帖子？')) return;
    const data = await this.api(`/api/posts/${id}`, { method: 'DELETE' });
    if (data.ok) { this.toast('已删除'); location.hash = '#/'; }
  },

  async acceptReply(id) {
    if (!confirm('采纳此回复？积分将奖励给对方')) return;
    const data = await this.api(`/api/posts/replies/${id}/accept`, { method: 'POST' });
    if (data.ok) { this.toast(`采纳成功！奖励 ${data.rewarded} 积分`); this.route(); }
  },

  async deleteReply(replyId, postId) {
    if (!confirm('确定删除此回复？')) return;
    const data = await this.api(`/api/posts/replies/${replyId}`, { method: 'DELETE' });
    if (data.ok) { this.toast('回复已删除'); this.pagePost(); }
  },

  async banUser(id) {
    const data = await this.api(`/api/admin/users/${id}/ban`, { method: 'POST' });
    if (data.ok) { this.toast(`已${data.status === 'banned' ? '封禁' : '解封'}`); this.pageAdmin(); }
  },

  async changeRole(id, role) {
    const data = await this.api(`/api/admin/users/${id}/role`, { method: 'POST', body: { role } });
    if (data.ok) { this.toast('角色已更新'); this.pageAdmin(); }
  },

  async createBoard() {
    const name = document.getElementById('nb-name').value.trim();
    const description = document.getElementById('nb-desc').value.trim();
    if (!name) { this.toast('名称不能为空', 'error'); return; }
    const data = await this.api('/api/admin/boards', { method: 'POST', body: { name, description, icon: '💬' } });
    if (data.ok) { this.toast('板块已创建'); this.pageAdmin(); }
  },

  async deleteBoard(id) {
    if (!confirm('确定删除？')) return;
    const data = await this.api(`/api/admin/boards/${id}`, { method: 'DELETE' });
    if (data.ok) { this.toast('已删除'); this.pageAdmin(); }
  },

  search() {
    const q = document.getElementById('search-input').value.trim();
    const cat = document.getElementById('search-category')?.value;
    if (!q) return;
    if (cat && cat !== 'all') {
      location.hash = `#/board?id=${cat}&q=${encodeURIComponent(q)}`;
    } else {
      location.hash = `#/board?q=${encodeURIComponent(q)}`;
    }
  },

  quickSearch(q) {
    const input = document.getElementById('search-input');
    if (input) input.value = q;
    this.search();
  },

  // ===== Utilities =====
  setContent(html) {
    const el = document.getElementById('app-content');
    if (el) el.innerHTML = html;
  },

  toast(msg, type = 'success') {
    const container = document.getElementById('toast-container') || (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    return d.toLocaleDateString('zh-CN');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
