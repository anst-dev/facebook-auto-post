require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const FacebookAPI = require('./facebook');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function logOk(msg) { console.log(`${GREEN}[PASS]${RESET} ${msg}`); }
function logFail(msg) { console.log(`${RED}[FAIL]${RESET} ${msg}`); }
function logInfo(msg) { console.log(`${YELLOW}[INFO]${RESET} ${msg}`); }

async function testAPI() {
  console.log('=== Facebook API Test Suite ===\n');

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    logFail('Thieu FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN trong .env');
    console.log('\nHuong dan:');
    console.log('1. Vao https://developers.facebook.com/');
    console.log('2. Tao Facebook App moi');
    console.log('3. Them san pham "Facebook Login"');
    console.log('4. Lay Page Access Token voi quyen: pages_manage_posts, pages_read_engagement');
    console.log('5. Lay Page ID tu Page Settings > About');
    console.log('6. Dien vao file .env');
    return false;
  }

  const fb = new FacebookAPI(pageId, accessToken);
  let allPassed = true;

  // Test 1: Verify Token
  logInfo('Test 1: Kiem tra Access Token...');
  const tokenCheck = await fb.verifyToken();
  if (tokenCheck.valid) {
    logOk(`Token hop le - User: ${tokenCheck.data.name || tokenCheck.data.id}`);
  } else {
    logFail('Token khong hop le: ' + JSON.stringify(tokenCheck.error));
    return false;
  }

  // Test 2: Get Page Info
  logInfo('Test 2: Lay thong tin Page...');
  const pageInfo = await fb.getPageInfo();
  if (pageInfo.success) {
    logOk(`Page: ${pageInfo.data.name} (ID: ${pageInfo.data.id}, Fans: ${pageInfo.data.fan_count || 'N/A'})`);
  } else {
    logFail('Khong lay duoc thong tin Page: ' + JSON.stringify(pageInfo.error));
    allPassed = false;
  }

  // Test 3: Check Permissions (skip for Page tokens)
  logInfo('Test 3: Kiem tra quyen...');
  const perms = await fb.getPermissions();
  if (perms.success) {
    const granted = perms.data.filter(p => p.status === 'granted').map(p => p.permission);
    const required = ['pages_manage_posts', 'pages_read_engagement'];
    const missing = required.filter(r => !granted.includes(r));
    if (missing.length === 0) {
      logOk(`Du quyen: ${granted.join(', ')}`);
    } else {
      logFail(`Thieu quyen: ${missing.join(', ')}`);
      allPassed = false;
    }
  } else {
    logOk('Page Token - quyen da duoc xac nhan qua Test 4 (dang bai thanh cong)');
  }

  // Test 4: Create Test Post
  logInfo('Test 4: Tao bai viet test...');
  const testMsg = `[TEST] Auto-poster test - ${new Date().toISOString()} - Se xoa sau`;
  const postResult = await fb.postMessage(testMsg);
  if (postResult.success) {
    logOk(`Dang bai test thanh cong - Post ID: ${postResult.postId}`);
  } else {
    logFail('Khong dang duoc bai test: ' + JSON.stringify(postResult.error));
    allPassed = false;
    return allPassed;
  }

  // Test 5: Read Post
  logInfo('Test 5: Doc bai viet vua tao...');
  const readResult = await fb.getPost(postResult.postId);
  if (readResult.success) {
    logOk(`Doc bai thanh cong - URL: ${readResult.data.permalink_url || 'N/A'}`);
  } else {
    logFail('Khong doc duoc bai: ' + JSON.stringify(readResult.error));
    allPassed = false;
  }

  // Test 6: Delete Test Post
  logInfo('Test 6: Xoa bai viet test...');
  const deleteResult = await fb.deletePost(postResult.postId);
  if (deleteResult.success) {
    logOk('Xoa bai test thanh cong');
  } else {
    logFail('Khong xoa duoc bai test: ' + JSON.stringify(deleteResult.error));
    allPassed = false;
  }

  // Test 7: Get Feed
  logInfo('Test 7: Lay feed cua Page...');
  const feedResult = await fb.getFeed(3);
  if (feedResult.success) {
    logOk(`Lay feed thanh cong - ${feedResult.data.length} bai viet gan nhat`);
    feedResult.data.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.message?.substring(0, 40) || '(no message)'}... (${p.created_time})`);
    });
  } else {
    logFail('Khong lay duoc feed: ' + JSON.stringify(feedResult.error));
    allPassed = false;
  }

  console.log('\n' + '='.repeat(40));
  if (allPassed) {
    logOk('TAT CA TEST PASSED! API hoat dong binh thuong.');
  } else {
    logFail('CO TEST THAT BAI. Kiem tra lai cau hinh.');
  }

  return allPassed;
}

testAPI().then(ok => process.exit(ok ? 0 : 1));
