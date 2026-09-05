/**
 * Event emission via transactional outbox (ADR-020).
 * The outbox write MUST be in the same DB transaction as the state change.
 */
import { randomUUID } from 'node:crypto';
import type { EventEnvelope } from './envelope.js';

/**
 * Atomically emit an event to the outbox within the caller's transaction.
 * ADR-020: state change + event MUST be in the same DB transaction.
 *
 * Usage:
 *   await db.transaction(async (tx) => {
 *     await tx.insert(gcp.creator).values(...);  // state change
 *     await emitEvent(tx, envelope);              // event in same tx
 *   });
 */
export async function emitEvent(
  tx: { insert: (table: unknown) => { values: (vals: unknown) => Promise<unknown> } },
  envelope: EventEnvelope,
): Promise<void> {
  const { outbox } = await import('@mushin/database');

  await tx.insert(outbox).values({
    eventId: envelope.eventId,
    eventType: envelope.type,
    schemaVersion: String(envelope.schemaVersion),
    scopeClass: envelope.scopeClass.toLowerCase() as 'gcp' | 'wp' | 'platform',
    workspaceId: envelope.workspaceId ?? null,
    actorType: envelope.actor.type,
    actorId: envelope.actor.id,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId ?? null,
    payload: envelope.payload,
    occurredAt: envelope.occurredAt,
    dispatchedAt: null,
  });
}

/**
 * Check if an event has already been processed by a consumer group.
 * Used by consumers before processing (ADR-020 idempotency).
 */
export async function isEventProcessed(
  db: { select: (fields: unknown) => { from: (table: unknown) => { where: (cond: unknown) => Promise<unknown[]> } } },
  consumerGroup: string,
  eventId: string,
): Promise<boolean> {
  const { processedEventLedger } = await import('@mushin/database');
  const { eq, and } = await import('drizzle-orm');

  const results = await db
    .select({ eventId: processedEventLedger.eventId })
    .from(processedEventLedger)
    .where(
      and(
        eq(processedEventLedger.consumerGroup, consumerGroup),
        eq(processedEventLedger.eventId, eventId),
      ),
    );

  return results.length > 0;
}

/**
 * Mark an event as processed by a consumer group.
 * Call AFTER successful processing, within the same transaction as the side-effect.
 */
export async function markEventProcessed(
  tx: { insert: (table: unknown) => { values: (vals: unknown) => Promise<unknown> } },
  consumerGroup: string,
  eventId: string,
): Promise<void> {
  const { processedEventLedger } = await import('@mushin/database');

  await tx.insert(processedEventLedger).values({
    consumerGroup,
    eventId,
    processedAt: new Date(),
  });
}
