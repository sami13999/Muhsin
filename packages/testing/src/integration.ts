/**
 * Integration Test Infrastructure
 *
 * Provides ephemeral Postgres instances via testcontainers for integration testing.
 * Each test suite gets a fresh database with migrations applied.
 *
 * Usage:
 *   import { getTestDatabase, cleanupTestDatabase } from '@mushin/testing';
 *
 *   beforeAll(async () => { db = await getTestDatabase(); });
 *   afterAll(async () => { await cleanupTestDatabase(); });
 */
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────────────

export interface TestDatabase {
  container: StartedTestContainer;
  connectionString: string;
}

// ── State ──────────────────────────────────────────────────────

let _testDb: TestDatabase | null = null;

// ── Database Setup ─────────────────────────────────────────────

/**
 * Get or create an ephemeral test database.
 * Reuses the same container across tests in the same suite.
 */
export async function getTestDatabase(): Promise<TestDatabase> {
  if (_testDb) return _testDb;

  console.log('[TestDB] Starting ephemeral Postgres container...');

  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'mushin_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const connectionString = `postgresql://test:test@${host}:${port}/mushin_test`;

  console.log(`[TestDB] Container started: ${connectionUri(connectionString)}`);

  _testDb = { container, connectionString };

  // Run migrations
  await runMigrations(connectionString);

  return _testDb;
}

/**
 * Run SQL migrations against the test database.
 */
async function runMigrations(connectionString: string): Promise<void> {
  console.log('[TestDB] Running migrations...');

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = [
    'V001__schemas_roles_enums.sql',
    'V002__gcp_schema.sql',
    'V003__platform_outbox.sql',
    'V004__wp_core_schema.sql',
    'V005__rls_policies.sql',
    'V006__billing_tables.sql',
    'V007__minor_signal.sql',
    'V008__pgvector_embeddings.sql',
    'V009__feedback_intelligence.sql',
  ];

  // Connect with raw postgres driver for migrations
  const client = postgres(connectionString);

  try {
    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      try {
        const sql = readFileSync(filePath, 'utf8');
        await client.unsafe(sql);
        console.log(`[TestDB] Applied: ${file}`);
      } catch (err: any) {
        // Some migrations may fail if objects already exist — that's OK
        if (err.message?.includes('already exists')) {
          console.log(`[TestDB] Skipped (already exists): ${file}`);
        } else {
          console.error(`[TestDB] Failed: ${file}`, err.message);
        }
      }
    }
  } finally {
    await client.end();
  }

  console.log('[TestDB] Migrations complete');
}

/**
 * Clean up the test database (truncate all tables).
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (!_testDb) return;

  console.log('[TestDB] Cleaning up test data...');

  const client = postgres(_testDb.connectionString);
  try {
    // Truncate all tables in WP schema
    await client.unsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'wp') LOOP
          EXECUTE 'TRUNCATE TABLE wp.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Truncate GCP tables
    await client.unsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'gcp') LOOP
          EXECUTE 'TRUNCATE TABLE gcp.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Truncate platform tables
    await client.unsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'platform') LOOP
          EXECUTE 'TRUNCATE TABLE platform.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
  } finally {
    await client.end();
  }

  console.log('[TestDB] Cleanup complete');
}

/**
 * Stop the test database container entirely.
 */
export async function stopTestDatabase(): Promise<void> {
  if (!_testDb) return;

  console.log('[TestDB] Stopping container...');
  await _testDb.container.stop();
  _testDb = null;
  console.log('[TestDB] Container stopped');
}

// ── Helpers ────────────────────────────────────────────────────

function connectionUri(uri: string): string {
  // Mask password in logs
  return uri.replace(/:([^@]+)@/, ':****@');
}

// ── Exports for direct SQL access ──────────────────────────────

/**
 * Execute raw SQL against the test database.
 */
export async function executeRaw(sql: string): Promise<any[]> {
  if (!_testDb) throw new Error('Test database not initialized');
  const client = postgres(_testDb.connectionString);
  try {
    const result = await client.unsafe(sql);
    return result as any[];
  } finally {
    await client.end();
  }
}
