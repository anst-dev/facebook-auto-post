require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const PROGRESS_FILE = path.join(CONTENT_DIR, 'progress.json');
const LOG_FILE = path.join(__dirname, '..', 'post-log.json');

// === CONFIG ===
const GRAPH_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Schedule times for posts each day (Vietnam time)
const DAILY_SCHEDULE = [
  '04:00', '06:00', '08:00', '10:00',
  '12:00', '14:00', '16:00', '18:00',
  '20:00', '22:00'
];

const DELAY_BETWEEN_POSTS_MS = 5000; // 5s between posts when posting immediately

// === HELPERS ===

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: [], failed: [], current: null, total: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  }
  return [];
}

function appendLog(entry) {
  const log = loadLog();
  log.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function findCaption(dir) {
  if (!fs.existsSync(dir)) return null;
  const txt = fs.readdirSync(dir).find(f => f.endsWith('.txt'));
  return txt ? path.join(dir, txt) : null;
}

function findImage(dir) {
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const ext of exts) {
    const img = files.find(f => f.toLowerCase().endsWith(ext));
    if (img) return path.join(dir, img);
  }
  return null;
}

function scanContent() {
  const posts = [];
  const base = path.join(CONTENT_DIR, 'Gen Z Book Reviews');
  if (!fs.existsSync(base)) return posts;

  const dates = fs.readdirSync(base)
    .filter(d => fs.statSync(path.join(base, d)).isDirectory())
    .sort();

  for (const date of dates) {
    const datePath = path.join(base, date);
    const topics = fs.readdirSync(datePath)
      .filter(d => fs.statSync(path.join(datePath, d)).isDirectory());

    for (const topic of topics) {
      const topicPath = path.join(datePath, topic);
      const types = fs.readdirSync(topicPath)
        .filter(d => fs.statSync(path.join(topicPath, d)).isDirectory());

      for (const type of types) {
        const typePath = path.join(topicPath, type);
        const postDirs = fs.readdirSync(typePath)
          .filter(d => fs.statSync(path.join(typePath, d)).isDirectory())
          .sort();

        for (const postDir of postDirs) {
          const postPath = path.join(typePath, postDir);
          const captionFile = findCaption(postPath);
          const imageFile = findImage(postPath);

          if (captionFile) {
            posts.push({
              id: postDir,
              date,
              topic,
              type,
              path: postPath,
              captionFile,
              imageFile,
              caption: fs.readFileSync(captionFile, 'utf8').trim()
            });
          }
        }
      }
    }
  }

  return posts;
}

// === FACEBOOK POSTING ===

async function postText(caption) {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  return fb.postMessage(caption);
}

