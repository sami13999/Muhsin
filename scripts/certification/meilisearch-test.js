/**
 * Test Meilisearch client directly
 */

async function test() {
  const host = 'https://ms-99e619050387-51371.sgp.meilisearch.io';
  const apiKey = 'e5231fe580450f54eec1dc9bc0dffce83420e33a';
  
  console.log('Testing Meilisearch connectivity...');
  console.log('Host:', host);
  
  // Test 1: Direct HTTP
  try {
    const res = await fetch(`${host}/health`);
    const data = await res.json();
    console.log('1. HTTP health:', JSON.stringify(data));
  } catch (err) {
    console.log('1. HTTP error:', err.message);
  }
  
  // Test 2: Indexes
  try {
    const res = await fetch(`${host}/indexes`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await res.json();
    console.log('2. Indexes:', JSON.stringify(data.results?.map(i => i.uid)));
  } catch (err) {
    console.log('2. Indexes error:', err.message);
  }
  
  // Test 3: Search
  try {
    const res = await fetch(`${host}/indexes/M/search?q=fashion&limit=3`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await res.json();
    console.log('3. Search hits:', data.hits?.length);
  } catch (err) {
    console.log('3. Search error:', err.message);
  }
  
  console.log('\n✅ Meilisearch is reachable via HTTP');
}

test();
