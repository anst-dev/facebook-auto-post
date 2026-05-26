/* ═══════════════════════════════════════════════
   FB Auto Post — Client-side JS v2
   ═══════════════════════════════════════════════ */

// ─── Sidebar ───
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburgerBtn');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
}

if (overlay) {
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ─── Toast System ───
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Counter Animation ───
function animateCounter(el, target, duration = 800) {
  if (!el || !target) return;
  const start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Auto animate counters on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    animateCounter(el, target);
  });
});

// ─── Keywords Page Logic ───
const API = '/admin/api/keywords';
const STATS_API = '/admin/api/stats';

// Modal helpers
function openModal(data) {
  const modal = document.getElementById('kwModal');
  if (!modal) return;
  modal.classList.add('active');
  if (data) {
    document.getElementById('kwId').value = data.id || '';
    document.getElementById('kwKeyword').value = data.keyword || '';
    document.getElementById('kwReply').value = data.replyComment || '';
    document.getElementById('kwDM').value = data.privateMessage || '';
    document.getElementById('kwEnabled').checked = data.enabled !== false;
    document.getElementById('modalTitle').textContent = 'Sửa từ khóa';
    document.getElementById('kwSaveBtn').textContent = 'Cập nhật';
  } else {
    document.getElementById('kwForm').reset();
    document.getElementById('kwId').value = '';
    document.getElementById('kwEnabled').checked = true;
    document.getElementById('modalTitle').textContent = 'Thêm từ khóa mới';
    document.getElementById('kwSaveBtn').textContent = 'Thêm';
  }
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  const modal = document.getElementById('kwModal');
  if (modal) modal.classList.remove('active');
}

// Escape to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Save keyword (create or update)
async function saveKeyword(e) {
  e.preventDefault();
  const id = document.getElementById('kwId').value;
  const body = {
    keyword: document.getElementById('kwKeyword').value.trim().toUpperCase(),
    replyComment: document.getElementById('kwReply').value.trim(),
    privateMessage: document.getElementById('kwDM').value.trim(),
    enabled: document.getElementById('kwEnabled').checked
  };

  if (!body.keyword) return showToast('Vui lòng nhập từ khóa', 'error');

  try {
    const res = await fetch(id ? `${API}/${id}` : API, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Lỗi lưu từ khóa');
    showToast(id ? 'Đã cập nhật từ khóa' : 'Đã thêm từ khóa', 'success');
    closeModal();
    loadKeywords();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete keyword with confirmation
async function deleteKeyword(id, keyword) {
  if (!confirm(`Xóa từ khóa "${keyword}"?`)) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Lỗi xóa');
    showToast(`Đã xóa "${keyword}"`, 'success');
    loadKeywords();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toggle keyword enabled
async function toggleKeyword(id, enabled) {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Lỗi cập nhật');
    showToast(enabled ? 'Đã bật' : 'Đã tắt', 'success');
    loadKeywords();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load and render keywords
async function loadKeywords() {
  const grid = document.getElementById('kwGrid');
  const empty = document.getElementById('kwEmpty');
  if (!grid) return;

  try {
    const res = await fetch(API);
    const keywords = await res.json();

    // Update stats
    const kwCount = document.getElementById('kwCount');
    const kwEnabled = document.getElementById('kwEnabled');
    const kwReplies = document.getElementById('kwReplies');
    const kwDMs = document.getElementById('kwDMs');
    if (kwCount) kwCount.textContent = keywords.length;

    if (keywords.length === 0) {
      grid.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    grid.innerHTML = keywords.map(kw => `
      <div class="kw-card">
        <div class="kw-card-header">
          <span class="kw-keyword">${kw.keyword}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <label class="toggle-label" style="font-size:0">
              <input type="checkbox" ${kw.enabled ? 'checked' : ''} onchange="toggleKeyword('${kw.id}', this.checked)">
              <span class="toggle-switch"></span>
            </label>
            <button class="icon-btn" onclick='openModal(${JSON.stringify(kw).replace(/'/g, "&#39;")})' title="Sửa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="icon-btn icon-btn-danger" onclick="deleteKeyword('${kw.id}','${kw.keyword}')" title="Xóa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div style="padding:14px 18px">
          ${kw.replyComment ? `<div class="field-group"><div class="field-label">💬 Phản hồi</div><div class="field-content">${kw.replyComment}</div></div>` : ''}
          ${kw.privateMessage ? `<div class="field-group"><div class="field-label">✉️ DM</div><div class="field-content">${kw.privateMessage}</div></div>` : ''}
          ${!kw.replyComment && !kw.privateMessage ? '<div class="text-muted" style="padding:8px 0">Chưa có phản hồi</div>' : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Lỗi tải từ khóa', 'error');
  }
}

// Filter keywords
function filterKeywords() {
  const query = document.getElementById('kwSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.kw-card').forEach(card => {
    const keyword = card.querySelector('.kw-keyword')?.textContent.toLowerCase() || '';
    const content = card.textContent.toLowerCase();
    card.style.display = (keyword.includes(query) || content.includes(query)) ? '' : 'none';
  });
}

// Auto-load keywords on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('kwGrid')) {
    loadKeywords();
  }
});

// ─── Ctrl+K search shortcut ───
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('kwSearch');
    if (searchInput) searchInput.focus();
  }
});
