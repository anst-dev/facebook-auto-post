require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Sử dụng: node src/post-content.js <lệnh> [tham số]

Lệnh:
  post <đường_dẫn_ảnh> <đường_dẫn_caption>   Đăng bài kèm ảnh + caption
  text <đường_dẫn_caption>                     Đăng bài chỉ text (không ảnh)
  list                                          Liệt kê caption sẵn có
  help                                          Hiển thị hướng dẫn

Ví dụ:
  node src/post-content.js post content/images/anh1.png content/captions/bai1.txt
  node src/post-content.js text content/captions/bai1.txt
  node src/post-content.js list
`);
}

function listCaptions() {
  const captionsDir = path.join(__dirname, '..', 'content', 'captions');
  const imagesDir = path.join(__dirname, '..', 'content', 'images');

  console.log('=== Nội dung sẵn có ===\n');

  // Liệt kê captions
  if (fs.existsSync(captionsDir)) {
    const captions = fs.readdirSync(captionsDir).filter(f => f.endsWith('.txt'));
    console.log(`📝 Caption (${captions.length}):`);
    captions.forEach(f => {
      const content = fs.readFileSync(path.join(captionsDir, f), 'utf8');
      const preview = content.split('\n')[0].substring(0, 60);
      console.log(`   content/captions/${f} — ${preview}`);
    });
  }

  // Liệt kê images
  if (fs.existsSync(imagesDir)) {
    const images = fs.readdirSync(imagesDir).filter(f =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    );
    console.log(`\n🖼️ Ảnh (${images.length}):`);
    images.forEach(f => {
      const size = fs.statSync(path.join(imagesDir, f)).size;
      console.log(`   content/images/${f} — ${(size / 1024).toFixed(0)} KB`);
    });
  }

  console.log('');
}

async function postWithImage(imagePath, captionPath) {
  // Đọc caption
  const resolvedCaption = path.resolve(captionPath);
  if (!fs.existsSync(resolvedCaption)) {
    console.error('Không tìm thấy file caption:', resolvedCaption);
    return false;
  }
  const caption = fs.readFileSync(resolvedCaption, 'utf8').trim();

  // Kiểm tra ảnh
  const resolvedImage = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImage)) {
    console.error('Không tìm thấy file ảnh:', resolvedImage);
    return false;
  }

  const stats = fs.statSync(resolvedImage);
  const ext = path.extname(resolvedImage).toLowerCase();
  const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (!validExts.includes(ext)) {
    console.error('Định dạng ảnh không hỗ trợ. Dùng: jpg, png, gif, webp');
    return false;
  }

  console.log(`Ảnh: ${resolvedImage} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`Caption: ${caption.split('\n')[0].substring(0, 60)}...`);
  console.log('\nĐang đăng bài...');

  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const formData = new FormData();
  formData.append('message', caption);
  formData.append('source', fs.createReadStream(resolvedImage));

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
      formData,
      {
        params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
        headers: formData.getHeaders()
      }
    );

    console.log(`Đăng bài thành công! Post ID: ${res.data.id}`);

    const detail = await fb.getPost(res.data.id);
    if (detail.success) {
      console.log(`URL: ${detail.data.permalink_url || 'N/A'}`);
    }

    return true;
  } catch (err) {
    console.error('Lỗi:', JSON.stringify(err.response?.data?.error || err.message, null, 2));
    return false;
  }
}

async function postTextOnly(captionPath) {
  const resolvedCaption = path.resolve(captionPath);
  if (!fs.existsSync(resolvedCaption)) {
    console.error('Không tìm thấy file caption:', resolvedCaption);
    return false;
  }

  const caption = fs.readFileSync(resolvedCaption, 'utf8').trim();
  console.log(`Caption: ${caption.split('\n')[0].substring(0, 60)}...`);
  console.log('\nĐang đăng bài (không ảnh)...');

  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const result = await fb.postMessage(caption);

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
}

// Main
const command = args[0];

if (!command || command === 'help') {
  showHelp();
} else if (command === 'list') {
  listCaptions();
} else if (command === 'post' && args[1] && args[2]) {
  postWithImage(args[1], args[2]).then(ok => process.exit(ok ? 0 : 1));
} else if (command === 'text' && args[1]) {
  postTextOnly(args[1]).then(ok => process.exit(ok ? 0 : 1));
} else {
  console.error('Lệnh không hợp lệ. Chạy "node src/post-content.js help" để xem hướng dẫn.');
  process.exit(1);
}
