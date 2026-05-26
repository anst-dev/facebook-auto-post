require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const CAPTION = `Không Gian Làm Việc Của Một Lập Trình Viên 🖥️

Bạn có nhận ra mình trong hình này không? 😄

Một workspace lý tưởng cho dân công nghệ:
• Laptop + màn hình phụ — code nhanh, debug nhanh hơn
• Bảng "Daily Routine": Lập kế hoạch → Deep work → Code & Build → Review & Improve → Learn → Teach
• Quy tắc sống: "Do the right thing", "Keep learning", "Help others", "Build with purpose"
• Mục tiêu: "Build scalable apps", "Learn new tech"
• Stack tự động hóa: Google, n8n, Notion, GitHub, Slack, Jira

Triết lý đơn giản nhưng mạnh mẽ:
"Better every day — 1% improvement compounds"
"Bạn không cần phải hoàn hảo, chỉ cần bắt đầu!"

Bạn thích sắp xếp workspace như thế nào? Chia sẻ bên dưới nhé!

#LapTrinhVien #Workspace #CongNghe #NangSuat #DeveloperLife #CodeClarity #TuDongHoa #TichCucMoiNgay`;

const IMAGE_PATH = path.join(__dirname, '..', '2d81a2c2-4070-4643-8ca0-b8496b416c24.png');

async function postWithImage() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  if (!fs.existsSync(IMAGE_PATH)) {
    console.error('Không tìm thấy file ảnh:', IMAGE_PATH);
    return false;
  }

  const stats = fs.statSync(IMAGE_PATH);
  console.log(`Ảnh: ${(stats.size / 1024).toFixed(1)} KB`);

  const formData = new FormData();
  formData.append('message', CAPTION);
  formData.append('source', fs.createReadStream(IMAGE_PATH));

  console.log('Đang đăng bài với ảnh lên Facebook...');

  const res = await axios.post(
    `https://graph.facebook.com/v25.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    formData,
    {
      params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
      headers: formData.getHeaders()
    }
  );

  console.log('Đăng bài thành công! Post ID:', res.data.id);

  const detail = await fb.getPost(res.data.id);
  if (detail.success) {
    console.log('URL:', detail.data.permalink_url || 'N/A');
  }

  return true;
}

postWithImage().then(ok => {
  if (!ok) process.exit(1);
}).catch(err => {
  console.error('Lỗi:', err.response?.data || err.message);
  process.exit(1);
});
