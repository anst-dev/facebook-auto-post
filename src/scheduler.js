require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const FacebookAPI = require('./facebook');
const WebSearcher = require('./search');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  const parts = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--at' && args[i + 1]) {
      // --at "2025-05-17 15:00" hoặc --at "15:00" (hôm nay)
      options.scheduledTime = args[++i];
    } else if (args[i] === '--in' && args[i + 1]) {
      // --in 60 (sau 60 phút)
      options.delayMinutes = parseInt(args[++i], 10);
    } else if (args[i] === '--repeat' && args[i + 1]) {
      // --repeat 60 (lặp lại mỗi 60 phút)
      options.repeatMinutes = parseInt(args[++i], 10);
    } else {
      parts.push(args[i]);
    }
  }

  return { topic: parts.join(' ') || null, options };
}

function getTimestamp(input) {
  let date;

  if (input.includes(' ')) {
    // Đầy đủ: "2025-05-17 15:00"
    date = new Date(input);
  } else {
    // Chỉ giờ: "15:00" → hôm nay
    const [h, m] = input.split(':').map(Number);
    date = new Date();
    date.setHours(h, m, 0, 0);

    // Nếu giờ đã qua, chuyển sang ngày mai
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }
  }

  if (isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(date.getTime() / 1000);
}

async function schedulePost(topic, options) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    console.error('Thiếu cấu hình. Kiểm tra file .env');
    return false;
  }

  const fb = new FacebookAPI(pageId, accessToken);
  const searcher = new WebSearcher();

  // Tính timestamp
  let timestamp;
  if (options.scheduledTime) {
    timestamp = getTimestamp(options.scheduledTime);
    if (!timestamp) {
      console.error('Định dạng thời gian không hợp lệ. Dùng: "15:00" hoặc "2025-05-17 15:00"');
      return false;
    }
  } else if (options.delayMinutes) {
    timestamp = Math.floor(Date.now() / 1000) + (options.delayMinutes * 60);
  } else {
    // Mặc định: 10 phút sau
    timestamp = Math.floor(Date.now() / 1000) + 600;
  }

  const dateStr = new Date(timestamp * 1000).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Tìm kiếm nội dung
  const effectiveTopic = topic || process.env.DEFAULT_TOPIC || 'công nghệ mới nhất';
  console.log(`Đang tìm kiếm: "${effectiveTopic}"...`);

  const results = await searcher.search(effectiveTopic, 5);
  if (!results.length) {
    console.error('Không tìm thấy kết quả.');
    return false;
  }

  const message = await searcher.summarizeForPost(effectiveTopic, results);
  if (!message) {
    console.error('Không thể tạo nội dung.');
    return false;
  }

  console.log('\nNội dung bài viết:');
  console.log('---');
  console.log(message);
  console.log('---');

  // Đăng bài đã lên lịch
  console.log(`\nĐang lên lịch đăng bài lúc ${dateStr}...`);

  const result = await fb.schedulePost(message, timestamp);
  if (result.success) {
    console.log(`Lên lịch thành công!`);
    console.log(`  Post ID: ${result.postId}`);
    console.log(`  Thời gian đăng: ${dateStr}`);
    return true;
  } else {
    console.error('Lỗi lên lịch:', JSON.stringify(result.error, null, 2));
    return false;
  }
}

// Lặp lại đăng bài
async function scheduleRepeating(topic, repeatMinutes) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const fb = new FacebookAPI(pageId, accessToken);
  const searcher = new WebSearcher();

  console.log(`Chế độ lặp lại: mỗi ${repeatMinutes} phút`);
  console.log('Nhấn Ctrl+C để dừng.\n');

  async function postOnce() {
    const effectiveTopic = topic || process.env.DEFAULT_TOPIC || 'công nghệ mới nhất';
    console.log(`[${new Date().toLocaleString('vi-VN')}] Đang đăng: "${effectiveTopic}"...`);

    const results = await searcher.search(effectiveTopic, 5);
    if (!results.length) {
      console.log('Không tìm thấy kết quả. Bỏ qua.');
      return;
    }

    const message = await searcher.summarizeForPost(effectiveTopic, results);
    if (!message) return;

    const result = await fb.postMessage(message);
    if (result.success) {
      console.log(`Đăng thành công! Post ID: ${result.postId}`);
    } else {
      console.error('Lỗi:', JSON.stringify(result.error));
    }
  }

  await postOnce();
  setInterval(postOnce, repeatMinutes * 60 * 1000);
}

// CLI
const { topic, options } = parseArgs();

if (options.repeatMinutes) {
  scheduleRepeating(topic, options.repeatMinutes);
} else {
  schedulePost(topic, options).then(ok => process.exit(ok ? 0 : 1));
}
