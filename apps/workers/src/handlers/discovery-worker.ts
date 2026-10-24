/**
 * Discovery Job Worker Handler — Background processor for Live Creator Discovery.
 * Consumes discovery.job_queued events from SQS / outbox, executes DiscoveryOrchestrator,
 * manages credit commit/refund, and updates wp.discovery_job status durably.
 */
import type { Database } from '@mushin/database';
import { discoveryJobRepository, creditRepository, withWorkspaceTransaction } from '@mushin/database';
import { EVENT_TYPES, emitEvent } from '@mushin/events';
import type { EventHandler, ParsedEvent } from '../worker.js';

export interface DiscoveryOrchestratorTarget {
  discover: (
    job: {
      jobId: string;
      workspaceId: string;
      query: string;
      platform?: string;
      niche?: string;
      status: 'queued' | 'searching' | 'scraping' | 'extracting' | 'completed' | 'failed';
      results: any[];
      pipelineStages?: any;
      executionStats?: any;
      createdAt: Date;
      signal?: AbortSignal;
    },
    signal?: AbortSignal,
  ) => Promise<any[]>;
}

export type VisibilityExtender = (receiptHandle: string, timeoutSeconds: number) => Promise<void>;

export const DISCOVERY_ORCHESTRATOR_TIMEOUT_MS = 210_000; // 3.5 minutes
export const DISCOVERY_LEASE_DURATION_MS = 360_000; // 6 minutes
export const DISCOVERY_HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

