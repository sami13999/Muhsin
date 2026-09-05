import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function diagnose() {
  // Serper
  console.log('--- Serper ---');
  const serperRes = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'test', num: 1 })
  });
  console.log('Status:', serperRes.status);
  console.log('Body:', (await serperRes.text()).substring(0, 300));

  // Upstash
  console.log('\n--- Upstash ---');
  const upstashRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/ping');
  console.log('Status:', upstashRes.status);
  console.log('Body:', (await upstashRes.text()).substring(0, 300));

  // Anthropic
  console.log('\n--- Anthropic ---');
  const anthRes = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }
  });
  console.log('Status:', anthRes.status);
  console.log('Body:', (await anthRes.text()).substring(0, 300));
}
diagnose();
