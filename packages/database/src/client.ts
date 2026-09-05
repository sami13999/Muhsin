/**
 * Database client — singleton postgres connection with Drizzle ORM.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as gcpSchema from './schema/gcp/index.js';
import * as wpSchema from './schema/wp/index.js';
import * as platformSchema from './schema/platform/index.js';
import * as enums from './schema/enums/index.js';

const allSchemas = { ...gcpSchema, ...wpSchema, ...platformSchema, ...enums };

let _db: ReturnType<typeof drizzle<typeof allSchemas>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export function getDb(connectionString: string) {
  if (_db) return _db;
  _client = postgres(connectionString, {
    max: 10,
    prepare: true,
  });
  _db = drizzle(_client, { schema: allSchemas });
  return _db;
}

export type Database = ReturnType<typeof getDb>;
