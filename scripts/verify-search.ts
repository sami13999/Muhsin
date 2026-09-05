import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'search_verify_' + Date.now();

async function verify() {
  console.log('=== SEARCH VERIFICATION ===\n');

  // Create index
  console.log('1. Create index...');
  const createRes = await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX, primaryKey: 'id' })
  });
  console.log('   Status:', createRes.status);

  // Configure settings
  console.log('2. Configure settings...');
  const settingsRes = await fetch(HOST + '/indexes/' + IDX + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche'],
      sortableAttributes: ['followerCount', 'qualityScore'],
      searchableAttributes: ['displayName', 'primaryHandle']
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
  console.log('\n3. Insert documents...');
  await fetch(HOST + '/indexes/' + IDX + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { id: 1, displayName: 'Fashion Queen', primaryHandle: '@fashionqueen', platform: 'instagram', followerCount: 150000, primaryNiche: 'fashion', qualityScore: 85 },
      { id: 2, displayName: 'Tech Reviewer', primaryHandle: '@techreviewer', platform: 'youtube', followerCount: 500000, primaryNiche: 'technology', qualityScore: 92 },
    ])
  });

  // Wait for indexing
  console.log('4. Wait 3s for indexing...');
  await new Promise(r => setTimeout(r, 3000));

  // Check stats
  const statsRes = await fetch(HOST + '/indexes/' + IDX + '/stats', {
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  const stats = await statsRes.json();
  console.log('   Documents:', stats.numberOfDocuments);

  // Search with filter
  console.log('\n5. Filter: platform = "instagram"...');
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

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + KEY }
  });
  console.log('\n=== VERIFICATION COMPLETE ===');
}
verify();
