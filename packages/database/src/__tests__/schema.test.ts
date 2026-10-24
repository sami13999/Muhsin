import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { creator, profile, risingScoreCache, trendingScoreCache } from '../schema/gcp/index.js';
import { getTableColumns } from 'drizzle-orm';

describe('GCP Schema Definitions (Step 2A / 2A.1)', () => {
  it('should have audienceDemographics column on profile matching V014', () => {
    const columns = getTableColumns(profile);
    expect(columns).toHaveProperty('audienceDemographics');
    expect(columns.audienceDemographics.name).toBe('audience_demographics');
  });

  it('should have indexPending and minorSignal columns on creator', () => {
    const columns = getTableColumns(creator);
    expect(columns).toHaveProperty('indexPending');
    expect(columns.indexPending.name).toBe('index_pending');
    expect(columns).toHaveProperty('minorSignal');
    expect(columns.minorSignal.name).toBe('minor_signal');
  });

  it('should export risingScoreCache table matching V014 with valid B-tree expires_at index', () => {
    const columns = getTableColumns(risingScoreCache);
    expect(columns).toHaveProperty('creatorId');
    expect(columns.creatorId.name).toBe('creator_id');
    expect(columns).toHaveProperty('score');
    expect(columns).toHaveProperty('inputs');
    expect(columns).toHaveProperty('computedAt');
    expect(columns).toHaveProperty('expiresAt');
  });

  it('should export trendingScoreCache table matching V014 with valid B-tree expires_at index', () => {
    const columns = getTableColumns(trendingScoreCache);
    expect(columns).toHaveProperty('creatorId');
    expect(columns.creatorId.name).toBe('creator_id');
    expect(columns).toHaveProperty('score');
    expect(columns).toHaveProperty('inputs');
    expect(columns).toHaveProperty('trendDirection');
    expect(columns).toHaveProperty('computedAt');
    expect(columns).toHaveProperty('expiresAt');
  });
});

describe('SQL Migrations Replay & Index Safety (Step 2A.1)', () => {
  const migrationsDir = join(__dirname, '../../../../supabase/migrations');

  it('should locate all 14 migration files and detect V012 sequence gap', async () => {
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // V001 to V017 (excluding V012) = 16 migration files
    expect(files.length).toBe(16);
    expect(files.some((f) => f.startsWith('V011'))).toBe(true);
    expect(files.some((f) => f.startsWith('V012'))).toBe(false); // Known sequence gap
    expect(files.some((f) => f.startsWith('V013'))).toBe(true);
    expect(files.some((f) => f.startsWith('V014'))).toBe(true);
    expect(files.some((f) => f.startsWith('V015'))).toBe(true);
    expect(files.some((f) => f.startsWith('V016'))).toBe(true);
    expect(files.some((f) => f.startsWith('V017'))).toBe(true);
  });

  it('should verify V002 creates idx_creator_index_pending on gcp.creator and NOT gcp.profile', async () => {
    const v002Content = await readFile(join(migrationsDir, 'V002__gcp_schema.sql'), 'utf-8');

    // Confirm invalid statement is gone from V002
    expect(v002Content.includes('CREATE INDEX idx_profile_index_pending\n    ON gcp.profile')).toBe(false);

    // Confirm valid statement on gcp.creator exists
    expect(v002Content.includes('CREATE INDEX IF NOT EXISTS idx_creator_index_pending')).toBe(true);
    expect(v002Content.includes('ON gcp.creator (index_pending)')).toBe(true);
  });

  it('should verify V014 defines cache expiry indexes without non-immutable NOW() predicate', async () => {
    const v014Content = await readFile(join(migrationsDir, 'V014__search_evolution.sql'), 'utf-8');

    // Confirm non-immutable NOW() index predicate is completely removed
    expect(v014Content.includes('WHERE expires_at > NOW()')).toBe(false);

    // Confirm standard B-tree index on expires_at exists for both cache tables
    expect(v014Content.includes('CREATE INDEX IF NOT EXISTS idx_rising_score_expires')).toBe(true);
    expect(v014Content.includes('ON gcp.rising_score_cache (expires_at)')).toBe(true);
    expect(v014Content.includes('CREATE INDEX IF NOT EXISTS idx_trending_score_expires')).toBe(true);
    expect(v014Content.includes('ON gcp.trending_score_cache (expires_at)')).toBe(true);
  });

  it('should verify V015 forward migration contains safe index statements for deployed environments', async () => {
    const v015Content = await readFile(join(migrationsDir, 'V015__fix_creator_index_pending.sql'), 'utf-8');

    // 1. Idempotent index on creator
    expect(v015Content.includes('CREATE INDEX IF NOT EXISTS idx_creator_index_pending')).toBe(true);
    expect(v015Content.includes('ON gcp.creator (index_pending)')).toBe(true);

    // 2. Drop profile index if present
    expect(v015Content.includes('DROP INDEX IF EXISTS gcp.idx_profile_index_pending;')).toBe(true);

    // 3. Cache expiry indexes without NOW()
    expect(v015Content.includes('CREATE INDEX IF NOT EXISTS idx_rising_score_expires')).toBe(true);
    expect(v015Content.includes('CREATE INDEX IF NOT EXISTS idx_trending_score_expires')).toBe(true);
    expect(v015Content.includes('NOW()')).toBe(false);
  });

  it('should ensure no migration in supabase/migrations uses changing-time predicates in index definitions', async () => {
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'));

    for (const file of files) {
      const content = await readFile(join(migrationsDir, file), 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line && (line.includes('CREATE INDEX') || line.includes('WHERE'))) {
          // Check if index WHERE clause references NOW()
          if (/WHERE.*NOW\(\)/i.test(line)) {
            throw new Error(`File ${file} line ${i + 1} contains illegal non-immutable function NOW() in index predicate: ${line}`);
          }
        }
      }
    }
  });
});
