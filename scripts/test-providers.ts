/**
 * Real Provider Connectivity Test
 * Tests actual API connections with live credentials from .env
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
const envPath = resolve(process.cwd(), '.env');
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (match) env[match[1]] = match[2];
});

async function testProviders() {
  console.log('=== REAL PROVIDER CONNECTIVITY TESTS ===\n');

  // 1. Meilisearch
  try {
    const res = await fetch(env.MEILISEARCH_HOST + '/health');
    const data = await res.json();
    console.log(`Meilisearch: ${data.status === 'available' ? 'CONNECTED' : 'DEGRADED (' + data.status + ')'}`);
  } catch (e) {
    console.log(`Meilisearch: FAILED - ${e.message}`);
  }

  // 2. Groq
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` }
    });
    console.log(`Groq: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Groq: FAILED - ${e.message}`);
  }

  // 3. Resend
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}` }
    });
    console.log(`Resend: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Resend: FAILED - ${e.message}`);
  }

  // 4. Serper
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: 'test', num: 1 })
    });
    console.log(`Serper: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Serper: FAILED - ${e.message}`);
  }

  // 5. Apify
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${env.APIFY_TOKEN}`);
    console.log(`Apify: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Apify: FAILED - ${e.message}`);
  }

  // 6. YouTube
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${env.YOUTUBE_API_KEY}`);
    console.log(`YouTube: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`YouTube: FAILED - ${e.message}`);
  }

  // 7. Upstash
  try {
    const res = await fetch(env.UPSTASH_REDIS_REST_URL, {
      headers: { 'Authorization': `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` }
    });
    console.log(`Upstash: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Upstash: FAILED - ${e.message}`);
  }

  // 8. Anthropic
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    console.log(`Anthropic: ${res.ok ? 'CONNECTED' : 'FAILED (' + res.status + ')'}`);
  } catch (e) {
    console.log(`Anthropic: FAILED - ${e.message}`);
  }
}

testProviders();
