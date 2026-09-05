import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'search_debug_' + Date.now();

async function debug() {
  console.log('=== MEILISEARCH DEBUG ===\n');

  // Create index
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });

  // Configure settings with verbose logging
  console.log('1. Configuring settings...');
  const settingsRes = await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche'],
      sortableAttributes: ['followerCount'],
      searchableAttributes: ['displayName', 'primaryHandle']
    })
  });
  console.log('   Settings response:', settingsRes.status);

  // Verify settings
  const getSettingsRes = await fetch(HOST + '/indexes/' + IDX + '/settings', {
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  const settings = await getSettingsRes.json();
  console.log('   Filterable:', settings.filterableAttributes);
  console.log('   Searchable:', settings.searchableAttributes);

  // Insert documents
  console.log('\n2. Inserting documents...');
  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { id: 1, displayName: 'Fashion Queen', platform: 'instagram', followerCount: 150000 },
      { id: 2, displayName: 'Tech Reviewer', platform: 'youtube', followerCount: 500000 },
    ])
  });

  // Wait longer
  console.log('3. Waiting 5 seconds for indexing...');
  await new Promise(r => setTimeout(r, 5000));

  // Check stats
  const statsRes = await fetch(HOST + '/indexes/' + IDX + '/stats', {
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  const stats = await statsRes.json();
  console.log('   Documents:', stats.numberOfDocuments);

  // Test 1: Simple filter
  console.log('\n4. Filter: platform = "instagram"...');
  const res1 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram"' })
  });
  const data1 = await res1.json();
  console.log('   Hits:', data1.hits?.length || 0);

  // Test 2: Numeric filter
  console.log('\n5. Filter: followerCount >= 100000...');
  const res2 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'followerCount >= 100000' })
  });
  const data2 = await res2.json();
  console.log('   Hits:', data2.hits?.length || 0);

  // Test 3: Combined filter
  console.log('\n6. Filter: platform = "instagram" AND followerCount >= 100000...');
  const res3 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram" AND followerCount >= 100000' })
  });
  const data3 = await res3.json();
  console.log('   Hits:', data3.hits?.length || 0);

  // Test 4: Empty query (should return all)
  console.log('\n7. Empty query (all documents)...');
  const res4 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '' })
  });
  const data4 = await res4.json();
  console.log('   Hits:', data4.hits?.length || 0);
  if (data4.hits) {
    data4.hits.forEach((h: any) => console.log('   -', h.displayName, h.platform, h.followerCount));
  }

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  console.log('\n=== DEBUG COMPLETE ===');
}
debug();
