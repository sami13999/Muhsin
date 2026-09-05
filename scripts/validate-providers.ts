import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const results: Record<string, { status: string; details: string; latency?: number }> = {};

async function testSupabase() {
  const start = Date.now();
  try {
    // Test connection via REST API
    const res = await fetch(env.SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + env.SUPABASE_ANON_KEY
      }
    });
    const latency = Date.now() - start;
    if (res.ok) {
      results['Supabase'] = { status: 'VERIFIED', details: 'REST API connected, status ' + res.status, latency };
    } else {
      results['Supabase'] = { status: 'FAILED', details: 'HTTP ' + res.status, latency };
    }
  } catch (e) {
    results['Supabase'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testMeilisearch() {
  const start = Date.now();
  try {
    const res = await fetch(env.MEILISEARCH_HOST + '/health');
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.status === 'available') {
      results['Meilisearch'] = { status: 'VERIFIED', details: 'Healthy, version: ' + (data.commitSha || 'unknown'), latency };
    } else {
      results['Meilisearch'] = { status: 'PARTIAL', details: 'Status: ' + data.status, latency };
    }
  } catch (e) {
    results['Meilisearch'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testUpstash() {
  const start = Date.now();
  try {
    const res = await fetch(env.UPSTASH_REDIS_REST_URL + '/ping', {
      headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
    });
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.result === 'PONG') {
      results['Upstash'] = { status: 'VERIFIED', details: 'PING responded PONG', latency };
    } else {
      results['Upstash'] = { status: 'FAILED', details: JSON.stringify(data), latency };
    }
  } catch (e) {
    results['Upstash'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testGroq() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5
      })
    });
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.choices && data.choices[0]) {
      results['Groq'] = { status: 'VERIFIED', details: 'Model: llama-3.1-8b-instant, response: "' + data.choices[0].message.content + '"', latency };
    } else {
      results['Groq'] = { status: 'FAILED', details: JSON.stringify(data).substring(0, 200), latency };
    }
  } catch (e) {
    results['Groq'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testSerper() {
  const start = Date.now();
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'MUSHIN influencer platform', num: 3 })
    });
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.organic) {
      results['Serper'] = { status: 'VERIFIED', details: 'Got ' + data.organic.length + ' results, credits: ' + (data.creditsRemaining || 'unknown'), latency };
    } else if (data.message) {
      results['Serper'] = { status: 'FAILED', details: data.message, latency };
    } else {
      results['Serper'] = { status: 'FAILED', details: JSON.stringify(data).substring(0, 200), latency };
    }
  } catch (e) {
    results['Serper'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testApify() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.apify.com/v2/users/me?token=' + env.APIFY_TOKEN);
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.data) {
      results['Apify'] = { status: 'VERIFIED', details: 'Plan: ' + (data.data.plan?.name || 'free'), latency };
    } else {
      results['Apify'] = { status: 'FAILED', details: JSON.stringify(data).substring(0, 200), latency };
    }
  } catch (e) {
    results['Apify'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testResend() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY }
    });
    const data = await res.json();
    const latency = Date.now() - start;
    if (res.ok) {
      const domains = data.data?.length || 0;
      results['Resend'] = { status: 'VERIFIED', details: domains + ' domain(s) configured', latency };
    } else {
      results['Resend'] = { status: 'FAILED', details: data.message || 'HTTP ' + res.status, latency };
    }
  } catch (e) {
    results['Resend'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testYouTube() {
  const start = Date.now();
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=' + env.YOUTUBE_API_KEY);
    const data = await res.json();
    const latency = Date.now() - start;
    if (data.items && data.items[0]) {
      results['YouTube'] = { status: 'VERIFIED', details: 'API key valid, video: "' + data.items[0].snippet.title.substring(0, 40) + '..."', latency };
    } else {
      results['YouTube'] = { status: 'FAILED', details: JSON.stringify(data).substring(0, 200), latency };
    }
  } catch (e) {
    results['YouTube'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function testHuggingFace() {
  const start = Date.now();
  try {
    const res = await fetch('https://huggingface.co/api/models?limit=1', {
      headers: { 'Authorization': 'Bearer ' + env.HUGGINGFACE_API_KEY }
    });
    const latency = Date.now() - start;
    if (res.ok) {
      results['HuggingFace'] = { status: 'VERIFIED', details: 'API key valid, HTTP ' + res.status, latency };
    } else {
      results['HuggingFace'] = { status: 'FAILED', details: 'HTTP ' + res.status, latency };
    }
  } catch (e) {
    results['HuggingFace'] = { status: 'FAILED', details: (e as Error).message, latency: Date.now() - start };
  }
}

async function runAll() {
  console.log('Running provider validation...\n');
  
  await Promise.all([
    testSupabase(),
    testMeilisearch(),
    testUpstash(),
    testGroq(),
    testSerper(),
    testApify(),
    testResend(),
    testYouTube(),
    testHuggingFace()
  ]);

  // Print results
  for (const [provider, result] of Object.entries(results)) {
    const icon = result.status === 'VERIFIED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
    const latencyStr = result.latency ? ` (${result.latency}ms)` : '';
    console.log(`${icon} ${provider}: ${result.status}${latencyStr}`);
    console.log(`   ${result.details}\n`);
  }

  // Summary
  const verified = Object.values(results).filter(r => r.status === 'VERIFIED').length;
  const failed = Object.values(results).filter(r => r.status === 'FAILED').length;
  console.log(`\nSummary: ${verified} verified, ${failed} failed out of ${Object.keys(results).length} providers`);
}

runAll();
