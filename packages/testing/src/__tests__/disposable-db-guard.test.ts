/**
 * Disposable Database Safety Guard Tests
 *
 * Verifies that validateDisposableDatabase strictly prevents targeting
 * production, staging, shared cloud, or non-disposable databases.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateDisposableDatabase } from '../integration.js';

describe('validateDisposableDatabase Safety Guards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['ALLOW_REMOTE_TEST_DATABASE'];
    delete process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'];
    delete process.env['CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepts valid local disposable test database', () => {
    expect(() => {
      validateDisposableDatabase('postgresql://postgres:postgres@localhost:5432/mushin_test');
    }).not.toThrow();

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:postgres@127.0.0.1:5432/mushin_test_worker');
    }).not.toThrow();

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:postgres@127.0.0.1:5432/postgres_test');
    }).not.toThrow();

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:postgres@127.0.0.1:5432/custom_run_test');
    }).not.toThrow();
  });

  it('unconditionally rejects configured production DATABASE_URL or DIRECT_URL', () => {
    process.env['DATABASE_URL'] = 'postgresql://postgres:secret@db.yknpqhrxutxpcrlscont.supabase.co:5432/postgres';
    process.env['DIRECT_URL'] = 'postgresql://user:secret@direct.internal.net:5432/mushin_test';

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:secret@db.yknpqhrxutxpcrlscont.supabase.co:5432/postgres');
    }).toThrow(/CRITICAL: Refusing to target active production\/staging DATABASE_URL/);

    expect(() => {
      validateDisposableDatabase('postgresql://user:secret@direct.internal.net:5432/mushin_test');
    }).toThrow(/CRITICAL: Refusing to target active DIRECT_URL/);
  });

  it('rejects cloud managed database providers regardless of flags', () => {
    process.env['ALLOW_REMOTE_TEST_DATABASE'] = 'true';
    process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'] = 'db.myproject.supabase.co';
    process.env['CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION'] = 'YES_DELETE_ALL_DATA_AT_db.myproject.supabase.co_mushin_test';

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@db.myproject.supabase.co:5432/mushin_test');
    }).toThrow(/Refusing to target managed cloud database host/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@ep-tiny-123.us-east-2.aws.neon.tech:5432/mushin_test');
    }).toThrow(/Refusing to target managed cloud database host/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@database-1.cxyz123.rds.amazonaws.com:5432/mushin_test');
    }).toThrow(/Refusing to target managed cloud database host/);
  });

  it('rejects transaction pooler port 6543', () => {
    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:6543/mushin_test');
    }).toThrow(/Refusing connection on port 6543/);
  });

  it('rejects database names containing production or shared keywords', () => {
    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/mushin_prod_test');
    }).toThrow(/contains forbidden keyword "prod"/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/test_staging_db_test');
    }).toThrow(/contains forbidden keyword "stag/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/shared_mushin_test');
    }).toThrow(/contains forbidden keyword "shared"/);
  });

  it('rejects database names that merely contain the substring "test" without proper format', () => {
    // "contest", "attestation", "mytestapp", "testing123" are not valid disposable test names
    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/contest');
    }).toThrow(/MUST strictly follow disposable pattern/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/attestation');
    }).toThrow(/MUST strictly follow disposable pattern/);

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@127.0.0.1:5432/testing123');
    }).toThrow(/MUST strictly follow disposable pattern/);
  });

  it('rejects remote database if ALLOW_REMOTE_TEST_DATABASE is not true', () => {
    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@internal-ci-runner.local:5432/mushin_test');
    }).toThrow(/Refusing to connect to remote host/);
  });

  it('rejects remote database if host is not allowlisted', () => {
    process.env['ALLOW_REMOTE_TEST_DATABASE'] = 'true';
    process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'] = 'ci-runner-alpha.local,ci-runner-beta.local';

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@unlisted-remote-server.local:5432/mushin_test');
    }).toThrow(/is not in ALLOWLISTED_REMOTE_TEST_HOSTS/);
  });

  it('rejects remote database if destruction confirmation token is missing or mismatched', () => {
    process.env['ALLOW_REMOTE_TEST_DATABASE'] = 'true';
    process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'] = 'ci-runner-alpha.local';
    process.env['CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION'] = 'WRONG_CONFIRMATION_STRING';

    expect(() => {
      validateDisposableDatabase('postgresql://postgres:pwd@ci-runner-alpha.local:5432/mushin_test');
    }).toThrow(/Missing or invalid destruction confirmation token/);
  });

  it('accepts remote database only when all three remote safety safeguards are verified', () => {
    const host = 'ci-disposable-db.corp.internal';
    const db = 'mushin_test';
    process.env['ALLOW_REMOTE_TEST_DATABASE'] = 'true';
    process.env['ALLOWLISTED_REMOTE_TEST_HOSTS'] = `other.corp.internal,${host}`;
    process.env['CONFIRM_DISPOSABLE_DATABASE_DESTRUCTION'] = `YES_DELETE_ALL_DATA_AT_${host}_${db}`;

    expect(() => {
      validateDisposableDatabase(`postgresql://postgres:pwd@${host}:5432/${db}`);
    }).not.toThrow();
  });
});
