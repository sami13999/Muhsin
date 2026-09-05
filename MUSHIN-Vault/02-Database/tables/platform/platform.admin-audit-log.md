---
title: platform.admin_audit_log
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, admin_audit_log]
---

# 🗄 `platform.admin_audit_log`

> [!abstract] Purpose
> Immutable audit trail for all administrative actions. Tracks who did what, when, and from where for compliance and incident investigation.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| actor_id | uuid | NOT NULL | Admin user who performed the action |
| actor_email | text | NOT NULL | Admin email (denormalized for audit trail) |
| action | text | NOT NULL | Action performed: user.suspend, workspace.delete, plan.override, etc. |
| target_type | text | NOT NULL | Entity type: user, workspace, subscription, credit |
| target_id | uuid | NOT NULL | Entity ID affected |
| details | jsonb | DEFAULT '{}' | Action-specific context (old/new values, reason) |
| ip_address | inet | | Source IP address |
| user_agent | text | | Client/user-agent string |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Action timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_aal_actor | actor_id | Btree | Actions by admin |
| idx_aal_target | target_type, target_id | Btree | Actions on an entity |
| idx_aal_action | action | Btree | Filter by action type |
| idx_aal_created | created_at | Btree | Time-based queries |

## Relationships

- No FK to gcp.creator — actor_id is platform admin, not creator
- **[[wp.workspace]]** → target_id (indirect, when target_type = 'workspace')
- **[[wp.paddle-subscription]]** → target_id (indirect, when target_type = 'subscription')

## Lifecycle & Retention

- Immutable — no updates or deletes (compliance requirement)
- Retained for 7 years per SOC 2 requirements (see [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]])
- Partitioned by `created_at` (quarterly)
- Hot partition (current quarter) for active queries
- Related events in [[02-Database/tables/platform/platform.processed-event-ledger|platform.processed_event_ledger]]
