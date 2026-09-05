---
type: webhook
provider: paddle
status: draft
created: "2026-07-05"
---

# Paddle Webhook

## Purpose

Handle Paddle payment events and sync subscription state.

## Events Handled

| Event | Action |
|-------|--------|
| subscription.created | Create [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]] |
| subscription.updated | Update subscription status |
| payment.succeeded | Credit [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]] |
| payment.failed | Update subscription to past_due |

## Verification

HMAC-SHA256 signature verification using Paddle webhook secret.

## Idempotency

- Raw payloads stored in [[02-Database/tables/platform/platform.paddle-webhook-raw|platform.paddle_webhook_raw]]
- Duplicate events detected via [[02-Database/tables/platform/platform.processed-event-ledger|platform.processed_event_ledger]]
- INSERT ON CONFLICT DO NOTHING for idempotent processing

## Related

- [[03-API/_API-MOC|API MOC]]
- [[02-Database/tables/wp/wp.paddle-subscription|Paddle Subscription]]
- [[02-Database/tables/wp/wp.entitlement-catalog|Entitlement Catalog]]
