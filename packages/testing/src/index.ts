/**
 * @mushin/testing — Test utilities and helpers.
 * Provides factories for DB, adapters, JWT, and event assertions.
 *
 * NOTE: vi.fn() helpers must be called at test time, not import time.
 * Use createMockXxx() factories inside your test setup.
 */

// ── Mock Database Factory ─────────────────────────────────────

export interface MockDatabase {
  select: () => MockQuery;
  insert: () => MockInsert;
  update: () => MockUpdate;
  delete: () => MockDelete;
  transaction: (fn: (tx: MockDatabase) => Promise<void>) => Promise<void>;
  execute: (query: unknown) => Promise<unknown[]>;
}

interface MockQuery {
  from: () => MockQuery;
  where: () => MockQuery;
  limit: () => MockQuery;
  offset: () => MockQuery;
  orderBy: () => MockQuery;
  leftJoin: () => MockQuery;
  innerJoin: () => MockQuery;
  then: (resolve: (value: unknown[]) => void) => void;
}

interface MockInsert {
  values: () => Promise<{ rowCount: number }>;
  onConflictDoNothing: () => Promise<{ rowCount: number }>;
}

interface MockUpdate {
  set: () => MockUpdate;
  where: () => Promise<{ rowCount: number }>;
}

interface MockDelete {
  where: () => Promise<{ rowCount: number }>;
}

/**
 * Creates a mock database for unit tests.
 * Returns empty arrays/results by default; override per-test as needed.
 */
export function createMockDatabase(): MockDatabase {
  const mockQuery: MockQuery = {
    from: () => mockQuery,
    where: () => mockQuery,
    limit: () => mockQuery,
    offset: () => mockQuery,
    orderBy: () => mockQuery,
    leftJoin: () => mockQuery,
    innerJoin: () => mockQuery,
    then: (resolve) => resolve([]),
  };

  const mockUpdate: MockUpdate = {
    set: () => mockUpdate,
    where: async () => ({ rowCount: 1 }),
  };

  return {
    select: () => mockQuery,
    insert: () => ({
      values: async () => ({ rowCount: 1 }),
      onConflictDoNothing: async () => ({ rowCount: 0 }),
    }),
    update: () => mockUpdate,
    delete: () => ({
      where: async () => ({ rowCount: 1 }),
    }),
    transaction: async (fn) => await fn(createMockDatabase()),
    execute: async () => [],
  };
}

// ── Mock Adapter Factories ────────────────────────────────────
// These return plain objects with jest.fn()-compatible stubs.
// In your test file, wrap with vi.fn() or jest.fn() as needed.

export interface MockMeilisearchAdapter {
  upsertDocument: (...args: unknown[]) => Promise<unknown>;
  upsertDocuments: (...args: unknown[]) => Promise<unknown>;
  search: (...args: unknown[]) => Promise<unknown>;
  health: () => Promise<unknown>;
  ping: () => Promise<boolean>;
  getIndexStats: () => Promise<unknown>;
  configureIndex: () => Promise<void>;
  getCircuitStatus: () => string;
}

export function createMockMeilisearchAdapter(): MockMeilisearchAdapter {
  const cost = { provider: 'meilisearch' as const, operation: 'index_upsert' as const, unitCostUsd: 0, timestamp: new Date().toISOString() };
  return {
    upsertDocument: async () => ({ status: 'success', cost }),
    upsertDocuments: async () => ({ status: 'success', cost }),
    search: async () => ({ status: 'success', hits: [], cost }),
    health: async () => ({ status: 'healthy', latencyMs: 10, indexStats: { numberOfDocuments: 0 }, circuitStatus: 'closed', lastChecked: new Date().toISOString() }),
    ping: async () => true,
    getIndexStats: async () => ({ numberOfDocuments: 0, isIndexing: false }),
    configureIndex: async () => {},
    getCircuitStatus: () => 'closed',
  };
}

export interface MockLLMAdapter {
  call: (...args: unknown[]) => Promise<unknown>;
  getCircuitStatus: () => Record<string, string>;
}

export function createMockLLMAdapter(): MockLLMAdapter {
  return {
    call: async () => ({
      success: true,
      data: {},
      response: {
        content: '{}',
        model: 'mock-model',
        provider: 'mock',
        tier: 'T-A',
        usage: { input: 0, output: 0 },
        costUsd: 0,
      },
    }),
    getCircuitStatus: () => ({ 'T-A': 'closed', 'T-B': 'closed', 'T-C': 'closed' }),
  };
}

// ── JWT Test Helper ───────────────────────────────────────────

export interface MockJWTOptions {
  sub?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  realm?: string;
}

/**
 * Creates a mock JWT payload for testing tenancy middleware.
 * Does NOT create a signed token — use for unit tests that mock jwtVerify.
 */
export function createMockJWTPayload(options: MockJWTOptions = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: options.sub ?? 'test-user-id',
    iss: options.iss ?? 'https://auth.mushin.io',
    aud: options.aud ?? 'mushin-api',
    exp: options.exp ?? now + 3600,
    iat: options.iat ?? now,
    realm: options.realm ?? 'user',
  };
}

/**
 * Creates a mock TenancyContext for testing.
 */
export function createMockTenancyContext(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user-id',
    workspaceId: 'test-workspace-id',
    creatorId: '',
    isStaff: false,
    roles: ['member'],
    claims: {
      iss: 'https://auth.mushin.io',
      sub: 'test-user-id',
      aud: 'mushin-api',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    },
    ...overrides,
  };
}

// ── Event Assertion Helpers ───────────────────────────────────

export interface CapturedEvent {
  eventId: string;
  eventType: string;
  schemaVersion: string;
  scopeClass: string;
  workspaceId: string | null;
  actorType: string;
  actorId: string;
  correlationId: string;
  causationId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Creates an event capture function that records emitted events.
 * Use with mock database to verify outbox events.
 */
export function createEventCapture() {
  const events: CapturedEvent[] = [];

  return {
    capture: (event: CapturedEvent) => events.push(event),
    getEvents: () => [...events],
    getEventsByType: (type: string) => events.filter((e) => e.eventType === type),
    clear: () => (events.length = 0),
    assertEventEmitted: (type: string) => {
      const found = events.some((e) => e.eventType === type);
      if (!found) {
        throw new Error(`Expected event '${type}' to be emitted, but it was not. Emitted events: ${events.map((e) => e.eventType).join(', ')}`);
      }
    },
    assertEventCount: (type: string, count: number) => {
      const found = events.filter((e) => e.eventType === type);
      if (found.length !== count) {
        throw new Error(`Expected ${count} events of type '${type}', but found ${found.length}`);
      }
    },
  };
}

// ── Integration Test Utilities ──────────────────────────────────
// Re-export integration test utilities for convenience.
// These require Docker to be available on the test machine.

export {
  getTestDatabase,
  cleanupTestDatabase,
  stopTestDatabase,
  executeRaw,
} from './integration.js';
