/**
 * MUSHIN 2.0 — API Server Startup Script
 * Loads all environment variables and starts the API server.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
const envPath = resolve(import.meta.dirname || '.', '../../.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (value && !process.env[key]) {
    process.env[key] = value;
  }
}

console.log('═══ MUSHIN 2.0 API Server ═══');
console.log('Environment loaded from .env');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}`);
console.log(`MEILISEARCH_HOST: ${process.env.MEILISEARCH_HOST ? 'SET' : 'MISSING'}`);
console.log(`JWKS_URI: ${process.env.JWKS_URI ? 'SET' : 'MISSING'}`);
console.log('');

// Import and start the server
import('../../packages/api/src/server.js');
