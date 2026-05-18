require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'post-log.json');

const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Error: FACEBOOK_ACCESS_TOKEN not found in .env");
  process.exit(1);
}

if (!fs.existsSync(logPath)) {
  console.error("Error: post-log.json not found");
  process.exit(1);
}

const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
const scheduledPosts = logs.filter(log => log.action === 'schedule' && log.status === 'success');

console.log(`Found ${scheduledPosts.length} successfully scheduled posts in logs. Starting deletion...`);

async function deletePosts() {
  let deletedCount = 0;
  let failedCount = 0;

  for (const post of scheduledPosts) {
    const postId = post.postId;
    if (!postId) continue;

    const url = `https://graph.facebook.com/v21.0/${postId}`;
    
    try {
      const response = await axios.delete(url, {
        params: { access_token: ACCESS_TOKEN }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(`Successfully deleted post ${postId} (contentId: ${post.contentId})`);
        deletedCount++;
      } else {
        console.error(`Failed to delete post ${postId}:`, response.data);
        failedCount++;
      }
    } catch (err) {
      console.error(`Exception deleting post ${postId}:`, err.response?.data || err.message);
      failedCount++;
    }

    // Delay slightly to avoid rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nFinished! Deleted: ${deletedCount}, Failed: ${failedCount}`);

  // Clear post-log.json
  fs.writeFileSync(logPath, JSON.stringify([], null, 2), 'utf8');
  console.log("Cleared post-log.json");
}

deletePosts();
