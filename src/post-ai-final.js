require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FacebookAPI = require('./facebook');
const path = require('path');

const POST_MESSAGE = `Thu Nghiem Tri Tue Nhan Tao (AI) la gi?

Tri tue nhan tao (Artificial Intelligence - AI) la cong nghe cho phep may moc thuc hien cac nhiem vu giong nhu con nguoi: nhan dien hinh anh, hieu ngon ngu, dua ra du doan tu du lieu va sang tao noi dung.

Cac loai AI pho bien:
Machine Learning (Hoc may) - May tinh tu hoc tu du lieu khong can lap trinh truc tiep
Deep Learning (Hoc sau) - Mo phong mang than kinh con nguoi bang mang neural network
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

const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Artificial_intelligence_symbol.svg/1200px-Artificial_intelligence_symbol.svg.png';

async function postAI() {
  const fb = new FacebookAPI(process.env.FACEBOOK_PAGE_ID, process.env.FACEBOOK_ACCESS_TOKEN);

  console.log('Dang bai "AI la gi" voi anh minh hoa...');
  console.log('---');
  console.log(POST_MESSAGE);
  console.log('---\n');

  const result = await fb.postPhoto(IMAGE_URL, POST_MESSAGE);

  if (result.success) {
    console.log('Dang bai thanh cong! Post ID:', result.postId);
    const detail = await fb.getPost(result.postId);
    if (detail.success) {
      console.log('URL:', detail.data.permalink_url || 'N/A');
    }
    return true;
  } else {
    console.error('Loi dang bai:', JSON.stringify(result.error, null, 2));
    console.log('\nThu dang khong co anh...');
    const fallback = await fb.postMessage(POST_MESSAGE);
    if (fallback.success) {
      console.log('Dang bai (khong anh) thanh cong! Post ID:', fallback.postId);
      const detail = await fb.getPost(fallback.postId);
      if (detail.success) {
        console.log('URL:', detail.data.permalink_url || 'N/A');
      }
      return true;
    }
    console.error('Loi dang bai:', JSON.stringify(fallback.error, null, 2));
    return false;
  }
}

postAI().then(ok => process.exit(ok ? 0 : 1));
