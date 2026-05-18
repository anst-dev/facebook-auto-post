let allPosts = [];
let activeFilter = 'all';
let currentView = 'grid'; // 'grid' or 'table'

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

// 2. Render Posts Grid or Table view
function renderPosts() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '';

  const filtered = allPosts.filter(p => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  if (filtered.length === 0) {
    container.className = 'glass-panel w-full text-center';
    container.innerHTML = `<div style="color: var(--text-secondary); padding: 40px 0;">Không có bài đăng nào thuộc trạng thái này.</div>`;
    return;
  }

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
    'completed': 'Đã đăng/lịch',
    'failed': 'Lỗi',
    'pending': 'Đang chờ'
  };

  if (currentView === 'grid') {
    container.className = 'posts-grid';
    
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.onclick = () => openModal(p);

      let timeLabel = '';
      if (p.scheduledFor) {
        const parts = p.scheduledFor.split(' ');
        const justTime = parts[0]; // "11:46"
        timeLabel = `<span class="time-tag"><i class="fa-solid fa-clock"></i> Lịch: ${justTime}</span>`;
      }

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
          <span><i class="fa-solid fa-calendar-day"></i> ${p.date} ${timeLabel}</span>
          <span>${p.hasImage ? '<i class="fa-solid fa-image" style="color: #20bf6b;"></i> Có ảnh' : '<i class="fa-solid fa-font"></i> Chữ'}</span>
        </div>
      `;
      container.appendChild(card);
    });
  } else {
    // Render Table View
    container.className = 'table-responsive';
    
    const table = document.createElement('table');
    table.className = 'posts-table';
    
    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 80px;">ID</th>
          <th style="width: 110px;">Ngày đăng</th>
          <th style="width: 140px;">Thể loại</th>
          <th>Nội dung caption tóm tắt</th>
          <th style="width: 100px; text-align: center;">Đính kèm</th>
          <th style="width: 120px; text-align: center;">Lịch đăng FB</th>
          <th style="width: 130px; text-align: center;">Trạng thái</th>
          <th style="width: 80px; text-align: center;">Thao tác</th>
        </tr>
      </thead>
      <tbody id="table-body">
      </tbody>
    `;
    
    container.appendChild(table);
    const tbody = document.getElementById('table-body');
    
    filtered.forEach(p => {
      const tr = document.createElement('tr');
      
      const imgIcon = p.hasImage 
        ? '<i class="fa-solid fa-image" style="color: #20bf6b; font-size: 16px;" title="Bài đăng có hình ảnh"></i>' 
        : '<i class="fa-solid fa-font" style="color: var(--text-secondary); font-size: 14px;" title="Bài đăng thuần văn bản"></i>';
        
      const justTime = p.scheduledFor ? p.scheduledFor.split(' ')[0] : '—';
      const timeTag = p.scheduledFor 
        ? `<span class="time-tag" style="margin-left: 0; font-size: 11px;"><i class="fa-solid fa-clock"></i> ${justTime}</span>`
        : '<span style="color: var(--text-secondary)">Chưa xếp lịch</span>';

      tr.innerHTML = `
        <td><span class="post-id-tag" style="color: #a55eea; cursor: pointer;" onclick="openModalById('${p.id}')">${p.id}</span></td>
        <td><i class="fa-solid fa-calendar-day" style="color: var(--text-secondary); margin-right: 6px;"></i>${p.date}</td>
        <td><span class="type-cell">${typeIcons[p.type] || '<i class="fa-solid fa-newspaper"></i>'} ${p.type}</span></td>
        <td><div class="caption-cell-text" title="${p.captionFull.replace(/"/g, '&quot;')}">${p.captionSnippet || 'Chưa có nội dung...'}</div></td>
        <td style="text-align: center;">${imgIcon}</td>
        <td style="text-align: center;">${timeTag}</td>
        <td style="text-align: center;"><span class="status-badge ${p.status}" style="font-size: 10px; padding: 2px 6px;">${statusLabels[p.status]}</span></td>
        <td style="text-align: center;">
          <button class="btn-action-edit" onclick="openModalById('${p.id}')" title="Chỉnh sửa nội dung & lên lịch">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Helper to open modal by post ID
function openModalById(id) {
  const post = allPosts.find(p => p.id === id);
  if (post) openModal(post);
}

// Switch between grid and table view
function switchView(view) {
  currentView = view;
  
  const btnGrid = document.getElementById('btn-view-grid');
  const btnTable = document.getElementById('btn-view-table');
  
  if (view === 'grid') {
    btnGrid.classList.add('active');
    btnGrid.style.color = '#fff';
    btnTable.classList.remove('active');
    btnTable.style.color = 'var(--text-secondary)';
  } else {
    btnTable.classList.add('active');
    btnTable.style.color = '#fff';
    btnGrid.classList.remove('active');
    btnGrid.style.color = 'var(--text-secondary)';
  }
  
  renderPosts();
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

  // Autofill scheduledTime
  if (post.scheduledFor) {
    // format "11:46 2026-05-18" -> "2026-05-18T11:46"
    const parts = post.scheduledFor.split(' ');
    if (parts.length === 2) {
      const [time, date] = parts;
      document.getElementById('modal-post-time').value = `${date}T${time}`;
    }
  } else {
    // Suggest current time + 30 minutes for new schedule
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('modal-post-time').value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

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

// 5. Manual schedule single post
async function scheduleSinglePost() {
  const id = document.getElementById('modal-post-id').value;
  const caption = document.getElementById('modal-post-caption').value;
  const scheduledTime = document.getElementById('modal-post-time').value;

  if (!scheduledTime) {
    alert('Vui lòng chọn ngày và giờ muốn lên lịch đăng bài!');
    return;
  }

  const cleanTime = scheduledTime.replace('T', ' ');
  if (!confirm(`Bạn có chắc chắn muốn LÊN LỊCH ĐƠN LẺ bài đăng ${id} lúc ${cleanTime}?`)) {
    return;
  }

  try {
    const res = await fetch('/api/action/schedule-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, caption, scheduledTime })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeModal();
      fetchStatus();
    } else {
      alert(`Lỗi từ Facebook: ${JSON.stringify(data.error) || 'Không rõ nguyên nhân'}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối máy chủ: ${err.message}`);
  }
}

// 6. Config Save
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

// 7. Action triggering helper
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
