/**
 * Creator Erasure Consumer — GDPR Right-to-Erasure (ADR-025 / Step 2B.2).
 *
 * Consumes creator.erased events and deletes the corresponding creator
 * document from Meilisearch using the canonical creatorId.
 *
 * Guarantees:
 * 1. Enforces canonical creatorId (rejects missing or blank creatorId).
 * 2. Idempotent: absent documents do not cause endless retries.
 * 3. Preserves outbox guarantees: throws on transient failure so the worker
 *    does not mark the event processed or delete the message from the queue.
 * 4. Never logs sensitive creator PII (reason, email, names, handles).
 */
import type { EventHandler, ParsedEvent } from '../worker.js';
import { EVENT_TYPES } from '@mushin/events';

export interface MeilisearchDeletionTarget {
  deleteDocument: (creatorId: string) => Promise<{
    status: 'success' | 'deletion_deferred' | 'error';
    error?: string;
    reason?: string;
  }>;
}

export function createCreatorErasureHandler(
  meilisearch: MeilisearchDeletionTarget,
): EventHandler {
  return {
    eventTypes: [EVENT_TYPES.CREATOR_ERASED],

    async handle(event: ParsedEvent): Promise<void> {
      const payload = event.payload as Record<string, unknown> | undefined;
      const creatorId = (payload?.['creatorId'] ?? payload?.['creator_id']) as string | undefined;

      // Canonical key enforcement: creatorId must be present and non-empty
      if (!creatorId || typeof creatorId !== 'string' || creatorId.trim() === '') {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'error',
            service: 'creator-erasure-handler',
            message: 'Invalid or missing creatorId in creator.erased event payload',
            eventId: event.eventId,
            correlationId: event.correlationId,
          }),
        );
        // Non-recoverable validation defect: do not loop indefinitely
        return;
      }

      // Execute document deletion on Meilisearch using canonical creatorId
      const result = await meilisearch.deleteDocument(creatorId);

      if (result.status === 'error') {
        // Transient/system failure: throw so worker retries via SQS visibility timeout.
        // Outbox guarantees preserved: event is NOT marked processed in ledger.
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'error',
            service: 'creator-erasure-handler',
            message: 'Meilisearch document deletion failed',
            creatorId,
            eventId: event.eventId,
            correlationId: event.correlationId,
            error: result.error,
          }),
        );
        throw new Error(`Meilisearch document deletion failed for creatorId ${creatorId}: ${result.error}`);
      }

      if (result.status === 'deletion_deferred') {
        // Circuit breaker open: throw to defer processing until recovery
        console.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'warn',
            service: 'creator-erasure-handler',
            message: 'Meilisearch document deletion deferred (circuit breaker open)',
            creatorId,
            eventId: event.eventId,
            correlationId: event.correlationId,
            reason: result.reason,
          }),
        );
        throw new Error(`Meilisearch document deletion deferred for creatorId ${creatorId}: ${result.reason}`);
      }

      // Success (including idempotent deletion of already-absent document)
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'info',
          service: 'creator-erasure-handler',
          message: 'Meilisearch document deleted successfully for erased creator',
          creatorId,
          eventId: event.eventId,
          correlationId: event.correlationId,
        }),
      );
    },
  };
}
