import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

async function diagnose() {
  // Resend
  console.log('=== RESEND DIAGNOSIS ===');
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM_ADDRESS || 'test@mushin.app',
      to: ['delivered@resend.dev'],
      subject: 'Test',
      html: '<p>Test</p>'
    })
  });
  console.log('Status:', resendRes.status);
  console.log('Body:', await resendRes.text());

  // Upstash
  console.log('\n=== UPSTASH DIAGNOSIS ===');
  console.log('URL:', env.UPSTASH_REDIS_REST_URL);
  const setRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/set/test123/val123', {
    headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
  });
  console.log('SET Status:', setRes.status);
  console.log('SET Body:', await setRes.text());

  const getRes = await fetch(env.UPSTASH_REDIS_REST_URL + '/get/test123', {
    headers: { 'Authorization': 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN }
  });
  console.log('GET Status:', getRes.status);
  console.log('GET Body:', await getRes.text());
}
diagnose();
