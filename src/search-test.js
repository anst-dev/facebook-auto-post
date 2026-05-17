const WebSearcher = require('./search');

async function testSearch() {
  const searcher = new WebSearcher();
  const query = process.argv.slice(2).join(' ') || 'công nghệ mới nhất 2025';

  console.log(`Đang tìm kiếm: "${query}"...\n`);

  const results = await searcher.search(query, 5);

  if (!results.length) {
    console.log('Không tìm thấy kết quả.');
    return false;
  }

  console.log(`Tìm thấy ${results.length} kết quả:\n`);
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   ${r.snippet}`);
    console.log(`   URL: ${r.url}\n`);
  });

  const postContent = searcher.summarizeForPost(query, results);
  console.log('--- Nội dung bài viết Facebook ---');
  console.log(postContent);

  return true;
}

testSearch().then(ok => process.exit(ok ? 0 : 1));
