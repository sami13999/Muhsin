import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'quick_test_' + Date.now();

async function test() {
  console.log('=== QUICK SEARCH TEST ===\n');

  // Create
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });

  // Settings
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterableAttributes: ['platform'], searchableAttributes: ['displayName'] })
  });

  // Insert
  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: 1, displayName: 'Test', platform: 'instagram' }])
  });

  await new Promise(r => setTimeout(r, 2000));

  // Search
  const res = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram"' })
  });
  const data = await res.json();
  console.log('Hits:', data.hits?.length);
  console.log('First hit:', JSON.stringify(data.hits?.[0]));

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
  console.log('\n=== TEST COMPLETE ===');
}
test();
