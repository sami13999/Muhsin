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

const { eraseCreator, isCreatorErased, isHandleBlocked } = creatorRepository;

const erasure = new Hono();

/**
 * POST /creators/:id/erasure
 * Execute GDPR Tier 2 erasure for a creator.
 *
 * Body: { reason: string (min 10 chars), requestedBy: string }
 * Response: { status: 'completed' | 'not_found' | 'already_erased', creatorId: string }
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

  // Execute erasure
  const db = c.get('db');
  const result = await eraseCreator(db, creatorId);

  if (result === 'not_found') {
    return c.json(
      { error: { code: 'NOT_FOUND', message: `Creator not found: ${creatorId}` } },
      404,
    );
  }

  if (result === 'already_erased') {
    return c.json({ status: 'already_erased', creatorId });
  }

  // Emit erasure event (ADR-020 — in same transaction conceptually)
  // Note: In production, this would be wrapped in db.transaction()
  // For now, emit outside transaction as the erasure is already committed
  try {
    await emitEvent(db as Parameters<typeof emitEvent>[0], {
      eventId: crypto.randomUUID(),
      type: EVENT_TYPES.CREATOR_ERASED,
      schemaVersion: 1,
      scopeClass: 'GCP',
      actor: { type: 'staff', id: requestedBy },
      correlationId: crypto.randomUUID(),
      payload: {
        creatorId,
        reason,
        requestedBy,
        erasedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    });
  } catch {
    // Event emission failure is non-fatal for erasure
    // The erasure itself is committed
  }

  return c.json({ status: 'completed', creatorId });
});

/**
 * GET /creators/:id/erasure/status
 * Check if a creator has been erased.
 */
erasure.get('/:id/erasure/status', async (c) => {
  const creatorId = c.req.param('id');
  const db = c.get('db');

  const erased = await isCreatorErased(db, creatorId);

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

  const blocked = await isHandleBlocked(db, handle, platform);

  return c.json({ handle, platform, blocked });
});

export { erasure };
