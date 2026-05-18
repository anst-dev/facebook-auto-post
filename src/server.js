const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Config path
const dotenvPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: dotenvPath });

const { 
  scanContent, 
  loadProgress, 
  saveProgress, 
  scheduleWithImage, 
  scheduleTextPost, 
  appendLog: appendToFBlog,
  initPageConfig,
  CONTENT_DIR
} = require('./auto-scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let activeProcess = null;
let processLogs = [];

function appendLog(message) {
  const time = new Date().toLocaleTimeString();
  const logLine = `[${time}] ${message}`;
  processLogs.push(logLine);
  if (processLogs.length > 500) processLogs.shift();
  console.log(logLine);
}

// Helper: Scan folders inside content/ directory as separate Pages
function getPagesList() {
  if (!fs.existsSync(CONTENT_DIR)) return ['Gen Z Book Reviews'];
  
  const folders = fs.readdirSync(CONTENT_DIR).filter(file => {
    return fs.statSync(path.join(CONTENT_DIR, file)).isDirectory();
  });
  
  if (folders.length === 0) {
    return ['Gen Z Book Reviews'];
  }
  return folders;
}

// 1. Get Status API
app.get('/api/status', async (req, res) => {
  try {
    // Dynamically retrieve active page settings
    const activePage = initPageConfig();
    const configPath = path.join(__dirname, '..', 'pages-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const pageConfig = config.pages[activePage] || { pageId: '', accessToken: '' };

    const progress = loadProgress();
    const posts = scanContent();
    const pagesList = getPagesList();
    
    // Check if token is valid
    const axios = require('axios');
    let fbStatus = { valid: false, name: 'Chưa kết nối', error: null };
    
    if (pageConfig.accessToken && pageConfig.pageId) {
      try {
        const url = `https://graph.facebook.com/v21.0/${pageConfig.pageId}`;
        const response = await axios.get(url, {
          params: {
            fields: 'name',
            access_token: pageConfig.accessToken
          }
        });
        fbStatus = { valid: true, name: response.data.name, error: null };
      } catch (err) {
        fbStatus = { valid: false, name: 'Lỗi token', error: err.response?.data?.error?.message || err.message };
      }
    }

    // Read post logs of the ACTIVE PAGE to get actual scheduled time
    const pageDir = path.join(CONTENT_DIR, activePage);
    const logFile = path.join(pageDir, 'post-log.json');
    const fblogs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];

    // Detail of posts
    let countPublished = 0;
    let countScheduled = 0;
    let countFailed = 0;
    let countPending = 0;

    const postDetails = posts.map(p => {
      let caption = '';
      if (fs.existsSync(p.captionFile)) {
        caption = fs.readFileSync(p.captionFile, 'utf8');
      }
      
      const logEntry = fblogs.find(l => l.contentId === p.id && l.action === 'schedule' && l.status === 'success');
      
      const isCompleted = progress.completed.includes(p.id);
      const isFailed = progress.failed.includes(p.id);
      
      let status = 'pending';
      if (isFailed) {
        status = 'failed';
        countFailed++;
      } else if (isCompleted) {
        if (logEntry && logEntry.scheduledFor) {
          // Phân tích xem thời gian lên lịch đã trôi qua chưa (GMT+7)
          const parts = logEntry.scheduledFor.split(' ');
          if (parts.length === 2) {
            const [timeStr, dateStr] = parts;
            const [hour, minute] = timeStr.split(':');
            const [year, month, day] = dateStr.split('-');
            
            const scheduledDate = new Date(year, month - 1, day, hour, minute, 0);
            const now = new Date();
            
            if (scheduledDate > now) {
              status = 'scheduled'; // Đã lên lịch (ở tương lai)
              countScheduled++;
            } else {
              status = 'published'; // Đã đăng (ở quá khứ)
              countPublished++;
            }
          } else {
            status = 'published';
            countPublished++;
          }
        } else {
          status = 'published';
          countPublished++;
        }
      } else {
        status = 'pending';
        countPending++;
      }
      
      return {
        id: p.id,
        date: p.date,
        theme: p.theme,
        topic: p.topic,
        type: p.type,
        captionFile: p.captionFile,
        captionSnippet: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
        captionFull: caption,
        hasImage: !!p.imageFile,
        imagePath: p.imageFile ? path.relative(path.join(__dirname, '..'), p.imageFile) : null,
        status,
        scheduledFor: logEntry ? logEntry.scheduledFor : null
      };
    });

    res.json({
      success: true,
      activePage,
      pagesList,
      config: {
        pageId: pageConfig.pageId || '',
        accessToken: pageConfig.accessToken ? `${pageConfig.accessToken.substring(0, 15)}...` : ''
      },
      fbStatus,
      progress: {
        total: posts.length,
        published: countPublished,
        scheduled: countScheduled,
        failed: countFailed,
        pending: countPending
      },
      posts: postDetails,
      isRunning: !!activeProcess,
      logs: processLogs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Save Caption API
app.post('/api/save-caption', (req, res) => {
  const { id, caption } = req.body;
  if (!id || caption === undefined) {
    return res.status(400).json({ success: false, error: 'Thiếu id hoặc caption' });
  }

  try {
    const posts = scanContent();
    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    }

    fs.writeFileSync(post.captionFile, caption, 'utf8');
    appendLog(`Đã cập nhật caption cho bài viết ${id}`);
    res.json({ success: true, message: 'Đã lưu caption thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Save Config API (Multi-page saved directly in pages-config.json)
app.post('/api/save-config', (req, res) => {
  const { pageId, accessToken } = req.body;
  if (!pageId || !accessToken) {
    return res.status(400).json({ success: false, error: 'Thiếu pageId hoặc accessToken' });
  }

  try {
    const configPath = path.join(__dirname, '..', 'pages-config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(400).json({ success: false, error: 'Chưa khởi tạo file cấu hình trang!' });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const activePage = config.activePage || 'Gen Z Book Reviews';

    if (!config.pages[activePage]) {
      config.pages[activePage] = {};
    }

    config.pages[activePage].pageId = pageId;
    if (!accessToken.includes('...')) {
      config.pages[activePage].accessToken = accessToken;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Dynamically override runtime environment settings
    process.env.FACEBOOK_PAGE_ID = pageId;
    if (!accessToken.includes('...')) {
      process.env.FACEBOOK_ACCESS_TOKEN = accessToken;
    }

    appendLog(`Đã cập nhật cấu hình Facebook API cho Page: ${activePage}`);
    res.json({ success: true, message: `Đã lưu cấu hình Page ${activePage} thành công!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Switch Active Page API
app.post('/api/action/switch-page', (req, res) => {
  const { pageName } = req.body;
  if (!pageName) {
    return res.status(400).json({ success: false, error: 'Thiếu tên Page muốn chuyển đổi' });
  }

  try {
    const configPath = path.join(__dirname, '..', 'pages-config.json');
    let config = { activePage: pageName, pages: {} };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    config.activePage = pageName;
    if (!config.pages[pageName]) {
      config.pages[pageName] = { pageId: '', accessToken: '' };
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Reload local configurations
    initPageConfig();

    appendLog(`Đã chuyển đổi Page hoạt động sang: ${pageName}`);
    res.json({ success: true, message: `Đã chuyển đổi sang Page ${pageName} thành công!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Run subprocess safely
function runSubprocess(scriptPath, args = []) {
  if (activeProcess) {
    return { success: false, error: 'Đang có một tiến trình khác chạy ngầm!' };
  }

  processLogs = [];
  appendLog(`Khởi chạy tiến trình: node ${scriptPath} ${args.join(' ')}`);

  activeProcess = spawn('node', [scriptPath, ...args], {
    cwd: path.join(__dirname, '..')
  });

  activeProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) appendLog(line.trim());
    });
  });

  activeProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) appendLog(`[LỖI] ${line.trim()}`);
    });
  });

  activeProcess.on('close', (code) => {
    appendLog(`Tiến trình kết thúc với mã thoát (Exit code): ${code}`);
    activeProcess = null;
  });

  return { success: true };
}

// 5. Action: Schedule
app.post('/api/action/schedule', (req, res) => {
  const result = runSubprocess('src/auto-scheduler.js', ['schedule']);
  if (result.success) {
    res.json({ success: true, message: 'Đã bắt đầu lên lịch bài viết chạy ngầm!' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// 6. Action: Stop
app.post('/api/action/stop', (req, res) => {
  if (!activeProcess) {
    return res.status(400).json({ success: false, error: 'Không có tiến trình nào đang chạy!' });
  }

  try {
    activeProcess.kill();
    activeProcess = null;
    appendLog('Đã gửi tín hiệu dừng tiến trình chạy ngầm.');
    res.json({ success: true, message: 'Đã dừng tiến trình thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Action: Reset Progress
app.post('/api/action/reset', (req, res) => {
  const result = runSubprocess('src/auto-scheduler.js', ['reset']);
  if (result.success) {
    res.json({ success: true, message: 'Đang thực hiện reset tiến trình...' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// 8. Action: Delete Facebook Schedule
app.post('/api/action/delete-scheduled', (req, res) => {
  const result = runSubprocess('scripts/delete-scheduled.js');
  if (result.success) {
    res.json({ success: true, message: 'Đang bắt đầu dọn dẹp các bài lên lịch trên Facebook...' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// 9. Action: Schedule Single Post manually
app.post('/api/action/schedule-single', async (req, res) => {
  const { id, caption, scheduledTime } = req.body;
  if (!id || !scheduledTime) {
    return res.status(400).json({ success: false, error: 'Thiếu id hoặc thời gian lên lịch đăng bài' });
  }

  try {
    const posts = scanContent();
    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết trong thư mục' });
    }

    // 1. Save new Caption first
    if (caption !== undefined) {
      fs.writeFileSync(post.captionFile, caption, 'utf8');
      appendLog(`Đã cập nhật caption cho bài viết ${id} trước khi lên lịch`);
    }

    // 2. Convert scheduledTime (from client datetime-local picker) to Unix timestamp (seconds)
    const dateObj = new Date(scheduledTime);
    const timestamp = Math.floor(dateObj.getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    // Facebook API requires scheduled posts to be at least 10 minutes in the future
    if (timestamp <= now + 600) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thời gian đăng bài phải cách thời điểm hiện tại ít nhất 10 phút!' 
      });
    }

    // 3. Post to Facebook API
    appendLog(`[Thủ công] Đang lên lịch đăng bài ${id} lúc ${scheduledTime}...`);
    let result;
    if (post.imageFile) {
      result = await scheduleWithImage(post.imageFile, caption || post.caption, timestamp);
    } else {
      result = await scheduleTextPost(caption || post.caption, timestamp);
    }

    // Format schedule display label (GMT+7 timezone)
    const labelDate = new Date((timestamp + 7 * 3600) * 1000);
    const timeStr = `${labelDate.getUTCHours().toString().padStart(2, '0')}:${labelDate.getUTCMinutes().toString().padStart(2, '0')}`;
    const schedLabel = `${timeStr} ${post.date}`;

    if (result.success) {
      // Update local progress log
      const progress = loadProgress();
      if (!progress.completed.includes(id)) {
        progress.completed.push(id);
        saveProgress(progress);
      }
      
      // Append to Facebook schedule log
      appendToFBlog({ 
        postId: result.postId, 
        contentId: id, 
        action: 'schedule', 
        scheduledFor: schedLabel, 
        status: 'success' 
      });

      appendLog(`[Thành công] Đã lên lịch đăng bài ${id} -> ${schedLabel}. Post ID: ${result.postId}`);
      res.json({ success: true, message: `Đã lên lịch bài viết đăng lúc ${schedLabel} thành công!` });
    } else {
      // Update failed status
      const progress = loadProgress();
      if (!progress.failed.includes(id)) {
        progress.failed.push(id);
        saveProgress(progress);
      }
      
      appendToFBlog({ 
        contentId: id, 
        action: 'schedule', 
        status: 'failed', 
        error: result.error 
      });

      appendLog(`[LỖI] Lên lịch bài ${id} thất bại: ${JSON.stringify(result.error)}`);
      res.status(500).json({ success: false, error: result.error });
    }

  } catch (err) {
    appendLog(`[LỖI] Lỗi hệ thống khi lên lịch đơn lẻ bài ${id}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve UI for any other request
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 DASHBOARD UI CHẠY TẠI: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
