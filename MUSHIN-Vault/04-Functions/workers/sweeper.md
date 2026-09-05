---
type: worker
name: sweeper
status: draft
created: "2026-07-05"
---

# Sweeper

## Purpose

Clean up stale, expired, and orphaned records across the database.

## Trigger

- Cron schedule: Every 60 seconds

## Processing Logic

1. Release expired [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]] (WHERE expires_at < now() AND status = 'active')
2. Delete expired [[02-Database/tables/gcp/gcp.inflight-url-lock|gcp.inflight_url_lock]] (WHERE expires_at < now())
3. Purge completed [[02-Database/tables/platform/platform.outbox|platform.outbox]] events (older than 7 days)
4. Archive old [[02-Database/tables/wp/wp.interaction-timeline|wp.interaction_timeline]] entries (older than 12 months)
5. Clean orphaned [[02-Database/tables/wp/wp.file-attachment|wp.file_attachment]] records (no parent reference for 48h)

## Tables Accessed

| Table | Access | Purpose |
|-------|--------|---------|
| [[02-Database/tables/wp/wp.credit-reservation\|wp.credit_reservation]] | Read/Write | Release expired holds |
| [[02-Database/tables/gcp/gcp.inflight-url-lock\|gcp.inflight_url_lock]] | Delete | Remove expired locks |
| [[02-Database/tables/platform/platform.outbox\|platform.outbox]] | Delete | Purge old events |
| [[02-Database/tables/wp/wp.interaction-timeline\|wp.interaction_timeline]] | Archive | Move to cold storage |
| [[02-Database/tables/wp/wp.file-attachment\|wp.file_attachment]] | Delete | Remove orphaned files |

## Error Handling

- Each sweep operation is independent (partial failure allowed)
- Alerting on sweep job failures
- Retry on transient errors (connection timeouts)

## Observability

- Logs: Records cleaned per table, execution duration
- Metrics: Sweep duration, records deleted, errors
- Alerts: Sweep job failure, high orphan count
