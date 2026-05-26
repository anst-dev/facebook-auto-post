require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const POST_MESSAGE = `Thu Nghiem Tri Tue Nhan Tao (AI) la gi?

Tri tue nhan tao (Artificial Intelligence - AI) la cong nghe cho phep may moc thuc hien cac nhiem vu giong nhu con nguoi: nhan dien hinh anh, hieu ngon ngu, dua ra du doan tu du lieu va sang tao noi dung.

Cac loai AI pho bien:
Machine Learning (Hoc May) - May tinh tu hoc tu du lieu khong can lap trinh truc tiep
Deep Learning (Hoc Sau) - Mo phong mang than kinh con nguoi bang mang neural network
NLP (Xu ly ngon ngu tu nhien) - ChatGPT, Google Translate...
Computer Vision (Thi giac may) - Nhan dien khuon mat, xe tu lai

Ung dung AI trong doi song:
- Tro ly ao (Siri, Alexa, Google Assistant)
- Goi y noi dung (Netflix, YouTube, TikTok)
- Y te: chan doan benh tu hinh anh X-quang
- Giao duc: hoc tap ca nhan hoa
- Kinh doanh: phan tich du lieu, tu dong hoa

AI dang thay doi the gioi quanh chung ta moi ngay!

#AI #TriTueNhanTao #CongNghe #ArtificialIntelligence #MachineLearning #Technology`;

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/4/4f/AI-terminator-1597621284.jpeg';

async function downloadImage(url, filepath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function postWithLocalImage() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  // Download AI image
  const imgPath = path.join(__dirname, '..', 'ai-image.jpg');

  const imageUrls = [
    'https://cdn.pixabay.com/photo/2018/05/10/11/34/ai-3388062_640.jpg',
    'https://cdn.pixabay.com/photo/2020/08/12/08/46/artificial-intelligence-5481838_640.jpg',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    'https://images.unsplash.com/photo-1684369176170-463e84248b70?w=800&q=80',
    'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];

  for (const url of imageUrls) {
    try {
      console.log(`Tai anh tu: ${url}`);
      await downloadImage(url, imgPath);

      const stats = fs.statSync(imgPath);
      console.log(`Tai thanh cong! Size: ${(stats.size / 1024).toFixed(1)} KB`);

      if (stats.size < 1000) {
        console.log('File qua nho, bo qua...');
        continue;
      }

      // Upload to Facebook using multipart form
      const formData = new FormData();
      formData.append('message', POST_MESSAGE);
      formData.append('source', fs.createReadStream(imgPath));

      console.log('Dang bai voi anh len Facebook...');
      const res = await axios.post(
        `https://graph.facebook.com/v25.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
        formData,
        {
          params: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
          headers: formData.getHeaders()
        }
      );

      console.log('Dang bai thanh cong voi anh! Post ID:', res.data.id);
      const fb2 = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);
      const detail = await fb2.getPost(res.data.id);
      if (detail.success) {
        console.log('URL:', detail.data.permalink_url || 'N/A');
      }

      // Cleanup
      fs.unlinkSync(imgPath);
      return true;
    } catch (err) {
      console.log('Loi:', err.response?.data?.error?.message || err.message);
    }
  }

  // Cleanup
  if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  console.log('\nKhong tai duoc anh. Dang bai khong co anh...');
  const result = await fb.postMessage(POST_MESSAGE);
  if (result.success) {
    console.log('Dang thanh cong! Post ID:', result.postId);
    return true;
  }
  return false;
}

postWithLocalImage().then(ok => process.exit(ok ? 0 : 1));
