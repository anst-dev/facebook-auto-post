const axios = require('axios');
const cheerio = require('cheerio');
const FacebookAPI = require('./facebook');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function fetchAIContent() {
  const res = await axios.get('https://aws.amazon.com/what-is/artificial-intelligence/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 10000
  });
  const $ = cheerio.load(res.data);
  $('script, style, nav, footer, header').remove();
  const text = $('main').text().replace(/\s+/g, ' ').trim();
  console.log('=== CONTENT ===');
  console.log(text.substring(0, 2000));

  const imgs = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('logo') && !src.includes('icon') && src.startsWith('http')) {
      imgs.push(src);
    }
  });
  console.log('=== IMAGES ===');
  imgs.slice(0, 5).forEach(u => console.log(u));
}

fetchAIContent().catch(e => console.error(e.message));
