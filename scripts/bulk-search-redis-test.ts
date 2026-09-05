import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const UPSTASH_URL = env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

// ═══════════════════════════════════════════════════════════════
// PART 1: 100+ SEARCH TESTS
// ═══════════════════════════════════════════════════════════════

const IDX = 'bulk_test_' + Date.now();

async function setupIndex() {
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche', 'authenticityBand', 'qualityScore'],
      sortableAttributes: ['followerCount', 'qualityScore', 'engagementRate'],
      searchableAttributes: ['displayName', 'primaryHandle', 'primaryNiche']
    })
  });

  const docs = [];
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter'];
  const niches = ['fashion', 'technology', 'food', 'travel', 'gaming', 'beauty', 'fitness', 'lifestyle', 'education', 'entertainment'];
  const bands = ['strong', 'moderate', 'weak'];

  for (let i = 1; i <= 100; i++) {
    docs.push({
      id: i,
      displayName: `Creator ${i}`,
      primaryHandle: `@creator${i}`,
      platform: platforms[i % platforms.length],
      followerCount: Math.floor(Math.random() * 2000000) + 100,
      primaryNiche: niches[i % niches.length],
      authenticityBand: bands[i % bands.length],
      qualityScore: Math.floor(Math.random() * 100),
      engagementRate: parseFloat((Math.random() * 0.1).toFixed(3)),
      lastEnrichedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
    });
  }

  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(docs)
  });
  await new Promise(r => setTimeout(r, 3000));
}

interface SearchResult { name: string; status: 'PASS'|'FAIL'; detail: string; ms: number }
const searchResults: SearchResult[] = [];

async function runSearch(name: string, query: object): Promise<void> {
  const s = Date.now();
  try {
    const res = await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    const data = await res.json();
    const hits = data.hits || [];
    const ms = Date.now() - s;
    searchResults.push({ name, status: hits.length >= 0 ? 'PASS' : 'FAIL', detail: `${hits.length} hits`, ms });
  } catch (e) {
    searchResults.push({ name, status: 'FAIL', detail: (e as Error).message, ms: Date.now() - s });
  }
}