async function postWithImage(imagePath, caption) {
  const formData = new FormData();
  formData.append('message', caption);
  formData.append('source', fs.createReadStream(imagePath));

  try {
    const res = await axios.post(
      `${BASE_URL}/${process.env.FACEBOOK_PAGE_ID}/photos`,
      formData,
      {
        params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
        headers: formData.getHeaders()
      }
    );
    return { success: true, postId: res.data.id };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

async function scheduleTextPost(caption, timestamp) {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  return fb.schedulePost(caption, timestamp);
}

async function scheduleWithImage(imagePath, caption, timestamp) {
  try {
    // Upload photo unpublished first
    const formData = new FormData();
    formData.append('source', fs.createReadStream(imagePath));
    formData.append('published', 'false');

    const uploadRes = await axios.post(
      `${BASE_URL}/${process.env.FACEBOOK_PAGE_ID}/photos`,
      formData,
      {
        params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
        headers: formData.getHeaders()
      }
    );

    // Schedule post with attached photo
    const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
    const scheduleRes = await axios.post(
      `${BASE_URL}/${process.env.FACEBOOK_PAGE_ID}/feed`,
      {
        message: caption,
        attached_media: JSON.stringify([{ media_fbid: uploadRes.data.id }]),
        published: false,
        scheduled_publish_time: timestamp,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN
      }
    );
    return { success: true, postId: scheduleRes.data.id };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

function getTimestampForSchedule(dateStr, timeStr) {
  // dateStr: "2026-05-18", timeStr: "07:00" -> Unix timestamp in Vietnam timezone (UTC+7)
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min] = timeStr.split(':').map(Number);

  // Create date in Vietnam timezone
  const date = new Date(Date.UTC(year, month - 1, day, hour - 7, min, 0));
  return Math.floor(date.getTime() / 1000);
}

// === MAIN COMMANDS ===

function showStatus() {
  const progress = loadProgress();
  const posts = scanContent();

  console.log('=== TRẠNG THÁI AUTO SCHEDULER ===\n');
  console.log(`Tổng nội dung có sẵn: ${posts.length} bài`);
  console.log(`Đã đăng thành công: ${progress.completed.length} bài`);
  console.log(`Đã thất bại: ${progress.failed.length} bài`);
  console.log(`Chưa đăng: ${posts.length - progress.completed.length} bài\n`);

  const remaining = posts.filter(p => !progress.completed.includes(p.id));
  if (remaining.length === 0) {
    console.log('Tất cả bài đã được đăng!');
    return;
  }

  console.log('Bài chưa đăng:');
  remaining.forEach(p => {
    console.log(`  ${p.id} | ${p.date} | ${p.type} | img:${p.imageFile ? 'Y' : 'N'} | ${p.caption.split('\n')[0].substring(0, 50)}`);
  });
}

async function postNow() {
  const progress = loadProgress();
  const posts = scanContent();
  const remaining = posts.filter(p => !progress.completed.includes(p.id));

  if (remaining.length === 0) {
    console.log('Khong con bai de dang!');
    return;
  }

  console.log(`Tim thay ${remaining.length} bai chua dang.\n`);

  // Verify API first
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const verify = await fb.verifyToken();
  if (!verify.valid) {
    console.error('TOKEN HET HAN! Cap nhat .env voi token moi.');
    console.error('Loi:', JSON.stringify(verify.error, null, 2));
    return;
  }
  console.log(`Token hop le. Page: ${verify.data.name}\n`);

  for (const post of remaining) {
    console.log(`Dang ${post.id}...`);

    let result;
    try {
      if (post.imageFile) {
        result = await postWithImage(post.imageFile, post.caption);
      } else {
        result = await postText(post.caption);
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }

    if (result.success) {
      progress.completed.push(post.id);
      saveProgress(progress);
      appendLog({ postId: result.postId, contentId: post.id, action: 'post', status: 'success' });
      console.log(`  OK! Post ID: ${result.postId}`);
    } else {
      progress.failed.push(post.id);
      saveProgress(progress);
      appendLog({ contentId: post.id, action: 'post', status: 'failed', error: result.error });
      console.error(`  LOI: ${JSON.stringify(result.error)}`);
    }

    // Delay between posts
    if (remaining.indexOf(post) < remaining.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
    }
  }

  console.log(`\nHoan thanh! Dang: ${progress.completed.length}/${posts.length}`);
}

async function scheduleAll() {
  const progress = loadProgress();
  const posts = scanContent();
  const remaining = posts.filter(p => !progress.completed.includes(p.id));

  if (remaining.length === 0) {
    console.log('Khong con bai de len lich!');
    return;
  }

  // Verify API first
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const verify = await fb.verifyToken();
  if (!verify.valid) {
    console.error('TOKEN HET HAN! Cap nhat .env voi token moi.');
    console.error('Loi:', JSON.stringify(verify.error, null, 2));
    return;
  }
  console.log(`Token hop le. Page: ${verify.data.name}\n`);

  // Group posts by date
  const byDate = {};
  for (const post of remaining) {
    if (!byDate[post.date]) byDate[post.date] = [];
    byDate[post.date].push(post);
  }

  console.log(`Len lich ${remaining.length} bai cho ${Object.keys(byDate)} ngay:\n`);

  for (const [date, datePosts] of Object.entries(byDate)) {
    console.log(`${date} (${datePosts.length} bai):`);

    for (let i = 0; i < datePosts.length; i++) {
      const post = datePosts[i];
      const timeStr = DAILY_SCHEDULE[i % DAILY_SCHEDULE.length];
      const timestamp = getTimestampForSchedule(date, timeStr);

      // Only schedule future posts
      const now = Math.floor(Date.now() / 1000);
      let schedTs = timestamp;
      let schedLabel = `${timeStr} ${date}`;

      if (schedTs <= now) {
        // If time passed, schedule 1 hour from now
        schedTs = now + 3600;
        schedLabel = `1h sau (vi ${timeStr} da qua)`;
      }

      console.log(`  ${post.id} -> ${schedLabel}`);

      let result;
      try {
        if (post.imageFile) {
          result = await scheduleWithImage(post.imageFile, post.caption, schedTs);
        } else {
          result = await scheduleTextPost(post.caption, schedTs);
        }
      } catch (err) {
        result = { success: false, error: err.message };
      }

      if (result.success) {
        progress.completed.push(post.id);
        saveProgress(progress);
        appendLog({ postId: result.postId, contentId: post.id, action: 'schedule', scheduledFor: schedLabel, status: 'success' });
        console.log(`    Len lich OK! Post ID: ${result.postId}`);
      } else {
        progress.failed.push(post.id);
        saveProgress(progress);
        appendLog({ contentId: post.id, action: 'schedule', status: 'failed', error: result.error });
        console.error(`    LOI: ${JSON.stringify(result.error)}`);
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\nHoan thanh! Dang/len lich: ${progress.completed.length}/${posts.length}`);
}

async function verifyToken() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const result = await fb.verifyToken();

  if (result.valid) {
    console.log('Token HOP LE');
    console.log(`User ID: ${result.data.id}`);
    console.log(`Name: ${result.data.name}`);

    const pageInfo = await fb.getPageInfo();
    if (pageInfo.success) {
      console.log(`\nPage: ${pageInfo.data.name}`);
      console.log(`Page ID: ${pageInfo.data.id}`);
      console.log(`Fans: ${pageInfo.data.fan_count || 'N/A'}`);
    }

    const perms = await fb.getPermissions();
    if (perms.success) {
      console.log('\nPermissions:');
      perms.data.filter(p => p.status === 'granted').forEach(p => console.log(`  ${p.permission}`));
    }
  } else {
    console.error('Token KHONG HOP LE:');
    console.error(JSON.stringify(result.error, null, 2));
    console.log('\nDe lay token moi:');
    console.log('1. Vao https://developers.facebook.com');
    console.log('2. Chon app -> Graph API Explorer');
    console.log('3. Lay Page Access Token (can quyen: pages_manage_posts, pages_read_engagement)');
    console.log('4. Cap nhat vao file .env:');
    console.log('   FACEBOOK_ACCESS_TOKEN=<token_moi>');
  }
}

function resetProgress() {
  const progress = { completed: [], failed: [], current: null, total: scanContent().length };
  saveProgress(progress);
  console.log('Da reset progress. Tat ca bai se duoc dang lai.');
  showStatus();
}

// === CLI ===

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
  AUTO SCHEDULER - Tu dong len lich dang bai Facebook

  Lenh:
    status        Xem trang thai (bai da dang / chua dang)
    verify        Kiem tra token Facebook
    post          Dang ngay tat ca bai chua dang
    schedule      Len lich tat ca bai theo ngay/gio
    reset         Reset progress (dang lai tu dau)
    help          Hien thi huong dan

  Ví du:
    node src/auto-scheduler.js status
    node src/auto-scheduler.js verify
    node src/auto-scheduler.js post
    node src/auto-scheduler.js schedule
    `);
  } else if (command === 'status') {
    showStatus();
  } else if (command === 'verify') {
    verifyToken();
  } else if (command === 'post') {
    postNow();
  } else if (command === 'schedule') {
    scheduleAll();
  } else if (command === 'reset') {
    resetProgress();
  } else {
    console.error('Lenh khong hop le. Chay "node src/auto-scheduler.js help"');
    process.exit(1);
  }
}

module.exports = {
  loadProgress,
  saveProgress,
  scanContent,
  resetProgress,
  FacebookAPI,
  scheduleAll
};
