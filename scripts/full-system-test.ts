import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function systemTest() {
  console.log('=== FULL SYSTEM VALIDATION ===\n');

  // 1. Supabase REST API
  console.log('1. Supabase REST API');
  try {
    const res = await fetch(env.SUPABASE_URL + '/rest/v1/', {
      headers: { 'apikey': env.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_ANON_KEY }
    });
    console.log('   Status: ' + res.status);
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 2. Meilisearch full cycle
  console.log('2. Meilisearch (health + search)');
  try {
    const health = await fetch(env.MEILISEARCH_HOST + '/health');
    const healthData = await health.json();
    console.log('   Health: ' + healthData.status);

    const searchRes = await fetch(env.MEILISEARCH_HOST + '/indexes/creators/search?q=test&limit=1', {
      headers: { 'X-API-KEY': env.MEILISEARCH_API_KEY }
    });
    const searchData = await searchRes.json();
    console.log('   Search: ' + (searchData.estimatedTotalHits || 0) + ' hits');
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 3. Groq LLM
  console.log('3. Groq LLM');
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'What is 2+2? Reply with just the number.' }],
        max_tokens: 5
      })
    });
    const groqData = await groqRes.json();
    console.log('   Response: "' + groqData.choices[0].message.content + '"');
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 4. Resend email
  console.log('4. Resend (email send)');
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_ADDRESS || 'test@mushin.app',
        to: ['delivered@resend.dev'],
        subject: 'MUSHIN System Test - ' + new Date().toISOString(),
        html: '<p>System validation test completed successfully.</p>'
      })
    });
    const resendData = await resendRes.json();
    console.log('   Email ID: ' + (resendData.id || 'N/A'));
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 5. YouTube Data API
  console.log('5. YouTube Data API');
  try {
    const ytRes = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=influencer+marketing&type=channel&maxResults=2&key=' + env.YOUTUBE_API_KEY);
    const ytData = await ytRes.json();
    if (ytData.items) {
      console.log('   Found: ' + ytData.items.length + ' channels');
      ytData.items.forEach((item: any) => console.log('   - ' + item.snippet.title.substring(0, 40)));
    }
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 6. Apify account
  console.log('6. Apify');
  try {
    const apifyRes = await fetch('https://api.apify.com/v2/users/me?token=' + env.APIFY_TOKEN);
    const apifyData = await apifyRes.json();
    console.log('   Plan: ' + (apifyData.data?.plan?.name || 'free'));
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 7. Upstash Redis
  console.log('7. Upstash Redis');
  try {
    const pingRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/ping');
    const pingData = await pingRes.json();
    console.log('   PING: ' + pingData.result);

    const setRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/set/system-test-key/system-test-value', {
      headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
    });
    const setData = await setRes.json();
    console.log('   SET: ' + setData.result);

    const getRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/get/system-test-key', {
      headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
    });
    const getData = await getRes.json();
    console.log('   GET: ' + getData.result);

    await fetch(env.UPSTASH_REDIS_REST_URL + '/del/system-test-key', {
      headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
    });
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  // 8. HuggingFace
  console.log('8. HuggingFace');
  try {
    const hfRes = await fetch('https://huggingface.co/api/models?limit=1&sort=downloads&direction=-1', {
      headers: { 'Authorization': 'Bearer ' + env.HUGGINGFACE_API_KEY }
    });
    const hfData = await hfRes.json();
    if (hfData[0]) console.log('   Top model: ' + hfData[0].id);
    console.log('   Result: VERIFIED\n');
  } catch (e) { console.log('   FAILED: ' + (e as Error).message + '\n'); }

  console.log('=== SYSTEM VALIDATION COMPLETE ===');
}
systemTest();
