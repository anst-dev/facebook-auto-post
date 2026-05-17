require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const path = require('path');
const fs = require('fs');

const IMAGE_URLS = [
  'https://editor.analyticsvidhya.com/uploads/64089What-is-Artificial-Intelligence.png',
  'https://www.simplilearn.com/ice9/free_resources_article_thumb/What_is_AI.jpg',
  'https://cdn.ttgtmedia.com/rms/misc/ai_illustration_720.png'
];

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

async function postWithImage() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  for (const imgUrl of IMAGE_URLS) {
    console.log(`Thu dang voi anh: ${imgUrl}`);
    const result = await fb.postPhoto(imgUrl, POST_MESSAGE);
    if (result.success) {
      console.log('Dang bai thanh cong! Post ID:', result.postId);
      const detail = await fb.getPost(result.postId);
      if (detail.success) {
        console.log('URL:', detail.data.permalink_url || 'N/A');
      }
      return true;
    }
    console.log('Anh nay khong duoc, thu anh tiep theo...');
  }

  console.log('\nKhong anh nao hop le. Dang bai van khong co anh...');
  const result = await fb.postMessage(POST_MESSAGE);
  if (result.success) {
    console.log('Dang thanh cong! Post ID:', result.postId);
    const detail = await fb.getPost(result.postId);
    if (detail.success) {
      console.log('URL:', detail.data.permalink_url || 'N/A');
    }
    return true;
  }
  return false;
}

postWithImage().then(ok => process.exit(ok ? 0 : 1));
