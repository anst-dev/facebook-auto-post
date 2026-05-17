const axios = require('axios');
const cheerio = require('cheerio');

class WebSearcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async search(query, maxResults = 5) {
    const results = [];

    try {
      const res = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000
      });

      const $ = cheerio.load(res.data);
      $('.result').each((i, el) => {
        if (i >= maxResults) return false;
        const title = $(el).find('.result__title a').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        const rawUrl = $(el).find('.result__url').attr('href') || '';
        const url = rawUrl.replace('//', '');

        if (title) {
          results.push({ title, snippet: snippet || '', url });
        }
      });
    } catch (err) {
      console.error('DuckDuckGo search error:', err.message);
    }

    if (results.length > 0) return results;

    try {
      const res = await axios.get('https://search.brave.com/search', {
        params: { q: query, count: maxResults },
        headers: { 'User-Agent': this.userAgent, 'Accept': 'text/html' },
        timeout: 15000
      });

      const $ = cheerio.load(res.data);
      $('.snippet').each((i, el) => {
        if (i >= maxResults) return false;
        const title = $(el).find('.title').text().trim();
        const snippet = $(el).find('.snippet-description').text().trim();
        const url = $(el).find('a').attr('href') || '';

        if (title) {
          results.push({ title, snippet: snippet || '', url });
        }
      });
    } catch (err) {
      console.error('Brave search error:', err.message);
    }

    return results;
  }

  async getPageContent(url) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });
      const $ = cheerio.load(res.data);
      $('script, style, nav, footer, header, aside, .ad, .ads').remove();
      const text = $('article').text() || $('main').text() || $('body').text();
      return text.replace(/\s+/g, ' ').trim().substring(0, 5000);
    } catch (err) {
      console.error('Content fetch error:', err.message);
      return null;
    }
  }

  formatPostContent(topic, results) {
    if (!results.length) return null;

    const lines = results.map((r, i) => {
      let line = `${i + 1}. ${r.title}`;
      if (r.snippet) line += `\n   ${r.snippet}`;
      return line;
    });

    const hashtags = this._generateHashtags(topic);

    return `📌 ${topic}\n\n${lines.join('\n\n')}\n\n${hashtags}`;
  }

  _generateHashtags(topic) {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const tags = words.slice(0, 3).map(w => `#${w}`);
    tags.push('#TinTức', '#CậpNhật');
    return tags.join(' ');
  }

  async summarizeForPost(topic, results) {
    if (!results.length) return null;

    const bestResult = results[0];
    let snippet = bestResult.snippet;

    // Nếu không có snippet, thử lấy nội dung từ trang web
    if (!snippet && bestResult.url) {
      const content = await this.getPageContent(bestResult.url);
      if (content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
        snippet = sentences.slice(0, 2).map(s => s.trim()).join('. ') + '.';
      }
    }

    let post = `📌 ${topic}\n\n`;

    if (snippet) {
      post += `📝 ${snippet}\n\n`;
    }

    if (results.length > 1) {
      post += '📖 Nguồn tham khảo:\n';
      results.slice(1, 4).forEach((r, i) => {
        const extra = r.snippet ? ` — ${r.snippet.substring(0, 80)}` : '';
        post += `  ${i + 1}. ${r.title}${extra}\n`;
      });
      post += '\n';
    }

    const hashtags = this._generateHashtags(topic);
    post += hashtags;

    return post;
  }
}

module.exports = WebSearcher;
