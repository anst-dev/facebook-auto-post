require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  'https://images.unsplash.com/photo-1684369176170-463e84248b70?w=800&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80'
];

const CAPTION = `🤖 Trí Tuệ Nhân Tạo (AI) — 3 Góc Nhìn

AI đang thay đổi thế giới quanh chúng ta mỗi ngày. Dưới đây là 3 hình ảnh minh họa cho các khía cạnh khác nhau của AI:

1️⃣ AI trong đời sống — Trợ lý ảo, gợi ý nội dung, dịch thuật tự động
2️⃣ AI trong kinh doanh — Phân tích dữ liệu, tự động hóa, ra quyết định
3️⃣ AI trong sáng tạo — Tạo hình ảnh, viết nội dung, sáng tác nhạc

Bạn đã ứng dụng AI vào công việc hàng ngày chưa? Chia sẻ trải nghiệm nhé!

#AI #TríTuệNhânTạo #CôngNghệ #ArtificialIntelligence #TươngLai`;

async function downloadImage(url, filepath) {
  const response = await axios({ method: 'GET', url, responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function testMultiPhoto() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
  const tmpDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  // Bước 1: Tải 3 ảnh
  console.log('Bước 1: Tải ảnh...\n');
  const localImages = [];

  for (let i = 0; i < IMAGE_URLS.length; i++) {
    const filename = `ai-${i + 1}.jpg`;
    const filepath = path.join(tmpDir, filename);

    try {
      await downloadImage(IMAGE_URLS[i], filepath);
      const size = fs.statSync(filepath).size;
      console.log(`  Ảnh ${i + 1}: ${filename} (${(size / 1024).toFixed(0)} KB) ✓`);
      localImages.push(filepath);
    } catch (err) {
      console.log(`  Ảnh ${i + 1}: Lỗi tải — ${err.message}`);
    }
  }

  if (localImages.length < 2) {
    console.error('\nKhông đủ ảnh (cần ít nhất 2). Thoát.');
    return false;
  }

  console.log(`\nTải thành công ${localImages.length} ảnh.`);

  // Bước 2: Upload từng ảnh (unpublished) để lấy photo ID
  console.log('\nBước 2: Upload ảnh lên Facebook (chưa xuất bản)...\n');
  const photoIds = [];

  for (const imgPath of localImages) {
    try {
      const formData = new FormData();
      formData.append('source', fs.createReadStream(imgPath));
      formData.append('published', 'false');

      const res = await axios.post(
        `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
        formData,
        {
          params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
          headers: formData.getHeaders()
        }
      );

      console.log(`  Upload OK — Photo ID: ${res.data.id}`);
      photoIds.push(res.data.id);
    } catch (err) {
      console.error(`  Lỗi upload: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  if (photoIds.length < 2) {
    console.error('\nKhông đủ photo ID. Thoát.');
    return false;
  }

  // Bước 3: Tạo bài viết với nhiều ảnh
  console.log('\nBước 3: Tạo bài viết kèm nhiều ảnh...\n');
  console.log(`  ${photoIds.length} ảnh`);

  try {
    const attachedMedia = photoIds.map(id => ({ media_fbid: id }));

    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
      {
        message: CAPTION,
        attached_media: JSON.stringify(attachedMedia),
        access_token: process.env.FACEBOOK_ACCESS_TOKEN
      }
    );

    console.log(`\nĐăng bài thành công! Post ID: ${res.data.id}`);

    const detail = await fb.getPost(res.data.id);
    if (detail.success) {
      console.log(`URL: ${detail.data.permalink_url || 'N/A'}`);
    }

    // Dọn dẹp
    for (const img of localImages) {
      try { fs.unlinkSync(img); } catch {}
    }
    try { fs.rmdirSync(tmpDir); } catch {}

    return true;
  } catch (err) {
    console.error('Lỗi đăng bài:', JSON.stringify(err.response?.data?.error || err.message, null, 2));
    return false;
  }
}

testMultiPhoto().then(ok => process.exit(ok ? 0 : 1));
