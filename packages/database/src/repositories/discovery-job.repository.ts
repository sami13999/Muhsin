/**
 * Discovery Job Repository — Data access layer for wp.discovery_job.
 * Manages job persistence, status updates, and tenant-scoped retrieval.
 */
import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { discoveryJob } from '../schema/wp/index.js';

export interface CreateDiscoveryJobInput {
  jobId?: string;
  workspaceId: string;
  requestedBy?: string;
  query: Record<string, unknown>;
  status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  maxAttempts?: number;
}

export interface UpdateDiscoveryJobInput {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  resultCount?: number;
  results?: unknown;
  pipelineStages?: unknown;
  executionStats?: unknown;
  error?: unknown;
  startedAt?: Date;
  completedAt?: Date;
  leaseExpiresAt?: Date | null;
  attemptCount?: number;
  maxAttempts?: number;
}

export type DiscoveryJobRecord = typeof discoveryJob.$inferSelect;

export interface ClaimJobResult {
  claimed: boolean;
  job: DiscoveryJobRecord | null;
  reason?: 'not_found' | 'already_completed' | 'already_failed' | 'currently_running' | 'exhausted_attempts';
}

export async function createJob(
  db: Database,
  input: CreateDiscoveryJobInput,
): Promise<DiscoveryJobRecord> {
  const [created] = await db
    .insert(discoveryJob)
    .values({
      ...(input.jobId ? { jobId: input.jobId } : {}),
      workspaceId: input.workspaceId,
      requestedBy: input.requestedBy ?? null,
      query: input.query,
      status: input.status ?? 'queued',
      maxAttempts: input.maxAttempts ?? 3,
      results: [],
    })
    .returning();

  if (!created) {
    throw new Error('Failed to insert discovery job');
  }

  return created;
}

