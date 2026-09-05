import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'search_fix_' + Date.now();

async function fix() {
  console.log('=== MEILISEARCH FIX TEST ===\n');

  // Create index with Bearer auth
  console.log('1. Creating index...');
  const createRes = await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });
  console.log('   Status:', createRes.status);

  // Configure settings
  console.log('2. Configuring settings...');
  await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche'],
      sortableAttributes: ['followerCount', 'qualityScore'],
      searchableAttributes: ['displayName', 'primaryHandle', 'primaryNiche']
    })
  });

  // Insert documents
  console.log('3. Inserting documents...');
  const insertRes = await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { id: 1, displayName: 'Fashion Queen', primaryHandle: '@fashionqueen', platform: 'instagram', followerCount: 150000, primaryNiche: 'fashion', qualityScore: 85 },
      { id: 2, displayName: 'Tech Reviewer', primaryHandle: '@techreviewer', platform: 'youtube', followerCount: 500000, primaryNiche: 'technology', qualityScore: 92 },
      { id: 3, displayName: 'Food Blogger', primaryHandle: '@foodblogger', platform: 'instagram', followerCount: 25000, primaryNiche: 'food', qualityScore: 71 },
    ])
  });
  console.log('   Insert status:', insertRes.status);

  // Wait for indexing
  console.log('4. Waiting for indexing...');
  await new Promise(r => setTimeout(r, 3000));

  // Check stats
  const statsRes = await fetch(HOST + '/indexes/' + IDX + '/stats', {
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  const stats = await statsRes.json();
  console.log('   Stats:', JSON.stringify(stats));

  // Search with filter
  console.log('5. Filtered search...');
  const search1 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram"' })
  });
  const data1 = await search1.json();
  console.log('   Results:', data1.hits?.length || 0, 'hits');
  if (data1.hits) {
    data1.hits.forEach((h: any) => console.log('   -', h.displayName, '(' + h.platform + ')'));
  }

  // Search with text
  console.log('6. Text search...');
  const search2 = await fetch(HOST + '/indexes/' + IDX + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'fashion' })
  });
  const data2 = await search2.json();
  console.log('   Results:', data2.hits?.length || 0, 'hits');
  if (data2.hits) {
    data2.hits.forEach((h: any) => console.log('   -', h.displayName));
  }

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  console.log('\n=== FIX TEST COMPLETE ===');
}
fix();
