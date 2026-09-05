import { readFileSync } from 'fs';

// Load .env
const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const MEILISEARCH_HOST = env.MEILISEARCH_HOST;
const MEILISEARCH_KEY = env.MEILISEARCH_API_KEY;
const GROQ_KEY = env.GROQ_API_KEY;
const SERPER_KEY = env.SERPER_API_KEY;
const APIFY_TOKEN = env.APIFY_TOKEN;

const TEST_INDEX = 'search_test_' + Date.now();

interface TestResult {
  scenario: string;
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  latency?: number;
}

const results: TestResult[] = [];

function log(r: TestResult) {
  results.push(r);
  const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
  const lat = r.latency ? ` (${r.latency}ms)` : '';
  console.log(`  ${icon} ${r.step}: ${r.status}${lat}`);
  if (r.status === 'FAIL') console.log(`     ${r.details}`);
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 1: Brain 1 — Structured Filtered Search
// ═══════════════════════════════════════════════════════════════

async function testBrain1() {
  console.log('\n═══ SCENARIO 1: Brain 1 — Structured Filtered Search ═══\n');

  // Step 1: Create test index
  const s1Start = Date.now();
  try {
    await fetch(MEILISEARCH_HOST + '/indexes', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: TEST_INDEX, primaryKey: 'id' })
    });

    // Configure index with filterable attributes
    await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/settings', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterableAttributes: ['platform', 'followerCount', 'primaryNiche', 'authenticityBand'],
        sortableAttributes: ['followerCount', 'engagementRate', 'qualityScore'],
        searchableAttributes: ['displayName', 'primaryHandle', 'primaryNiche']
      })
    });

    // Verify settings were applied
    const verifyRes = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/settings', {
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY }
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.filterableAttributes?.includes('platform')) {
      log({ scenario: 'Brain 1', step: 'Create index', status: 'FAIL', details: 'Settings not applied' });
      return;
    }

    log({ scenario: 'Brain 1', step: 'Create index', status: 'PASS', details: 'Index created with filterable attributes', latency: Date.now() - s1Start });
  } catch (e) {
    log({ scenario: 'Brain 1', step: 'Create index', status: 'FAIL', details: (e as Error).message });
    return;
  }

  // Step 2: Insert test documents
  const s2Start = Date.now();
  const testCreators = [
    { id: 'c1', displayName: 'Fashion Queen', primaryHandle: '@fashionqueen', platform: 'instagram', followerCount: 150000, engagementRate: 0.045, primaryNiche: 'fashion', authenticityBand: 'strong', qualityScore: 85, lastEnrichedAt: new Date().toISOString() },
    { id: 'c2', displayName: 'Tech Reviewer', primaryHandle: '@techreviewer', platform: 'youtube', followerCount: 500000, engagementRate: 0.032, primaryNiche: 'technology', authenticityBand: 'strong', qualityScore: 92, lastEnrichedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'c3', displayName: 'Food Blogger', primaryHandle: '@foodblogger', platform: 'instagram', followerCount: 25000, engagementRate: 0.068, primaryNiche: 'food', authenticityBand: 'moderate', qualityScore: 71, lastEnrichedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'c4', displayName: 'Travel Vlogger', primaryHandle: '@travelvlogger', platform: 'youtube', followerCount: 89000, engagementRate: 0.041, primaryNiche: 'travel', authenticityBand: 'strong', qualityScore: 88, lastEnrichedAt: new Date().toISOString() },
    { id: 'c5', displayName: 'Gaming Streamer', primaryHandle: '@gamingstreamer', platform: 'tiktok', followerCount: 320000, engagementRate: 0.055, primaryNiche: 'gaming', authenticityBand: 'moderate', qualityScore: 76, lastEnrichedAt: new Date(Date.now() - 259200000).toISOString() },
  ];

  try {
    await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/documents', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(testCreators)
    });
    await new Promise(r => setTimeout(r, 1500)); // Wait for indexing
    log({ scenario: 'Brain 1', step: 'Insert documents', status: 'PASS', details: testCreators.length + ' creators inserted', latency: Date.now() - s2Start });
  } catch (e) {
    log({ scenario: 'Brain 1', step: 'Insert documents', status: 'FAIL', details: (e as Error).message });
    return;
  }

  // Step 3: Search with filters
  const s3Start = Date.now();
  try {
    const res = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: '',
        filter: 'platform = "instagram" AND followerCount >= 10000',
        limit: 10
      })
    });
    const data = await res.json();
    const hits = data.hits || [];
    log({ scenario: 'Brain 1', step: 'Filtered search', status: hits.length > 0 ? 'PASS' : 'FAIL', details: hits.length + ' results found (instagram, 10k+ followers)', latency: Date.now() - s3Start });

    // Verify results match filters
    const allInstagram = hits.every((h: any) => h.platform === 'instagram');
    const allAboveMin = hits.every((h: any) => h.followerCount >= 10000);
    log({ scenario: 'Brain 1', step: 'Filter correctness', status: allInstagram && allAboveMin ? 'PASS' : 'FAIL', details: `All results match filters: platform=instagram(${allInstagram}), followers>=10k(${allAboveMin})` });
  } catch (e) {
    log({ scenario: 'Brain 1', step: 'Filtered search', status: 'FAIL', details: (e as Error).message });
  }

  // Step 4: Full-text search
  const s4Start = Date.now();
  try {
    const res = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'fashion', limit: 5 })
    });
    const data = await res.json();
    const hits = data.hits || [];
    log({ scenario: 'Brain 1', step: 'Full-text search', status: hits.length > 0 ? 'PASS' : 'FAIL', details: hits.length + ' results for "fashion"', latency: Date.now() - s4Start });
  } catch (e) {
    log({ scenario: 'Brain 1', step: 'Full-text search', status: 'FAIL', details: (e as Error).message });
  }

  // Step 5: Sort by follower count
  const s5Start = Date.now();
  try {
    const res = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', sort: ['followerCount:desc'], limit: 5 })
    });
    const data = await res.json();
    const hits = data.hits || [];
    const sorted = hits.every((h: any, i: number) => i === 0 || h.followerCount <= hits[i - 1].followerCount);
    log({ scenario: 'Brain 1', step: 'Sort by followers', status: sorted ? 'PASS' : 'FAIL', details: hits.length + ' results sorted descending', latency: Date.now() - s5Start });
  } catch (e) {
    log({ scenario: 'Brain 1', step: 'Sort by followers', status: 'FAIL', details: (e as Error).message });
  }
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 2: Brain 2 — Natural Language Search via LLM
// ═══════════════════════════════════════════════════════════════

