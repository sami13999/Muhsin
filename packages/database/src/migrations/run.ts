/**
 * Migration runner — executes raw SQL migration files from supabase/migrations/.
 * Usage: pnpm migrate
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getEnv } from '@mushin/config';
import postgres from 'postgres';

async function run() {
  const env = getEnv();
  const migrationsDir = join(import.meta.dirname, '../../../supabase/migrations');

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    // Create migration tracking table if not exists
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS platform._migrations (
        version     TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const applied = await sql<{ version: string }[]>`
      SELECT version FROM platform._migrations ORDER BY version
    `;
    const appliedSet = new Set(applied.map((r) => r.version));

    for (const file of files) {
      const version = file.replace('.sql', '');
      if (appliedSet.has(version)) {
        console.log(`  ✓ ${version} (already applied)`);
        continue;
      }

      const filePath = join(migrationsDir, file);
      const content = await readFile(filePath, 'utf-8');

      console.log(`  → Applying ${version}...`);
      await sql.unsafe(content);
      await sql`INSERT INTO platform._migrations (version) VALUES (${version})`;
      console.log(`  ✓ ${version} applied`);
    }

    console.log('All migrations applied.');
  } finally {
    await sql.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
