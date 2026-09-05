/**
 * Billing State Machine Consumer
 *
 * Processes billing events and updates workspace subscription state.
 * Handles subscription lifecycle transitions.
 *
 * Events consumed:
 * - billing.subscription_state_changed
 * - billing.plan_changed
 * - billing.webhook_received
 */
import type { Database } from '@mushin/database';
import type { EventHandler, ParsedEvent } from '../worker.js';

// ── State Transitions ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  'trialing': ['active', 'canceled_pending', 'expired'],
  'active': ['past_due', 'paused_grace', 'canceled_pending', 'expired'],
  'past_due': ['active', 'canceled_pending', 'expired'],
  'paused_grace': ['active', 'canceled_pending', 'expired'],
  'canceled_pending': ['expired'],
  'expired': [],
};

// ── Consumer ─────────────────────────────────────────────────

export function createBillingStateHandler(db: Database): EventHandler {
  return {
    eventTypes: [
      'billing.subscription_state_changed',
      'billing.plan_changed',
      'billing.webhook_received',
    ],

    async handle(event: ParsedEvent): Promise<void> {
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case 'billing.subscription_state_changed': {
          const subscriptionId = payload['subscriptionId'] as string;
          const newStatus = payload['status'] as string;
          const customerId = payload['customerId'] as string;

          if (!subscriptionId || !newStatus) {
            console.error(JSON.stringify({
              ts: new Date().toISOString(),
              level: 'error',
              service: 'billing-state',
              message: 'Missing required fields in subscription_state_changed',
              event,
            }));
            return;
          }

          // Look up workspace by Paddle customer ID
          const workspaceResult = await db.execute(`
            SELECT workspace_id, subscription_state
            FROM wp.workspace
            WHERE paddle_customer_id = ${customerId}
            LIMIT 1
          `);

          if (workspaceResult.length === 0) {
            console.warn(JSON.stringify({
              ts: new Date().toISOString(),
              level: 'warn',
              service: 'billing-state',
              message: `No workspace found for customer ${customerId}`,
              subscriptionId,
            }));
            return;
          }

          const workspace = workspaceResult[0]!;
          const workspaceId = workspace['workspace_id'] as string;
          const currentState = workspace['subscription_state'] as string;

          // Validate transition
          const validNext = VALID_TRANSITIONS[currentState] ?? [];
          if (!validNext.includes(newStatus)) {
            console.warn(JSON.stringify({
              ts: new Date().toISOString(),
              level: 'warn',
              service: 'billing-state',
              message: `Invalid state transition: ${currentState} -> ${newStatus}`,
              workspaceId,
              subscriptionId,
            }));
            // Still update — Paddle is the source of truth
          }

          // Update workspace subscription state
          await db.execute(`
            UPDATE wp.workspace
            SET subscription_state = ${newStatus},
                subscription_paddle_id = ${subscriptionId},
                updated_at = NOW()
            WHERE workspace_id = ${workspaceId}
          `);

          console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'billing-state',
            message: `Subscription state updated: ${currentState} -> ${newStatus}`,
            workspaceId,
            subscriptionId,
            request_id: event.correlationId,
          }));
          break;
        }

        case 'billing.plan_changed': {
          const subscriptionId = payload['subscriptionId'] as string;
          const newPlan = payload['plan'] as string;

          if (!subscriptionId || !newPlan) return;

          // Look up workspace by subscription ID
          const workspaceResult = await db.execute(`
            SELECT workspace_id
            FROM wp.workspace
            WHERE subscription_paddle_id = ${subscriptionId}
            LIMIT 1
          `);

          if (workspaceResult.length === 0) return;

          const workspaceId = workspaceResult[0]!['workspace_id'] as string;

          await db.execute(`
            UPDATE wp.workspace
            SET subscription_plan_id = ${newPlan},
                entitlement_snapshot_version = entitlement_snapshot_version + 1,
                updated_at = NOW()
            WHERE workspace_id = ${workspaceId}
          `);

          console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'billing-state',
            message: `Plan changed to ${newPlan}`,
            workspaceId,
            subscriptionId,
            request_id: event.correlationId,
          }));
          break;
        }

        case 'billing.webhook_received': {
          // Log webhook receipt for audit trail
          console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'billing-state',
            message: `Webhook received: ${payload['eventType'] ?? 'unknown'}`,
            eventId: event.eventId,
            request_id: event.correlationId,
          }));
          break;
        }
      }
    },
  };
}
