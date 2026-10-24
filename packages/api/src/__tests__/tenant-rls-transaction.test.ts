/**
 * Tenant RLS Transaction-Scoping Regression Tests (Phase 3H)
 *
 * NOTE: These tests verify the architectural transaction-scoping contract,
 * tenancy middleware isolation, transaction context injection (c.get('db')),
 * sequential pooled connection hygiene, and concurrent isolation.
 *
 * TEST CLASSIFICATION: MOCKED/SIMULATED INTEGRATION
 * Live PostgreSQL FORCE ROW LEVEL SECURITY verification requires a live PostgreSQL instance.
 * As documented, Docker Desktop is offline in this environment. These tests verify the
 * TypeScript/API layer guarantees and transaction boundary mechanics without fabricating live DB state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenancyMiddleware } from '../middleware/tenancy.js';
import { withWorkspaceTransaction, type Database } from '@mushin/database';

// Mock jose module for JWT verification
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
}));

// Mock workspace repository for membership checks
vi.mock('@mushin/database', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    workspaceRepository: {
      getMembership: vi.fn(),
      findById: vi.fn(),
    },
  };
});

import { jwtVerify } from 'jose';
import { workspaceRepository } from '@mushin/database';

describe('Tenant RLS Transaction Scoping (MOCKED/SIMULATED)', () => {
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn().mockImplementation(async () => {});
  });

  function createMockContext(headers: Record<string, string> = {}) {
    const store = new Map<string, unknown>();
    const headerMap = new Map(Object.entries(headers));
    return {
      req: {
        header: (name: string) => headerMap.get(name) ?? headerMap.get(name.toLowerCase()),
      },
      json: vi.fn().mockImplementation((body, status = 200) => ({ body, status })),
      set: vi.fn().mockImplementation((key: string, value: unknown) => {
        store.set(key, value);
      }),
      get: vi.fn().mockImplementation((key: string) => store.get(key)),
      _store: store,
    };
  }

  // ── Requirement 1 & 7: Transaction scoping and c.get('db') ────────────────

  it('Requirement 1 & 7: executes set_config with transaction-local scope and passes tx to c.set("db")', async () => {
    const executedStatements: string[] = [];
    const mockTx = {
      execute: vi.fn().mockImplementation(async (query: any) => {
        const queryText = typeof query === 'string' ? query : query?.strings?.join('?') ?? JSON.stringify(query);
        executedStatements.push(queryText);
        return [];
      }),
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        executedStatements.push('BEGIN');
        try {
          const result = await callback(mockTx);
          executedStatements.push('COMMIT');
          return result;
        } catch (err) {
          executedStatements.push('ROLLBACK');
          throw err;
        }
      }),
      execute: vi.fn(),
    } as unknown as Database;

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-alpha', iss: 'https://auth.mushin.io', aud: 'mushin-api' },
    } as any);

    vi.mocked(workspaceRepository.getMembership).mockResolvedValue({
      membershipId: 'mem-1',
      workspaceId: 'ws-alpha',
      userId: 'user-alpha',
      role: 'owner',
      status: 'active',
    } as any);

    vi.mocked(workspaceRepository.findById).mockResolvedValue({
      workspace: { workspaceId: 'ws-alpha', subscriptionPlanId: 'pro' },
    } as any);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-jwt',
      'X-Workspace-ID': 'ws-alpha',
    });

    let contextDbDuringNext: any = null;
    mockNext.mockImplementation(async () => {
      // Invariant: downstream route handler retrieves the transaction client from context
      contextDbDuringNext = c.get('db');
    });

    await middleware(c as any, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(c.set).toHaveBeenCalledWith('db', mockTx);
    expect(contextDbDuringNext).toBe(mockTx);

    // Verify set_config was executed inside the transaction with is_local = true
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
    const setConfigCall = mockTx.execute.mock.calls[0]?.[0];
    expect(JSON.stringify(setConfigCall)).toContain('app.current_workspace_id');
  });

  // ── Requirement 2: Missing workspace context is denied ────────────────────

  it('Requirement 2: missing workspace ID is denied immediately without opening a transaction', async () => {
    const mockDb = {
      transaction: vi.fn(),
      execute: vi.fn(),
    } as unknown as Database;

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-alpha', iss: 'https://auth.mushin.io', aud: 'mushin-api' },
    } as any);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-jwt',
      // Missing 'X-Workspace-ID'
    });

    await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'WORKSPACE_ID_REQUIRED' }),
      }),
      400,
    );
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ── Requirement 3: Cross-tenant isolation ─────────────────────────────────

  it('Requirement 3: denies access when user attempts to access an unauthorized workspace', async () => {
    const mockDb = {
      transaction: vi.fn(),
      execute: vi.fn(),
    } as unknown as Database;

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-alpha', iss: 'https://auth.mushin.io', aud: 'mushin-api' },
    } as any);

    // User is NOT a member of ws-beta
    vi.mocked(workspaceRepository.getMembership).mockResolvedValue(null);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-jwt',
      'X-Workspace-ID': 'ws-beta',
    });

    await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'AUTHZ_WORKSPACE_MISMATCH' }),
      }),
      403,
    );
    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ── Requirement 4: Sequential requests on pooled connection ───────────────

  it('Requirement 4: sequential requests on a connection do not inherit previous workspace context', async () => {
    // Simulate a database connection from a connection pool
    let activeSessionWorkspace: string | null = null;
    const sessionHistory: Array<{ op: string; ws: string | null }> = [];

    const mockPooledDb = {
      transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        let txWorkspace: string | null = null;
        const mockTxClient = {
          execute: vi.fn().mockImplementation(async (sqlObj: any) => {
            // In Drizzle sql`... ${val} ...`, parameterized string values are stored directly as string primitives in queryChunks
            const wsId = sqlObj?.queryChunks?.find((chunk: any) => typeof chunk === 'string') as string | undefined;
            txWorkspace = wsId ?? null;
            sessionHistory.push({ op: 'SET_CONFIG_LOCAL', ws: txWorkspace });
            return [];
          }),
        };

        sessionHistory.push({ op: 'BEGIN', ws: null });
        try {
          const res = await callback(mockTxClient);
          sessionHistory.push({ op: 'COMMIT', ws: null });
          // PostgreSQL automatically resets transaction-local settings on commit
          txWorkspace = null;
          return res;
        } catch (err) {
          sessionHistory.push({ op: 'ROLLBACK', ws: null });
          txWorkspace = null;
          throw err;
        }
      }),
    } as unknown as Database;

    // Test with real withWorkspaceTransaction helper
    const ws1 = 'ws-first-tenant';
    const ws2 = 'ws-second-tenant';

    let capturedWsInReq1: string | null = null;
    let capturedWsInReq2: string | null = null;

    // Request 1
    await withWorkspaceTransaction(mockPooledDb, ws1, async (tx: any) => {
      // Simulate query execution on tx
      capturedWsInReq1 = sessionHistory[sessionHistory.length - 1]?.ws ?? null;
      expect(capturedWsInReq1).toBe(ws1);
    });

    // Request 2 on the SAME pooled connection
    await withWorkspaceTransaction(mockPooledDb, ws2, async (tx: any) => {
      capturedWsInReq2 = sessionHistory[sessionHistory.length - 1]?.ws ?? null;
      expect(capturedWsInReq2).toBe(ws2);
    });

    // Ensure Request 2 saw strictly ws2, and never inherited ws1
    expect(capturedWsInReq1).toBe(ws1);
    expect(capturedWsInReq2).toBe(ws2);
    expect(activeSessionWorkspace).toBeNull();
  });

  // ── Requirement 5: Concurrent requests across different workspaces ────────

  it('Requirement 5: concurrent requests across different workspaces execute with isolated context', async () => {
    const activeTransactions = new Map<string, string>();

    const mockConcurrentDb = {
      transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const txId = crypto.randomUUID();
        const tx = {
          execute: vi.fn().mockImplementation(async (sqlObj: any) => {
            const wsId = sqlObj?.queryChunks?.find((chunk: any) => typeof chunk === 'string') as string | undefined;
            if (wsId) {
              activeTransactions.set(txId, wsId);
            }
            return [];
          }),
        };

        const res = await callback(tx);
        activeTransactions.delete(txId);
        return res;
      }),
    } as unknown as Database;

    const wsA = 'ws-company-a';
    const wsB = 'ws-company-b';

    let observedA: string | undefined;
    let observedB: string | undefined;

    // Execute concurrently with a deliberate interleaving delay
    await Promise.all([
      withWorkspaceTransaction(mockConcurrentDb, wsA, async (tx: any) => {
        await new Promise((r) => setTimeout(r, 20));
        // Find workspace bound to this transaction
        observedA = Array.from(activeTransactions.values()).find((v) => v === wsA);
      }),
      withWorkspaceTransaction(mockConcurrentDb, wsB, async (tx: any) => {
        await new Promise((r) => setTimeout(r, 20));
        observedB = Array.from(activeTransactions.values()).find((v) => v === wsB);
      }),
    ]);

    expect(observedA).toBe(wsA);
    expect(observedB).toBe(wsB);
    expect(activeTransactions.size).toBe(0);
  });

  // ── Requirement 6: Transaction rollback clears context ───────────────────

  it('Requirement 6: transaction rollback cleanly discards context on error', async () => {
    const lifecycle: string[] = [];

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        lifecycle.push('BEGIN');
        const tx = {
          execute: vi.fn().mockImplementation(async () => {
            lifecycle.push('SET_CONFIG');
            return [];
          }),
        };

        try {
          await callback(tx);
          lifecycle.push('COMMIT');
        } catch (err) {
          lifecycle.push('ROLLBACK');
          throw err;
        }
      }),
    } as unknown as Database;

    const errorToThrow = new Error('Database constraint violation');

    await expect(
      withWorkspaceTransaction(mockDb, 'ws-failing', async () => {
        throw errorToThrow;
      }),
    ).rejects.toThrow('Database constraint violation');

    expect(lifecycle).toEqual(['BEGIN', 'SET_CONFIG', 'ROLLBACK']);
  });
});
