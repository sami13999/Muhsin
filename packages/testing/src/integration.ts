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
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────────────

export interface TestDatabase {
  container?: StartedTestContainer;
  connectionString: string;
}

// ── State ──────────────────────────────────────────────────────

let _testDb: TestDatabase | null = null;

// ── Database Setup ─────────────────────────────────────────────

/**
 * Get or create an ephemeral test database.
 * Reuses the same container or external test database across tests in the same suite.
 */
export async function getTestDatabase(): Promise<TestDatabase> {
  if (_testDb) return _testDb;

  const testDbUrl = process.env['TEST_DATABASE_URL'];
  if (testDbUrl) {
    validateDisposableDatabase(testDbUrl);
    console.log(`[TestDB] Using verified disposable TEST_DATABASE_URL: ${connectionUri(testDbUrl)}`);
    _testDb = { connectionString: testDbUrl };
    await runMigrations(testDbUrl);
    return _testDb;
  }

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
function findMigrationsDir(): string {
  let current = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = join(current, 'supabase', 'migrations');
    if (existsSync(candidate)) return candidate;
    current = join(current, '..');
  }
  return join(process.cwd(), 'supabase', 'migrations');
}

async function runMigrations(connectionString: string): Promise<void> {
  console.log('[TestDB] Running migrations...');

  const migrationsDir = findMigrationsDir();
  const migrationFiles = existsSync(migrationsDir)
    ? readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    : [];

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

    // Ensure default partitions exist for active test execution on partitioned tables
    await client.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'wp' AND tablename = 'credit_ledger_entry_default') THEN
          CREATE TABLE wp.credit_ledger_entry_default PARTITION OF wp.credit_ledger_entry DEFAULT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'wp' AND tablename = 'interaction_timeline_default') THEN
          CREATE TABLE wp.interaction_timeline_default PARTITION OF wp.interaction_timeline DEFAULT;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'gcp' AND tablename = 'creator') THEN
          ALTER TABLE gcp.creator ADD COLUMN IF NOT EXISTS embedding TEXT;
        END IF;
      END $$;
    `);
  } finally {
    await client.end();
  }

  console.log('[TestDB] Migrations complete');
}

/**
 * Clean up the test database (truncate all tables).
 * Enforces strict safety validation, in-session DB name verification,
 * and only truncates isolated test schemas.
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (!_testDb) return;

  validateDisposableDatabase(_testDb.connectionString);
  console.log('[TestDB] Cleaning up test data...');

  const client = postgres(_testDb.connectionString);
  try {
    // In-session verification: verify connected database name and user directly from PostgreSQL session
    const currentDbRows = await client.unsafe<{ current_database: string; current_user: string }[]>(
      `SELECT current_database(), current_user`
    );
    const currentDbRow = currentDbRows[0];
    if (!currentDbRow) {
      throw new Error('[TestDB Safety Guard] Failed to verify current database in PostgreSQL session.');
    }

    const sessionDbName = currentDbRow.current_database.toLowerCase();
    const url = new URL(_testDb.connectionString);
    const expectedDbName = url.pathname.replace(/^\//, '').toLowerCase();

    if (sessionDbName !== expectedDbName) {
      throw new Error(
        `[TestDB Safety Guard] In-session database mismatch! Connected to "${sessionDbName}", expected "${expectedDbName}". Refusing destruction.`
      );
    }

    // Verify session database name strictly matches allowed test database pattern
    const isStrictTestDb =
      sessionDbName === 'mushin_test' ||
      sessionDbName === 'postgres_test' ||
      /^mushin_test_[a-z0-9_]+$/.test(sessionDbName) ||
      /^[a-z0-9_]+_test$/.test(sessionDbName);

    if (!isStrictTestDb) {
      throw new Error(
        `[TestDB Safety Guard] Connected session database "${sessionDbName}" is not a verified disposable database. Refusing destruction.`
      );
    }

    // Only truncate tables in test schemas (wp, gcp, platform)
    await client.unsafe(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT schemaname, tablename 
          FROM pg_tables 
          WHERE schemaname IN ('wp', 'gcp', 'platform')
        ) LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE';
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

  if (_testDb.container) {
    console.log('[TestDB] Stopping container...');
    await _testDb.container.stop();
  }
  _testDb = null;
  console.log('[TestDB] Database stopped');
}

// ── Helpers & Safety Guards ────────────────────────────────────

/**
 * Validate that a target database connection string points to a disposable test database.
 * Rejects production, shared development, or non-disposable databases.
 *
 * Rules:
 * 1. Unconditionally rejects matching production/staging DATABASE_URL or DIRECT_URL.
 * 2. Rejects cloud-managed database domains (supabase.co, neon.tech, aws.com, etc.).
 * 3. Rejects transaction pooler port 6543.
 * 4. Rejects databases with production keywords ('prod', 'staging', 'live', 'main', 'shared').
 * 5. Requires strict test naming pattern ('mushin_test', 'postgres_test', or ending in '_test'). Substrings like 'test' in 'mytestprod' are rejected.
 * 6. For remote hosts: requires ALLOW_REMOTE_TEST_DATABASE=true, host in ALLOWLISTED_REMOTE_TEST_HOSTS, and explicit CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION token.
 */
export function validateDisposableDatabase(connectionString: string): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch (err) {
    throw new Error(`[TestDB Safety Guard] Invalid connection string URL: ${err}`);
  }

  const hostname = url.hostname.toLowerCase();
  const dbName = url.pathname.replace(/^\//, '').toLowerCase();
  const port = url.port;

  // 1. Unconditionally reject matching production/shared environment URLs
  const prodDbUrl = process.env['DATABASE_URL'];
  const directDbUrl = process.env['DIRECT_URL'];
  if (prodDbUrl) {
    try {
      const prodUrl = new URL(prodDbUrl);
      if (
        (hostname === prodUrl.hostname.toLowerCase() && dbName === prodUrl.pathname.replace(/^\//, '').toLowerCase()) ||
        connectionString === prodDbUrl
      ) {
        throw new Error(
          `[TestDB Safety Guard] CRITICAL: Refusing to target active production/staging DATABASE_URL (${hostname}/${dbName}). ` +
          `Never run integration tests or migrations against configured application database!`
        );
      }
    } catch (e: any) {
      if (e.message.includes('CRITICAL')) throw e;
    }
  }
  if (directDbUrl) {
    try {
      const directUrl = new URL(directDbUrl);
      if (
        (hostname === directUrl.hostname.toLowerCase() && dbName === directUrl.pathname.replace(/^\//, '').toLowerCase()) ||
        connectionString === directDbUrl
      ) {
        throw new Error(
          `[TestDB Safety Guard] CRITICAL: Refusing to target active DIRECT_URL (${hostname}/${dbName}).`
        );
      }
    } catch (e: any) {
      if (e.message.includes('CRITICAL')) throw e;
    }
  }

  // 2. Reject known multi-tenant cloud managed database providers or poolers
  const forbiddenDomains = [
    'supabase.co',
    'supabase.com',
    'supabase.net',
    'neon.tech',
    'aws.com',
    'amazonaws.com',
    'rds.amazonaws.com',
    'render.com',
    'railway.app',
    'cockroachlabs.cloud',
    'cloud.google.com',
    'azure.com',
    'planetscale.com',
    'upstash.io',
  ];
  for (const domain of forbiddenDomains) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      throw new Error(
        `[TestDB Safety Guard] Refusing to target managed cloud database host "${hostname}". ` +
        `Managed cloud hosts are strictly forbidden for disposable test execution.`
      );
    }
  }

  // 3. Reject transaction pooler ports (e.g. Supavisor / PgBouncer port 6543)
  if (port === '6543') {
    throw new Error(
      `[TestDB Safety Guard] Refusing connection on port 6543 (transaction pooler). ` +
      `Test databases must be direct PostgreSQL instances supporting prepared statements and session configurations.`
    );
  }

  // 4. Strict Database Name Validation:
  // Must NOT contain production/shared markers
  const forbiddenNameKeywords = ['prod', 'production', 'live', 'main', 'master', 'stage', 'staging', 'shared', 'customer', 'audit'];
  for (const kw of forbiddenNameKeywords) {
    if (dbName.includes(kw)) {
      throw new Error(
        `[TestDB Safety Guard] Database name "${dbName}" contains forbidden keyword "${kw}". ` +
        `Target database must be strictly disposable.`
      );
    }
  }

  // Database name MUST strictly match disposable naming convention
  // e.g. "mushin_test", "postgres_test", or end strictly with "_test"
  const isStrictTestName =
    dbName === 'mushin_test' ||
    dbName === 'postgres_test' ||
    /^mushin_test_[a-z0-9_]+$/.test(dbName) ||
    /^[a-z0-9_]+_test$/.test(dbName);

  if (!isStrictTestName) {
    throw new Error(
      `[TestDB Safety Guard] Refusing to use database "${dbName}". ` +
      `Test database name MUST strictly follow disposable pattern (e.g. "mushin_test", "postgres_test", or ending in "_test"). ` +
      `Arbitrary database names containing substring "test" are rejected.`
    );
  }

  // 5. Host Validation & Remote Safeguards
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === 'host.docker.internal';

  if (!isLocalHost) {
    // Remote database targeting requires ALL three safeguards:
    // (a) ALLOW_REMOTE_TEST_DATABASE=true
    // (b) Host must be in explicit ALLOWLISTED_REMOTE_TEST_HOSTS
    // (c) Explicit confirmation token CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION="YES_DELETE_ALL_DATA_AT_${hostname}_${dbName}"
    const allowRemote = process.env['ALLOW_REMOTE_TEST_DATABASE'] === 'true';
    if (!allowRemote) {
      throw new Error(
        `[TestDB Safety Guard] Refusing to connect to remote host "${hostname}". ` +
        `Integration test targets must be local (localhost / 127.0.0.1).`
      );
    }

    const allowlistedHosts = (process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'] ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    if (!allowlistedHosts.includes(hostname)) {
      throw new Error(
        `[TestDB Safety Guard] Remote host "${hostname}" is not in ALLOWLISTED_REMOTE_TEST_HOSTS. ` +
        `Remote execution requires host to be explicitly allowlisted.`
      );
    }

    const expectedConfirmation = `YES_DELETE_ALL_DATA_AT_${hostname}_${dbName}`;
    const providedConfirmation = process.env['CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION'];
    if (providedConfirmation !== expectedConfirmation) {
      throw new Error(
        `[TestDB Safety Guard] Missing or invalid destruction confirmation token for remote target. ` +
        `Expected CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION="${expectedConfirmation}". ` +
        `An environment flag alone cannot make a remote target safe.`
      );
    }
  }
}

function connectionUri(uri: string): string {
  // Mask password in logs
  return uri.replace(/:([^@]+)@/, ':****@');
}

// ── Exports for direct SQL access ──────────────────────────────

/**
 * Execute a callback within an ephemeral direct postgres client connection.
 */
export async function withTestConnection<T>(
  fn: (client: postgres.Sql) => Promise<T>,
): Promise<T> {
  if (!_testDb) throw new Error('Test database not initialized');
  const client = postgres(_testDb.connectionString);
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Execute raw SQL statements within a single transaction with workspace-scoped RLS context.
 * Guarantees that set_config and queries execute on the exact same connection without leakage.
 */
export async function executeInWorkspaceTransaction(
  workspaceId: string,
  sqlStatements: string[],
): Promise<any[][]> {
  return await withTestConnection(async (client) => {
    return await client.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE mushin_app`);
      await tx.unsafe(`SELECT set_config('app.current_workspace_id', '${workspaceId}', true)`);
      const results: any[][] = [];
      for (const statement of sqlStatements) {
        const res = await tx.unsafe(statement);
        results.push(res as any[]);
      }
      return results;
    });
  });
}

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

