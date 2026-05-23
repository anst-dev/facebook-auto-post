require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Paths
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const PROGRESS_FILE = path.join(CONTENT_DIR, 'progress.json');
const POST_LOG_FILE = path.join(ROOT, 'post-log.json');
const COMMENT_CONFIG_FILE = path.join(ROOT, 'comment-reply-config.json');
const COMMENT_STATE_FILE = path.join(ROOT, 'comment-reply-state.json');
const COMMENT_LOG_FILE = path.join(ROOT, 'comment-reply-log.json');

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(express.static(path.join(ROOT, 'public')));
app.use(express.urlencoded({ extended: true }));

// === DATA HELPERS ===

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return fallback;
}

function readCommentConfig() {
  return readJson(COMMENT_CONFIG_FILE, { keywords: [], enabled: false, pollIntervalMinutes: 5 });
}

function readCommentState() {
  return readJson(COMMENT_STATE_FILE, {
    processedComments: {},
    lastPollTime: null,
    stats: { totalProcessed: 0, totalReplies: 0, totalDMs: 0, totalDMFailed: 0, byKeyword: {} }
  });
}

function readPostLog() {
  return readJson(POST_LOG_FILE, []);
}

function readCommentLog() {
  return readJson(COMMENT_LOG_FILE, []);
}

function readProgress() {
  return readJson(PROGRESS_FILE, { completed: [], failed: [] });
}

function scanContentTree() {
  const tree = [];
  const base = path.join(CONTENT_DIR, 'Gen Z Book Reviews');
  if (!fs.existsSync(base)) return tree;

  const progress = readProgress();
  const dates = fs.readdirSync(base).filter(d => {
    try { return fs.statSync(path.join(base, d)).isDirectory(); } catch { return false; }
  }).sort().reverse();

  for (const date of dates) {
    tree.push({ depth: 0, icon: '📅', name: date });
    const datePath = path.join(base, date);
    const topics = fs.readdirSync(datePath).filter(d => {
      try { return fs.statSync(path.join(datePath, d)).isDirectory(); } catch { return false; }
    });

    for (const topic of topics) {
      tree.push({ depth: 1, icon: '📂', name: topic });
      const topicPath = path.join(datePath, topic);
      const types = fs.readdirSync(topicPath).filter(d => {
        try { return fs.statSync(path.join(topicPath, d)).isDirectory(); } catch { return false; }
      });

      for (const type of types) {
        const typePath = path.join(topicPath, type);
        const posts = fs.readdirSync(typePath).filter(d => {
          try { return fs.statSync(path.join(typePath, d)).isDirectory(); } catch { return false; }
        }).sort();

        for (const post of posts) {
          const postPath = path.join(typePath, post);
          const hasCaption = fs.readdirSync(postPath).some(f => f.endsWith('.txt'));
          const hasImage = fs.readdirSync(postPath).some(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
          const isPosted = progress.completed.includes(post);
          let status = 'empty';
          if (isPosted) status = 'posted';
          else if (hasCaption) status = 'ready';
          tree.push({ depth: 2, icon: '📄', name: `${post} (${type})`, status });
        }
      }
    }
  }
  return tree;
}

// === RENDER HELPER ===

function renderPage(req, res, page, title, data) {
  const templateMap = {
    dashboard: 'dashboard',
    posts: 'posts',
    comments: 'comments',
    content: 'content'
  };
  const body = require('ejs').render(
    fs.readFileSync(path.join(ROOT, 'views', `${templateMap[page]}.ejs`), 'utf8'),
    { ...data, page }
  );
  res.send(require('ejs').render(
    fs.readFileSync(path.join(ROOT, 'views', 'layout.ejs'), 'utf8'),
    { title, page, body }
  ));
}

// === ROUTES ===

// Dashboard
app.get('/', (req, res) => {
  const postLog = readPostLog();
  const commentLog = readCommentLog();
  const commentState = readCommentState();
  const commentConfig = readCommentConfig();
  const progress = readProgress();

  const allLogs = [
    ...postLog.map(l => ({ ...l, keyword: '-', userName: '-' })),
    ...commentLog
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

  renderPage(req, res, 'dashboard', 'Dashboard', {
    stats: {
      totalPosts: postLog.filter(l => l.status === 'success').length,
      pendingPosts: progress.failed?.length || 0,
      totalReplies: commentState.stats.totalReplies || 0,
      totalDMs: commentState.stats.totalDMs || 0,
      dmFailed: commentState.stats.totalDMFailed || 0,
      keywords: commentConfig.keywords.length,
      polling: false,
      lastPoll: commentState.lastPollTime
        ? new Date(commentState.lastPollTime).toLocaleString('vi-VN')
        : null
    },
    recentLogs: allLogs
  });
});

// Posts
app.get('/posts', (req, res) => {
  const postLog = readPostLog();
  renderPage(req, res, 'posts', 'Bai dang', {
    posts: postLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

// Comments
app.get('/comments', (req, res) => {
  const config = readCommentConfig();
  const state = readCommentState();
  const logs = readCommentLog();
  renderPage(req, res, 'comments', 'Comment Reply', {
    config,
    commentStats: state.stats,
    commentLogs: logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

app.post('/comments/toggle', (req, res) => {
  const config = readCommentConfig();
  config.enabled = !config.enabled;
  fs.writeFileSync(COMMENT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  res.redirect('/comments');
});

app.post('/comments/start', (req, res) => {
  res.redirect('/comments');
});

app.post('/comments/stop', (req, res) => {
  res.redirect('/comments');
});

app.post('/comments/reset', (req, res) => {
  const emptyState = {
    processedComments: {},
    lastPollTime: null,
    stats: { totalProcessed: 0, totalReplies: 0, totalDMs: 0, totalDMFailed: 0, byKeyword: {} }
  };
  fs.writeFileSync(COMMENT_STATE_FILE, JSON.stringify(emptyState, null, 2), 'utf8');
  res.redirect('/comments');
});

// Content
app.get('/content', (req, res) => {
  const progress = readProgress();
  const tree = scanContentTree();
  const total = tree.filter(t => t.status).length;
  const completed = tree.filter(t => t.status === 'posted').length;

  renderPage(req, res, 'content', 'Noi dung', {
    contentStats: { total, completed, pending: total - completed },
    tree
  });
});

// === START ===

app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
});
