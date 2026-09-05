import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'load_test_' + Date.now();

// ═══════════════════════════════════════════════════════════════
// SETUP: Create index with 1000 documents
// ═══════════════════════════════════════════════════════════════

async function setup() {
  console.log('Setting up load test index...');

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

  // Insert 1000 documents in batches
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter'];
  const niches = ['fashion', 'technology', 'food', 'travel', 'gaming', 'beauty', 'fitness', 'lifestyle'];

  for (let batch = 0; batch < 10; batch++) {
    const docs = [];
    for (let i = 0; i < 100; i++) {
      const id = batch * 100 + i + 1;
      docs.push({
        id,
        displayName: `Creator ${id}`,
        primaryHandle: `@creator${id}`,
        platform: platforms[i % platforms.length],
        followerCount: Math.floor(Math.random() * 2000000) + 100,
        primaryNiche: niches[i % niches.length],
        qualityScore: Math.floor(Math.random() * 100),
        authenticityBand: ['strong', 'moderate', 'weak'][i % 3],
        lastEnrichedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
      });
    }

    await fetch(HOST + '/indexes/' + IDX + '/documents', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(docs)
    });
  }

  await new Promise(r => setTimeout(r, 5000));
  console.log('Setup complete: 1000 documents indexed.\n');
}

// ═══════════════════════════════════════════════════════════════
// LOAD TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════

interface LatencySample { min: number; max: number; avg: number; p50: number; p95: number; p99: number }

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

async function measureLatency(name: string, fn: () => Promise<void>, iterations: number): Promise<LatencySample> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const s = Date.now();
    await fn();
    latencies.push(Date.now() - s);
  }

  latencies.sort((a, b) => a - b);

  return {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

async function searchRequest() {
  await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram"', limit: 20 })
  });
}

async function filteredSearchRequest() {
  await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'Creator', filter: 'platform = "youtube" AND followerCount >= 10000', limit: 10 })
  });
}

async function textSearchRequest() {
  await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'fashion technology', limit: 20 })
  });
}

async function sortSearchRequest() {
  await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', sort: ['followerCount:desc', 'qualityScore:desc'], limit: 20 })
  });
}

// ═══════════════════════════════════════════════════════════════
// CONCURRENT LOAD TEST
// ═══════════════════════════════════════════════════════════════

async function concurrentLoadTest(concurrency: number, duration: number) {
  console.log(`\nConcurrent load test: ${concurrency} requests for ${duration}s`);

  let running = true;
  let totalRequests = 0;
  let errors = 0;
  const latencies: number[] = [];

  const worker = async () => {
    while (running) {
      const s = Date.now();
      try {
        await searchRequest();
        latencies.push(Date.now() - s);
        totalRequests++;
      } catch {
        errors++;
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  await new Promise(r => setTimeout(r, duration * 1000));
  running = false;

  await new Promise(r => setTimeout(r, 1000));

  latencies.sort((a, b) => a - b);
  const rps = Math.round(totalRequests / duration);

  return {
    concurrency,
    totalRequests,
    errors,
    rps,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  MUSHIN 2.0 — LOAD TEST                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  await setup();

  // Scenario 1: Filtered search
  console.log('═══ Scenario 1: Filtered Search ═══');
  const filtered = await measureLatency('filtered', filteredSearchRequest, 50);
  console.log(`  Min: ${filtered.min}ms | Avg: ${filtered.avg}ms | P50: ${filtered.p50}ms | P95: ${filtered.p95}ms | P99: ${filtered.p99}ms`);

  // Scenario 2: Text search
  console.log('\n═══ Scenario 2: Text Search ═══');
  const text = await measureLatency('text', textSearchRequest, 50);
  console.log(`  Min: ${text.min}ms | Avg: ${text.avg}ms | P50: ${text.p50}ms | P95: ${text.p95}ms | P99: ${text.p99}ms`);

  // Scenario 3: Sort search
  console.log('\n═══ Scenario 3: Sort Search ═══');
  const sort = await measureLatency('sort', sortSearchRequest, 50);
  console.log(`  Min: ${sort.min}ms | Avg: ${sort.avg}ms | P50: ${sort.p50}ms | P95: ${sort.p95}ms | P99: ${sort.p99}ms`);

  // Scenario 4: Concurrent load (10 users)
  const c10 = await concurrentLoadTest(10, 5);
  console.log(`\n═══ Concurrent Load: 10 users ═══`);
  console.log(`  Requests: ${c10.totalRequests} | RPS: ${c10.rps} | Errors: ${c10.errors}`);
  console.log(`  P50: ${c10.p50}ms | P95: ${c10.p95}ms | P99: ${c10.p99}ms`);

  // Scenario 5: Concurrent load (50 users)
  const c50 = await concurrentLoadTest(50, 5);
  console.log(`\n═══ Concurrent Load: 50 users ═══`);
  console.log(`  Requests: ${c50.totalRequests} | RPS: ${c50.rps} | Errors: ${c50.errors}`);
  console.log(`  P50: ${c50.p50}ms | P95: ${c50.p95}ms | P99: ${c50.p99}ms`);

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  LOAD TEST SUMMARY                                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Single Request Latency:`);
  console.log(`    Filtered: P50=${filtered.p50}ms P95=${filtered.p95}ms`);
  console.log(`    Text:     P50=${text.p50}ms P95=${text.p95}ms`);
  console.log(`    Sort:     P50=${sort.p50}ms P95=${sort.p95}ms`);
  console.log(`\n  Concurrent Load:`);
  console.log(`    10 users: ${c10.rps} RPS, P95=${c10.p95}ms`);
  console.log(`    50 users: ${c50.rps} RPS, P95=${c50.p95}ms`);
}

main();
