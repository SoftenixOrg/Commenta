class CommentsWidget {
  constructor(options = {}) {
    this.containerId = options.containerId || 'comments';
    this.contentId = options.contentId || window.location.pathname;
    this.apiBase = options.apiBase || '';
    this.theme = options.theme || 'light';

    this.currentUser = null;
    this.comments = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.replyingTo = null;
    this.editingComment = null;

    this.init();
  }

  async init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }

    if (!document.querySelector('link[href*="widget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${this.apiBase}/widget.css`;
      document.head.appendChild(link);
    }

    await this.checkAuthStatus();
    this.render();
    await this.loadComments();
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.apiBase}/auth/status`, { credentials: 'include' });
      const data = await response.json();
      if (data.authenticated) this.currentUser = data.user;
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  async loadComments(page = 1) {
    if (this.isLoading) return;
    this.isLoading = true;
    // this.showLoading()

    try {
      const response = await fetch(`${this.apiBase}/api/comments?content_id=${encodeURIComponent(this.contentId)}&page=${page}&limit=20`, { credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        this.comments = data.data.comments;
        this.currentPage = data.data.pagination.page;
        this.totalPages = data.data.pagination.totalPages;
        this.renderComments();
        this.renderPagination();
      } else {
        this.showError(data.message);
      }
    } catch (error) {
      this.showError('Failed to load comments');
      console.error('Load comments error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async submitComment(content, parentId = null) {
    if (!this.currentUser) return this.showError('Please login to comment');
    if (!content.trim()) return this.showError('Comment cannot be empty');

    try {
      const response = await fetch(`${this.apiBase}/api/comments`, {
        method     : 'POST',
        headers    : { 'Content-Type': 'application/json' },
        credentials: 'include',
        body       : JSON.stringify({ content_id: this.contentId, parent_id: parentId, content: content.trim() }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        this.showSuccess('Comment posted successfully!');
        this.replyingTo = null;
        await this.loadComments(this.currentPage);
      } else this.showError(data.message);
    } catch (error) {
      this.showError('Failed to post comment');
      console.error('Submit comment error:', error);
    }
  }

  async updateComment(commentId, content) {
    if (!content.trim()) return this.showError('Comment cannot be empty'); // DEĞİŞİKLİK: Ekstra kontrol
    try {
      const response = await fetch(`${this.apiBase}/api/comments/${commentId}`, {
        method     : 'PUT',
        headers    : { 'Content-Type': 'application/json' },
        credentials: 'include',
        body       : JSON.stringify({ content: content.trim(), content_id: this.contentId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        this.showSuccess('Comment updated successfully!');
        this.editingComment = null;
        await this.loadComments(this.currentPage);
      } else this.showError(data.message);
    } catch (error) {
      this.showError('Failed to update comment');
      console.error('Update comment error:', error);
    }
  }

  async deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const response = await fetch(`${this.apiBase}/api/comments/${commentId}`, {
        method     : 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        this.showSuccess('Comment deleted successfully!');
        await this.loadComments(this.currentPage);
      } else this.showError(data.message);
    } catch (error) {
      this.showError('Failed to delete comment');
      console.error('Delete comment error:', error);
    }
  }

  async likeComment(commentId) {
    if (!this.currentUser) {
      this.showError('Please login to like comments');
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/api/comments/${commentId}/like`, {
        method     : 'POST',
        headers    : { 'Content-Type': 'application/json' },
        credentials: 'include',
        body       : JSON.stringify({ userId: this.currentUser.id })
      });
      const data = await response.json();
      if (data.status === 'success') {
        this.updateCommentInList(commentId, data.data.updatedComment);
        this.renderComments();
      } else this.showError(data.message);
    } catch (error) {
      this.showError('Failed to like comment');
      console.error('Like comment error:', error);
    }
  }

  updateCommentInList(commentId, updatedComment) {
    for (let i = 0; i < this.comments.length; i++) {
      if (this.comments[i].id === commentId) {
        this.comments[i] = updatedComment;
        return;
      }
      if (this.comments[i].replies) {
        for (let j = 0; j < this.comments[i].replies.length; j++) {
          if (this.comments[i].replies[j].id === commentId) {
            this.comments[i].replies[j] = updatedComment;
            return;
          }
        }
      }
    }
  }

  async logout() {
    try {
      const response = await fetch(`${this.apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (data.status === 'success') {
        this.currentUser = null;
        this.showSuccess('Logged out successfully!');
        this.render();
      } else this.showError(data.message);
    } catch (error) {
      this.showError('Logout failed');
      console.error('Logout error:', error);
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.container.className = `comments-widget ${this.theme === 'dark' ? 'dark-theme' : ''}`;
    localStorage.setItem('comments-widget-theme', this.theme);
  }

  render() {
    const savedTheme = localStorage.getItem('comments-widget-theme');
    if (savedTheme) this.theme = savedTheme;
    this.container.className = `comments-widget ${this.theme === 'dark' ? 'dark-theme' : ''}`;

    this.container.innerHTML = `
  <div class="comments-header">
    <h3 class="comments-title">Comments</h3>
    <button class="theme-toggle" id="theme-toggle-btn">
      ${this.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  </div>
  <div class="comments-content-wrapper">
    <div id="messages"></div>
    <div id="auth-section"></div>
    <div id="comments-list"></div>
    <div id="pagination"></div>
  </div>
`;

    this.bindHeaderEvents();
    this.renderAuthSection();
  }

  bindHeaderEvents() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());
  }

  renderAuthSection() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    if (!this.currentUser) {
      authSection.innerHTML = `
        <div class="auth-section">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Please login with Google to post comments</p>
          <a href="${this.apiBase}/auth/google" class="login-btn">Login with Google</a>
        </div>
      `;
    } else {
      authSection.innerHTML = `
        <div class="auth-section">
          <div class="user-info">
            <img src="${this.currentUser.avatar_url}" alt="${this.currentUser.username}" class="user-avatar">
            <span class="user-name">${this.escapeHtml(this.currentUser.username)}</span>
            <button class="logout-btn" id="logout-btn">Logout</button>
          </div>
          <div id="comment-form-container">${this.renderCommentForm()}</div>
        </div>
      `;
      this.bindAuthEvents();
    }
  }

  bindAuthEvents() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    const formContainer = document.getElementById('comment-form-container');
    if (formContainer && formContainer.querySelector('.comment-form')) {
      this.bindFormEvents(formContainer.querySelector('.comment-form'));
    }
  }

  renderCommentForm(parentId = null, editingComment = null) {
    const isEditing = editingComment !== null;
    const content = isEditing ? editingComment.content : '';
    const placeholder = parentId ? 'Write a reply...' : 'Write a comment...';
    const submitText = isEditing ? 'Update' : parentId ? 'Reply' : 'Post Comment';
    const formId = isEditing ? `comment-form-edit-${editingComment.id}` : `comment-form-${parentId || 'main'}`;

    return `
      <div class="comment-form" id="${formId}">
        <textarea class="comment-textarea" placeholder="${placeholder}" maxlength="2000">${content}</textarea>
        <div class="comment-form-actions">
          <span class="char-count">${content.length}/2000</span>
          <div>
            ${parentId || isEditing ? `<button class="cancel-btn" data-parent="${parentId || ''}" data-editing="${isEditing ? editingComment.id : ''}">Cancel</button>` : ''}
            <button class="submit-btn" data-parent="${parentId || ''}" data-editing="${isEditing ? editingComment.id : ''}">${submitText}</button>
          </div>
        </div>
      </div>
    `;
  }

  bindFormEvents(form) {
    if (!form) return;
    const textarea = form.querySelector('.comment-textarea');
    if (textarea) textarea.addEventListener('input', (e) => this.updateCharCount(e.target));

    const submitBtn = form.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', (event) => {
        const parentId = event.target.dataset.parent || null;
        const editingId = event.target.dataset.editing ? parseInt(event.target.dataset.editing) : null;
        const formElement = event.target.closest('.comment-form'); // Butonun içinde bulunduğu formu bul
        this.handleSubmit(formElement, parentId, editingId);
      });
    }

    const cancelBtn = form.querySelector('.cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.cancelReply());
  }

  renderComments() {
    const commentsContainer = document.getElementById('comments-list');
    if (!commentsContainer) return;

    if (this.comments.length === 0) {
      commentsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color: var(--text-secondary);">No comments yet. Be the first to comment!</div>`;
      return;
    }

    commentsContainer.innerHTML = this.comments.map(c => this.renderComment(c)).join('');
    this.bindCommentActions();
  }

  renderComment(comment, isReply = false) {
    const canEdit = this.currentUser && this.currentUser.id === comment.user_id;
    const timeAgo = this.timeAgo(new Date(comment.created_at));

    return `
      <div class="comment ${isReply ? 'reply' : ''}" id="comment-${comment.id}">
        <div class="comment-header">
          <img src="${comment.avatar_url}" alt="${comment.username}" class="comment-avatar">
          <span class="comment-author">${this.escapeHtml(comment.username)}</span>
          <span class="comment-date">${timeAgo}</span>
          ${comment.created_at !== comment.updated_at ? '<span class="comment-date">(edited)</span>' : ''}
        </div>
        <div class="comment-content" id="content-${comment.id}">${this.escapeHtml(comment.content)}</div>
        <div class="comment-actions">
          <button class="action-btn like-btn" data-id="${comment.id}">❤️ ${comment.likes}</button>
          ${this.currentUser ? `<button class="action-btn reply-btn" data-id="${comment.id}">Reply</button>` : ''}
          ${canEdit ? `<button class="action-btn edit-btn" data-id="${comment.id}">Edit</button><button class="action-btn delete-btn" data-id="${comment.id}">Delete</button>` : ''}
        </div>
        <div id="reply-form-${comment.id}"></div>
        ${comment.replies && comment.replies.length ? `<div class="comment-replies">${comment.replies.map(r => this.renderComment(r, true)).join('')}</div>` : ''}
      </div>
    `;
  }

  bindCommentActions() {
    this.container.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => this.likeComment(e.target.dataset.id)));
    this.container.querySelectorAll('.reply-btn').forEach(btn => btn.addEventListener('click', (e) => this.startReply(e.target.dataset.id)));
    this.container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => this.startEdit(e.target.dataset.id)));
    this.container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => this.deleteComment(e.target.dataset.id)));
  }

  renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const prevDisabled = this.currentPage === 1;
    const nextDisabled = this.currentPage === this.totalPages;

    paginationContainer.innerHTML = `
      <div class="pagination">
        <button class="pagination-btn" ${prevDisabled ? 'disabled' : ''} data-page="${this.currentPage - 1}">Previous</button>
        <span class="pagination-info">Page ${this.currentPage} of ${this.totalPages}</span>
        <button class="pagination-btn" ${nextDisabled ? 'disabled' : ''} data-page="${this.currentPage + 1}">Next</button>
      </div>
    `;
    paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.loadComments(e.target.dataset.page));
    });
  }

  updateCharCount(textarea) {
    const count = textarea.value.length;
    const form = textarea.closest('.comment-form');
    if (!form) return;
    const counter = form.querySelector('.char-count');
    if (counter) {
      counter.textContent = `${count}/2000`;
      counter.className = count > 1800 ? 'char-count warning' : 'char-count';
    }
  }

  handleSubmit(form, parentId = null, editingId = null) {
    if (!form) return;
    const textarea = form.querySelector('.comment-textarea');
    if (!textarea) return;
    const content = textarea.value.trim();

    if (editingId) {
      this.updateComment(editingId, content);
    } else {
      this.submitComment(content, parentId);
    }

    textarea.value = '';
    this.updateCharCount(textarea);
  }

  startReply(commentId) {
    this.cancelReply();
    this.replyingTo = commentId;
    const replyContainer = document.getElementById(`reply-form-${commentId}`);
    if (!replyContainer) return;
    replyContainer.innerHTML = this.renderCommentForm(commentId);
    this.bindFormEvents(replyContainer.querySelector('.comment-form'));
  }

  startEdit(commentId) {
    this.cancelReply();
    const comment = this.findCommentById(commentId);
    if (!comment) return;
    this.editingComment = comment;
    const contentDiv = document.getElementById(`content-${commentId}`);
    if (contentDiv) {
      contentDiv.innerHTML = this.renderCommentForm(null, comment);
      this.bindFormEvents(contentDiv.querySelector('.comment-form'));
    }
  }

  cancelReply() {
    if (this.replyingTo) {
      const replyContainer = document.getElementById(`reply-form-${this.replyingTo}`);
      if (replyContainer) replyContainer.innerHTML = '';
      this.replyingTo = null;
    }
    if (this.editingComment) {
      const contentDiv = document.getElementById(`content-${this.editingComment.id}`);
      if (contentDiv) contentDiv.innerHTML = this.escapeHtml(this.editingComment.content);
      this.editingComment = null;
    }
  }

  findCommentById(id) {
    const searchId = parseInt(id, 10);
    for (const comment of this.comments) {
      if (comment.id === searchId) return comment;
      if (comment.replies) {
        for (const reply of comment.replies) if (reply.id === searchId) return reply;
      }
    }
    return null;
  }

  showLoading() {
    document.getElementById('messages').innerHTML = `<div class="loading"><span class="loading-spinner"></span> Loading comments...</div>`;
  }

  showError(message) {
    const msg = document.getElementById('messages');
    if (msg) {
      msg.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
      setTimeout(() => {
        msg.innerHTML = '';
      }, 5000);
    }
  }

  showSuccess(message) {
    const msg = document.getElementById('messages');
    if (msg) {
      msg.innerHTML = `<div class="success">${this.escapeHtml(message)}</div>`;
      setTimeout(() => {
        msg.innerHTML = '';
      }, 3000);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  timeAgo(date) {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  }
}

// Global instance
let commentsWidget;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('comments')) commentsWidget = new CommentsWidget();
});
