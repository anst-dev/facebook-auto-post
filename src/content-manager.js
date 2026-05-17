require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const CONTENT_DIR = path.join(__dirname, '..', 'content');

// ============ HELPERS ============

function getPageName() {
  // Lấy tên Page từ .env hoặc từ Facebook API
  return process.env.FACEBOOK_PAGE_NAME || process.env.FACEBOOK_PAGE_ID;
}

function todayStr() {
  return new Date().toISOString().split('T')[0]; // "2025-05-17"
}

function listDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => {
    try { return fs.statSync(path.join(dir, f)).isDirectory(); } catch { return false; }
  });
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => {
    if (ext) return f.endsWith(ext);
    try { return fs.statSync(path.join(dir, f)).isFile(); } catch { return false; }
  });
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

function findCaption(dir) {
  if (!fs.existsSync(dir)) return null;
  const txt = fs.readdirSync(dir).find(f => f.endsWith('.txt'));
  return txt ? path.join(dir, txt) : null;
}

// ============ LỆNH ============

function showHelp() {
  console.log(`
Quản lý nội dung Facebook theo: Page / Ngày / Chủ đề / Loại

Cấu trúc thư mục:
  content/
    {Tên Page}/
      {Ngày}/           ← ví dụ: 2025-05-17
        {Chủ đề}/       ← ví dụ: AI-cho-dan-van-phong
          content/      ← Bài đăng thông thường
            caption.txt
            ảnh.png
          kienthuc/     ← Bài kiến thức
            caption.txt
            ảnh.png

Lệnh:
  init [chủ đề] [loại]          Tạo thư mục mới cho hôm nay
  list                          Xem tất cả nội dung sẵn có
  post <đường_dẫn>             Đăng bài (thư mục chứa caption + ảnh)
  today                         Xem nội dung hôm nay
  help                          Hiển thị hướng dẫn này

Ví dụ:
  node src/content-manager.js init "AI cho dân văn phòng" content
  node src/content-manager.js init "tips Excel" kienthuc
  node src/content-manager.js list
  node src/content-manager.js post "content/Gen Z Book Reviews/2025-05-17/AI-cho-dan-van-phong/content"
  node src/content-manager.js today
`);
}

function initFolder(topic, type) {
  const pageName = getPageName();
  const date = todayStr();
  const safeTopic = topic.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9À-ỹ-]/g, '');
  const folderType = type || 'content';

  const basePath = path.join(CONTENT_DIR, pageName, date, safeTopic, folderType);
  fs.mkdirSync(basePath, { recursive: true });

  // Tạo caption mẫu
  const captionFile = path.join(basePath, 'caption.txt');
  if (!fs.existsSync(captionFile)) {
    fs.writeFileSync(captionFile, `📌 ${topic}\n\nNội dung bài viết ở đây...\n\n#Hashtag`, 'utf8');
  }

  console.log(`Đã tạo thư mục:`);
  console.log(`  ${path.relative(CONTENT_DIR, basePath)}`);
  console.log(`\nBước tiếp theo:`);
  console.log(`  1. Sửa caption: ${path.relative('.', captionFile)}`);
  console.log(`  2. Thả ảnh vào: ${path.relative('.', basePath)}`);
  console.log(`  3. Đăng bài:    node src/content-manager.js post "${path.relative('.', basePath)}"`);

  return basePath;
}

function listAll() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('Chưa có nội dung nào.');
    return;
  }

  console.log('=== Nội dung sẵn có ===\n');

  const pages = listDir(CONTENT_DIR);
  if (!pages.length) { console.log('Chưa có nội dung nào.'); return; }

  for (const page of pages) {
    console.log(`📄 ${page}/`);
    const pagePath = path.join(CONTENT_DIR, page);
    const dates = listDir(pagePath).sort().reverse();

    for (const date of dates) {
      console.log(`  📅 ${date}/`);
      const datePath = path.join(pagePath, date);
      const topics = listDir(datePath);

      for (const topic of topics) {
        console.log(`    📂 ${topic}/`);
        const topicPath = path.join(datePath, topic);
        const types = listDir(topicPath);

        for (const type of types) {
          const typePath = path.join(topicPath, type);
          const caption = findCaption(typePath);
          const image = findImage(typePath);
          const status = [];
          if (caption) status.push('caption ✓');
          if (image) status.push(`ảnh (${(fs.statSync(image).size / 1024).toFixed(0)} KB) ✓`);
          if (!status.length) status.push('trống');

          console.log(`      ${type}/ — ${status.join(', ')}`);
          if (caption) {
            const preview = fs.readFileSync(caption, 'utf8').split('\n')[0].substring(0, 50);
            console.log(`        "${preview}"`);
          }
        }
      }
    }
    console.log('');
  }
}

