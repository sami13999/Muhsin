/**
 * Live Search Routes tests (Phase 3A Asynchronous Discovery).
 * Asserts HTTP 202 Accepted, job persistence, outbox event emission,
 * credit reservation, and tenant-scoped job polling.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createLiveSearchRoutes } from '../routes/m3-search/live-search.js';

const { reservedCredits } = vi.hoisted(() => {
  return {
    reservedCredits: [] as any[],
  };
});

vi.mock('@mushin/database', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    creditRepository: {
      reserveCredits: vi.fn().mockImplementation(async (_db: any, wsId: string, amount: bigint, reason: string, refId: string) => {
        reservedCredits.push({ wsId, amount, reason, refId });
        return { success: true, balance: 100n };
      }),
      commitCredits: vi.fn().mockResolvedValue({ success: true, balance: 88n }),
      releaseCredits: vi.fn().mockResolvedValue({ success: true, balance: 100n }),
    },
  };
});

describe('Live Search Asynchronous API Routes', () => {
  let mockDb: any;
  let mockSerper: any;
  let mockApify: any;
  let mockLlm: any;
  let mockMeilisearch: any;
  let app: Hono;

  let persistedJobs: Record<string, any>;
  let emittedEvents: any[];

  beforeEach(() => {
    persistedJobs = {};
    emittedEvents = [];
    reservedCredits.length = 0;

    mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
      insert: vi.fn().mockImplementation((table) => ({
        values: vi.fn().mockImplementation((val) => {
          if (val.jobId) {
            persistedJobs[val.jobId] = { ...val, createdAt: new Date(), updatedAt: new Date() };
          }
          if (val.eventId) {
            emittedEvents.push(val);
          }
          return {
            returning: vi.fn().mockResolvedValue([val]),
          };
        }),
      })),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockImplementation(async () => {
              const jobs = Object.values(persistedJobs);
              return jobs.slice(0, 1);
            }),
          })),
        })),
      })),
    };

    mockSerper = { search: vi.fn().mockResolvedValue([]) };
    mockApify = { runActor: vi.fn().mockResolvedValue([]) };
    mockLlm = { call: vi.fn().mockResolvedValue({ success: true, data: { searchQueries: [] } }) };
    mockMeilisearch = { upsertDocumentToIndex: vi.fn().mockResolvedValue({ status: 'success' }) };

    app = new Hono();
    // Simulate tenancy middleware
    app.use('*', async (c, next) => {
      c.set('tenancy', {
        workspaceId: 'ws-test-123',
        userId: 'u-user-456',
        creatorId: null,
        isStaff: false,
        roles: ['owner'],
        claims: {},
      } as any);
      await next();
    });

    const routes = createLiveSearchRoutes(
      mockSerper,
      mockApify,
      mockLlm,
      mockDb,
      mockMeilisearch,
    );
    app.route('/api/v1/creators', routes);
  });

  describe('POST /api/v1/creators/search/live', () => {
    it('returns HTTP 202 Accepted with job_id and queued status without blocking on scrapers', async () => {
      const res = await app.request('/api/v1/creators/search/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Pakistani travel vloggers',
          platform: 'instagram',
        }),
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as any;

      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('queued');
      expect(typeof json.data.job_id).toBe('string');
      expect(json.data.credits_reserved).toBe(12);

      // Verify job persistence in DB
      const persistedJob = persistedJobs[json.data.job_id];
      expect(persistedJob).toBeDefined();
      expect(persistedJob.workspaceId).toBe('ws-test-123');
      expect(persistedJob.status).toBe('queued');

      // Verify outbox event emitted
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventType).toBe('discovery.job_queued');
      expect(emittedEvents[0].payload.jobId).toBe(json.data.job_id);

      // Verify credit reservation
      expect(reservedCredits).toHaveLength(1);
      expect(reservedCredits[0].amount).toBe(12n);
      expect(reservedCredits[0].refId).toBe(json.data.job_id);
    });

    it('rejects invalid payloads with 400 Validation Error', async () => {
      const res = await app.request('/api/v1/creators/search/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }), // Empty query violates min(1)
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/creators/search/live/jobs/:jobId', () => {
    it('returns 404 when job does not exist for the workspace', async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

      const res = await app.request('/api/v1/creators/search/live/jobs/non-existent-job');
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns job status and details for an authorized workspace', async () => {
      const jobId = 'a0000000-0000-0000-0000-000000000001';
      const existingRecord = {
        jobId,
        workspaceId: 'ws-test-123',
        status: 'completed',
        resultCount: 2,
        results: [
          { handle: '@creator1', displayName: 'Creator 1', followerCount: 100000 },
          { handle: '@creator2', displayName: 'Creator 2', followerCount: 50000 },
        ],
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRecord]),
          }),
        }),
      }));

      const res = await app.request(`/api/v1/creators/search/live/jobs/${jobId}`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;

      expect(json.data.job_id).toBe(jobId);
      expect(json.data.status).toBe('completed');
      expect(json.data.result_count).toBe(2);
      expect(json.data.results).toHaveLength(2);
    });
  });
});
