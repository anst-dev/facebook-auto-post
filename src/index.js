require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const FacebookAPI = require('./facebook');
const WebSearcher = require('./search');

module.exports = { FacebookAPI, WebSearcher };

if (require.main === module) {
  console.log('Facebook Auto Poster v1.0');
  console.log('');
  console.log('Commands:');
  console.log('  npm test          - Test Facebook API connection');
  console.log('  npm run post      - Auto-post (needs topic arg)');
  console.log('  npm run search    - Test web search');
  console.log('');
  console.log('Usage:');
  console.log('  node src/auto-post.js "chu de can tim"');
  console.log('  node src/auto-post.js "cong nghe AI" --format full');
  console.log('  node src/auto-post.js "thoi su" --link');
}
