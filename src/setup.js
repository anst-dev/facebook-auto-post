require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const FacebookAPI = require('./facebook');
const fs = require('fs');
const path = require('path');

async function setup() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Thieu FACEBOOK_ACCESS_TOKEN trong .env');
    return false;
  }

  const fb = new FacebookAPI(null, accessToken);

  console.log('Dang lay danh sach Page ban quan ly...\n');
  const pages = await fb.getManagedPages();

  if (!pages.success) {
    console.error('Loi:', JSON.stringify(pages.error, null, 2));
    return false;
  }

  if (!pages.data.length) {
    console.error('Ban khong quan ly Page nao. Can tao Page truoc.');
    return false;
  }

  console.log(`Tim thay ${pages.data.length} Page(s):\n`);
  pages.data.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
  });

  const targetPage = pages.data[0];
  console.log(`\nSu dung Page: ${targetPage.name} (${targetPage.id})`);

  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const updated = envContent
    .replace(/FACEBOOK_PAGE_ID=.*/, `FACEBOOK_PAGE_ID=${targetPage.id}`);

  fs.writeFileSync(envPath, updated);
  console.log('Da cap nhat .env voi Page ID.');

  if (targetPage.access_token && targetPage.access_token !== accessToken) {
    const updated2 = fs.readFileSync(envPath, 'utf8')
      .replace(/FACEBOOK_ACCESS_TOKEN=.*/, `FACEBOOK_ACCESS_TOKEN=${targetPage.access_token}`);
    fs.writeFileSync(envPath, updated2);
    console.log('Da cap nhat .env voi Page Access Token.');
  }

  return true;
}

setup().then(ok => process.exit(ok ? 0 : 1));