function showToday() {
  const pageName = getPageName();
  const date = todayStr();
  const todayPath = path.join(CONTENT_DIR, pageName, date);

  console.log(`📅 Hôm nay: ${date}`);
  console.log(`📄 Page: ${pageName}\n`);

  if (!fs.existsSync(todayPath)) {
    console.log('Chưa có nội dung nào cho hôm nay.');
    console.log('Tạo mới: node src/content-manager.js init "chủ đề" content');
    return;
  }

  const topics = listDir(todayPath);
  if (!topics.length) {
    console.log('Chưa có chủ đề nào.');
    return;
  }

  for (const topic of topics) {
    console.log(`📂 ${topic}/`);
    const topicPath = path.join(todayPath, topic);
    const types = listDir(topicPath);

    for (const type of types) {
      const typePath = path.join(topicPath, type);
      const ready = findCaption(typePath) && findImage(typePath);
      const readyText = ready ? 'SẴN SÀNG ĐĂNG' : 'chưa đủ nội dung';
      console.log(`  ${type}/ — ${readyText}`);
    }
  }
}

async function postFromFolder(folderPath) {
  const resolved = path.resolve(folderPath);

  if (!fs.existsSync(resolved)) {
    console.error('Không tìm thấy thư mục:', resolved);
    return false;
  }

  const caption = findCaption(resolved);
  const image = findImage(resolved);

  if (!caption) {
    console.error('Không tìm thấy caption (.txt) trong:', resolved);
    return false;
  }

  const captionText = fs.readFileSync(caption, 'utf8').trim();
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  console.log(`\nNội dung:`);
  console.log(`  Caption: ${path.relative('.', caption)}`);
  console.log(`  Ảnh: ${image ? path.relative('.', image) : 'không có'}`);
  console.log(`\nTiêu đề: ${captionText.split('\n')[0]}`);
  console.log('\nĐang đăng bài...');

  try {
    let result;

    if (image) {
      const formData = new FormData();
      formData.append('message', captionText);
      formData.append('source', fs.createReadStream(image));

      const res = await axios.post(
        `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
        formData,
        {
          params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
          headers: formData.getHeaders()
        }
      );
      result = { success: true, postId: res.data.id };
    } else {
      result = await fb.postMessage(captionText);
    }

    if (result.success) {
      console.log(`Đăng bài thành công! Post ID: ${result.postId}`);
      const detail = await fb.getPost(result.postId);
      if (detail.success) {
        console.log(`URL: ${detail.data.permalink_url || 'N/A'}`);
      }
      return true;
    } else {
      console.error('Lỗi:', JSON.stringify(result.error, null, 2));
      return false;
    }
  } catch (err) {
    console.error('Lỗi:', JSON.stringify(err.response?.data?.error || err.message, null, 2));
    return false;
  }
}

// ============ CLI ============

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help') {
  showHelp();
} else if (command === 'init') {
  const topic = args[1] || 'bai-viet-moi';
  const type = args[2] || 'content';
  initFolder(topic, type);
} else if (command === 'list') {
  listAll();
} else if (command === 'today') {
  showToday();
} else if (command === 'post' && args[1]) {
  postFromFolder(args[1]).then(ok => process.exit(ok ? 0 : 1));
} else {
  console.error('Lệnh không hợp lệ. Chạy "node src/content-manager.js help" để xem hướng dẫn.');
  process.exit(1);
}