export async function getJobById(
  db: Database,
  jobId: string,
  workspaceId: string,
): Promise<DiscoveryJobRecord | null> {
  const [row] = await db
    .select()
    .from(discoveryJob)
    .where(
      and(
        eq(discoveryJob.jobId, jobId),
        eq(discoveryJob.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Concurrency-safe atomic job claiming with crashed worker lease recovery.
 *
 * Atomically claims the job IF:
 * 1. Status is 'queued'
 * 2. OR status is 'running' AND lease has expired (worker crashed or timed out) AND attempts < max_attempts
 */
export async function claimJob(
  db: Database,
  jobId: string,
  workspaceId: string,
  leaseDurationMs: number = 360000, // 6 minutes (compatible with SQS 450s visibility)
): Promise<ClaimJobResult> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  const fallbackCutoff = new Date(now.getTime() - leaseDurationMs);

  const [claimed] = await db
    .update(discoveryJob)
    .set({
      status: 'running',
      startedAt: sql`COALESCE(${discoveryJob.startedAt}, ${now})`,
      leaseExpiresAt,
      attemptCount: sql`${discoveryJob.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(discoveryJob.jobId, jobId),
        eq(discoveryJob.workspaceId, workspaceId),
        sql`(
          ${discoveryJob.status} = 'queued'
          OR (
            ${discoveryJob.status} = 'running'
            AND (
              ${discoveryJob.leaseExpiresAt} < ${now}
              OR (${discoveryJob.leaseExpiresAt} IS NULL AND ${discoveryJob.updatedAt} < ${fallbackCutoff})
            )
            AND ${discoveryJob.attemptCount} < ${discoveryJob.maxAttempts}
          )
        )`,
      ),
    )
    .returning();

  if (claimed) {
    return { claimed: true, job: claimed };
  }

  // Not claimed: inspect current record state
  const current = await getJobById(db, jobId, workspaceId);
  if (!current) {
    return { claimed: false, job: null, reason: 'not_found' };
  }

  if (current.status === 'completed') {
    return { claimed: false, job: current, reason: 'already_completed' };
  }

  if (current.status === 'failed' || current.status === 'cancelled') {
    return { claimed: false, job: current, reason: 'already_failed' };
  }

  if (current.status === 'running' && current.attemptCount >= current.maxAttempts) {
    return { claimed: false, job: current, reason: 'exhausted_attempts' };
  }

  return { claimed: false, job: current, reason: 'currently_running' };
}

/**
 * Extend an active lease for a running discovery job.
 * Returns true if the lease was successfully extended, false if job is no longer running.
 */
export async function extendLease(
  db: Database,
  jobId: string,
  workspaceId: string,
  extensionMs: number = 360000,
  expectedAttemptCount?: number,
): Promise<boolean> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + extensionMs);

  const [updated] = await db
    .update(discoveryJob)
    .set({
      leaseExpiresAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(discoveryJob.jobId, jobId),
        eq(discoveryJob.workspaceId, workspaceId),
        eq(discoveryJob.status, 'running'),
        ...(expectedAttemptCount !== undefined
          ? [eq(discoveryJob.attemptCount, expectedAttemptCount)]
          : []),
      ),
    )
    .returning({ jobId: discoveryJob.jobId });

  return !!updated;
}

/**
 * Atomically marks a running job as completed.
 * Guarded by `status = 'running'` and optional `attemptCount` to prevent race conditions or overwriting by zombie workers.
 */
export async function completeJob(
  db: Database,
  jobId: string,
  workspaceId: string,
  data: {
    resultCount?: number;
    results?: unknown;
    pipelineStages?: unknown;
    executionStats?: unknown;
  },
  expectedAttemptCount?: number,
): Promise<DiscoveryJobRecord | null> {
  const now = new Date();
  const [updated] = await db
    .update(discoveryJob)
    .set({
      status: 'completed',
      completedAt: now,
      leaseExpiresAt: null,
      resultCount: data.resultCount,
      results: data.results,
      pipelineStages: data.pipelineStages,
      executionStats: data.executionStats,
      updatedAt: now,
    })
    .where(
      and(
        eq(discoveryJob.jobId, jobId),
        eq(discoveryJob.workspaceId, workspaceId),
        eq(discoveryJob.status, 'running'),
        ...(expectedAttemptCount !== undefined
          ? [eq(discoveryJob.attemptCount, expectedAttemptCount)]
          : []),
      ),
    )
    .returning();

  return updated ?? null;
}

/**
 * Atomically marks a running job as failed.
 * Guarded by `status = 'running'` and optional `attemptCount` to prevent overwriting completed or already terminated jobs.
 */
export async function failJob(
  db: Database,
  jobId: string,
  workspaceId: string,
  error: unknown,
  expectedAttemptCount?: number,
): Promise<DiscoveryJobRecord | null> {
  const now = new Date();
  const [updated] = await db
    .update(discoveryJob)
    .set({
      status: 'failed',
      completedAt: now,
      leaseExpiresAt: null,
      error,
      updatedAt: now,
    })
    .where(
      and(
        eq(discoveryJob.jobId, jobId),
        eq(discoveryJob.workspaceId, workspaceId),
        eq(discoveryJob.status, 'running'),
        ...(expectedAttemptCount !== undefined
          ? [eq(discoveryJob.attemptCount, expectedAttemptCount)]
          : []),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function updateJob(
  db: Database,
  jobId: string,
  updates: Partial<UpdateDiscoveryJobInput>,
): Promise<DiscoveryJobRecord | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) updateData['status'] = updates.status;
  if (updates.resultCount !== undefined) updateData['resultCount'] = updates.resultCount;
  if (updates.results !== undefined) updateData['results'] = updates.results;
  if (updates.pipelineStages !== undefined) updateData['pipelineStages'] = updates.pipelineStages;
  if (updates.executionStats !== undefined) updateData['executionStats'] = updates.executionStats;
  if (updates.error !== undefined) updateData['error'] = updates.error;
  if (updates.startedAt !== undefined) updateData['startedAt'] = updates.startedAt;
  if (updates.completedAt !== undefined) updateData['completedAt'] = updates.completedAt;
  if (updates.leaseExpiresAt !== undefined) updateData['leaseExpiresAt'] = updates.leaseExpiresAt;
  if (updates.attemptCount !== undefined) updateData['attemptCount'] = updates.attemptCount;
  if (updates.maxAttempts !== undefined) updateData['maxAttempts'] = updates.maxAttempts;

  const [updated] = await db
    .update(discoveryJob)
    .set(updateData)
    .where(eq(discoveryJob.jobId, jobId))
    .returning();

  return updated ?? null;
}
