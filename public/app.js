let allPosts = [];
let activeFilter = 'all';

// Fetch data initially and start polling
document.addEventListener('DOMContentLoaded', () => {
  fetchStatus();
  setInterval(fetchStatus, 3000); // Poll status every 3 seconds

  // Register form submit
  document.getElementById('config-form').addEventListener('submit', saveConfig);

  // Register main control buttons
  document.getElementById('btn-schedule').addEventListener('click', runAction.bind(null, 'schedule'));
  document.getElementById('btn-stop').addEventListener('click', runAction.bind(null, 'stop'));
  document.getElementById('btn-delete').addEventListener('click', runAction.bind(null, 'delete-scheduled'));
  document.getElementById('btn-reset').addEventListener('click', runAction.bind(null, 'reset'));
});

// 1. Fetch Status and update UI
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.success) return;

    // Update Stats
    document.getElementById('stat-total').innerText = data.progress.total;
    document.getElementById('stat-completed').innerText = data.progress.completed;
    document.getElementById('stat-pending').innerText = data.progress.pending;
    document.getElementById('stat-failed').innerText = data.progress.failed;

    // Update Facebook Status Header
    const fbHeader = document.getElementById('fb-connection-card');
    const statusDot = document.getElementById('status-dot');
    const pageNameSpan = document.getElementById('status-page-name');

    if (data.fbStatus.valid) {
      statusDot.className = 'status-indicator green';
      pageNameSpan.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.fbStatus.name} (Đã kết nối)`;
    } else {
      statusDot.className = 'status-indicator red';
      pageNameSpan.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.fbStatus.error || 'Token không hợp lệ'}`;
    }

    // Update Config Placeholders
    if (document.activeElement !== document.getElementById('config-page-id')) {
      document.getElementById('config-page-id').value = data.config.pageId;
    }
    if (document.activeElement !== document.getElementById('config-access-token')) {
      // Only set placeholder if value isn't typed yet
      if (!document.getElementById('config-access-token').value) {
        document.getElementById('config-access-token').value = data.config.accessToken;
      }
    }

    // Update Active Process Buttons & Terminal Badge
    const btnSchedule = document.getElementById('btn-schedule');
    const btnStop = document.getElementById('btn-stop');
    const btnDelete = document.getElementById('btn-delete');
    const btnReset = document.getElementById('btn-reset');
    const terminalBadge = document.getElementById('process-badge');

    if (data.isRunning) {
      btnSchedule.disabled = true;
      btnDelete.disabled = true;
      btnReset.disabled = true;
      btnStop.disabled = false;
      terminalBadge.innerText = 'Active';
      terminalBadge.className = 'terminal-status active';
    } else {
      btnSchedule.disabled = false;
      btnDelete.disabled = false;
      btnReset.disabled = false;
      btnStop.disabled = true;
      terminalBadge.innerText = 'Inactive';
      terminalBadge.className = 'terminal-status';
    }

    // Update Terminal Logs
    const logBox = document.getElementById('terminal-logs');
    // Save scroll position
    const isScrolledToBottom = logBox.scrollHeight - logBox.clientHeight <= logBox.scrollTop + 30;

    logBox.innerHTML = '';
    data.logs.forEach(log => {
      const line = document.createElement('div');
      line.className = 'log-line';
      if (log.includes('[LỖI]')) line.classList.add('error');
      else if (log.includes('[Hệ thống]')) line.classList.add('system');
      else if (log.includes('WARNING') || log.includes('Loi:')) line.classList.add('warning');
      
      line.innerText = log;
      logBox.appendChild(line);
    });

    if (isScrolledToBottom && data.logs.length > 0) {
      logBox.scrollTop = logBox.scrollHeight;
    }

    // Render Posts
    allPosts = data.posts;
    renderPosts();

  } catch (err) {
    console.error('Error fetching status:', err);
  }
}