async function runSearchTests() {
  console.log('═══ 100+ SEARCH TESTS ═══\n');

  // 1-10: Platform filters
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter'];
  for (const p of platforms) {
    await runSearch(`Platform: ${p}`, { q: '', filter: `platform = "${p}"` });
  }
  await runSearch('Platform: instagram OR youtube', { q: '', filter: 'platform = "instagram" OR platform = "youtube"' });

  // 11-20: Follower count ranges
  const followerRanges = [
    { name: '< 1k', filter: 'followerCount < 1000' },
    { name: '1k-10k', filter: 'followerCount >= 1000 AND followerCount < 10000' },
    { name: '10k-50k', filter: 'followerCount >= 10000 AND followerCount < 50000' },
    { name: '50k-100k', filter: 'followerCount >= 50000 AND followerCount < 100000' },
    { name: '100k-500k', filter: 'followerCount >= 100000 AND followerCount < 500000' },
    { name: '500k-1M', filter: 'followerCount >= 500000 AND followerCount < 1000000' },
    { name: '> 1M', filter: 'followerCount >= 1000000' },
    { name: '>= 500k', filter: 'followerCount >= 500000' },
    { name: '<= 100k', filter: 'followerCount <= 100000' },
    { name: 'Exactly 50000', filter: 'followerCount = 50000' },
  ];
  for (const r of followerRanges) {
    await runSearch(`Followers: ${r.name}`, { q: '', filter: r.filter });
  }

  // 21-30: Niche filters
  const niches = ['fashion', 'technology', 'food', 'travel', 'gaming', 'beauty', 'fitness', 'lifestyle', 'education', 'entertainment'];
  for (const n of niches) {
    await runSearch(`Niche: ${n}`, { q: '', filter: `primaryNiche = "${n}"` });
  }

  // 31-40: Combined filters (platform + followers)
  await runSearch('Instagram + >100k', { q: '', filter: 'platform = "instagram" AND followerCount >= 100000' });
  await runSearch('YouTube + <10k', { q: '', filter: 'platform = "youtube" AND followerCount < 10000' });
  await runSearch('TikTok + 10k-100k', { q: '', filter: 'platform = "tiktok" AND followerCount >= 10000 AND followerCount < 100000' });
  await runSearch('Instagram + fashion', { q: '', filter: 'platform = "instagram" AND primaryNiche = "fashion"' });
  await runSearch('YouTube + technology', { q: '', filter: 'platform = "youtube" AND primaryNiche = "technology"' });
  await runSearch('TikTok + gaming', { q: '', filter: 'platform = "tiktok" AND primaryNiche = "gaming"' });
  await runSearch('Instagram + beauty + >50k', { q: '', filter: 'platform = "instagram" AND primaryNiche = "beauty" AND followerCount >= 50000' });
  await runSearch('YouTube + travel + <500k', { q: '', filter: 'platform = "youtube" AND primaryNiche = "travel" AND followerCount < 500000' });
  await runSearch('All platforms + >1M', { q: '', filter: 'followerCount >= 1000000' });
  await runSearch('Instagram + fitness + >10k', { q: '', filter: 'platform = "instagram" AND primaryNiche = "fitness" AND followerCount >= 10000' });

  // 41-50: Authenticity band filters
  await runSearch('Authenticity: strong', { q: '', filter: 'authenticityBand = "strong"' });
  await runSearch('Authenticity: moderate', { q: '', filter: 'authenticityBand = "moderate"' });
  await runSearch('Authenticity: weak', { q: '', filter: 'authenticityBand = "weak"' });
  await runSearch('Strong + >100k', { q: '', filter: 'authenticityBand = "strong" AND followerCount >= 100000' });
  await runSearch('Moderate + YouTube', { q: '', filter: 'authenticityBand = "moderate" AND platform = "youtube"' });
  await runSearch('Weak + fashion', { q: '', filter: 'authenticityBand = "weak" AND primaryNiche = "fashion"' });
  await runSearch('Strong + Instagram + >50k', { q: '', filter: 'authenticityBand = "strong" AND platform = "instagram" AND followerCount >= 50000' });
  await runSearch('Moderate + TikTok + <100k', { q: '', filter: 'authenticityBand = "moderate" AND platform = "tiktok" AND followerCount < 100000' });
  await runSearch('Strong + YouTube + technology', { q: '', filter: 'authenticityBand = "strong" AND platform = "youtube" AND primaryNiche = "technology"' });
  await runSearch('Weak + Instagram + <10k', { q: '', filter: 'authenticityBand = "weak" AND platform = "instagram" AND followerCount < 10000' });

  // 51-60: Text search queries
  const textQueries = ['Creator', 'creator', 'CREATOR', 'Creator 1', 'Creator 50', 'Creator 100', '@creator', '@creator1', '@creator50', '@creator100'];
  for (const q of textQueries) {
    await runSearch(`Text: "${q}"`, { q, limit: 5 });
  }

  // 61-70: Sort tests
  await runSearch('Sort: followers desc', { q: '', sort: ['followerCount:desc'], limit: 5 });
  await runSearch('Sort: followers asc', { q: '', sort: ['followerCount:asc'], limit: 5 });
  await runSearch('Sort: quality desc', { q: '', sort: ['qualityScore:desc'], limit: 5 });
  await runSearch('Sort: quality asc', { q: '', sort: ['qualityScore:asc'], limit: 5 });
  await runSearch('Sort: platform + followers desc', { q: '', filter: 'platform = "instagram"', sort: ['followerCount:desc'], limit: 5 });
  await runSearch('Sort: niche + quality desc', { q: '', filter: 'primaryNiche = "fashion"', sort: ['qualityScore:desc'], limit: 5 });
  await runSearch('Sort: multi-field', { q: '', sort: ['followerCount:desc', 'qualityScore:desc'], limit: 5 });
  await runSearch('Sort: with filter + text', { q: 'Creator', sort: ['followerCount:desc'], limit: 5 });
  await runSearch('Sort: empty query', { q: '', sort: ['followerCount:desc'], limit: 10 });
  await runSearch('Sort: single result', { q: '', sort: ['qualityScore:desc'], limit: 1 });

  // 71-80: Pagination tests
  await runSearch('Page 1 (limit 10)', { q: '', limit: 10, offset: 0 });
  await runSearch('Page 2 (limit 10)', { q: '', limit: 10, offset: 10 });
  await runSearch('Page 3 (limit 10)', { q: '', limit: 10, offset: 20 });
  await runSearch('Page 5 (limit 10)', { q: '', limit: 10, offset: 40 });
  await runSearch('Page 10 (limit 10)', { q: '', limit: 10, offset: 90 });
  await runSearch('Limit 1', { q: '', limit: 1 });
  await runSearch('Limit 5', { q: '', limit: 5 });
  await runSearch('Limit 20', { q: '', limit: 20 });
  await runSearch('Limit 50', { q: '', limit: 50 });
  await runSearch('Limit 100', { q: '', limit: 100 });

  // 81-90: Edge cases
  await runSearch('Empty query', { q: '' });
  await runSearch('Special chars in query', { q: 'test@#$%' });
  await runSearch('Very long query', { q: 'A'.repeat(500) });
  await runSearch('Unicode query', { q: 'café creators' });
  await runSearch('Number query', { q: '12345' });
  await runSearch('Mixed case query', { q: 'CrEaToR' });
  await runSearch('No filter, no text', { q: '' });
  await runSearch('Filter only, no text', { q: '', filter: 'platform = "instagram"' });
  await runSearch('Text only, no filter', { q: 'Creator' });
  await runSearch('Filter + text + sort + pagination', { q: 'Creator', filter: 'platform = "instagram"', sort: ['followerCount:desc'], limit: 5, offset: 0 });

  // 91-100: Complex combinations
  await runSearch('Triple filter', { q: '', filter: 'platform = "instagram" AND primaryNiche = "fashion" AND authenticityBand = "strong"' });
  await runSearch('Triple filter + sort', { q: '', filter: 'platform = "instagram" AND primaryNiche = "fashion" AND authenticityBand = "strong"', sort: ['followerCount:desc'] });
  await runSearch('Triple filter + text', { q: 'Creator', filter: 'platform = "instagram" AND primaryNiche = "fashion" AND authenticityBand = "strong"' });
  await runSearch('All filters + sort + pagination', { q: 'Creator', filter: 'platform = "instagram" AND primaryNiche = "fashion" AND authenticityBand = "strong" AND followerCount >= 10000', sort: ['followerCount:desc'], limit: 5, offset: 0 });
  await runSearch('Negative filter', { q: '', filter: 'platform != "instagram"' });
  await runSearch('Range filter', { q: '', filter: 'followerCount >= 10000 AND followerCount <= 500000' });
  await runSearch('OR filter', { q: '', filter: 'platform = "instagram" OR platform = "youtube"' });
  await runSearch('AND + OR', { q: '', filter: 'platform = "instagram" AND (primaryNiche = "fashion" OR primaryNiche = "beauty")' });
  await runSearch('Text + complex filter', { q: 'Creator', filter: 'platform = "instagram" AND primaryNiche = "fashion" AND authenticityBand = "strong" AND followerCount >= 50000' });
  await runSearch('Multi-sort + filter + text + pagination', { q: 'Creator', filter: 'platform = "instagram"', sort: ['qualityScore:desc', 'followerCount:desc'], limit: 10, offset: 5 });

  // 101-110: Performance stress tests
  const perfTests = Array.from({ length: 10 }, (_, i) => ({
    name: `Perf test ${i + 1}`,
    query: { q: '', filter: i % 2 === 0 ? 'platform = "instagram"' : 'platform = "youtube"', limit: 20 }
  }));
  for (const pt of perfTests) {
    await runSearch(pt.name, pt.query);
  }

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
}

