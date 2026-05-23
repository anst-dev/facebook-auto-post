require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'comment-reply-config.json');
const STATE_FILE = path.join(__dirname, '..', 'comment-reply-state.json');
const LOG_FILE = path.join(__dirname, '..', 'comment-reply-log.json');
const DELAY_BETWEEN_REPLIES_MS = 2000;

// === VIETNAMESE TEXT NORMALIZATION ===

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

function matchKeyword(commentText, keywords) {
  const normalized = normalizeVietnamese(commentText);
  for (const kw of keywords) {
    const normalizedKw = normalizeVietnamese(kw.keyword);
    const pattern = new RegExp(`\\b${escapeRegex(normalizedKw)}\\b`, 'i');
    if (pattern.test(normalized)) {
      return kw;
    }
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === STATE MANAGEMENT ===

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('Khong tim thay file cau hinh:', CONFIG_FILE);
    console.error('Tao file comment-reply-config.json truoc khi chay.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {
    processedComments: {},
    lastPollTime: null,
    stats: { totalProcessed: 0, totalReplies: 0, totalDMs: 0, totalDMFailed: 0, byKeyword: {} }
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function appendLog(entry) {
  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  }
  log.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

// === MAIN POLLING LOGIC ===

async function pollComments() {
  const config = loadConfig();
  if (!config.enabled) {
    console.log('Comment reply dang TAM NGUNG (enabled=false trong config).');
    return;
  }

  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  // Verify token
  const verify = await fb.verifyToken();
  if (!verify.valid) {
    console.error('TOKEN HET HAN!', JSON.stringify(verify.error, null, 2));
    return;
  }

  const state = loadState();
  const sinceTimestamp = Math.floor(Date.now() / 1000) - (config.pollIntervalMinutes + 2) * 60;

  console.log(`\n[${new Date().toLocaleString('vi-VN')}] Bat dau quet comment...`);

  // Fetch published posts
  const postsResult = await fb.getPublishedPosts(config.postLimit || 10);
  if (!postsResult.success) {
    console.error('Loi lay danh sach bai dang:', JSON.stringify(postsResult.error, null, 2));
    return;
  }

  const posts = postsResult.data || [];
  if (posts.length === 0) {
    console.log('Khong tim thay bai dang nao.');
    state.lastPollTime = new Date().toISOString();
    saveState(state);
    return;
  }

  console.log(`Tim thay ${posts.length} bai dang. Dang quet comment...`);

  let newReplies = 0;

  for (const post of posts) {
    const commentsResult = await fb.getComments(post.id, { since: sinceTimestamp, limit: 100 });
    if (!commentsResult.success) {
      console.error(`  Loi lay comment bai ${post.id}:`, JSON.stringify(commentsResult.error));
      continue;
    }

    const comments = commentsResult.data || [];
    if (comments.length === 0) continue;

    for (const comment of comments) {
      // Skip already processed
      if (state.processedComments[comment.id]) continue;

      // Skip own page comments
      if (comment.from && comment.from.id === process.env.FACEBOOK_PAGE_ID) continue;

      // Match keyword
      const matched = matchKeyword(comment.message, config.keywords);
      if (!matched) continue;

      const userName = comment.from ? comment.from.name : 'Unknown';
      const userId = comment.from ? comment.from.id : null;

      console.log(`  Match "${matched.keyword}" tu "${userName}" (${comment.id})`);

      // Reply comment
      const replyResult = await fb.replyToComment(
        comment.id,
        matched.replyComment,
        matched.replyCommentAttachmentUrl || null
      );

      if (replyResult.success) {
        console.log(`    Reply OK: ${replyResult.commentId}`);
        state.stats.totalReplies++;
        appendLog({
          commentId: comment.id, postId: post.id, keyword: matched.keyword,
          action: 'reply', status: 'success', userName, replyId: replyResult.commentId
        });
      } else {
        console.error(`    Reply LOI:`, JSON.stringify(replyResult.error));
        appendLog({
          commentId: comment.id, postId: post.id, keyword: matched.keyword,
          action: 'reply', status: 'failed', userName, error: replyResult.error
        });
      }

      // Send DM — try PSID first, fallback to private_replies via comment ID
      let dmSent = false;
      if (matched.privateMessage) {
        let dmResult;
        if (userId) {
          dmResult = await fb.sendPrivateMessage(userId, matched.privateMessage);
        } else {
          dmResult = await fb.sendPrivateReply(comment.id, matched.privateMessage);
        }
        if (dmResult.success) {
          console.log(`    DM OK: ${dmResult.messageId}`);
          dmSent = true;
          state.stats.totalDMs++;
          appendLog({
            commentId: comment.id, postId: post.id, keyword: matched.keyword,
            action: 'dm', status: 'success', userName
          });
        } else {
          console.warn(`    DM LOI (van reply comment OK):`, JSON.stringify(dmResult.error));
          state.stats.totalDMFailed++;
          appendLog({
            commentId: comment.id, postId: post.id, keyword: matched.keyword,
            action: 'dm', status: 'failed', userName, error: dmResult.error
          });
        }
      }

      // Mark processed
      state.processedComments[comment.id] = {
        postId: post.id,
        keyword: matched.keyword,
        repliedAt: new Date().toISOString(),
        dmSent,
        userName
      };
      state.stats.totalProcessed++;
      state.stats.byKeyword[matched.keyword] = (state.stats.byKeyword[matched.keyword] || 0) + 1;
      newReplies++;

      // Rate limit delay
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REPLIES_MS));
    }
  }

  state.lastPollTime = new Date().toISOString();
  saveState(state);

  console.log(`Quet xong. ${newReplies} comment moi duoc xu ly.`);
}

// === CLI COMMANDS ===

function showStatus() {
  const state = loadState();
  const config = loadConfig();

  console.log('=== TRANG THAI COMMENT REPLY ===\n');
  console.log(`Trang thai: ${config.enabled ? 'DANG BAT' : 'TAM NGUNG'}`);
  console.log(`Poll interval: ${config.pollIntervalMinutes} phut`);
  console.log(`Post limit: ${config.postLimit} bai`);
  console.log(`Tu khoa: ${config.keywords.map(k => k.keyword).join(', ')}\n`);

  console.log(`Tong comment da xu ly: ${state.stats.totalProcessed}`);
  console.log(`Reply thanh cong: ${state.stats.totalReplies}`);
  console.log(`DM thanh cong: ${state.stats.totalDMs}`);
  console.log(`DM that bai: ${state.stats.totalDMFailed}`);
  console.log(`Lan quet cuoi: ${state.lastPollTime || 'Chua chay'}\n`);

  if (Object.keys(state.stats.byKeyword).length > 0) {
    console.log('Theo tu khoa:');
    for (const [kw, count] of Object.entries(state.stats.byKeyword)) {
      console.log(`  ${kw}: ${count} comment`);
    }
  }
}

async function testConfig() {
  console.log('=== KIEM TRA COMMENT REPLY ===\n');

  // Check config
  const config = loadConfig();
  console.log(`Config: OK (${config.keywords.length} tu khoa)`);
  config.keywords.forEach(k => console.log(`  - "${k.keyword}"`));

  // Check token
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const verify = await fb.verifyToken();
  if (!verify.valid) {
    console.error('\nToken KHONG HOP LE:', JSON.stringify(verify.error, null, 2));
    return;
  }
  console.log(`\nToken: HOP LE (${verify.data.name})`);

  // Check permissions
  const perms = await fb.getPermissions();
  if (perms.success) {
    const granted = perms.data.filter(p => p.status === 'granted').map(p => p.permission);
    const required = ['pages_manage_posts', 'pages_read_engagement', 'pages_read_user_content', 'pages_messaging'];
    console.log('\nPermissions:');
    for (const perm of required) {
      const has = granted.includes(perm);
      console.log(`  ${has ? 'OK' : 'THIEU'} ${perm}${has ? '' : ' (can them)'}`);
    }
  }

  // Test getPublishedPosts
  const posts = await fb.getPublishedPosts(3);
  if (posts.success) {
    console.log(`\ngetPublishedPosts: OK (${posts.data.length} bai)`);
  } else {
    console.error('\ngetPublishedPosts: LOI', JSON.stringify(posts.error));
  }

  // Test getComments on first post
  if (posts.success && posts.data.length > 0) {
    const comments = await fb.getComments(posts.data[0].id, { limit: 5 });
    if (comments.success) {
      console.log(`getComments: OK (${comments.data.length} comment tren bai dau tien)`);
    } else {
      console.error('getComments: LOI', JSON.stringify(comments.error));
    }
  }
}

function resetState() {
  const state = {
    processedComments: {},
    lastPollTime: null,
    stats: { totalProcessed: 0, totalReplies: 0, totalDMs: 0, totalDMFailed: 0, byKeyword: {} }
  };
  saveState(state);
  console.log('Da reset state. Tat ca comment se duoc xu ly lai.');
}

function startPolling() {
  const config = loadConfig();
  const intervalMs = (config.pollIntervalMinutes || 5) * 60 * 1000;

  console.log(`=== BAT DAU COMMENT REPLY POLLING ===`);
  console.log(`Interval: ${config.pollIntervalMinutes} phut`);
  console.log(`Tu khoa: ${config.keywords.map(k => k.keyword).join(', ')}`);
  console.log(`Nhan Ctrl+C de dung.\n`);

  // Run immediately
  pollComments().catch(err => console.error('Loi polling:', err.message));

  // Then poll on interval
  const timer = setInterval(() => {
    pollComments().catch(err => console.error('Loi polling:', err.message));
  }, intervalMs);

  process.on('SIGINT', () => {
    console.log('\nDung polling...');
    clearInterval(timer);
    process.exit(0);
  });
}

// === CLI ===

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help') {
  console.log(`
COMMENT REPLY - Tu dong reply comment va gui DM Facebook

Lenh:
  start     Bat dau polling lien tuc (mac dinh 5 phut)
  once      Chay 1 lan roi thoat
  status    Xem trang thai va thong ke
  test      Kiem tra token, permissions va API
  reset     Reset state (xu ly lai tat ca comment)
  help      Hien thi huong dan

Vi du:
  node src/comment-reply.js start
  node src/comment-reply.js once
  node src/comment-reply.js test
  `);
} else if (command === 'start') {
  startPolling();
} else if (command === 'once') {
  pollComments().catch(err => console.error('Loi:', err.message));
} else if (command === 'status') {
  showStatus();
} else if (command === 'test') {
  testConfig();
} else if (command === 'reset') {
  resetState();
} else {
  console.error('Lenh khong hop le. Chay "node src/comment-reply.js help"');
  process.exit(1);
}
