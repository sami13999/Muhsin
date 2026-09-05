import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'search_final_' + Date.now();

async function run() {
  console.log('=== MEILISEARCH SEARCH VALIDATION ===\n');

  // Create index
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });

  // Configure settings with PATCH (not PUT)
  console.log('1. Configuring settings with PATCH...');
  const settingsRes = await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche', 'authenticityBand'],
      sortableAttributes: ['followerCount', 'qualityScore'],
      searchableAttributes: ['displayName', 'primaryHandle', 'primaryNiche']
    })
  });
  console.log('   Status:', settingsRes.status);

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
      { id: 1, displayName: 'Fashion Queen', primaryHandle: '@fashionqueen', platform: 'instagram', followerCount: 150000, primaryNiche: 'fashion', qualityScore: 85 },
      { id: 2, displayName: 'Tech Reviewer', primaryHandle: '@techreviewer', platform: 'youtube', followerCount: 500000, primaryNiche: 'technology', qualityScore: 92 },
      { id: 3, displayName: 'Food Blogger', primaryHandle: '@foodblogger', platform: 'instagram', followerCount: 25000, primaryNiche: 'food', qualityScore: 71 },
    ])
  });

  // Wait for indexing
  console.log('3. Waiting for indexing...');
  await new Promise(r => setTimeout(r, 3000));

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
  if (data1.hits) {
    data1.hits.forEach((h: any) => console.log('   -', h.displayName, h.platform));
  }

  // Test 2: Numeric filter
  console.log('\n5. Filter: followerCount >= 100000...');
  const res2 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'followerCount >= 100000' })
  });
  const data2 = await res2.json();
  console.log('   Hits:', data2.hits?.length || 0);
  if (data2.hits) {
    data2.hits.forEach((h: any) => console.log('   -', h.displayName, h.followerCount));
  }

  // Test 3: Combined filter
  console.log('\n6. Filter: platform = "instagram" AND followerCount >= 100000...');
  const res3 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram" AND followerCount >= 100000' })
  });
  const data3 = await res3.json();
  console.log('   Hits:', data3.hits?.length || 0);

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  console.log('\n=== VALIDATION COMPLETE ===');
}
run();