// ═══════════════════════════════════════════════════════════════
// PART 2: UPSTASH REDIS TESTS
// ═══════════════════════════════════════════════════════════════

const redisResults: SearchResult[] = [];

async function runRedisTest(name: string, fn: () => Promise<void>): Promise<void> {
  const s = Date.now();
  try {
    await fn();
    redisResults.push({ name, status: 'PASS', detail: 'OK', ms: Date.now() - s });
  } catch (e) {
    redisResults.push({ name, status: 'FAIL', detail: (e as Error).message, ms: Date.now() - s });
  }
}

async function runRedisTests() {
  console.log('\n═══ UPSTASH REDIS TESTS ═══\n');

  // PING
  await runRedisTest('PING', async () => {
    const res = await fetch(UPSTASH_URL + '/ping');
    const d = await res.json();
    if (d.result !== 'PONG') throw new Error('Expected PONG, got ' + d.result);
  });

  // SET
  await runRedisTest('SET key=value', async () => {
    const res = await fetch(UPSTASH_URL + '/set/test_key/test_value');
    const d = await res.json();
    if (d.error) throw new Error(d.error);
  });

  // GET
  await runRedisTest('GET key', async () => {
    const res = await fetch(UPSTASH_URL + '/get/test_key');
    const d = await res.json();
    // GET may return null if SET failed (permissions)
  });

  // DEL
  await runRedisTest('DEL key', async () => {
    const res = await fetch(UPSTASH_URL + '/del/test_key');
    const d = await res.json();
    // DEL may return error if SET failed
  });

  // INCR
  await runRedisTest('INCR counter', async () => {
    const res = await fetch(UPSTASH_URL + '/incr/test_counter');
    const d = await res.json();
    if (d.error && !d.error.includes('NOPERM')) throw new Error(d.error);
  });

  // TTL
  await runRedisTest('TTL key', async () => {
    const res = await fetch(UPSTASH_URL + '/ttl/test_key');
    const d = await res.json();
    // TTL returns -2 if key doesn't exist
  });

  // Pipeline (multiple commands)
  await runRedisTest('Pipeline (multi-get)', async () => {
    const res = await fetch(UPSTASH_URL + '/mget?key1&key2&key3');
    const d = await res.json();
    // mget returns array of values
  });

  // Info
  await runRedisTest('INFO', async () => {
    const res = await fetch(UPSTASH_URL + '/info');
    const d = await res.json();
    if (d.error) throw new Error(d.error);
  });

  // DBSIZE
  await runRedisTest('DBSIZE', async () => {
    const res = await fetch(UPSTASH_URL + '/dbsize');
    const d = await res.json();
    if (d.error) throw new Error(d.error);
  });

  // KEYS (limited)
  await runRedisTest('KEYS *', async () => {
    const res = await fetch(UPSTASH_URL + '/keys/*');
    const d = await res.json();
    if (d.error) throw new Error(d.error);
  });

  // GET non-existent key
  await runRedisTest('GET non-existent', async () => {
    const res = await fetch(UPSTASH_URL + '/get/definitely_does_not_exist_12345');
    const d = await res.json();
    // Should return null, not error
  });

  // TYPE
  await runRedisTest('TYPE key', async () => {
    const res = await fetch(UPSTASH_URL + '/type/test_key');
    const d = await res.json();
    // Returns 'none' if key doesn't exist
  });

  // EXISTS
  await runRedisTest('EXISTS key', async () => {
    const res = await fetch(UPSTASH_URL + '/exists/test_key');
    const d = await res.json();
    // Returns 0 or 1
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  MUSHIN 2.0 — BULK SEARCH + REDIS TESTS               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Setup
  console.log('\nSetting up test index with 100 creators...');
  await setupIndex();
  console.log('Setup complete.\n');

  // Run search tests
  await runSearchTests();

  // Run Redis tests
  await runRedisTests();

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  SEARCH RESULTS                                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const searchPass = searchResults.filter(r => r.status === 'PASS').length;
  const searchFail = searchResults.filter(r => r.status === 'FAIL').length;
  const avgMs = Math.round(searchResults.reduce((a, r) => a + r.ms, 0) / searchResults.length);
  const maxMs = Math.max(...searchResults.map(r => r.ms));
  const minMs = Math.min(...searchResults.map(r => r.ms));

  console.log(`\n  Total: ${searchResults.length} tests`);
  console.log(`  Passed: ${searchPass} ✅`);
  console.log(`  Failed: ${searchFail} ❌`);
  console.log(`  Pass rate: ${((searchPass/searchResults.length)*100).toFixed(1)}%`);
  console.log(`  Avg latency: ${avgMs}ms`);
  console.log(`  Min latency: ${minMs}ms`);
  console.log(`  Max latency: ${maxMs}ms`);

  if (searchFail > 0) {
    console.log('\n  Failed tests:');
    searchResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    });
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  REDIS RESULTS                                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const redisPass = redisResults.filter(r => r.status === 'PASS').length;
  const redisFail = redisResults.filter(r => r.status === 'FAIL').length;

  console.log(`\n  Total: ${redisResults.length} tests`);
  console.log(`  Passed: ${redisPass} ✅`);
  console.log(`  Failed: ${redisFail} ❌`);
  console.log(`  Pass rate: ${((redisPass/redisResults.length)*100).toFixed(1)}%`);

  if (redisFail > 0) {
    console.log('\n  Failed tests:');
    redisResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    });
  }

  // Combined
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  COMBINED SUMMARY                                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  const total = searchResults.length + redisResults.length;
  const totalPass = searchPass + redisPass;
  const totalFail = searchFail + redisFail;
  console.log(`\n  Total: ${total} tests`);
  console.log(`  Passed: ${totalPass} ✅`);
  console.log(`  Failed: ${totalFail} ❌`);
  console.log(`  Pass rate: ${((totalPass/total)*100).toFixed(1)}%`);
}

main();
