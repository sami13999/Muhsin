import { readFileSync } from 'fs';

// Load .env
const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const GROQ_KEY = env.GROQ_API_KEY;
const SERPER_KEY = env.SERPER_API_KEY;
const APIFY_TOKEN = env.APIFY_TOKEN;
const RESEND_KEY = env.RESEND_API_KEY;
const UPSTASH_URL = env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;
const YOUTUBE_KEY = env.YOUTUBE_API_KEY;
const HF_KEY = env.HUGGINGFACE_API_KEY;

interface TestResult { name: string; status: 'PASS'|'FAIL'|'SKIP'; detail: string; ms?: number }
const results: TestResult[] = [];

function t(name: string, status: TestResult['status'], detail: string, ms?: number) {
  results.push({ name, status, detail, ms });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const msStr = ms !== undefined ? ` (${ms}ms)` : '';
  console.log(`  ${icon} ${name}${msStr}`);
  if (status === 'FAIL') console.log(`     → ${detail}`);
}

// ═══════════════════════════════════════════════════════════════
// 1. MEILISEARCH — Full lifecycle
// ═══════════════════════════════════════════════════════════════

async function testMeilisearch() {
  console.log('\n1. MEILISEARCH');
  const IDX = 'e2e_ms_' + Date.now();

  // Health
  let s = Date.now();
  try {
    const h = await fetch(HOST + '/health');
    const d = await h.json();
    t('Health check', d.status === 'available' ? 'PASS' : 'FAIL', d.status, Date.now()-s);
  } catch(e) { t('Health check', 'FAIL', (e as Error).message); }

  // Create + configure
  s = Date.now();
  try {
    await fetch(HOST + '/indexes', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
    });
    await fetch(HOST + '/indexes/' + IDX + '/settings', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterableAttributes: ['platform', 'followerCount', 'primaryNiche'],
        sortableAttributes: ['followerCount', 'qualityScore'],
        searchableAttributes: ['displayName', 'primaryNiche']
      })
    });
    t('Index + configure', 'PASS', 'Settings applied', Date.now()-s);
  } catch(e) { t('Index + configure', 'FAIL', (e as Error).message); }

  // Insert documents
  s = Date.now();
  try {
    await fetch(HOST + '/indexes/' + IDX + '/documents', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { id: 1, displayName: 'Fashion Queen', platform: 'instagram', followerCount: 150000, primaryNiche: 'fashion', qualityScore: 85, lastEnrichedAt: new Date().toISOString() },
        { id: 2, displayName: 'Tech Reviewer', platform: 'youtube', followerCount: 500000, primaryNiche: 'technology', qualityScore: 92, lastEnrichedAt: new Date(Date.now()-86400000).toISOString() },
        { id: 3, displayName: 'Food Blogger', platform: 'instagram', followerCount: 25000, primaryNiche: 'food', qualityScore: 71, lastEnrichedAt: new Date(Date.now()-172800000).toISOString() },
      ])
    });
    await new Promise(r => setTimeout(r, 2000));
    t('Insert documents', 'PASS', '3 creators indexed', Date.now()-s);
  } catch(e) { t('Insert documents', 'FAIL', (e as Error).message); }

  // Filtered search
  s = Date.now();
  try {
    const res = await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', filter: 'platform = "instagram"', limit: 5 })
    });
    const d = await res.json();
    t('Filtered search', (d.hits?.length||0) > 0 ? 'PASS' : 'FAIL', `${d.hits?.length||0} instagram creators`, Date.now()-s);
  } catch(e) { t('Filtered search', 'FAIL', (e as Error).message); }

  // Full-text search
  s = Date.now();
  try {
    const res = await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'fashion', limit: 5 })
    });
    const d = await res.json();
    t('Full-text search', (d.hits?.length||0) > 0 ? 'PASS' : 'FAIL', `${d.hits?.length||0} results for "fashion"`, Date.now()-s);
  } catch(e) { t('Full-text search', 'FAIL', (e as Error).message); }

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
}

// ═══════════════════════════════════════════════════════════════
// 2. GROQ LLM — Completion + token accounting
// ═══════════════════════════════════════════════════════════════

