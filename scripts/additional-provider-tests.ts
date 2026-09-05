import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function testApifyActors() {
  console.log('═══ APIFY ACTOR EXECUTION TESTS ═══\n');

  // Test 1: List available actors
  console.log('1. List popular scraping actors...');
  try {
    const res = await fetch('https://api.apify.com/v2/acts?limit=5&sortBy=startCount:desc', {
      headers: { 'Authorization': 'Bearer ' + env.APIFY_TOKEN }
    });
    const d = await res.json();
    if (d.data?.items) {
      console.log('   Found ' + d.data.items.length + ' actors:');
      d.data.items.forEach((a: any) => console.log('   - ' + a.name + ' (' + a.stats.totalStarts + ' runs)'));
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 2: Instagram scraper availability
  console.log('\n2. Check Instagram scraper...');
  try {
    const res = await fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper', {
      headers: { 'Authorization': 'Bearer ' + env.APIFY_TOKEN }
    });
    const d = await res.json();
    console.log('   Status: ' + (d.data ? 'Available' : 'Not found'));
    if (d.data) console.log('   Latest version: ' + d.data.versionNumber);
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 3: TikTok scraper availability
  console.log('\n3. Check TikTok scraper...');
  try {
    const res = await fetch('https://api.apify.com/v2/acts/apify~tiktok-scraper', {
      headers: { 'Authorization': 'Bearer ' + env.APIFY_TOKEN }
    });
    const d = await res.json();
    console.log('   Status: ' + (d.data ? 'Available' : 'Not found'));
    if (d.data) console.log('   Latest version: ' + d.data.versionNumber);
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 4: YouTube scraper availability
  console.log('\n4. Check YouTube scraper...');
  try {
    const res = await fetch('https://api.apify.com/v2/acts/apify~youtube-scraper', {
      headers: { 'Authorization': 'Bearer ' + env.APIFY_TOKEN }
    });
    const d = await res.json();
    console.log('   Status: ' + (d.data ? 'Available' : 'Not found'));
    if (d.data) console.log('   Latest version: ' + d.data.versionNumber);
  } catch(e) { console.log('   Error: ' + (e as Error).message); }
}

async function testYouTubeAPI() {
  console.log('\n═══ YOUTUBE DATA API TESTS ═══\n');

  // Test 1: Search channels
  console.log('1. Search influencer marketing channels...');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=influencer+marketing+pakistan&type=channel&maxResults=3&key=${env.YOUTUBE_API_KEY}`);
    const d = await res.json();
    if (d.items) {
      console.log('   Found ' + d.items.length + ' channels:');
      d.items.forEach((i: any) => console.log('   - ' + i.snippet.title.substring(0, 45)));
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 2: Search videos
  console.log('\n2. Search fashion influencer videos...');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=fashion+influencer+pakistan&type=video&maxResults=3&key=${env.YOUTUBE_API_KEY}`);
    const d = await res.json();
    if (d.items) {
      console.log('   Found ' + d.items.length + ' videos:');
      d.items.forEach((i: any) => console.log('   - ' + i.snippet.title.substring(0, 45)));
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 3: Get channel details
  console.log('\n3. Get channel statistics...');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forUsername=YouTube&key=${env.YOUTUBE_API_KEY}`);
    const d = await res.json();
    if (d.items?.[0]) {
      const ch = d.items[0];
      console.log('   Channel: ' + ch.snippet.title);
      console.log('   Subscribers: ' + ch.statistics.subscriberCount);
      console.log('   Videos: ' + ch.statistics.videoCount);
      console.log('   Views: ' + ch.statistics.viewCount);
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 4: Video details
  console.log('\n4. Get video statistics...');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=dQw4w9WgXcQ&key=${env.YOUTUBE_API_KEY}`);
    const d = await res.json();
    if (d.items?.[0]) {
      const v = d.items[0];
      console.log('   Video: ' + v.snippet.title.substring(0, 45));
      console.log('   Views: ' + v.statistics.viewCount);
      console.log('   Likes: ' + v.statistics.likeCount);
      console.log('   Comments: ' + v.statistics.commentCount);
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }

  // Test 5: Category lookup
  console.log('\n5. Get video categories...');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=PK&key=${env.YOUTUBE_API_KEY}`);
    const d = await res.json();
    if (d.items) {
      console.log('   Found ' + d.items.length + ' categories:');
      d.items.slice(0, 5).forEach((c: any) => console.log('   - ' + c.snippet.title));
    }
  } catch(e) { console.log('   Error: ' + (e as Error).message); }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ADDITIONAL PROVIDER TESTS                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await testApifyActors();
  await testYouTubeAPI();

  console.log('\n═══ PROVIDER TESTS COMPLETE ═══');
}

main();