// 2. Render Posts Grid
function renderPosts() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '';

  const filtered = allPosts.filter(p => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="glass-panel w-full text-center" style="grid-column: 1/-1; color: var(--text-secondary);">Không có bài đăng nào thuộc trạng thái này.</div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.onclick = () => openModal(p);

    const typeIcons = {
      'infographic': '<i class="fa-solid fa-chart-pie"></i>',
      'slide-deck': '<i class="fa-solid fa-file-powerpoint"></i>',
      'mind-map': '<i class="fa-solid fa-network-wired"></i>',
      'quiz': '<i class="fa-solid fa-circle-question"></i>',
      'flashcards': '<i class="fa-solid fa-copy"></i>',
      'report': '<i class="fa-solid fa-file-invoice"></i>',
      'data-table': '<i class="fa-solid fa-table"></i>'
    };

    const statusLabels = {
      'completed': 'Đã đăng',
      'failed': 'Lỗi',
      'pending': 'Đang chờ'
    };

    card.innerHTML = `
      <div class="post-card-header">
        <span class="post-id-tag">${p.id}</span>
        <span class="status-badge ${p.status}">${statusLabels[p.status]}</span>
      </div>
      <div class="post-card-body">
        <h4>${typeIcons[p.type] || '<i class="fa-solid fa-newspaper"></i>'} ${p.type}</h4>
        <p>${p.captionSnippet || 'Chưa có nội dung...'}</p>
      </div>
      <div class="post-card-footer">
        <span><i class="fa-solid fa-calendar-day"></i> ${p.date}</span>
        <span>${p.hasImage ? '<i class="fa-solid fa-image" style="color: #20bf6b;"></i> Có ảnh' : '<i class="fa-solid fa-font"></i> Chữ'}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// 3. Filter badges handle
function filterPosts(status) {
  activeFilter = status;
  const badges = document.querySelectorAll('.filter-badge');
  badges.forEach(b => b.classList.remove('active'));
  
  // Find correct badge to active
  const idxMap = { 'all': 0, 'pending': 1, 'completed': 2, 'failed': 3 };
  badges[idxMap[status]].classList.add('active');

  renderPosts();
}

// 4. Modal actions
function openModal(post) {
  document.getElementById('modal-post-id').value = post.id;
  document.getElementById('modal-post-title').innerText = `Chi tiết bài viết ${post.id}`;
  document.getElementById('modal-post-date').innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${post.date}`;
  document.getElementById('modal-post-type').innerHTML = `<i class="fa-solid fa-hashtag"></i> ${post.type.toUpperCase()}`;
  document.getElementById('modal-post-caption').value = post.captionFull;

  document.getElementById('caption-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('caption-modal').classList.remove('open');
}

async function saveCaption() {
  const id = document.getElementById('modal-post-id').value;
  const caption = document.getElementById('modal-post-caption').value;

  try {
    const res = await fetch('/api/save-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, caption })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeModal();
      fetchStatus();
    } else {
      alert(`Lỗi: ${data.error}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối: ${err.message}`);
  }
}

// 5. Config Save
async function saveConfig(e) {
  e.preventDefault();
  const pageId = document.getElementById('config-page-id').value;
  const accessToken = document.getElementById('config-access-token').value;

  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, accessToken })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      document.getElementById('config-access-token').value = ''; // clear token input, it will reload mask
      window.location.reload(); // Reload page to apply new Page ID and Token
    } else {
      alert(`Lỗi: ${data.error}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối: ${err.message}`);
  }
}

// 6. Action triggering helper
async function runAction(action) {
  let confirmMsg = '';
  if (action === 'reset') confirmMsg = 'Bạn có chắc chắn muốn RESET hàng chờ về 0? Tất cả bài viết sẽ được xếp lịch lại từ đầu!';
  if (action === 'delete-scheduled') confirmMsg = 'BẠN CÓ CHẮC CHẮN? Lệnh này sẽ XOÁ TOÀN BỘ các bài đã lên lịch của Fanpage trên Facebook!';

  if (confirmMsg && !confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/action/${action}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      fetchStatus();
    } else {
      alert(`Lỗi: ${data.error}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối: ${err.message}`);
  }
}

// Password toggle helper
function togglePasswordVisibility() {
  const input = document.getElementById('config-access-token');
  const eye = document.getElementById('password-eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
}