export function createDiscoveryJobHandler(
  orchestrator: DiscoveryOrchestratorTarget,
  db: Database,
  extendVisibility?: VisibilityExtender,
): EventHandler {
  return {
    eventTypes: [EVENT_TYPES.DISCOVERY_JOB_QUEUED],

    async handle(event: ParsedEvent): Promise<void> {
      const payload = event.payload as Record<string, unknown> | undefined;
      const jobId = (payload?.['jobId'] ?? payload?.['job_id']) as string | undefined;
      const workspaceId = (payload?.['workspaceId'] ?? payload?.['workspace_id'] ?? event.workspaceId) as string | undefined;
      const query = (payload?.['query'] as string) || '';
      const platform = payload?.['platform'] as string | undefined;
      const niche = payload?.['niche'] as string | undefined;
      const location = payload?.['location'] as string | undefined;
      const cost = Number(payload?.['cost'] ?? 12);

      if (!jobId || !workspaceId) {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'error',
            service: 'discovery-job-handler',
            message: 'Missing jobId or workspaceId in discovery.job_queued event',
            eventId: event.eventId,
          }),
        );
        return;
      }

      // Atomic claim with lease and crash recovery (Rule 2) inside workspace transaction for RLS
      const claimResult = await withWorkspaceTransaction(db, workspaceId, async (tx) => {
        return await discoveryJobRepository.claimJob(
          tx,
          jobId,
          workspaceId,
          DISCOVERY_LEASE_DURATION_MS,
        );
      });

      if (!claimResult.claimed) {
        if (claimResult.reason === 'exhausted_attempts') {
          console.error(
            JSON.stringify({
              ts: new Date().toISOString(),
              level: 'error',
              service: 'discovery-job-handler',
              message: `Job ${jobId} exceeded max attempts; marking terminal failure and releasing credits`,
              jobId,
              attempts: claimResult.job?.attemptCount,
            }),
          );

          await withWorkspaceTransaction(db, workspaceId, async (tx) => {
            const failedRecord = await discoveryJobRepository.failJob(tx as any, jobId, workspaceId, {
              message: 'Max attempts exceeded due to worker failure',
            });

            if (!failedRecord) {
              console.warn(`[DiscoveryWorker] Job ${jobId} was already finalized; skipping refund`);
              return;
            }

            try {
              await creditRepository.releaseCredits(
                tx as any,
                workspaceId,
                BigInt(cost),
                'discovery_live_search',
                jobId,
              );
            } catch (refundErr) {
              console.warn(`[DiscoveryWorker] Failed to release credits for exhausted job ${jobId}:`, refundErr);
            }

            await emitEvent(tx as any, {
              eventId: crypto.randomUUID(),
              type: EVENT_TYPES.DISCOVERY_JOB_FAILED,
              schemaVersion: 1,
              scopeClass: 'WP',
              workspaceId,
              actor: { type: 'system', id: 'discovery-worker' },
              correlationId: jobId,
              occurredAt: new Date(),
              payload: {
                jobId,
                workspaceId,
                error: 'Max attempts exceeded due to worker failure',
              },
            });
          });
        } else {
          console.info(
            JSON.stringify({
              ts: new Date().toISOString(),
              level: 'info',
              service: 'discovery-job-handler',
              message: `Job ${jobId} not claimed (${claimResult.reason}); skipping duplicate execution`,
              eventId: event.eventId,
            }),
          );
        }
        return;
      }

      const attemptCount = claimResult.job?.attemptCount ?? 1;
      const abortController = new AbortController();

      const fullQuery = location ? `${query} ${location}` : query;
      const jobObject = {
        jobId,
        workspaceId,
        query: fullQuery,
        platform,
        niche,
        status: 'queued' as const,
        results: [],
        createdAt: new Date(),
        signal: abortController.signal,
      };

      // Heartbeat timer: periodically extends DB lease and SQS visibility while running
      let heartbeatTimer: NodeJS.Timeout | null = null;
      let timeoutTimer: NodeJS.Timeout | null = null;

      heartbeatTimer = setInterval(async () => {
        try {
          const extended = await withWorkspaceTransaction(db, workspaceId, async (tx) => {
            return await discoveryJobRepository.extendLease(
              tx,
              jobId,
              workspaceId,
              DISCOVERY_LEASE_DURATION_MS,
              attemptCount,
            );
          });
          if (!extended) {
            console.warn(
              `[DiscoveryWorker] Heartbeat: could not extend lease for job ${jobId} (attempt ${attemptCount} lost); aborting active execution`,
            );
            abortController.abort();
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            return;
          }

          if (event.receiptHandle && extendVisibility) {
            // SQS visibility timeout 450s ensures comfortable buffer over 360s DB lease
            await extendVisibility(event.receiptHandle, 450);
          }
        } catch (hbErr) {
          console.warn(`[DiscoveryWorker] Heartbeat lease extension error for job ${jobId}:`, hbErr);
        }
      }, DISCOVERY_HEARTBEAT_INTERVAL_MS);

      try {
        const orchestratorPromise = orchestrator.discover(jobObject, abortController.signal);
        // Attach catch to prevent unhandled rejections if timeout wins
        orchestratorPromise.catch(() => {});

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            abortController.abort();
            reject(new Error(`Discovery orchestrator timed out after ${DISCOVERY_ORCHESTRATOR_TIMEOUT_MS}ms`));
          }, DISCOVERY_ORCHESTRATOR_TIMEOUT_MS);
        });

        const results = await Promise.race([orchestratorPromise, timeoutPromise]);

        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);

        // Commit credit reservation and mark job completed atomically with attemptCount check
        await withWorkspaceTransaction(db, workspaceId, async (tx) => {
          const completedRecord = await discoveryJobRepository.completeJob(
            tx as any,
            jobId,
            workspaceId,
            {
              resultCount: results.length,
              results,
              pipelineStages: (jobObject as any).pipelineStages,
              executionStats: (jobObject as any).executionStats,
            },
            attemptCount,
          );

          // Only commit credits and emit event IF the job transitioned atomically
          if (!completedRecord) {
            console.warn(
              `[DiscoveryWorker] Job ${jobId} was no longer owned by attempt ${attemptCount} during completion — skipping credit commit and event`,
            );
            return;
          }

          try {
            await creditRepository.commitCredits(
              tx as any,
              workspaceId,
              BigInt(cost),
              'discovery_live_search',
              jobId,
            );
          } catch (creditErr) {
            console.warn(`[DiscoveryWorker] Failed to commit credits for ${jobId}:`, creditErr);
          }

          await emitEvent(tx as any, {
            eventId: crypto.randomUUID(),
            type: EVENT_TYPES.DISCOVERY_JOB_COMPLETED,
            schemaVersion: 1,
            scopeClass: 'WP',
            workspaceId,
            actor: { type: 'system', id: 'discovery-worker' },
            correlationId: jobId,
            occurredAt: new Date(),
            payload: {
              jobId,
              workspaceId,
              resultCount: results.length,
            },
          });
        });

        console.info(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'discovery-job-handler',
            message: `Discovery job ${jobId} completed successfully with ${results.length} creators`,
            jobId,
          }),
        );
      } catch (err: unknown) {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        abortController.abort();

        const errorMsg = err instanceof Error ? err.message : 'Unknown discovery error';

        // Refund / release credit reservation on failure atomically with attemptCount check
        await withWorkspaceTransaction(db, workspaceId, async (tx) => {
          const failedRecord = await discoveryJobRepository.failJob(
            tx as any,
            jobId,
            workspaceId,
            {
              message: errorMsg,
            },
            attemptCount,
          );

          // Only release credits and emit event IF the job was atomically transitioned to failed
          if (!failedRecord) {
            console.warn(
              `[DiscoveryWorker] Job ${jobId} was no longer owned by attempt ${attemptCount} during failure handling — skipping credit release and event`,
            );
            return;
          }

          try {
            await creditRepository.releaseCredits(
              tx as any,
              workspaceId,
              BigInt(cost),
              'discovery_live_search',
              jobId,
            );
          } catch (refundErr) {
            console.warn(`[DiscoveryWorker] Failed to release credits for ${jobId}:`, refundErr);
          }

          await emitEvent(tx as any, {
            eventId: crypto.randomUUID(),
            type: EVENT_TYPES.DISCOVERY_JOB_FAILED,
            schemaVersion: 1,
            scopeClass: 'WP',
            workspaceId,
            actor: { type: 'system', id: 'discovery-worker' },
            correlationId: jobId,
            occurredAt: new Date(),
            payload: {
              jobId,
              workspaceId,
              error: errorMsg,
            },
          });
        });

        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'error',
            service: 'discovery-job-handler',
            message: `Discovery job ${jobId} failed: ${errorMsg}`,
            jobId,
          }),
        );
      } finally {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      }
    },
  };
}
