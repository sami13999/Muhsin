---
type: webhook
provider: gmail
status: draft
created: "2026-07-05"
---

# Gmail Webhook

## Purpose

Handle Gmail push notifications for email integration.

## Events Handled

| Event | Action |
|-------|--------|
| message.received | Process inbound email |
| message.updated | Update email status |

## Verification

HMAC-SHA256 signature verification using Gmail webhook secret.

## Related

- [[03-API/_API-MOC|API MOC]]
- [[02-Database/tables/platform/platform.processed-event-ledger|Processed Event Ledger]]
- [[03-API/webhooks/outlook|Outlook Webhook]]
