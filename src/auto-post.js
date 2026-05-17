require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const FacebookAPI = require('./facebook');
const WebSearcher = require('./search');

async function autoPost(topic, options = {}) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    console.error('Thiếu cấu hình. Kiểm tra file .env');
    return { success: false, error: 'Missing credentials' };
  }

  const fb = new FacebookAPI(pageId, accessToken);
  const searcher = new WebSearcher();

  const effectiveTopic = topic || process.env.DEFAULT_TOPIC || 'technology news';
  console.log(`Đang tìm kiếm: "${effectiveTopic}"...`);

  const results = await searcher.search(effectiveTopic, 5);
  if (!results.length) {
    console.error('Không tìm thấy kết quả.');
    return { success: false, error: 'No search results' };
  }

  const message = options.format === 'full'
    ? searcher.formatPostContent(effectiveTopic, results)
    : await searcher.summarizeForPost(effectiveTopic, results);

  if (!message) {
    console.error('Không thể tạo nội dung bài viết.');
    return { success: false, error: 'Content generation failed' };
  }

  console.log('\nNội dung bài viết:');
  console.log('---');
  console.log(message);
  console.log('---\n');

  console.log('Đang đăng bài lên Facebook...');

  let result;
  if (options.link && results[0]?.url) {
    result = await fb.postLink(results[0].url, message);
  } else {
    result = await fb.postMessage(message);
  }

  if (result.success) {
    console.log(`Đăng bài thành công! Post ID: ${result.postId}`);

    const postDetail = await fb.getPost(result.postId);
    if (postDetail.success) {
      console.log(`URL: ${postDetail.data.permalink_url || 'N/A'}`);
    }

    return { success: true, postId: result.postId, message };
  } else {
    console.error('Lỗi đăng bài:', JSON.stringify(result.error, null, 2));
    return { success: false, error: result.error };
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { format: 'summary' };
  const parts = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      options.format = args[++i];
    } else if (args[i] === '--link') {
      options.link = true;
    } else if (args[i] === '--schedule' && args[i + 1]) {
      options.schedule = parseInt(args[++i], 10);
    } else {
      parts.push(args[i]);
    }
  }

  return { topic: parts.join(' ') || null, options };
}

if (require.main === module) {
  const { topic, options } = parseArgs();
  autoPost(topic, options).then(result => process.exit(result.success ? 0 : 1));
}

module.exports = autoPost;
