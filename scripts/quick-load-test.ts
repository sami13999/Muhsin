import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'quick_load_' + Date.now();

async function setup() {
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterableAttributes: ['platform'], searchableAttributes: ['displayName'] })
  });
  const docs = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1, displayName: `Creator ${i + 1}`, platform: ['instagram', 'youtube'][i % 2]
  }));
  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(docs)
  });
  await new Promise(r => setTimeout(r, 2000));
}

function percentile(arr: number[], p: number): number {
  return arr[Math.ceil(arr.length * p / 100) - 1];
}

async function main() {
  console.log('=== LOAD TEST ===\n');
  await setup();

  // Sequential latency test
  console.log('Sequential (50 requests):');
  const seqLatencies: number[] = [];
  for (let i = 0; i < 50; i++) {
    const s = Date.now();
    await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'Creator', limit: 10 })
    });
    seqLatencies.push(Date.now() - s);
  }
  seqLatencies.sort((a, b) => a - b);
  console.log(`  P50: ${percentile(seqLatencies, 50)}ms | P95: ${percentile(seqLatencies, 95)}ms | P99: ${percentile(seqLatencies, 99)}ms`);

  // Concurrent test (10 requests)
  console.log('\nConcurrent (10 requests):');
  const concLatencies: number[] = [];
  const promises = Array.from({ length: 10 }, async () => {
    const s = Date.now();
    await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'Creator', limit: 10 })
    });
    concLatencies.push(Date.now() - s);
  });
  await Promise.all(promises);
  concLatencies.sort((a, b) => a - b);
  console.log(`  P50: ${percentile(concLatencies, 50)}ms | P95: ${percentile(concLatencies, 95)}ms | P99: ${percentile(concLatencies, 99)}ms`);

  // Concurrent test (50 requests)
  console.log('\nConcurrent (50 requests):');
  const conc50Latencies: number[] = [];
  const promises50 = Array.from({ length: 50 }, async () => {
    const s = Date.now();
    await fetch(HOST + '/indexes/' + IDX + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'Creator', limit: 10 })
    });
    conc50Latencies.push(Date.now() - s);
  });
  await Promise.all(promises50);
  conc50Latencies.sort((a, b) => a - b);
  console.log(`  P50: ${percentile(conc50Latencies, 50)}ms | P95: ${percentile(conc50Latencies, 95)}ms | P99: ${percentile(conc50Latencies, 99)}ms`);

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
  console.log('\n=== LOAD TEST COMPLETE ===');
}

main();
