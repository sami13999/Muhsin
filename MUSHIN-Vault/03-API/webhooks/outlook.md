---
type: webhook
provider: outlook
status: draft
created: "2026-07-05"
---

# Outlook Webhook

## Purpose

Handle Microsoft Outlook / Graph push notifications for email integration.

## Events Handled

| Event | Action |
|-------|--------|
| message.received | Process inbound email |
| message.updated | Update email status |

## Verification

Token validation via Microsoft Graph API.

## Related

- [[03-API/_API-MOC|API MOC]]
- [[02-Database/tables/platform/platform.processed-event-ledger|Processed Event Ledger]]
- [[03-API/webhooks/gmail|Gmail Webhook]]
