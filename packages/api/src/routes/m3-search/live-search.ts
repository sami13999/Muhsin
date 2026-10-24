/**
 * M3 Search — Live Internet Discovery (Brain 2).
 *
 * Routes:
 * - POST /api/v1/creators/search/live (Submits discovery job -> HTTP 202 Accepted)
 * - GET  /api/v1/creators/search/live/jobs/:jobId (Polls discovery job status and results)
 *
 * Conforms to asynchronous transactional-outbox architecture:
 * 1. Validates query and workspace tenancy.
 * 2. Reserves credits via creditRepository.reserveCredits.
 * 3. Persists job to wp.discovery_job with status 'queued'.
 * 4. Emits discovery.job_queued event to outbox.
 * 5. Returns HTTP 202 Accepted without blocking HTTP connection on external scraping.
 * 6. Background worker processes the job and commits/refunds credits upon completion.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@mushin/database';
import { creditRepository, discoveryJobRepository } from '@mushin/database';
import { emitEvent, EVENT_TYPES } from '@mushin/events';
import type { SerperAdapter, ApifyAdapter, LLMAdapter, MeilisearchAdapter } from '@mushin/adapters';
import type { TenancyContext } from '@mushin/shared';
import { createDiscoveryOrchestrator, type DiscoveryJob, type DiscoveryOrchestrator } from '../../services/discovery/orchestrator.js';

const liveSearchSchema = z.object({
  query: z.string().min(1).max(500),
  platform: z.string().optional(),
  niche: z.string().optional(),
  location: z.string().optional(),
});

export function createLiveSearchRoutes(
  serper: SerperAdapter,
  apify: ApifyAdapter,
  llm: LLMAdapter,
  db: Database,
  meilisearch?: MeilisearchAdapter,
) {
  const routes = new Hono();
  const orchestrator = createDiscoveryOrchestrator(db, serper, apify, llm, meilisearch);

  /**
   * POST /api/v1/creators/search/live
   * Queues an asynchronous Brain 2 live discovery job.
   */
  routes.post('/search/live', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext | undefined;
    const requestId = c.get('requestId') || crypto.randomUUID();

    const body = await c.req.json().catch(() => ({}));
    const parsed = liveSearchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid live search request payload',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { query, platform, niche, location } = parsed.data;
    const workspaceId = tenancy?.workspaceId || 'ws-default';
    const userId = tenancy?.userId;
    const cost = 12;
    const jobId = crypto.randomUUID();

    const clientDb = c.get('db') ?? db;

    try {
      await clientDb.transaction(async (tx) => {
        // Reserve credits within transaction
        if (tenancy?.workspaceId) {
          const reserveRes = await creditRepository.reserveCredits(
            tx as any,
            workspaceId,
            BigInt(cost),
            'discovery_live_search',
            jobId,
          );
          if (!reserveRes.success) {
            throw new Error(`Insufficient credits for live discovery (reason: ${reserveRes.reason})`);
          }
        }

        // Persist discovery job in wp.discovery_job with status 'queued'
        await discoveryJobRepository.createJob(tx as any, {
          jobId,
          workspaceId,
          requestedBy: userId,
          query: { query, platform, niche, location },
          status: 'queued',
        });

        // Emit transactional outbox event
        await emitEvent(tx as any, {
          eventId: crypto.randomUUID(),
          type: EVENT_TYPES.DISCOVERY_JOB_QUEUED,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: userId || 'anonymous' },
          correlationId: jobId,
          occurredAt: new Date(),
          payload: {
            jobId,
            workspaceId,
            requestedBy: userId,
            query,
            platform,
            niche,
            location,
            cost,
          },
        });
      });

      return c.json(
        {
          data: {
            job_id: jobId,
            status: 'queued',
            estimated_duration_seconds: 60,
            credits_reserved: cost,
            created_at: new Date().toISOString(),
          },
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        },
        202,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to queue discovery job';
      const isCreditErr = message.includes('credit') || message.includes('Insufficient');
      return c.json(
        {
          error: {
            code: isCreditErr ? 'INSUFFICIENT_CREDITS' : 'DISCOVERY_QUEUE_ERROR',
            message,
            request_id: requestId,
          },
        },
        isCreditErr ? 402 : 500,
      );
    }
  });

  /**
   * GET /api/v1/creators/search/live/jobs/:jobId
   * Retrieves status and results of a discovery job, enforcing tenant isolation.
   */
  routes.get('/search/live/jobs/:jobId', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext | undefined;
    const requestId = c.get('requestId') || crypto.randomUUID();
    const jobId = c.req.param('jobId');

    if (!jobId) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jobId parameter is required',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const workspaceId = tenancy?.workspaceId || 'ws-default';
    const clientDb = c.get('db') ?? db;
    const job = await discoveryJobRepository.getJobById(clientDb, jobId, workspaceId);

    if (!job) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Discovery job "${jobId}" not found`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    return c.json({
      data: {
        job_id: job.jobId,
        status: job.status,
        result_count: job.resultCount,
        results: job.results,
        pipeline_stages: job.pipelineStages,
        execution_stats: job.executionStats,
        error: job.error,
        started_at: job.startedAt ? job.startedAt.toISOString() : null,
        completed_at: job.completedAt ? job.completedAt.toISOString() : null,
        created_at: job.createdAt.toISOString(),
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  });

  return routes;
}
