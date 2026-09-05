import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function diagnose() {
  const HOST = env.MEILISEARCH_HOST;
  const KEY = env.MEILISEARCH_API_KEY;
  const IDX = 'search_diag_' + Date.now();

  console.log('=== MEILISEARCH DIAGNOSIS ===\n');

  // Create index
  console.log('1. Creating index...');
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });

  // Configure settings
  console.log('2. Configuring settings...');
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PUT',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount'],
      sortableAttributes: ['followerCount'],
      searchableAttributes: ['displayName', 'primaryHandle']
    })
  });

  // Insert document
  console.log('3. Inserting document...');
  const insertRes = await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: 1, displayName: 'Test Creator', platform: 'instagram', followerCount: 15000 }])
  });
  console.log('   Insert status:', insertRes.status);

  // Wait for indexing
  console.log('4. Waiting for indexing...');
  await new Promise(r => setTimeout(r, 2000));

  // Check stats
  const statsRes = await fetch(HOST + '/indexes/' + IDX + '/stats', {
    headers: { 'X-API-KEY': KEY }
  });
  const stats = await statsRes.json();
  console.log('   Stats:', JSON.stringify(stats));

  // Search without filter
  console.log('5. Searching without filter...');
  const search1 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '' })
  });
  const data1 = await search1.json();
  console.log('   Results:', data1.hits?.length || 0, 'hits');
  console.log('   Hits:', JSON.stringify(data1.hits?.slice(0, 2)));

  // Search with text query
  console.log('6. Searching with text query...');
  const search2 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'Test' })
  });
  const data2 = await search2.json();
  console.log('   Results:', data2.hits?.length || 0, 'hits');

  // Search with filter
  console.log('7. Searching with filter...');
  const search3 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram"' })
  });
  const data3 = await search3.json();
  console.log('   Results:', data3.hits?.length || 0, 'hits');

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, {
    method: 'DELETE',
    headers: { 'X-API-KEY': KEY }
  });
  console.log('\n=== DIAGNOSIS COMPLETE ===');
}
diagnose();
