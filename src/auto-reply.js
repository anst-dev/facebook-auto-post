require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const axios = require('axios');
const readline = require('readline');

const GRAPH_API_VERSION = 'v23.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ========== CONFIG ==========
let CONFIG = {
  pageId: process.env.FACEBOOK_PAGE_ID,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'auto_reply_token_2024',
  port: process.env.WEBHOOK_PORT || 3000,
  selectedPostId: null,
  keywords: [],
  matchReply: '',
  noMatchReply: '',
  privateReplyMatch: '',
  privateReplyNoMatch: '',
  messengerWelcomeReply: '',
};

const processedEvents = new Set();

// ========== FACEBOOK API HELPERS ==========
function fbUrl(path) {
  return `${BASE_URL}${path}`;
}

async function getFeed(limit = 20) {
  const res = await axios.get(fbUrl(`/${CONFIG.pageId}/feed`), {
    params: {
      access_token: CONFIG.accessToken,
      fields: 'id,message,created_time,permalink_url',
      limit,
    },
  });
  return res.data.data;
}

async function replyComment(commentId, message) {
  const res = await axios.post(fbUrl(`/${commentId}/comments`), null, {
    params: { access_token: CONFIG.accessToken, message },
  });
  return res.data;
}

async function privateReply(commentId, message) {
  const res = await axios.post(fbUrl(`/${commentId}/private_replies`), null, {
    params: { access_token: CONFIG.accessToken, message },
  });
  return res.data;
}

async function sendMessengerMessage(psid, message) {
  const res = await axios.post(fbUrl(`/${CONFIG.pageId}/messages`), {
    recipient: { id: psid },
    message: { text: message },
    access_token: CONFIG.accessToken,
  });
  return res.data;
}

// ========== INTERACTIVE SETUP ==========
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function interactiveSetup() {
  console.log('\n========================================');
  console.log('  FACEBOOK AUTO-REPLY SETUP');
  console.log('========================================\n');

  if (!CONFIG.accessToken || !CONFIG.pageId) {
    console.error('Loi: Thieu FACEBOOK_ACCESS_TOKEN hoac FACEBOOK_PAGE_ID trong .env');
    process.exit(1);
  }

  // Verify token
  try {
    const me = await axios.get(fbUrl('/me'), {
      params: { access_token: CONFIG.accessToken, fields: 'id,name' },
    });
    console.log(`Da ket noi voi Page: ${me.data.name}\n`);
  } catch (err) {
    console.error('Loi xac thuc token. Kiem tra lai .env');
    process.exit(1);
  }

  // Select post
  console.log('Dang lay danh sach bai dang...\n');
  const posts = await getFeed(15);

  if (!posts.length) {
    console.error('Khong tim thay bai dang nao.');
    process.exit(1);
  }

  posts.forEach((p, i) => {
    const msg = (p.message || '(khong co noi dung)').substring(0, 80);
    const date = new Date(p.created_time).toLocaleDateString('vi-VN');
    console.log(`  ${i + 1}. [${date}] ${msg}${msg.length >= 80 ? '...' : ''}`);
  });

  const postChoice = await ask('\nChon bai dang (so thu tu, hoac "all" cho tat ca): ');
  if (postChoice.trim().toLowerCase() === 'all') {
    CONFIG.selectedPostId = 'all';
    console.log('-> Se theo doi tat ca bai dang.\n');
  } else {
    const idx = parseInt(postChoice) - 1;
    if (idx >= 0 && idx < posts.length) {
      CONFIG.selectedPostId = posts[idx].id;
      console.log(`-> Da chon bai: ${posts[idx].id}\n`);
    } else {
      console.error('Lua chon khong hop le.');
      process.exit(1);
    }
  }

  // Keywords
  const kwInput = await ask('Nhap tu khoa (phan cach bang dau phay, vd: gia, gia bao nhieu, mua): ');
  CONFIG.keywords = kwInput.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  console.log(`-> Tu khoa: [${CONFIG.keywords.join(', ')}]\n`);

  // Reply when keyword matches
  CONFIG.matchReply = await ask('Nhap noi dung reply cong khai khi DUNG tu khoa: ');
  CONFIG.privateReplyMatch = await ask('Nhap noi dung tin nhan rieng khi DUNG tu khoa: ');

  // Reply when keyword does NOT match
  CONFIG.noMatchReply = await ask('Nhap noi dung reply cong khai khi KHONG dung tu khoa: ');
  CONFIG.privateReplyNoMatch = await ask('Nhap noi dung tin nhan rieng khi KHONG dung tu khoa: ');

  // Messenger welcome
  CONFIG.messengerWelcomeReply = await ask('Nhap noi dung reply khi nguoi dung chu dong nhan tin: ');

  // Summary
  console.log('\n========================================');
  console.log('  CAU HINH DA SAN SANG');
  console.log('========================================');
  console.log(`  Bai dang: ${CONFIG.selectedPostId === 'all' ? 'Tat ca' : CONFIG.selectedPostId}`);
  console.log(`  Tu khoa: [${CONFIG.keywords.join(', ')}]`);
  console.log(`  Reply dung tu khoa (public): ${CONFIG.matchReply}`);
  console.log(`  Reply dung tu khoa (private): ${CONFIG.privateReplyMatch}`);
  console.log(`  Reply sai tu khoa (public): ${CONFIG.noMatchReply}`);
  console.log(`  Reply sai tu khoa (private): ${CONFIG.privateReplyNoMatch}`);
  console.log(`  Messenger welcome: ${CONFIG.messengerWelcomeReply}`);
  console.log('========================================\n');
}