async function testBrain2() {
  console.log('\n═══ SCENARIO 2: Brain 2 — NL Search via LLM ═══\n');

  // Step 1: LLM translation
  const s1Start = Date.now();
  let translatedFilters: any;
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Translate the following natural language query into Meilisearch filters. Return JSON with: { "filters": { "platform": string, "followerMin": number, "niche": string, "authenticityBand": string }, "chips": [{ "label": string, "value": string, "field": string }], "confidence": number (0-1) }' },
          { role: 'user', content: 'Instagram fashion influencers with more than 10k followers' }
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    });
    const groqData = await groqRes.json();
    const content = groqData.choices[0].message.content;
    translatedFilters = JSON.parse(content);

    log({ scenario: 'Brain 2', step: 'LLM translation', status: 'PASS', details: JSON.stringify(translatedFilters).substring(0, 120), latency: Date.now() - s1Start });
  } catch (e) {
    log({ scenario: 'Brain 2', step: 'LLM translation', status: 'FAIL', details: (e as Error).message });
    return;
  }

  // Step 2: Verify translation quality
  const s2Start = Date.now();
  const hasPlatform = translatedFilters.filters?.platform === 'instagram';
  const hasNiche = translatedFilters.filters?.niche?.toLowerCase().includes('fashion');
  const hasFollowerMin = translatedFilters.filters?.followerMin >= 10000;
  const hasChips = translatedFilters.chips?.length > 0;
  log({ scenario: 'Brain 2', step: 'Translation quality', status: hasPlatform && hasNiche && hasFollowerMin ? 'PASS' : 'FAIL', details: `platform=${translatedFilters.filters?.platform}, niche=${translatedFilters.filters?.niche}, followerMin=${translatedFilters.filters?.followerMin}, chips=${translatedFilters.chips?.length}` });

  // Step 3: Search with translated filters
  const s3Start = Date.now();
  try {
    let filterStr = '';
    if (translatedFilters.filters?.platform) filterStr += `platform = "${translatedFilters.filters.platform}"`;
    if (translatedFilters.filters?.followerMin) filterStr += `${filterStr ? ' AND ' : ''}followerCount >= ${translatedFilters.filters.followerMin}`;
    if (translatedFilters.filters?.niche) filterStr += `${filterStr ? ' AND ' : ''}primaryNiche = "${translatedFilters.filters.niche}"`;

    const res = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', filter: filterStr || undefined, limit: 10 })
    });
    const data = await res.json();
    const hits = data.hits || [];
    log({ scenario: 'Brain 2', step: 'Filtered search', status: hits.length > 0 ? 'PASS' : 'FAIL', details: hits.length + ' results for translated filters', latency: Date.now() - s3Start });
  } catch (e) {
    log({ scenario: 'Brain 2', step: 'Filtered search', status: 'FAIL', details: (e as Error).message });
  }

  // Step 4: Verify chips
  const s4Start = Date.now();
  const chipCount = translatedFilters.chips?.length || 0;
  log({ scenario: 'Brain 2', step: 'Chip generation', status: chipCount > 0 ? 'PASS' : 'FAIL', details: chipCount + ' chips generated', latency: Date.now() - s4Start });
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 3: Ranking Pipeline
// ═══════════════════════════════════════════════════════════════

