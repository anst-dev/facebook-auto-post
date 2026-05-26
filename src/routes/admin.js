const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..', '..');
const VIEWS = path.join(__dirname, '..', '..', 'views');
const COMMENT_CONFIG_FILE = path.join(ROOT, 'comment-reply-config.json');
const COMMENT_LOG_FILE = path.join(ROOT, 'comment-reply-log.json');

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return fallback;
}

function writeJsonAtomic(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function renderPage(req, res, page, title, data) {
  const body = ejs.render(
    fs.readFileSync(path.join(VIEWS, `${page}.ejs`), 'utf8'),
    { ...data, page }
  );
  res.send(ejs.render(
    fs.readFileSync(path.join(VIEWS, 'layout.ejs'), 'utf8'),
    { title, page, body }
  ));
}

// Admin dashboard → redirect to main dashboard
router.get('/', (req, res) => {
  res.redirect('/');
});

// Keywords page — rendered through layout
router.get('/keywords', (req, res) => {
  renderPage(req, res, 'admin/keywords', 'Từ khóa', {});
});

// API: keywords CRUD
router.get('/api/keywords', (req, res) => {
  const cfg = readJson(COMMENT_CONFIG_FILE, { keywords: [], enabled: false });
  res.json(cfg.keywords || []);
});

router.post('/api/keywords', express.json(), (req, res) => {
  const body = req.body || {};
  if (!body.keyword) return res.status(400).json({ error: 'keyword required' });
  const cfg = readJson(COMMENT_CONFIG_FILE, { keywords: [], enabled: false });
  const id = Date.now().toString();
  const item = {
    id,
    keyword: body.keyword,
    replyComment: body.replyComment || '',
    privateMessage: body.privateMessage || '',
    enabled: body.enabled === undefined ? true : !!body.enabled
  };
  cfg.keywords = cfg.keywords || [];
  cfg.keywords.push(item);
  writeJsonAtomic(COMMENT_CONFIG_FILE, cfg);
  res.json(item);
});

router.put('/api/keywords/:id', express.json(), (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const cfg = readJson(COMMENT_CONFIG_FILE, { keywords: [], enabled: false });
  const idx = (cfg.keywords || []).findIndex(k => k.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const existing = cfg.keywords[idx];
  const updated = Object.assign({}, existing, {
    keyword: body.keyword !== undefined ? body.keyword : existing.keyword,
    replyComment: body.replyComment !== undefined ? body.replyComment : existing.replyComment,
    privateMessage: body.privateMessage !== undefined ? body.privateMessage : existing.privateMessage,
    enabled: body.enabled !== undefined ? !!body.enabled : existing.enabled
  });
  cfg.keywords[idx] = updated;
  writeJsonAtomic(COMMENT_CONFIG_FILE, cfg);
  res.json(updated);
});

router.delete('/api/keywords/:id', (req, res) => {
  const id = req.params.id;
  const cfg = readJson(COMMENT_CONFIG_FILE, { keywords: [], enabled: false });
  const newList = (cfg.keywords || []).filter(k => k.id !== id);
  cfg.keywords = newList;
  writeJsonAtomic(COMMENT_CONFIG_FILE, cfg);
  res.json({ success: true });
});

// API: stats
router.get('/api/stats', (req, res) => {
  const log = readJson(COMMENT_LOG_FILE, []);
  const total = log.length;
  const replies = log.filter(e => e.action === 'reply');
  const dm = log.filter(e => e.action === 'dm');
  const successCount = log.filter(e => e.status === 'success').length;
  const failCount = log.filter(e => e.status === 'failed').length;
  const lastEvents = log.slice(-20).reverse();
  res.json({ total, replies: replies.length, dm: dm.length, successCount, failCount, lastEvents });
});

// POST /admin/api/test -> simulate a comment event for a keyword
router.post('/api/test', express.json(), async (req, res) => {
  const body = req.body || {};
  const keyword = body.keyword || '';
  if (!keyword) return res.status(400).json({ error: 'keyword required' });
  const payload = {
    object: 'page',
    entry: [
      {
        id: '1864460076999002',
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'feed',
            value: {
              from: { id: 'USER_SIM_ID', name: 'Simulated User' },
              post: { id: '1864460076999002_999999999999999' },
              message: keyword,
              post_id: '1864460076999002_999999999999999',
              comment_id: '999999999999999_111111111111111',
              created_time: Math.floor(Date.now() / 1000),
              item: 'comment',
              verb: 'add'
            }
          }
        ]
      }
    ]
  };

  try {
    const axios = require('axios');
    const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
    const r = await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
    return res.json({ ok: true, status: r.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
