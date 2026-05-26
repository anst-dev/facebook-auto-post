require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const FacebookAPI = require('./facebook');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Webhook config
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_secret_verify_token_2026';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';

// Parse JSON body for webhook - capture raw body for signature verification
app.use('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));

// Paths
const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const PAGES_FILE = path.join(ROOT, 'saved-pages.json');
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

function appendLog(entry) {
  let log = [];
  if (fs.existsSync(COMMENT_LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(COMMENT_LOG_FILE, 'utf8'));
  }
  log.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(COMMENT_LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
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
    content: 'content',
    settings: 'settings'
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

// === SETTINGS HELPERS ===

function readEnvFile() {
  const result = {};
  if (!fs.existsSync(ENV_FILE)) return result;
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      result[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  }
  return result;
}

function writeEnvFile(data) {
  const lines = [
    '# Facebook API Credentials',
    `FACEBOOK_PAGE_ID=${data.FACEBOOK_PAGE_ID || ''}`,
    `FACEBOOK_ACCESS_TOKEN=${data.FACEBOOK_ACCESS_TOKEN || ''}`,
    '',
    '# Optional: Default topic for auto-posting',
    `DEFAULT_TOPIC=${data.DEFAULT_TOPIC || 'technology news today'}`,
    '',
    '# Webhook Config',
    `WEBHOOK_VERIFY_TOKEN=${data.WEBHOOK_VERIFY_TOKEN || ''}`,
    `FB_APP_SECRET=${data.FB_APP_SECRET || ''}`
  ];
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
  // Update process.env for current session
  if (data.FACEBOOK_PAGE_ID) process.env.FACEBOOK_PAGE_ID = data.FACEBOOK_PAGE_ID;
  if (data.FACEBOOK_ACCESS_TOKEN) process.env.FACEBOOK_ACCESS_TOKEN = data.FACEBOOK_ACCESS_TOKEN;
  if (data.WEBHOOK_VERIFY_TOKEN) process.env.WEBHOOK_VERIFY_TOKEN = data.WEBHOOK_VERIFY_TOKEN;
  if (data.FB_APP_SECRET) process.env.FB_APP_SECRET = data.FB_APP_SECRET;
}

function readSavedPages() {
  return readJson(PAGES_FILE, []);
}

function saveSavedPages(pages) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), 'utf8');
}

async function verifyToken(pageId, accessToken) {
  try {
    const res = await axios.get('https://graph.facebook.com/v25.0/me', {
      params: { access_token: accessToken, fields: 'id,name' }
    });
    return { valid: true, id: res.data.id, name: res.data.name };
  } catch (err) {
    return { valid: false, error: err.response?.data?.error?.message || err.message };
  }
}

// === SETTINGS ROUTES ===

app.get('/settings', async (req, res) => {
  try {
    const envData = readEnvFile();
    let tokenInfo = null;
    let flash = null;
    try {
      flash = req.query.flash ? JSON.parse(Buffer.from(req.query.flash, 'base64').toString()) : null;
    } catch {}

    if (envData.FACEBOOK_ACCESS_TOKEN) {
      const verify = await verifyToken(envData.FACEBOOK_PAGE_ID, envData.FACEBOOK_ACCESS_TOKEN);
      tokenInfo = {
        valid: verify.valid,
        id: verify.id || envData.FACEBOOK_PAGE_ID,
        name: verify.name || '-',
        tokenLength: envData.FACEBOOK_ACCESS_TOKEN.length
      };
      if (!verify.valid) tokenInfo.error = verify.error;
    }

    const savedPages = readSavedPages();
    for (const p of savedPages) {
      if (p.accessToken) {
        const v = await verifyToken(p.pageId, p.accessToken);
        p.valid = v.valid;
        if (v.name) p.name = v.name;
      } else {
        p.valid = false;
      }
    }

    renderPage(req, res, 'settings', 'Cai dat', {
      tokenInfo,
      currentEnv: envData,
      savedPages,
      flash
    });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).send('Error loading settings: ' + err.message);
  }
});

app.post('/settings/token', async (req, res) => {
  const { pageId, accessToken } = req.body;
  const envData = readEnvFile();
  envData.FACEBOOK_PAGE_ID = (pageId || '').trim();
  envData.FACEBOOK_ACCESS_TOKEN = (accessToken || '').trim();
  writeEnvFile(envData);

  const verify = await verifyToken(envData.FACEBOOK_PAGE_ID, envData.FACEBOOK_ACCESS_TOKEN);

  // Auto-save to saved pages
  if (verify.valid) {
    const pages = readSavedPages();
    const existing = pages.findIndex(p => p.pageId === envData.FACEBOOK_PAGE_ID);
    const entry = { pageId: envData.FACEBOOK_PAGE_ID, accessToken: envData.FACEBOOK_ACCESS_TOKEN, name: verify.name, valid: true };
    if (existing >= 0) pages[existing] = entry;
    else pages.push(entry);
    saveSavedPages(pages);
  }

  const flash = verify.valid
    ? { type: 'success', message: `Token hop le! Page: ${verify.name}` }
    : { type: 'error', message: `Token khong hop le: ${verify.error}` };

  res.redirect('/settings?flash=' + Buffer.from(JSON.stringify(flash)).toString('base64'));
});