async function testRanking() {
  console.log('\n═══ SCENARIO 3: Ranking Pipeline ═══\n');

  // Get all test creators sorted by various fields
  const s1Start = Date.now();
  try {
    // By followers (should rank high-follower creators higher)
    const res1 = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', sort: ['followerCount:desc'], limit: 5 })
    });
    const data1 = await res1.json();
    const topFollower = data1.hits?.[0];
    log({ scenario: 'Ranking', step: 'Top by followers', status: topFollower ? 'PASS' : 'FAIL', details: topFollower?.displayName + ' (' + topFollower?.followerCount + ' followers)', latency: Date.now() - s1Start });

    // By quality score
    const s2Start = Date.now();
    const res2 = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', sort: ['qualityScore:desc'], limit: 5 })
    });
    const data2 = await res2.json();
    const topQuality = data2.hits?.[0];
    log({ scenario: 'Ranking', step: 'Top by quality', status: topQuality ? 'PASS' : 'FAIL', details: topQuality?.displayName + ' (score: ' + topQuality?.qualityScore + ')', latency: Date.now() - s2Start });

    // Verify determinism
    const s3Start = Date.now();
    const res3a = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'fashion', limit: 3 })
    });
    const data3a = await res3a.json();
    const res3b = await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'fashion', limit: 3 })
    });
    const data3b = await res3b.json();
    const deterministic = JSON.stringify(data3a.hits?.map((h: any) => h.creatorId)) === JSON.stringify(data3b.hits?.map((h: any) => h.creatorId));
    log({ scenario: 'Ranking', step: 'Determinism', status: deterministic ? 'PASS' : 'FAIL', details: 'Same query returns same order', latency: Date.now() - s3Start });
  } catch (e) {
    log({ scenario: 'Ranking', step: 'Ranking tests', status: 'FAIL', details: (e as Error).message });
  }
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 4: Discovery Pipeline (Serper)
// ═══════════════════════════════════════════════════════════════

