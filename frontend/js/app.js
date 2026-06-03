const API = '';

const App = {
  user: null,

  async init() {
    await this.checkAuth();
    this.bindNav();
    this.route();
    window.addEventListener('hashchange', () => this.route());
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
        <div class="user-area">
          <div class="avatar">${this.user.username[0]}</div>
          <a href="#/profile/${this.user.id}" style="color:#fff;font-weight:600;font-size:.9rem;">${this.user.username}</a>
          <span class="points">${this.user.points}分</span>
          <a href="#/messages" style="color:rgba(255,255,255,.7);font-size:.85rem;">私信${unread ? `<span style="background:var(--danger);color:#fff;border-radius:50%;padding:1px 6px;font-size:.7rem;margin-left:2px;">${unread}</span>` : ''}</a>
          <a href="#" onclick="App.logout()" style="color:rgba(255,255,255,.7);font-size:.85rem;">退出</a>
        </div>`;
    } else {
      userArea = `
        <div class="user-area">
          <a href="#/login" style="color:rgba(255,255,255,.8);font-size:.9rem;">登录</a>
          <a href="#/register" style="color:rgba(255,255,255,.8);font-size:.9rem;">注册</a>
        </div>`;
    }
    const isAdmin = this.user && this.user.role === 'admin';
    nav.innerHTML = `
      <a class="brand" href="#/"><span>💬</span> BBS论坛</a>
      <div class="nav-links">
        <a href="#/">首页</a>
        ${this.user ? '<a href="#/new-post">发帖</a>' : ''}
        ${this.user ? `<a href="#/messages">私信</a>` : ''}
        ${isAdmin ? '<a href="#/admin">管理</a>' : ''}
      </div>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="搜索帖子..." onkeydown="if(event.key==='Enter')App.search()">
        <button onclick="App.search()">🔍</button>
      </div>
      ${userArea}`;
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
      '/profile': () => this.pageProfile(),
      '/messages': () => this.pageMessages(),
      '/admin': () => this.pageAdmin(),
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

  // ===== Pages =====
  async pageHome() {
    const data = await this.api('/api/boards');
    if (!data.ok) return;
    const boards = data.boards;
    let html = `<div class="section-title">🏠 论坛板块</div><div class="boards-grid">`;
    for (const b of boards) {
      html += `
        <div class="card board-card" onclick="location.hash='#/board?id=${b.id}'">
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
    html += '</div>';
    if (this.user) {
      html += `<div style="text-align:center;margin-top:24px;">
        <a href="#/new-post" class="btn btn-primary btn-lg">✏️ 发布新帖</a></div>`;
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
          <div class="post-avatar">${p.author_name ? p.author_name[0] : '?'}</div>
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
            <span class="post-avatar" style="width:28px;height:28px;font-size:11px;display:inline-flex;vertical-align:middle;margin-right:4px;">${p.author_name[0]}</span>
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
              <span class="post-avatar" style="width:28px;height:28px;font-size:11px;">${r.author_name[0]}</span>
              <a href="#/profile/${r.author_id}">${r.author_name}</a>
              ${r.is_accepted ? '<span class="badge badge-reward">已采纳</span>' : ''}
            </div>
            <span style="color:var(--gray-400);font-size:.8rem;">${this.timeAgo(r.created_at)}</span>
          </div>
          <div class="reply-content">${this.esc(r.content)}</div>
          ${this.user && p.reward_points > 0 && p.author_id === this.user.id && !r.is_accepted ? `
            <button class="btn btn-sm btn-success mt-1" onclick="App.acceptReply(${r.id})">✅ 采纳 (${p.reward_points}分)</button>
          ` : ''}
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
    const userId = parts[2] || (this.user ? this.user.id : 0);
    const data = await this.api(`/api/users/${userId}`);
    if (!data.ok) return;
    const u = data.user;
    const posts = data.posts || [];
    const replyCount = data.reply_count || 0;
    const isMe = this.user && this.user.id == u.id;

    // 头像：有自定义URL用img，否则用首字母
    const avatarHtml = u.avatar
      ? `<img src="${this.esc(u.avatar)}" class="avatar-lg" style="object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="avatar-lg" style="display:none;">${u.username[0]}</div>`
      : `<div class="avatar-lg">${u.username[0]}</div>`;

    // 性别图标
    const genderIcon = u.gender === '男' ? '👨' : u.gender === '女' ? '👩' : '';

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
            <h2>${this.esc(u.username)} ${genderIcon}
            </h2>
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
              <div class="stat-item"><strong>${replyCount}</strong><span>回复</span></div>
              <div class="stat-item"><strong>${u.points}</strong><span>积分</span></div>
              <div class="stat-item"><strong>${u.login_count || 0}</strong><span>登录</span></div>
            </div>
            <div class="profile-joined">注册于 ${u.created_at ? u.created_at.slice(0,10) : '-'}</div>
          </div>
          <div class="profile-actions">
            ${isMe ? `<button class="btn btn-primary btn-sm" onclick="App.showEditProfile()">✏️ 编辑资料</button>` : ''}
            ${this.user && !isMe ? `<a href="#/messages?to=${u.id}" class="btn btn-outline btn-sm">✉️ 发私信</a>` : ''}
          </div>
        </div>
      </div>

      <div class="profile-tabs">
        <button class="profile-tab active" onclick="App.profileTab('posts',${userId})">📝 帖子</button>
        <button class="profile-tab" onclick="App.profileTab('replies',${userId})">💬 回复</button>
        <button class="profile-tab" onclick="App.profileTab('favs',${userId})">⭐ 收藏</button>
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

      <div id="profile-replies" class="profile-tab-content" style="display:none;"></div>
      <div id="profile-favs" class="profile-tab-content" style="display:none;"></div>
    `;
    this.setContent(html);
  },

  async profileTab(tab, userId) {
    // 切换tab样式
    document.querySelectorAll('.profile-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    // 切换内容
    document.querySelectorAll('.profile-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`profile-${tab}`).style.display = '';

    // 懒加载
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
  },

  showEditProfile() {
    const u = this.user;
    // 创建模态框
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
    const data = await this.api('/api/users/messages');
    const recv = data.recv || [];
    const sent = data.sent || [];
    let html = `
      <div class="section-title">✉️ 私信</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="btn btn-sm btn-primary" id="tab-recv" onclick="App.msgTab('recv')">收件箱 (${recv.length})</button>
        <button class="btn btn-sm btn-outline" id="tab-sent" onclick="App.msgTab('sent')">已发送 (${sent.length})</button>
      </div>
      <div id="msg-recv" class="card">`;
    for (const m of recv) {
      html += `<div class="post-item" style="${!m.is_read ? 'background:#fffbeb;' : ''}">
        <div class="post-avatar">${m.sender_name[0]}</div>
        <div class="post-main">
          <div class="post-title"><a href="#/profile/${m.sender_id}">${m.sender_name}</a>
            ${!m.is_read ? '<span style="color:var(--danger);font-size:.75rem;margin-left:4px;">● 新消息</span>' : ''}
          </div>
          <div style="font-size:.9rem;margin-top:2px;">${this.esc(m.content)}</div>
          <div class="post-meta"><span>${this.timeAgo(m.created_at)}</span></div>
        </div>
      </div>`;
    }
    if (!recv.length) html += '<div class="empty-state" style="padding:24px;">暂无私信</div>';
    html += `</div><div id="msg-sent" class="card" style="display:none;">`;
    for (const m of sent) {
      html += `<div class="post-item">
        <div class="post-avatar" style="background:var(--success);">${m.receiver_name[0]}</div>
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
    let html = `
      <div class="section-title">⚙️ 后台管理</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
        <div class="stat-card bg-primary"><h3>${dash.user_count || 0}</h3><p>注册用户</p></div>
        <div class="stat-card bg-success"><h3>${dash.post_count || 0}</h3><p>帖子总数</p></div>
        <div class="stat-card bg-accent"><h3>${dash.board_count || 0}</h3><p>板块数量</p></div>
      </div>

      <div class="section-title">👥 用户管理</div>
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
        <td>${u.role !== 'admin' ? `<button class="btn btn-sm ${u.status==='active'?'btn-danger':'btn-success'}" onclick="App.banUser(${u.id})">${u.status==='active'?'封禁':'解封'}</button>` : '-'}</td>
      </tr>`;
    }
    html += `</tbody></table></div>

      <div class="section-title">📁 板块管理</div>
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
    html += '</tbody></table></div>';
    this.setContent(html);
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
    if (q) location.hash = `#/board?q=${encodeURIComponent(q)}`;
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