app.post('/settings/switch', async (req, res) => {
  const { pageId } = req.body;
  const pages = readSavedPages();
  const page = pages.find(p => p.pageId === pageId);
  if (page) {
    const envData = readEnvFile();
    envData.FACEBOOK_PAGE_ID = page.pageId;
    envData.FACEBOOK_ACCESS_TOKEN = page.accessToken;
    writeEnvFile(envData);

    const flash = { type: 'success', message: `Da chuyen sang Page: ${page.name}` };
    res.redirect('/settings?flash=' + Buffer.from(JSON.stringify(flash)).toString('base64'));
  } else {
    res.redirect('/settings');
  }
});

app.post('/settings/delete', (req, res) => {
  const { pageId } = req.body;
  let pages = readSavedPages();
  pages = pages.filter(p => p.pageId !== pageId);
  saveSavedPages(pages);
  res.redirect('/settings');
});

// === FACEBOOK WEBHOOK ===

// Webhook verification (Facebook calls this to verify)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verified OK');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification FAILED', { mode, token });
    res.sendStatus(403);
  }
});

// Verify Facebook webhook signature (supports both SHA1 and SHA256)
// Reference: https://github.com/fbsamples/original-coast-clothing/blob/main/app.js
function verifySignature(req) {
  if (!FB_APP_SECRET) return true; // Skip if no app secret configured
  
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
  if (!signature) {
    console.error('[Webhook] No signature header found');
    return false;
  }
  
  const [method, signatureHash] = signature.split('=');
  let expectedHash;
  
  if (method === 'sha256') {
    expectedHash = crypto.createHmac('sha256', FB_APP_SECRET).update(req.rawBody).digest('hex');
  } else if (method === 'sha1') {
    expectedHash = crypto.createHmac('sha1', FB_APP_SECRET).update(req.rawBody).digest('hex');
  } else {
    console.error('[Webhook] Unknown signature method:', method);
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

// Webhook event receiver (following Facebook official pattern)
app.post('/webhook', async (req, res) => {
  // Verify signature first
  if (!verifySignature(req)) {
    console.warn('[Webhook] Invalid signature');
    return res.sendStatus(403);
  }

  const body = req.body;

  // Log full payload for debugging
  console.log('📩 Received webhook:');
  console.dir(body, { depth: null });

  // Check this is a page subscription
  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Acknowledge immediately (Facebook expects "EVENT_RECEIVED")
  res.status(200).send('EVENT_RECEIVED');

  // Process each entry (may be batched)
  for (const entry of body.entry) {
    // Handle Page feed changes (comments, posts)
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'feed') {
          const value = change.value;
          switch (value.item) {
            case 'comment':
              await handleCommentEvent(value);
              break;
            case 'post':
              console.log(`[Webhook] New post event: ${value.post_id}`);
              break;
            default:
              console.warn('[Webhook] Unsupported feed item:', value.item);
          }
        }
      }
    }

    // Handle messaging events (DMs via Messenger)
    if (entry.messaging) {
      for (const event of entry.messaging) {
        // Skip read/delivery/echo events
        if ('read' in event) {
          console.log('[Webhook] Read event');
          continue;
        }
        if ('delivery' in event) {
          console.log('[Webhook] Delivery event');
          continue;
        }
        if (event.message?.is_echo) {
          console.log('[Webhook] Echo event, mid = ' + event.message.mid);
          continue;
        }
        await handleDMEvent(event);
      }
    }
  }
});