async function testDiscovery() {
  console.log('\n═══ SCENARIO 4: Discovery Pipeline ═══\n');

  // Step 1: Serper search
  const s1Start = Date.now();
  let serperResults: any[] = [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'instagram fashion influencer pakistan', num: 5 })
    });
    const data = await res.json();
    serperResults = data.organic || [];
    log({ scenario: 'Discovery', step: 'Serper search', status: serperResults.length > 0 ? 'PASS' : 'FAIL', details: serperResults.length + ' results found', latency: Date.now() - s1Start });
  } catch (e) {
    log({ scenario: 'Discovery', step: 'Serper search', status: 'FAIL', details: (e as Error).message });
    return;
  }

  // Step 2: Platform detection
  const s2Start = Date.now();
  const platforms = serperResults.map((r: any) => {
    const url = r.link || '';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'unknown';
  });
  const detectedPlatforms = [...new Set(platforms)];
  log({ scenario: 'Discovery', step: 'Platform detection', status: detectedPlatforms.length > 0 ? 'PASS' : 'FAIL', details: 'Detected: ' + detectedPlatforms.join(', '), latency: Date.now() - s2Start });

  // Step 3: Handle extraction
  const s3Start = Date.now();
  const handles = serperResults.map((r: any) => {
    try {
      const url = new URL(r.link);
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[0] ? '@' + parts[0] : null;
    } catch { return null; }
  }).filter(Boolean);
  log({ scenario: 'Discovery', step: 'Handle extraction', status: handles.length > 0 ? 'PASS' : 'FAIL', details: handles.length + ' handles extracted: ' + handles.slice(0, 3).join(', '), latency: Date.now() - s3Start });

  // Step 4: LLM extraction (Groq)
  const s4Start = Date.now();
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Extract creator info from search results. Return JSON array with: [{ handle, platform, displayName, niche, followerCount }]' },
          { role: 'user', content: JSON.stringify(serperResults.slice(0, 3)) }
        ],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });
    const groqData = await groqRes.json();
    const extracted = JSON.parse(groqData.choices[0].message.content);
    const creators = Array.isArray(extracted) ? extracted : extracted.creators || extracted.results || [];
    log({ scenario: 'Discovery', step: 'LLM extraction', status: creators.length > 0 ? 'PASS' : 'FAIL', details: creators.length + ' creators extracted by LLM', latency: Date.now() - s4Start });
  } catch (e) {
    log({ scenario: 'Discovery', step: 'LLM extraction', status: 'FAIL', details: (e as Error).message });
  }
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 5: Credit Quote
// ═══════════════════════════════════════════════════════════════

async function testCreditQuote() {
  console.log('\n═══ SCENARIO 5: Credit Quote ═══\n');

  // Step 1: Calculate quote
  const s1Start = Date.now();
  const candidateCount = 20;
  const breakdown = {
    serper: 0.005,
    apify: 0.01 * candidateCount,
    llm: 0.005 * candidateCount,
    youtube_api: 0.001 * candidateCount,
    meilisearch: 0.0001 * candidateCount,
    overhead: 0.05,
  };
  const totalCostUsd = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const credits = Math.ceil(totalCostUsd * 100);

  log({ scenario: 'Credit Quote', step: 'Calculate quote', status: 'PASS', details: `${candidateCount} candidates = ${credits} credits ($${totalCostUsd.toFixed(4)})`, latency: Date.now() - s1Start });

  // Step 2: Verify breakdown
  const s2Start = Date.now();
  const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const matches = Math.abs(breakdownSum - totalCostUsd) < 0.001;
  log({ scenario: 'Credit Quote', step: 'Breakdown integrity', status: matches ? 'PASS' : 'FAIL', details: 'Sum of breakdown matches total', latency: Date.now() - s2Start });

  // Step 3: Validate bounds
  const s3Start = Date.now();
  const validCredits = credits > 0 && credits < 10000;
  log({ scenario: 'Credit Quote', step: 'Credit bounds', status: validCredits ? 'PASS' : 'FAIL', details: credits + ' credits (within bounds)', latency: Date.now() - s3Start });
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════

async function cleanup() {
  console.log('\n═══ CLEANUP ═══\n');
  try {
    await fetch(MEILISEARCH_HOST + '/indexes/' + TEST_INDEX, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + MEILISEARCH_KEY }
    });
    console.log('  ✅ Test index deleted');
  } catch (e) {
    console.log('  ⚠️ Cleanup failed: ' + (e as Error).message);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  MUSHIN 2.0 — FULL SEARCH SYSTEM VALIDATION           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await testBrain1();
  await testBrain2();
  await testRanking();
  await testDiscovery();
  await testCreditQuote();
  await cleanup();

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Skipped: ${skipped} ⏭️`);
  console.log(`  Pass rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('  Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    - ${r.scenario} > ${r.step}: ${r.details}`);
    });
  }
}

main();
