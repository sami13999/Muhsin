/**
 * Discovery Worker Handler unit tests.
 * Asserts idempotency, credit commit/refund semantics, and status transitions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscoveryJobHandler } from '../handlers/discovery-worker.js';
import { EVENT_TYPES } from '@mushin/events';

const { existingJobs, updatedJobs, creditActions } = vi.hoisted(() => {
  return {
    existingJobs: {} as Record<string, any>,
    updatedJobs: {} as Record<string, any>,
    creditActions: [] as any[],
  };
});

vi.mock('@mushin/database', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    withWorkspaceTransaction: vi.fn().mockImplementation(async (_db: any, _wsId: string, fn: any) => fn(_db)),
    creditRepository: {
      commitCredits: vi.fn().mockImplementation(async (_db: any, wsId: string, amount: bigint, reason: string, refId: string) => {
        creditActions.push({ action: 'commit', wsId, amount, refId });
        return { success: true };
      }),
      releaseCredits: vi.fn().mockImplementation(async (_db: any, wsId: string, amount: bigint, reason: string, refId: string) => {
        creditActions.push({ action: 'release', wsId, amount, refId });
        return { success: true };
      }),
    },
    discoveryJobRepository: {
      getJobById: vi.fn().mockImplementation(async (_db: any, jobId: string) => existingJobs[jobId] ?? null),
      claimJob: vi.fn().mockImplementation(async (_db: any, jobId: string, _wsId: string, leaseMs: number = 360000) => {
        const current = existingJobs[jobId];
        if (!current) return { claimed: false, job: null, reason: 'not_found' };
        if (current.status === 'completed') return { claimed: false, job: current, reason: 'already_completed' };
        if (current.status === 'failed') return { claimed: false, job: current, reason: 'already_failed' };
        if (current.status === 'running') {
          const now = new Date();
          const leaseExpired = current.leaseExpiresAt && new Date(current.leaseExpiresAt) < now;
          if (!leaseExpired) {
            return { claimed: false, job: current, reason: 'currently_running' };
          }
          if ((current.attemptCount ?? 1) >= (current.maxAttempts ?? 3)) {
            return { claimed: false, job: current, reason: 'exhausted_attempts' };
          }
        }
        const attempts = (current.attemptCount ?? 0) + 1;
        const updated = {
          ...current,
          status: 'running',
          attemptCount: attempts,
          leaseExpiresAt: new Date(Date.now() + leaseMs),
        };
        existingJobs[jobId] = updated;
        updatedJobs[jobId] = updated;
        return { claimed: true, job: updated };
      }),
      extendLease: vi.fn().mockImplementation(async (_db: any, jobId: string, _wsId: string, leaseMs: number = 360000, expectedAttemptCount?: number) => {
        const current = existingJobs[jobId];
        if (!current || current.status !== 'running') return false;
        if (expectedAttemptCount !== undefined && current.attemptCount !== expectedAttemptCount) return false;
        current.leaseExpiresAt = new Date(Date.now() + leaseMs);
        return true;
      }),
      completeJob: vi.fn().mockImplementation(async (_db: any, jobId: string, _wsId: string, data: any, expectedAttemptCount?: number) => {
        const current = existingJobs[jobId];
        if (!current || current.status !== 'running') return null;
        if (expectedAttemptCount !== undefined && current.attemptCount !== expectedAttemptCount) return null;
        const updated = { ...current, status: 'completed', ...data, leaseExpiresAt: null, completedAt: new Date() };
        existingJobs[jobId] = updated;
        updatedJobs[jobId] = updated;
        return updated;
      }),
      failJob: vi.fn().mockImplementation(async (_db: any, jobId: string, _wsId: string, error: any, expectedAttemptCount?: number) => {
        const current = existingJobs[jobId];
        if (!current || current.status !== 'running') return null;
        if (expectedAttemptCount !== undefined && current.attemptCount !== expectedAttemptCount) return null;
        const updated = { ...current, status: 'failed', error, leaseExpiresAt: null, completedAt: new Date() };
        existingJobs[jobId] = updated;
        updatedJobs[jobId] = updated;
        return updated;
      }),
      updateJob: vi.fn().mockImplementation(async (_db: any, jobId: string, updates: any) => {
        updatedJobs[jobId] = { ...(updatedJobs[jobId] ?? {}), ...updates };
        if (existingJobs[jobId]) {
          existingJobs[jobId] = { ...existingJobs[jobId], ...updates };
        }
        return { jobId, ...updates };
      }),
    },
  };
});

describe('Discovery Worker Handler (Phase 3A)', () => {
  let mockOrchestrator: any;
  let mockDb: any;
  let emittedEvents: any[];

  beforeEach(() => {
    for (const key of Object.keys(updatedJobs)) delete updatedJobs[key];
    creditActions.length = 0;
    emittedEvents = [];
    for (const key of Object.keys(existingJobs)) delete existingJobs[key];

    mockOrchestrator = {
      discover: vi.fn(),
    };

    mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockImplementation(async () => {
              const jobs = Object.values(existingJobs);
              return jobs.slice(0, 1);
            }),
          })),
        })),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((val) => ({
          where: vi.fn().mockImplementation(async () => {
            updatedJobs['last'] = val;
            return [val];
          }),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((val) => {
          emittedEvents.push(val);
          return {
            returning: vi.fn().mockResolvedValue([val]),
          };
        }),
      })),
    };
  });

  it('claims queued job, executes discovery, commits credits, and marks completed', async () => {
    const jobId = 'job-success-123';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani travel' },
    };

    mockOrchestrator.discover.mockResolvedValue([
      { handle: '@creator_pk', displayName: 'Creator PK', followerCount: 50000 },
    ]);

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-1',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: {
          jobId,
          workspaceId,
          query: 'Pakistani travel',
          cost: 12,
        },
      },
      mockDb,
    );

    expect(mockOrchestrator.discover).toHaveBeenCalledTimes(1);

    // Assert credit commit
    expect(creditActions).toHaveLength(1);
    expect(creditActions[0]).toEqual({
      action: 'commit',
      wsId: workspaceId,
      amount: 12n,
      refId: jobId,
    });

    // Assert job updated to completed
    expect(updatedJobs[jobId]?.status).toBe('completed');
    expect(updatedJobs[jobId]?.resultCount).toBe(1);

    // Assert completion event emitted
    expect(emittedEvents.some((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_COMPLETED)).toBe(true);
  });

  it('skips execution idempotently if job is not in queued state', async () => {
    const jobId = 'job-already-running';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'running', // Already running!
      query: { query: 'test' },
    };

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-2',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: { jobId, workspaceId, query: 'test' },
      },
      mockDb,
    );

    // Orchestrator should NOT have been invoked
    expect(mockOrchestrator.discover).not.toHaveBeenCalled();
    expect(creditActions).toHaveLength(0);
  });

  it('releases/refunds credit reservation and marks job failed when orchestrator throws', async () => {
    const jobId = 'job-failed-456';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'failing query' },
    };

    mockOrchestrator.discover.mockRejectedValue(new Error('Serper quota exhausted'));

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-3',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: {
          jobId,
          workspaceId,
          query: 'failing query',
          cost: 12,
        },
      },
      mockDb,
    );

    // Assert credit release / refund
    expect(creditActions).toHaveLength(1);
    expect(creditActions[0]).toEqual({
      action: 'release',
      wsId: workspaceId,
      amount: 12n,
      refId: jobId,
    });

    // Assert job updated to failed
    expect(updatedJobs[jobId]?.status).toBe('failed');
    expect(updatedJobs[jobId]?.error?.message).toBe('Serper quota exhausted');

    // Assert failure event emitted
    expect(emittedEvents.some((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_FAILED)).toBe(true);
  });

  it('recovers crashed worker job if lease expired and attempts < maxAttempts', async () => {
    const jobId = 'job-crashed-recovering';
    const workspaceId = 'ws-test-999';

    // Simulate job previously stuck in 'running' with expired lease
    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'running',
      leaseExpiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      attemptCount: 1,
      maxAttempts: 3,
      query: { query: 'Pakistani fashion' },
    };

    mockOrchestrator.discover.mockResolvedValue([
      { handle: '@fashion_pk', displayName: 'Fashion PK', followerCount: 25000 },
    ]);

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-recovery',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'system', id: 'sqs-retry' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: {
          jobId,
          workspaceId,
          query: 'Pakistani fashion',
          cost: 12,
        },
      },
      mockDb,
    );

    // Job should be claimed, incrementing attempt count
    expect(mockOrchestrator.discover).toHaveBeenCalledTimes(1);
    expect(creditActions).toHaveLength(1);
    expect(creditActions[0].action).toBe('commit');
    expect(updatedJobs[jobId]?.status).toBe('completed');
    expect(updatedJobs[jobId]?.attemptCount).toBe(2);
  });

  it('marks job failed and refunds credits when crashed job exceeded max attempts', async () => {
    const jobId = 'job-crashed-exhausted';
    const workspaceId = 'ws-test-999';

    // Already at max attempts
    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'running',
      leaseExpiresAt: new Date(Date.now() - 60000), // Expired
      attemptCount: 3,
      maxAttempts: 3,
      query: { query: 'Pakistani tech' },
    };

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-exhausted',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'system', id: 'sqs-dlq-check' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: {
          jobId,
          workspaceId,
          query: 'Pakistani tech',
          cost: 12,
        },
      },
      mockDb,
    );

    // Discover should NOT be called
    expect(mockOrchestrator.discover).not.toHaveBeenCalled();

    // Credits should be released / refunded
    expect(creditActions).toHaveLength(1);
    expect(creditActions[0]).toEqual({
      action: 'release',
      wsId: workspaceId,
      amount: 12n,
      refId: jobId,
    });

    // Job should be marked failed
    expect(updatedJobs[jobId]?.status).toBe('failed');
    expect(emittedEvents.some((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_FAILED)).toBe(true);
  });

  it('prevents double-charging if job was already finalized before worker completed', async () => {
    const jobId = 'job-stolen-lease';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani food' },
    };

    // When discover runs, another worker finishes the job first!
    mockOrchestrator.discover.mockImplementation(async () => {
      // External event or another worker marked job completed
      existingJobs[jobId] = {
        ...existingJobs[jobId],
        status: 'completed',
      };
      return [{ handle: '@biryani_pk', displayName: 'Biryani PK', followerCount: 50000 }];
    });

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-race',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: { jobId, workspaceId, query: 'Pakistani food', cost: 12 },
      },
      mockDb,
    );

    // Because completeJob guards with status = 'running', it returned null!
    // Therefore, credits must NOT have been committed again!
    expect(creditActions).toHaveLength(0);
    // And no duplicate completion event emitted
    expect(emittedEvents.filter((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_COMPLETED)).toHaveLength(0);
  });

  it('calls extendVisibility and extendLease during heartbeat execution', async () => {
    const jobId = 'job-heartbeat-test';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani crafts' },
    };

    const mockExtendVisibility = vi.fn().mockResolvedValue(undefined);

    vi.useFakeTimers();
    try {
      let resolveDiscover: (res: any[]) => void;
      mockOrchestrator.discover.mockReturnValue(
        new Promise((resolve) => {
          resolveDiscover = resolve;
        }),
      );

      const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb, mockExtendVisibility);

      const handlePromise = handler.handle(
        {
          eventId: 'evt-hb',
          type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: 'u-1' },
          correlationId: jobId,
          occurredAt: new Date(),
          receiptHandle: 'receipt-handle-xyz',
          payload: { jobId, workspaceId, query: 'Pakistani crafts', cost: 12 },
        },
        mockDb,
      );

      // Advance time by 60 seconds to trigger first heartbeat
      await vi.advanceTimersByTimeAsync(60_000);

      expect(mockExtendVisibility).toHaveBeenCalledWith('receipt-handle-xyz', 450);

      // Resolve discover and complete
      resolveDiscover!([{ handle: '@crafts_pk', displayName: 'Crafts PK' }]);
      await handlePromise;

      expect(creditActions).toHaveLength(1);
      expect(creditActions[0].action).toBe('commit');
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles orchestrator timeout gracefully by failing job and refunding credits', async () => {
    const jobId = 'job-timeout-test';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'slow search' },
    };

    vi.useFakeTimers();
    try {
      // Orchestrator hangs indefinitely
      mockOrchestrator.discover.mockReturnValue(new Promise(() => {}));

      const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

      const handlePromise = handler.handle(
        {
          eventId: 'evt-timeout',
          type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: 'u-1' },
          correlationId: jobId,
          occurredAt: new Date(),
          payload: { jobId, workspaceId, query: 'slow search', cost: 12 },
        },
        mockDb,
      );

      // Advance time past 210s orchestrator timeout
      await vi.advanceTimersByTimeAsync(211_000);
      await handlePromise;

      // Assert credit refund
      expect(creditActions).toHaveLength(1);
      expect(creditActions[0]).toEqual({
        action: 'release',
        wsId: workspaceId,
        amount: 12n,
        refId: jobId,
      });

      // Assert job marked failed with timeout message
      expect(updatedJobs[jobId]?.status).toBe('failed');
      expect(updatedJobs[jobId]?.error?.message).toMatch(/timed out/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prevents stale worker from completing job after lease was lost to a newer worker attempt', async () => {
    const jobId = 'job-stale-attempt-race';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani beauty' },
    };

    mockOrchestrator.discover.mockImplementation(async (job: any, signal: any) => {
      // Simulate that during discover, Worker 1 was delayed and Worker 2 took over the job (attemptCount incremented to 2)
      existingJobs[jobId] = {
        ...existingJobs[jobId],
        status: 'running',
        attemptCount: 2, // Newer worker owns attempt 2!
      };
      return [{ handle: '@beauty_pk', displayName: 'Beauty PK' }];
    });

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-stale-worker',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: { jobId, workspaceId, query: 'Pakistani beauty', cost: 12 },
      },
      mockDb,
    );

    // Stale worker (attempt 1) must NOT commit credits or emit completion event
    expect(creditActions).toHaveLength(0);
    expect(emittedEvents.filter((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_COMPLETED)).toHaveLength(0);
  });

  it('prevents stale worker from marking job failed if lease was lost to a newer worker attempt', async () => {
    const jobId = 'job-stale-fail-race';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani cars' },
    };

    mockOrchestrator.discover.mockImplementation(async () => {
      // Simulate that while Worker 1 was running, its lease expired and Worker 2 claimed attempt 2
      existingJobs[jobId] = {
        ...existingJobs[jobId],
        status: 'running',
        attemptCount: 2, // Worker 2 owns attempt 2
      };
      throw new Error('Late network error');
    });

    const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

    await handler.handle(
      {
        eventId: 'evt-stale-fail',
        type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'u-1' },
        correlationId: jobId,
        occurredAt: new Date(),
        payload: { jobId, workspaceId, query: 'Pakistani cars', cost: 12 },
      },
      mockDb,
    );

    // Stale worker (attempt 1) must NOT refund credits or emit failure event, because attempt 2 is running
    expect(creditActions).toHaveLength(0);
    expect(emittedEvents.filter((e) => e.eventType === EVENT_TYPES.DISCOVERY_JOB_FAILED)).toHaveLength(0);
  });

  it('heartbeat failure aborts active orchestrator execution via AbortSignal when lease is lost', async () => {
    const jobId = 'job-heartbeat-abort';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'Pakistani music' },
    };

    let observedSignal: AbortSignal | undefined;

    vi.useFakeTimers();
    try {
      mockOrchestrator.discover.mockImplementation(async (job: any, signal: any) => {
        observedSignal = signal;
        // Hang until aborted
        return new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('Discovery operation cancelled');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb);

      const handlePromise = handler.handle(
        {
          eventId: 'evt-hb-abort',
          type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: 'u-1' },
          correlationId: jobId,
          occurredAt: new Date(),
          payload: { jobId, workspaceId, query: 'Pakistani music', cost: 12 },
        },
        mockDb,
      );

      // Simulate lease lost before first heartbeat fires (e.g. job cancelled or stolen)
      existingJobs[jobId].status = 'cancelled';

      // Advance time by 60s to fire heartbeat
      await vi.advanceTimersByTimeAsync(60_000);
      await handlePromise;

      expect(observedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles SQS visibility extension failure safely without crashing worker', async () => {
    const jobId = 'job-sqs-visibility-err';
    const workspaceId = 'ws-test-999';

    existingJobs[jobId] = {
      jobId,
      workspaceId,
      status: 'queued',
      query: { query: 'safe sqs test' },
    };

    const failingVisibility = vi.fn().mockRejectedValue(new Error('SQS Network Timeout'));

    vi.useFakeTimers();
    try {
      let resolveDiscover: (res: any[]) => void;
      mockOrchestrator.discover.mockReturnValue(
        new Promise((resolve) => {
          resolveDiscover = resolve;
        }),
      );

      const handler = createDiscoveryJobHandler(mockOrchestrator, mockDb, failingVisibility);

      const handlePromise = handler.handle(
        {
          eventId: 'evt-sqs-err',
          type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: 'u-1' },
          correlationId: jobId,
          occurredAt: new Date(),
          receiptHandle: 'receipt-handle-err',
          payload: { jobId, workspaceId, query: 'safe sqs test', cost: 12 },
        },
        mockDb,
      );

      // Advance time by 60s
      await vi.advanceTimersByTimeAsync(60_000);
      expect(failingVisibility).toHaveBeenCalled();

      // Resolve discover and complete
      resolveDiscover!([{ handle: '@safe_pk', displayName: 'Safe PK' }]);
      await handlePromise;

      // Completed successfully despite visibility failure
      expect(creditActions).toHaveLength(1);
      expect(creditActions[0].action).toBe('commit');
      expect(updatedJobs[jobId]?.status).toBe('completed');
    } finally {
      vi.useRealTimers();
    }
  });
});
