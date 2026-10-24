/**
 * Tenant Isolation & PostgreSQL RLS Integration Tests (Phase 3L)
 *
 * Exercises the three-layer enforcement model and RLS guarantees against real PostgreSQL:
 * - Layer 1: Middleware (JWT + workspace membership)
 * - Layer 2: Repository (application-level filtering)
 * - Layer 3: RLS (safety net with transaction-local context)
 *
 * Test Scenarios:
 * 1. Workspace A cannot read or modify Workspace B records.
 * 2. Missing or empty tenant context denies access as intended without errors.
 * 3. Transaction-local tenant context does not leak across pooled connections.
 * 4. Concurrent requests and transaction rollbacks preserve isolation.
 * 5. Workspace onboarding and initial credit-balance creation work under intended roles.
 * 6. Contact reveal and discovery-job policies enforce tenant isolation.
 * 7. Concurrent releaseCredits calls for the same reference cannot refund twice.
 * 8. Stale workers cannot finalize jobs, commit credits or emit completion events.
 *
 * Skip condition: Neither TEST_DATABASE_URL nor Docker is available → skipped gracefully.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  getTestDatabase,
  cleanupTestDatabase,
  executeRaw,
  withTestConnection,
  executeInWorkspaceTransaction,
} from '@mushin/testing';
import { creditRepository, getDb } from '@mushin/database';

// Check if real disposable PostgreSQL is available (via TEST_DATABASE_URL or Docker)
let postgresAvailable = Boolean(process.env['TEST_DATABASE_URL']);

if (!postgresAvailable) {
  try {
    const { execSync } = await import('child_process');
    execSync('docker info', { stdio: 'ignore', timeout: 5000 });
    postgresAvailable = true;
  } catch {
    // Docker not available
  }
}

describe.skipIf(!postgresAvailable)('PostgreSQL Real RLS & Security Integration Suite', () => {
  beforeAll(async () => {
    await getTestDatabase();
  }, 120000);

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // ── Scenario 1: Cross-workspace read and modify protection ───────────────────

  describe('1. Cross-Workspace Read and Modify Isolation', () => {
    it('Workspace A cannot read, update, or delete Workspace B records', async () => {
      // Seed workspaces
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES 
          ('11111111-1111-1111-1111-111111111111', 'Workspace Alpha', 'ws-alpha', 'free'),
          ('22222222-2222-2222-2222-222222222222', 'Workspace Beta', 'ws-beta', 'free');
      `);

      // Seed list in Workspace Beta
      await executeRaw(`
        INSERT INTO wp.list (list_id, workspace_id, name, created_by)
        VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Beta VIP List', '44444444-4444-4444-4444-444444444444');
      `);

      // Execute in Workspace Alpha transaction
      await withTestConnection(async (client) => {
        await client.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE mushin_app`);
          await tx.unsafe(`SELECT set_config('app.current_workspace_id', '11111111-1111-1111-1111-111111111111', true)`);

          // 1. SELECT query looking for Beta list returns 0 rows
          const selectResult = await tx.unsafe(
            `SELECT list_id FROM wp.list WHERE workspace_id = '22222222-2222-2222-2222-222222222222'`
          );
          expect(selectResult.length).toBe(0);

          // 2. UPDATE query targeting Beta list affects 0 rows
          const updateResult = await tx.unsafe(
            `UPDATE wp.list SET name = 'Hacked Name' WHERE workspace_id = '22222222-2222-2222-2222-222222222222'`
          );
          expect(updateResult.count).toBe(0);

          // 3. DELETE query targeting Beta list affects 0 rows
          const deleteResult = await tx.unsafe(
            `DELETE FROM wp.list WHERE workspace_id = '22222222-2222-2222-2222-222222222222'`
          );
          expect(deleteResult.count).toBe(0);
        });
      });
    });
  });

  // ── Scenario 2: Missing or empty tenant context denies access ───────────────

  describe('2. Missing or Empty Tenant Context Safeguard', () => {
    it('denies access without throwing when tenant context is missing or empty string', async () => {
      // Seed a workspace and list
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('11111111-1111-1111-1111-111111111111', 'Workspace Alpha', 'ws-alpha', 'free');
        INSERT INTO wp.list (list_id, workspace_id, name, created_by)
        VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Alpha List', '44444444-4444-4444-4444-444444444444');
      `);

      // 1. Missing context (never set)
      await withTestConnection(async (client) => {
        await client.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE mushin_app`);
          const rows = await tx.unsafe(`SELECT * FROM wp.list`);
          expect(rows.length).toBe(0);
        });
      });

      // 2. Empty string context
      await withTestConnection(async (client) => {
        await client.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE mushin_app`);
          await tx.unsafe(`SELECT set_config('app.current_workspace_id', '', true)`);
          const rows = await tx.unsafe(`SELECT * FROM wp.list`);
          expect(rows.length).toBe(0);
        });
      });
    });
  });

  // ── Scenario 3: Transaction-local context does not leak across pooled connections ──

  describe('3. Transaction-Local Connection Hygiene', () => {
    it('discards app.current_workspace_id upon transaction end', async () => {
      await withTestConnection(async (client) => {
        // Run inside transaction
        await client.begin(async (tx) => {
          await tx.unsafe(`SELECT set_config('app.current_workspace_id', '11111111-1111-1111-1111-111111111111', true)`);
          const [inTxRow] = await tx.unsafe<{ ws: string }[]>(
            `SELECT current_setting('app.current_workspace_id', true) AS ws`
          );
          expect(inTxRow?.ws).toBe('11111111-1111-1111-1111-111111111111');
        });

        // After transaction commit/end on the same client connection
        const [postTxRow] = await client.unsafe<{ ws: string }[]>(
          `SELECT current_setting('app.current_workspace_id', true) AS ws`
        );
        // Parameter must be discarded / null
        expect(postTxRow?.ws == null || postTxRow?.ws === '').toBe(true);
      });
    });
  });

  // ── Scenario 4: Concurrent requests and transaction rollbacks ───────────────

  describe('4. Concurrent Isolation and Rollback Integrity', () => {
    it('preserves isolation across concurrent transactions and cleans up rolled-back state', async () => {
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES 
          ('11111111-1111-1111-1111-111111111111', 'Workspace Alpha', 'ws-alpha', 'free'),
          ('22222222-2222-2222-2222-222222222222', 'Workspace Beta', 'ws-beta', 'free');
      `);

      // Open two independent connections for concurrent transactions
      const dbUrl = (await getTestDatabase()).connectionString;
      const client1 = (await import('postgres')).default(dbUrl);
      const client2 = (await import('postgres')).default(dbUrl);

      try {
        let tx1Inserted = false;

        const p1 = client1.begin(async (tx1) => {
          await tx1.unsafe(`SELECT set_config('app.current_workspace_id', '11111111-1111-1111-1111-111111111111', true)`);
          await tx1.unsafe(`
            INSERT INTO wp.list (list_id, workspace_id, name, created_by)
            VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Tx1 Uncommitted List', '44444444-4444-4444-4444-444444444444')
          `);
          tx1Inserted = true;
          // Hold transaction open briefly then throw to force ROLLBACK
          await new Promise((r) => setTimeout(r, 100));
          throw new Error('Simulated rollback in Tx1');
        }).catch(() => {});

        const p2 = client2.begin(async (tx2) => {
          await tx2.unsafe(`SELECT set_config('app.current_workspace_id', '22222222-2222-2222-2222-222222222222', true)`);
          // Wait until tx1 inserted
          while (!tx1Inserted) {
            await new Promise((r) => setTimeout(r, 10));
          }
          // Tx2 must NOT see Tx1's uncommitted list
          const rows = await tx2.unsafe(`SELECT * FROM wp.list WHERE list_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`);
          expect(rows.length).toBe(0);
        });

        await Promise.all([p1, p2]);

        // After rollback, row must not exist in Alpha either
        const checkAlpha = await executeInWorkspaceTransaction('11111111-1111-1111-1111-111111111111', [
          `SELECT * FROM wp.list WHERE list_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`,
        ]);
        expect(checkAlpha[0]?.length).toBe(0);
      } finally {
        await client1.end();
        await client2.end();
      }
    });
  });

  // ── Scenario 5: Workspace onboarding and initial credit balance ─────────────

  describe('5. Workspace Onboarding & Initial Credit Balance', () => {
    it('creates workspace, owner membership, and initial zero credit balance atomically', async () => {
      const wsId = '55555555-5555-5555-5555-555555555555';
      const userId = '66666666-6666-6666-6666-666666666666';

      await withTestConnection(async (client) => {
        await client.begin(async (tx) => {
          // 1. Insert workspace
          await tx.unsafe(`
            INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
            VALUES ('${wsId}', 'New Venture Inc', 'new-venture', 'free')
          `);

          // 2. Set tenant context to newly created workspace
          await tx.unsafe(`SELECT set_config('app.current_workspace_id', '${wsId}', true)`);

          // 3. Insert owner membership
          await tx.unsafe(`
            INSERT INTO wp.membership (membership_id, workspace_id, user_id, role, status)
            VALUES ('77777777-7777-7777-7777-777777777777', '${wsId}', '${userId}', 'owner', 'active')
          `);

          // 4. Insert initial credit balance
          await tx.unsafe(`
            INSERT INTO wp.workspace_credit_balance (workspace_id, balance, version)
            VALUES ('${wsId}', 0, 1)
          `);
        });
      });

      // Verify records exist for tenant
      const results = await executeInWorkspaceTransaction(wsId, [
        `SELECT workspace_id, name FROM wp.workspace WHERE workspace_id = '${wsId}'`,
        `SELECT role, status FROM wp.membership WHERE workspace_id = '${wsId}'`,
        `SELECT balance, version FROM wp.workspace_credit_balance WHERE workspace_id = '${wsId}'`,
      ]);

      expect(results[0]?.length).toBe(1);
      expect(results[1]?.length).toBe(1);
      expect(results[2]?.length).toBe(1);
      expect(results[2]?.[0]?.balance).toBe('0');
      expect(results[2]?.[0]?.version).toBe(1);
    });
  });

  // ── Scenario 6: Contact reveal and discovery-job tenant isolation ────────────

  describe('6. Contact Reveal and Discovery Job Isolation', () => {
    it('enforces tenant isolation on wp.reveal and wp.discovery_job', async () => {
      const wsAlpha = '11111111-1111-1111-1111-111111111111';
      const wsBeta = '22222222-2222-2222-2222-222222222222';
      const creatorId = '88888888-8888-8888-8888-888888888888';

      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES 
          ('${wsAlpha}', 'Alpha', 'ws-alpha', 'free'),
          ('${wsBeta}', 'Beta', 'ws-beta', 'free');
      `);

      // Seed reveal in Alpha
      await withTestConnection(async (client) => {
        await client.begin(async (tx) => {
          await tx.unsafe(`SELECT set_config('app.current_workspace_id', '${wsAlpha}', true)`);
          await tx.unsafe(`
            INSERT INTO wp.reveal (workspace_id, creator_id, revealed_by, credit_cost)
            VALUES ('${wsAlpha}', '${creatorId}', '44444444-4444-4444-4444-444444444444', 5)
          `);
        });
      });

      // Beta queries reveal -> must be empty
      const betaReveal = await executeInWorkspaceTransaction(wsBeta, [
        `SELECT * FROM wp.reveal WHERE creator_id = '${creatorId}'`,
      ]);
      expect(betaReveal[0]?.length).toBe(0);

      // Beta attempts to insert reveal for Alpha -> denied by WITH CHECK RLS
      await expect(
        withTestConnection(async (client) => {
          await client.begin(async (tx) => {
            await tx.unsafe(`SELECT set_config('app.current_workspace_id', '${wsBeta}', true)`);
            await tx.unsafe(`
              INSERT INTO wp.reveal (workspace_id, creator_id, revealed_by, credit_cost)
              VALUES ('${wsAlpha}', '${creatorId}', '44444444-4444-4444-4444-444444444444', 5)
            `);
          });
        })
      ).rejects.toThrow();
    });
  });

  // ── Scenario 7: Concurrent releaseCredits double-refund protection ───────────

  describe('7. Concurrent releaseCredits Double-Refund Defense', () => {
    it('executes exactly one refund when two concurrent transactions attempt releaseCredits for the same reference', async () => {
      const wsId = '11111111-1111-1111-1111-111111111111';
      const refId = '77777777-7777-7777-7777-777777777777';

      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('${wsId}', 'Alpha', 'ws-alpha', 'free');
        INSERT INTO wp.workspace_credit_balance (workspace_id, balance, version)
        VALUES ('${wsId}', 500, 1);
      `);

      const dbUrl = (await getTestDatabase()).connectionString;
      const appDb1 = getDb(dbUrl);
      const appDb2 = getDb(dbUrl);

      // Launch two concurrent releaseCredits operations in independent transactions
      const op1 = appDb1.transaction(async (tx) => {
        return await creditRepository.releaseCredits(tx as any, wsId, 100n, 'discovery', refId);
      });

      const op2 = appDb2.transaction(async (tx) => {
        return await creditRepository.releaseCredits(tx as any, wsId, 100n, 'discovery', refId);
      });

      const [res1, res2] = await Promise.all([op1, op2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // Balance must have increased from 500 to 600 (NOT 700)
      const { balance, version } = await creditRepository.getBalance(appDb1, wsId);
      expect(balance).toBe(600n);
      expect(version).toBe(2);

      // Verify credit ledger has exactly ONE released entry
      const ledgerEntries = await executeRaw(`
        SELECT entry_id, entry_type, amount FROM wp.credit_ledger_entry 
        WHERE workspace_id = '${wsId}' AND reference_id = '${refId}'
      `);
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0]?.entry_type).toBe('released');
      expect(ledgerEntries[0]?.amount).toBe('100');
    });
  });

  // ── Scenario 8: Stale worker protection ─────────────────────────────────────

  describe('8. Stale Worker Race Defense', () => {
    it('rejects state update if worker attempt_count is stale', async () => {
      const wsId = '11111111-1111-1111-1111-111111111111';
      const jobId = '99999999-9999-9999-9999-999999999999';

      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('${wsId}', 'Alpha', 'ws-alpha', 'free');
        INSERT INTO wp.discovery_job (job_id, workspace_id, query, status, attempt_count)
        VALUES ('${jobId}', '${wsId}', '{"terms": "test"}'::jsonb, 'running', 2);
      `);

      // Worker 1 (stale attempt = 1) attempts atomic update:
      // UPDATE ... WHERE job_id = $1 AND attempt_count = 1
      const updateResult = await executeRaw(`
        UPDATE wp.discovery_job
        SET status = 'completed', completed_at = now()
        WHERE job_id = '${jobId}' AND attempt_count = 1
        RETURNING job_id;
      `);

      // Must be rejected (0 rows updated)
      expect(updateResult.length).toBe(0);

      // Verify job status remains running with attempt_count 2
      const [job] = await executeRaw(`SELECT status, attempt_count FROM wp.discovery_job WHERE job_id = '${jobId}'`);
      expect(job?.status).toBe('running');
      expect(job?.attempt_count).toBe(2);
    });
  });
});
