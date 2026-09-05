import postgres from 'postgres';
import { readFileSync } from 'fs';

function loadEnv() {
  const env: Record<string, string> = {};
  const content = readFileSync('.env', 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (match) {
      env[match[1]] = match[2];
    }
  });
  return env;
}

async function testConnection() {
  const env = loadEnv();
  const url = env.DATABASE_URL;
  console.log('Connecting to:', url.replace(/:([^@]+)@/, ':****@'));
  
  const sql = postgres(url);
  try {
    const result = await sql`SELECT 1 as connection_test`;
    console.log('SUCCESS! Database connection successful:', result);
  } catch (err: any) {
    console.error('ERROR! Database connection failed:', err.message);
  } finally {
    await sql.end();
  }
}

testConnection();
