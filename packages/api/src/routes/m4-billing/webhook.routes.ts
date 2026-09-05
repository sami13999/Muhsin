/**
 * M4 Billing — Webhook Routes.
 * Handles Paddle webhook verification and event normalization.
 * Per ADR-031: webhook verification is synchronous at the gateway.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@mushin/database';
import type { BillingProvider } from '@mushin/adapters';
import { paddleWebhookRaw, subscriptionEvent } from '@mushin/database';
import { emitEvent } from '@mushin/events';
import { EVENT_TYPES } from '@mushin/events';

// ── Validation ───────────────────────────────────────────────

const webhookHeadersSchema = z.object({
  'x-paddle-signature': z.string().min(1),
});

// ── Route Factory ────────────────────────────────────────────

export function createBillingWebhookRoutes(
  db: Database,
  billing: BillingProvider,
) {
  const routes = new Hono();

  /**
   * POST /api/v1/webhooks/paddle
   * Receives raw Paddle webhook, verifies signature, stores raw payload,
   * normalizes event, and emits domain event via outbox.
   */
  routes.post('/paddle', async (c) => {
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // 1. Extract and validate signature header
    const signature = c.req.header('x-paddle-signature');
    if (!signature) {
      return c.json(
        { error: { code: 'WEBHOOK_SIGNATURE_MISSING', message: 'Missing x-paddle-signature header', request_id: requestId } },
        401,
      );
    }

    // 2. Read raw body
    const rawBody = await c.req.text();

    // 3. Verify signature and parse event
    const event = await billing.parseWebhook(rawBody, signature);
    if (!event) {
      return c.json(
        { error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'Invalid webhook signature', request_id: requestId } },
        401,
      );
    }

    // 4. Store raw webhook (idempotency + audit)
    const payload = JSON.parse(rawBody);
    await db.insert(paddleWebhookRaw).values({
      paddleEventId: payload['event_id'] ?? crypto.randomUUID(),
      eventType: event.type,
      rawPayload: payload,
      signature,
      verified: true,
    }).onConflictDoNothing();

    // 5. Process event based on type
    try {
      await db.transaction(async (tx) => {
        // Store normalized event
        await tx.insert(subscriptionEvent).values({
          workspaceId: extractWorkspaceId(event),
          subscriptionId: getSubscriptionId(event),
          eventType: event.type,
          status: getStatus(event),
          priceId: getPriceId(event),
          customerId: getCustomerId(event),
          amount: getAmount(event),
          currency: getCurrency(event),
          metadata: getMetadata(event),
          paddleEventId: payload['event_id'],
          occurredAt: event.occurredAt,
        });

        // Emit domain event via outbox
        await emitEvent(tx as Parameters<typeof emitEvent>[0], {
          eventId: crypto.randomUUID(),
          type: getEventTypeForOutbox(event),
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId: extractWorkspaceId(event),
          actor: { type: 'system', id: 'paddle-webhook' },
          correlationId: requestId,
          occurredAt: event.occurredAt,
          payload: event as unknown as Record<string, unknown>,
        });

        // Mark raw webhook as processed
        await tx.update(paddleWebhookRaw)
          .set({ processedAt: new Date() })
          .where(sql`${paddleWebhookRaw.paddleEventId} = ${payload['event_id']}`);
      });

      return c.json({ success: true, event_type: event.type }, 200);
    } catch (err) {
      // Record processing error on raw webhook
      const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
      await db.update(paddleWebhookRaw)
        .set({ processingError: errorMessage })
        .where(sql`${paddleWebhookRaw.paddleEventId} = ${payload['event_id']}`);

      return c.json(
        { error: { code: 'WEBHOOK_PROCESSING_ERROR', message: errorMessage, request_id: requestId } },
        500,
      );
    }
  });

  return routes;
}

// ── Helpers ──────────────────────────────────────────────────

function extractWorkspaceId(event: { type: string; metadata?: Record<string, string> }): string {
  // Workspace ID is stored in subscription metadata
  return event.metadata?.['workspace_id'] ?? '';
}

function getSubscriptionId(event: { type: string; subscriptionId?: string; subscription_id?: string }): string {
  return event.subscriptionId ?? event.subscription_id ?? '';
}

function getStatus(event: { type: string; status?: string }): string | null {
  return event.status ?? null;
}

function getPriceId(event: { type: string; priceId?: string }): string | null {
  return event.priceId ?? null;
}

function getCustomerId(event: { type: string; customerId?: string }): string | null {
  return event.customerId ?? null;
}

function getAmount(event: { type: string; amount?: number }): bigint | null {
  return event.amount ? BigInt(event.amount) : null;
}

function getCurrency(event: { type: string; currency?: string }): string | null {
  return event.currency ?? null;
}

function getMetadata(event: { type: string; metadata?: Record<string, string> }): Record<string, string> {
  return event.metadata ?? {};
}

function getEventTypeForOutbox(event: { type: string }): string {
  switch (event.type) {
    case 'subscription_created': return EVENT_TYPES.BILLING_SUBSCRIPTION_STATE_CHANGED;
    case 'subscription_updated': return EVENT_TYPES.BILLING_SUBSCRIPTION_STATE_CHANGED;
    case 'subscription_cancelled': return EVENT_TYPES.BILLING_SUBSCRIPTION_STATE_CHANGED;
    case 'payment_succeeded': return EVENT_TYPES.BILLING_WEBHOOK_RECEIVED;
    case 'payment_failed': return EVENT_TYPES.BILLING_WEBHOOK_RECEIVED;
    default: return EVENT_TYPES.BILLING_WEBHOOK_RECEIVED;
  }
}

import { sql } from 'drizzle-orm';
