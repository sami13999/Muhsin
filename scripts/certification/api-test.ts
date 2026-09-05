/**
 * MUSHIN 2.0 — API Server Startup Test
 * Tests if the API server can start and respond to health checks.
 *
 * Requires environment variables to be set (via .env or shell).
 * Run: npx tsx scripts/certification/api-test.ts
 */

import 'dotenv/config';

import { createApp } from '../../packages/api/src/index.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Required environment variable ${name} is not set.`);
    console.error('   Copy .env.example to .env and fill in your credentials.');
    process.exit(1);
  }
  return value;
}

async function test() {
  console.log('═══ MUSHIN API Startup Test ═══\n');

  // Validate required env vars exist (never hardcode secrets)
  requireEnv('DATABASE_URL');
  requireEnv('SUPABASE_URL');
  requireEnv('SUPABASE_ANON_KEY');
  requireEnv('MEILISEARCH_HOST');
  requireEnv('MEILISEARCH_API_KEY');
  requireEnv('GROQ_API_KEY');
  requireEnv('JWKS_URI');

  try {
    console.log('1. Creating Hono app...');
    const app = createApp();
    console.log('   ✅ App created successfully');
    
    console.log('\n2. Testing health endpoint...');
    const req = new Request('http://localhost:3000/health');
    const res = await app.fetch(req);
    const body = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(body, null, 2)}`);
    
    console.log('\n3. Testing liveness endpoint...');
    const req2 = new Request('http://localhost:3000/health/liveness');
    const res2 = await app.fetch(req2);
    const body2 = await res2.json();
    console.log(`   Status: ${res2.status}`);
    console.log(`   Response: ${JSON.stringify(body2)}`);
    
    console.log('\n✅ API SERVER: STARTUP SUCCESSFUL');
    console.log('   The Hono app can be created and responds to health checks.');
    
  } catch (err) {
    console.error('\n❌ API SERVER: STARTUP FAILED');
    if (err instanceof Error) {
      console.error('   Error:', err.message);
    }
    process.exit(1);
  }
}

test();