// ========== KEYWORD MATCHING ==========
function matchKeywords(text) {
  if (!CONFIG.keywords.length) return false;
  const lower = text.toLowerCase();
  return CONFIG.keywords.some(kw => lower.includes(kw));
}

// ========== WEBHOOK SERVER ==========
function createServer() {
  const app = express();
  app.use(express.json());

  // Webhook verification
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === CONFIG.verifyToken) {
      console.log('[Webhook] Xac thuc thanh cong!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  // Event handler
  app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object !== 'page') {
      res.sendStatus(404);
      return;
    }

    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry) {
      // ====== FEED EVENTS (comments) ======
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
            await handleComment(change.value);
          }
        }
      }

      // ====== MESSENGER EVENTS (direct messages) ======
      if (entry.messaging) {
        for (const msg of entry.messaging) {
          await handleMessengerEvent(msg);
        }
      }
    }
  });

  return app;
}

// ========== COMMENT HANDLER ==========
async function handleComment(commentData) {
  const { comment_id, post_id, message, from } = commentData;

  // Dedup
  if (processedEvents.has(comment_id)) return;
  processedEvents.add(comment_id);

  // Filter by post
  if (CONFIG.selectedPostId !== 'all' && post_id !== CONFIG.selectedPostId) return;

  // Skip own page comments
  if (from.id === CONFIG.pageId) return;

  const now = new Date().toLocaleString('vi-VN');
  console.log(`\n[${now}] Comment moi tu ${from.name}: "${message}"`);

  const isMatch = matchKeywords(message);
  const label = isMatch ? 'DUNG TU KHOA' : 'KHONG DUNG TU KHOA';

  // Public reply
  const publicMsg = isMatch ? CONFIG.matchReply : CONFIG.noMatchReply;
  try {
    await replyComment(comment_id, publicMsg);
    console.log(`  [Public Reply - ${label}]: ${publicMsg}`);
  } catch (err) {
    console.error(`  [Loi Public Reply]: ${err.response?.data?.error?.message || err.message}`);
  }

  // Private reply via Messenger
  const privateMsg = isMatch ? CONFIG.privateReplyMatch : CONFIG.privateReplyNoMatch;
  if (privateMsg) {
    try {
      await privateReply(comment_id, privateMsg);
      console.log(`  [Private Reply - ${label}]: ${privateMsg}`);
    } catch (err) {
      console.error(`  [Loi Private Reply]: ${err.response?.data?.error?.message || err.message}`);
    }
  }
}

// ========== MESSENGER HANDLER ==========
async function handleMessengerEvent(msgEvent) {
  const senderId = msgEvent.sender.id;
  const recipientId = msgEvent.recipient.id;

  // Skip messages sent BY the page
  if (senderId === CONFIG.pageId) return;

  // Only handle text messages from users
  if (!msgEvent.message || !msgEvent.message.text) return;

  const mid = msgEvent.message.mid;

  // Dedup
  if (processedEvents.has(mid)) return;
  processedEvents.add(mid);

  const now = new Date().toLocaleString('vi-VN');
  const text = msgEvent.message.text;
  console.log(`\n[${now}] Messenger tu PSID ${senderId}: "${text}"`);

  if (!CONFIG.messengerWelcomeReply) return;

  try {
    await sendMessengerMessage(senderId, CONFIG.messengerWelcomeReply);
    console.log(`  [Messenger Reply]: ${CONFIG.messengerWelcomeReply}`);
  } catch (err) {
    console.error(`  [Loi Messenger Reply]: ${err.response?.data?.error?.message || err.message}`);
  }
}

// ========== MAIN ==========
async function main() {
  await interactiveSetup();
  rl.close();

  const app = createServer();
  app.listen(CONFIG.port, () => {
    console.log(`Webhook server dang chay tai:`);
    console.log(`  http://localhost:${CONFIG.port}/webhook`);
    console.log(`\nVerify Token: ${CONFIG.verifyToken}`);
    console.log(`\nDang cho comment va messenger...`);
    console.log('(Nhan Ctrl+C de dung)\n');
  });
}

main().catch(err => {
  console.error('Loi khoi dong:', err.message);
  rl.close();
  process.exit(1);
});