// Handle incoming comment
async function handleCommentEvent(value) {
  const config = readCommentConfig();
  if (!config.enabled) return;

  const commentId = value.comment_id;
  const commentText = value.message || '';
  const senderName = value.sender_name || 'Unknown';
  const postId = value.post_id || '';
  const senderId = value.sender_id || '';
  const pageId = process.env.FACEBOOK_PAGE_ID;

  // Skip own page comments
  if (senderId === pageId) return;

  // Check already processed
  const state = readCommentState();
  if (state.processedComments[commentId]) return;

  console.log(`[Webhook] New comment from "${senderName}": "${commentText.substring(0, 50)}..."`);

  // Match keyword
  const matched = matchKeywordWebhook(commentText, config.keywords);
  if (!matched) {
    console.log(`[Webhook] No keyword match, skipping.`);
    return;
  }

  console.log(`[Webhook] Matched keyword "${matched.keyword}"`);

  const fb = new FacebookAPI(pageId, process.env.FACEBOOK_ACCESS_TOKEN);

  // Reply to comment
  const replyResult = await fb.replyToComment(
    commentId,
    matched.replyComment,
    matched.replyCommentAttachmentUrl || null
  );

  if (replyResult.success) {
    console.log(`[Webhook] Reply OK: ${replyResult.commentId}`);
    state.stats.totalReplies++;
    appendLog({
      commentId, postId, keyword: matched.keyword,
      action: 'reply', status: 'success', userName: senderName, replyId: replyResult.commentId
    });
  } else {
    console.error(`[Webhook] Reply FAILED:`, JSON.stringify(replyResult.error));
    appendLog({
      commentId, postId, keyword: matched.keyword,
      action: 'reply', status: 'failed', userName: senderName, error: replyResult.error
    });
  }

  // Send DM if configured
  if (matched.privateMessage) {
    let dmResult;
    if (senderId) {
      dmResult = await fb.sendPrivateMessage(senderId, matched.privateMessage);
    } else {
      dmResult = await fb.sendPrivateReply(commentId, matched.privateMessage);
    }

    if (dmResult.success) {
      console.log(`[Webhook] DM OK`);
      state.stats.totalDMs++;
      appendLog({ commentId, postId, keyword: matched.keyword, action: 'dm', status: 'success', userName: senderName });
    } else {
      console.warn(`[Webhook] DM FAILED:`, JSON.stringify(dmResult.error));
      state.stats.totalDMFailed++;
      appendLog({ commentId, postId, keyword: matched.keyword, action: 'dm', status: 'failed', userName: senderName, error: dmResult.error });
    }
  }

  // Mark processed
  state.processedComments[commentId] = {
    postId, keyword: matched.keyword,
    repliedAt: new Date().toISOString(),
    dmSent: !!matched.privateMessage,
    userName: senderName
  };
  state.stats.totalProcessed++;
  state.stats.byKeyword[matched.keyword] = (state.stats.byKeyword[matched.keyword] || 0) + 1;
  fs.writeFileSync(COMMENT_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Handle incoming DM
async function handleDMEvent(event) {
  console.log(`[Webhook] DM from ${event.sender?.id}: ${(event.message?.text || '').substring(0, 50)}`);
  // Future: auto-reply to DMs
}

// Vietnamese text normalization (same as comment-reply.js)
function normalizeVietnamese(text) {
  if (!text) return '';
  let s = text.toUpperCase();
  s = s.replace(/[ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ]/g, 'A');
  s = s.replace(/[ÉÈẺẼẸÊẾỀỂỄỆ]/g, 'E');
  s = s.replace(/[ÍÌỈĨỊ]/g, 'I');
  s = s.replace(/[ÓÒỎÕỌƠỚỜỞỠỢÔỐỒỔỖỘ]/g, 'O');
  s = s.replace(/[ÚÙỦŨỤƯỨỪỬỮỰ]/g, 'U');
  s = s.replace(/[ÝỲỶỸỴ]/g, 'Y');
  s = s.replace(/Đ/g, 'D');
  s = s.replace(/[^\w\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function matchKeywordWebhook(commentText, keywords) {
  const normalized = normalizeVietnamese(commentText);
  for (const kw of keywords) {
    const normalizedKw = normalizeVietnamese(kw.keyword);
    const pattern = new RegExp(`\\b${escapeRegexWebhook(normalizedKw)}\\b`, 'i');
    if (pattern.test(normalized)) return kw;
  }
  return null;
}

function escapeRegexWebhook(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === PROFILE SETUP ENDPOINT (Facebook official pattern) ===
// Usage: GET /profile?mode=all&verify_token=<your_token>
// Modes: webhook, private-reply, all
app.get('/profile', async (req, res) => {
  const token = req.query['verify_token'];
  const mode = req.query['mode'];

  if (token !== WEBHOOK_VERIFY_TOKEN) {
    return res.sendStatus(403);
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const webhookUrl = `https://unsupercilious-leonarda-unreaving.ngrok-free.dev/webhook`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (mode === 'webhook' || mode === 'all') {
    // Subscribe app to page events via Graph API
    try {
      const result = await axios.post(
        `https://graph.facebook.com/v25.0/${pageId}/subscribed_apps`,
        { subscribed_fields: 'feed,messages' },
        { params: { access_token: accessToken } }
      );
      res.write(`<p>✅ Subscribed app to page ${pageId} (feed + messages)</p>`);
      console.log('[Profile] Subscribed to page events:', result.data);
    } catch (err) {
      res.write(`<p>❌ Subscribe failed: ${err.response?.data?.error?.message || err.message}</p>`);
      console.error('[Profile] Subscribe failed:', err.response?.data || err.message);
    }
  }

  if (mode === 'private-reply' || mode === 'all') {
    // Enable private replies for page comments
    try {
      const result = await axios.post(
        `https://graph.facebook.com/v25.0/${pageId}/subscribed_apps`,
        { subscribed_fields: 'feed' },
        { params: { access_token: accessToken } }
      );
      res.write(`<p>✅ Private reply webhook set for page ${pageId}</p>`);
    } catch (err) {
      res.write(`<p>❌ Private reply setup failed: ${err.response?.data?.error?.message || err.message}</p>`);
    }
  }

  res.write(`<hr><p>Webhook URL: <code>${webhookUrl}</code></p>`);
  res.write(`<p>Page ID: <code>${pageId}</code></p>`);
  res.end();
});

// === START ===

app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
  console.log(`Webhook: http://localhost:${PORT}/webhook`);
  console.log(`Webhook URL: https://unsupercilious-leonarda-unreaving.ngrok-free.dev/webhook`);
});