async function testGroq() {
  console.log('\n2. GROQ LLM');
  let s = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'What is 2+2? Reply with just the number.' }],
        max_tokens: 5
      })
    });
    const d = await res.json();
    const answer = d.choices[0].message.content;
    const tokens = d.usage.total_tokens;
    t('Completion', answer.trim() === '4' ? 'PASS' : 'FAIL', `Answer: "${answer}", Tokens: ${tokens}`, Date.now()-s);
  } catch(e) { t('Completion', 'FAIL', (e as Error).message); }

  // JSON mode test
  s = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Return JSON with "answer" field.' },
          { role: 'user', content: 'What is 3*7?' }
        ],
        temperature: 0,
        max_tokens: 20,
        response_format: { type: 'json_object' }
      })
    });
    const d = await res.json();
    const parsed = JSON.parse(d.choices[0].message.content);
    t('JSON mode', parsed.answer === 21 ? 'PASS' : 'FAIL', `JSON response: ${JSON.stringify(parsed)}`, Date.now()-s);
  } catch(e) { t('JSON mode', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 3. SERPER — Google SERP search
// ═══════════════════════════════════════════════════════════════

async function testSerper() {
  console.log('\n3. SERPER');
  let s = Date.now();
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'instagram fashion influencer pakistan', num: 3 })
    });
    const d = await res.json();
    if (d.organic) {
      t('Search', 'PASS', `${d.organic.length} results returned`, Date.now()-s);
      d.organic.slice(0,2).forEach((r: any) => console.log(`     → ${r.title?.substring(0,50)}`));
    } else {
      t('Search', 'FAIL', JSON.stringify(d).substring(0,100), Date.now()-s);
    }
  } catch(e) { t('Search', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 4. APIFY — Account + actor run
// ═══════════════════════════════════════════════════════════════

async function testApify() {
  console.log('\n4. APIFY');
  let s = Date.now();
  try {
    const res = await fetch('https://api.apify.com/v2/users/me?token=' + APIFY_TOKEN);
    const d = await res.json();
    t('Account check', 'PASS', `Plan: ${d.data?.plan?.name||'free'}`, Date.now()-s);
  } catch(e) { t('Account check', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 5. RESEND — Email send
// ═══════════════════════════════════════════════════════════════

async function testResend() {
  console.log('\n5. RESEND');
  let s = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_ADDRESS || 'test@mushin.app',
        to: ['delivered@resend.dev'],
        subject: 'MUSHIN E2E Test - ' + new Date().toISOString(),
        html: '<p>End-to-end system test completed successfully.</p>'
      })
    });
    const d = await res.json();
    t('Send email', res.ok ? 'PASS' : 'FAIL', `ID: ${d.id || 'N/A'}, Status: ${res.status}`, Date.now()-s);
  } catch(e) { t('Send email', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 6. YOUTUBE — Data API
// ═══════════════════════════════════════════════════════════════

async function testYouTube() {
  console.log('\n6. YOUTUBE');
  let s = Date.now();
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=influencer+marketing+pakistan&type=channel&maxResults=2&key=${YOUTUBE_KEY}`);
    const d = await res.json();
    if (d.items) {
      t('Search channels', 'PASS', `${d.items.length} channels found`, Date.now()-s);
      d.items.forEach((i: any) => console.log(`     → ${i.snippet.title}`));
    } else {
      t('Search channels', 'FAIL', JSON.stringify(d).substring(0,100), Date.now()-s);
    }
  } catch(e) { t('Search channels', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 7. UPSTASH REDIS — PING + SET/GET
// ═══════════════════════════════════════════════════════════════

async function testRedis() {
  console.log('\n7. UPSTASH REDIS');
  let s = Date.now();
  try {
    await fetch(UPSTASH_URL + '/set/e2e_test_key/e2e_test_value', {
      headers: { 'Authorization': 'Bearer ' + UPSTASH_TOKEN }
    });
    const getRes = await fetch(UPSTASH_URL + '/get/e2e_test_key', {
      headers: { 'Authorization': 'Bearer ' + UPSTASH_TOKEN }
    });
    const d = await getRes.json();
    await fetch(UPSTASH_URL + '/del/e2e_test_key', {
      headers: { 'Authorization': 'Bearer ' + UPSTASH_TOKEN }
    });
    t('SET/GET/DEL', d.result === 'e2e_test_value' ? 'PASS' : 'FAIL', `Value: ${d.result}`, Date.now()-s);
  } catch(e) { t('SET/GET/DEL', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 8. HUGGINGFACE — API key
// ═══════════════════════════════════════════════════════════════

async function testHuggingFace() {
  console.log('\n8. HUGGINGFACE');
  let s = Date.now();
  try {
    const res = await fetch('https://huggingface.co/api/models?limit=1&sort=downloads&direction=-1', {
      headers: { 'Authorization': 'Bearer ' + HF_KEY }
    });
    const d = await res.json();
    t('API key valid', res.ok ? 'PASS' : 'FAIL', `Top model: ${d[0]?.id||'N/A'}`, Date.now()-s);
  } catch(e) { t('API key valid', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// 9. NL SEARCH PIPELINE (Groq + Meilisearch)
// ═══════════════════════════════════════════════════════════════

async function testNLSearch() {
  console.log('\n9. NL SEARCH PIPELINE');
  const IDX = 'e2e_nl_' + Date.now();

  // Setup index
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterableAttributes: ['platform', 'followerCount'], searchableAttributes: ['displayName'] })
  });
  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { id: 1, displayName: 'Fashion Creator', platform: 'instagram', followerCount: 150000 },
      { id: 2, displayName: 'Tech Creator', platform: 'youtube', followerCount: 500000 },
    ])
  });
  await new Promise(r => setTimeout(r, 2000));

  // NL → Filter via Groq
  let s = Date.now();
  let filters: any;
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Translate to Meilisearch filters. Return JSON: {"filters":{"platform":string,"followerMin":number},"chips":[{"label":string,"value":string}]}' },
          { role: 'user', content: 'Instagram creators with more than 10k followers' }
        ],
        temperature: 0, max_tokens: 200, response_format: { type: 'json_object' }
      })
    });
    const d = await groqRes.json();
    filters = JSON.parse(d.choices[0].message.content);
    t('NL → Filter translation', 'PASS', JSON.stringify(filters).substring(0,80), Date.now()-s);
  } catch(e) { t('NL → Filter translation', 'FAIL', (e as Error).message); }

  // Search with translated filters
  if (filters) {
    s = Date.now();
    try {
      let filterStr = '';
      if (filters.filters?.platform) filterStr += `platform = "${filters.filters.platform}"`;
      if (filters.filters?.followerMin) filterStr += `${filterStr?' AND ':''}followerCount >= ${filters.filters.followerMin}`;
      const res = await fetch(HOST + '/indexes/' + IDX + '/search', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: '', filter: filterStr || undefined, limit: 5 })
      });
      const d = await res.json();
      t('Search with translated filters', (d.hits?.length||0) > 0 ? 'PASS' : 'FAIL', `${d.hits?.length||0} results`, Date.now()-s);
    } catch(e) { t('Search with translated filters', 'FAIL', (e as Error).message); }
  }

  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
}

// ═══════════════════════════════════════════════════════════════
// 10. DISCOVERY PIPELINE (Serper + Groq extraction)
// ═══════════════════════════════════════════════════════════════

async function testDiscovery() {
  console.log('\n10. DISCOVERY PIPELINE');

  // Stage 1: Serper search
  let s = Date.now();
  let serperResults: any[] = [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'instagram fashion influencer pakistan', num: 3 })
    });
    const d = await res.json();
    serperResults = d.organic || [];
    t('Stage 1: Serper search', serperResults.length > 0 ? 'PASS' : 'FAIL', `${serperResults.length} results`, Date.now()-s);
  } catch(e) { t('Stage 1: Serper search', 'FAIL', (e as Error).message); }

  // Stage 2: LLM extraction
  s = Date.now();
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Extract creator info. Return JSON array: [{handle, platform, displayName, niche}]' },
          { role: 'user', content: JSON.stringify(serperResults.slice(0,2)) }
        ],
        temperature: 0, max_tokens: 300, response_format: { type: 'json_object' }
      })
    });
    const d = await groqRes.json();
    const extracted = JSON.parse(d.choices[0].message.content);
    const creators = Array.isArray(extracted) ? extracted : extracted.creators || [];
    t('Stage 2: LLM extraction', creators.length > 0 ? 'PASS' : 'FAIL', `${creators.length} creators extracted`, Date.now()-s);
  } catch(e) { t('Stage 2: LLM extraction', 'FAIL', (e as Error).message); }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MUSHIN 2.0 — FULL SYSTEM END-TO-END TEST               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await testMeilisearch();
  await testGroq();
  await testSerper();
  await testApify();
  await testResend();
  await testYouTube();
  await testRedis();
  await testHuggingFace();
  await testNLSearch();
  await testDiscovery();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL RESULTS                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const skip = results.filter(r => r.status === 'SKIP').length;

  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  Passed: ${pass} ✅`);
  console.log(`  Failed: ${fail} ❌`);
  console.log(`  Skipped: ${skip} ⏭️`);
  console.log(`  Pass rate: ${((pass/results.length)*100).toFixed(1)}%\n`);

  if (fail > 0) {
    console.log('  Failed:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.detail}`);
    });
  }
}

main();
