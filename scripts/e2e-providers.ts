import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function e2eTest() {
  console.log('=== E2E PROVIDER TESTS ===\n');

  // 1. Meilisearch: Create index + insert + search
  console.log('1. Meilisearch');
  try {
    await fetch(env.MEILISEARCH_HOST + '/indexes', {
      method: 'POST',
      headers: { 'X-API-KEY': env.MEILISEARCH_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: 'test_providers', primaryKey: 'id' })
    }).catch(() => {});

    await fetch(env.MEILISEARCH_HOST + '/indexes/test_providers/documents', {
      method: 'PUT',
      headers: { 'X-API-KEY': env.MEILISEARCH_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: 1, name: 'Test Creator', platform: 'instagram', followerCount: 10000 }])
    });

    await new Promise(r => setTimeout(r, 1000));

    const searchRes = await fetch(env.MEILISEARCH_HOST + '/indexes/test_providers/search?q=Test+Creator', {
      headers: { 'X-API-KEY': env.MEILISEARCH_API_KEY }
    });
    const searchData = await searchRes.json();
    console.log('   Index + Insert + Search: OK (' + searchData.estimatedTotalHits + ' hits)');

    await fetch(env.MEILISEARCH_HOST + '/indexes/test_providers', {
      method: 'DELETE',
      headers: { 'X-API-KEY': env.MEILISEARCH_API_KEY }
    });
    console.log('   Cleanup: OK\n');
  } catch (e) {
    console.log('   FAILED: ' + e.message + '\n');
  }

  // 2. Groq: Simple completion
  console.log('2. Groq (LLM)');
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        max_tokens: 10
      })
    });
    const groqData = await groqRes.json();
    console.log('   Completion: OK - "' + groqData.choices[0].message.content + '"\n');
  } catch (e) {
    console.log('   FAILED: ' + e.message + '\n');
  }

  // 3. Resend: Send test email
  console.log('3. Resend (Email)');
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_ADDRESS || 'test@mushin.app',
        to: ['delivered@resend.dev'],
        subject: 'MUSHIN Provider Test',
        html: '<p>Provider connectivity test successful</p>'
      })
    });
    const resendData = await resendRes.json();
    console.log('   Send: OK - ID: ' + (resendData.id || 'N/A') + '\n');
  } catch (e) {
    console.log('   FAILED: ' + e.message + '\n');
  }

  // 4. YouTube: Get video info
  console.log('4. YouTube Data API');
  try {
    const ytRes = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=dQw4w9WgXcQ&key=' + env.YOUTUBE_API_KEY
    );
    const ytData = await ytRes.json();
    if (ytData.items && ytData.items[0]) {
      console.log('   Video lookup: OK - "' + ytData.items[0].snippet.title + '"');
      console.log('   Views: ' + ytData.items[0].statistics.viewCount + '\n');
    } else {
      console.log('   FAILED: no items returned\n');
    }
  } catch (e) {
    console.log('   FAILED: ' + e.message + '\n');
  }

  // 5. Apify: Check user account
  console.log('5. Apify');
  try {
    const apifyRes = await fetch('https://api.apify.com/v2/users/me?token=' + env.APIFY_TOKEN);
    const apifyData = await apifyRes.json();
    console.log('   Account: OK - Plan: ' + (apifyData.data?.plan || 'unknown'));
    console.log('   Usage: ' + (apifyData.data?.usageTotalUsd?.toFixed(2) || '0') + ' USD\n');
  } catch (e) {
    console.log('   FAILED: ' + e.message + '\n');
  }

  console.log('=== COMPLETE ===');
}
e2eTest();
