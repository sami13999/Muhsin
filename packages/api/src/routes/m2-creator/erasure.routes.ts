/**
 * GDPR Erasure Routes — ADR-025 compliant.
 *
 * Provides API endpoints for GDPR right-to-erasure requests.
 * Per ADR-025: PII nullification + tombstone + re-ingestion block.
 *
 * Endpoints:
 * - POST /creators/:id/erasure — Execute erasure for a creator
 * - GET /creators/:id/erasure/status — Check erasure status
 * - GET /creators/handle/:handle/block-status — Check if handle is blocked
 */
import { Hono } from 'hono';
import type { Database } from '@mushin/database';
import { creatorRepository } from '@mushin/database';
import { emitEvent, EVENT_TYPES } from '@mushin/events';

const erasure = new Hono();

/**
 * POST /creators/:id/erasure
 * Execute GDPR Tier 2 erasure for a creator.
 *
 * Atomically commits PostgreSQL tombstoning/nullification and the outbox event (ADR-020).
 * Downstream search-index deletion in Meilisearch is enqueued asynchronously via outbox relay.
 *
 * Body: { reason: string (min 10 chars), requestedBy: string }
 * Response: { status: 'completed' | 'not_found' | 'already_erased', creatorId: string, searchIndexSync?: 'pending' }
 */
erasure.post('/:id/erasure', async (c) => {
  const creatorId = c.req.param('id');
  const body = await c.req.json();
  const { reason, requestedBy } = body;

  // Validate reason (min 10 chars per DOC-029)
  if (!reason || reason.length < 10) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Reason required (min 10 chars)' } },
      400,
    );
  }

  // Execute erasure within transaction (ADR-020: state change + outbox event in same tx)
  const db = c.get('db');
  const correlationId = (c.get('requestId') as string) || crypto.randomUUID();

  let result: 'completed' | 'not_found' | 'already_erased' = 'not_found';

  try {
    await db.transaction(async (tx: unknown) => {
      const txDb = tx as Database;
      result = await creatorRepository.eraseCreator(txDb, creatorId);

      if (result === 'completed') {
        await emitEvent(txDb as Parameters<typeof emitEvent>[0], {
          eventId: crypto.randomUUID(),
          type: EVENT_TYPES.CREATOR_ERASED,
          schemaVersion: 1,
          scopeClass: 'GCP',
          actor: { type: 'staff', id: requestedBy },
          correlationId,
          payload: {
            creatorId,
            reason,
            requestedBy,
            erasedAt: new Date().toISOString(),
          },
          occurredAt: new Date(),
        });
      }
    });
  } catch {
    return c.json(
      {
        error: {
          code: 'ERASURE_TRANSACTION_FAILED',
          message: 'Failed to atomically commit creator erasure and outbox event',
        },
      },
      500,
    );
  }

  if (result === 'not_found') {
    return c.json(
      { error: { code: 'NOT_FOUND', message: `Creator not found: ${creatorId}` } },
      404,
    );
  }

  if (result === 'already_erased') {
    return c.json({ status: 'already_erased', creatorId });
  }

  // Response: DB erasure and outbox event committed; search-index deletion is enqueued asynchronously
  return c.json({
    status: 'completed',
    creatorId,
    searchIndexSync: 'pending',
  });
});

/**
 * GET /creators/:id/erasure/status
 * Check if a creator has been erased.
 */
erasure.get('/:id/erasure/status', async (c) => {
  const creatorId = c.req.param('id');
  const db = c.get('db');

  const erased = await creatorRepository.isCreatorErased(db, creatorId);

  return c.json({ creatorId, erased });
});

/**
 * GET /creators/handle/:handle/block-status
 * Check if a handle is blocked (for re-ingestion pipeline).
 */
erasure.get('/handle/:handle/block-status', async (c) => {
  const handle = c.req.param('handle');
  const platform = c.req.query('platform') ?? 'instagram';
  const db = c.get('db');

  const blocked = await creatorRepository.isHandleBlocked(db, handle, platform);

  return c.json({ handle, platform, blocked });
});

export { erasure };
