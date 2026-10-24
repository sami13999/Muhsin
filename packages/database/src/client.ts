/**
 * Database client — singleton postgres connection with Drizzle ORM.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as gcpSchema from './schema/gcp/index.js';
import * as wpSchema from './schema/wp/index.js';
import * as platformSchema from './schema/platform/index.js';
import * as enums from './schema/enums/index.js';

const allSchemas = { ...gcpSchema, ...wpSchema, ...platformSchema, ...enums };

let _db: ReturnType<typeof drizzle<typeof allSchemas>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function shouldPrepare(connectionString: string): boolean {
  if (process.env['DATABASE_PREPARE'] === 'false') return false;
  try {
    const u = new URL(connectionString);
    if (u.port === '6543') return false;
  } catch {}
  return true;
}

export function getDb(connectionString: string) {
  if (_db) return _db;
  _client = postgres(connectionString, {
    max: 10,
    prepare: shouldPrepare(connectionString),
  });
  _db = drizzle(_client, { schema: allSchemas });
  return _db;
}

export type Database = ReturnType<typeof getDb>;

/**
 * Execute an operation within an explicit database transaction with workspace-scoped RLS.
 *
 * Uses `SELECT set_config('app.current_workspace_id', $wsId, true)` (is_local = true)
 * strictly within the transaction block. Upon commit or rollback, the setting is
 * automatically discarded by PostgreSQL, ensuring zero cross-connection leakage.
 */
export async function withWorkspaceTransaction<T>(
  db: Database,
  workspaceId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`
    );
    return await fn(tx as unknown as Database);
  });
}

