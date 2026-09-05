---
title: "WP Schema — Workspace Plane"
status: Active
last_updated: 2026-07-07
tags: [database, wp, schema, doc-19, workspace, billing]
---

# WP Schema — Workspace Plane

**Source:** Doc 19 Part E, F, G, H, I | **Migration:** V004 | **Schema:** `wp`

The Workspace Plane contains all tenant-scoped data. Every WP query MUST carry workspace context (NFR-S01). Absence = deny (fail-closed).

---

## Tables

### `wp.workspace`

The tenancy and billing boundary. All WP data hangs off here.

| Column | Type | Notes |
|---|---|---|
| `workspace_id` | UUID PK | |
| `name` | TEXT | |
| `slug` | TEXT UNIQUE | URL-safe identifier |
| `logo_url` | TEXT | |
| `default_timezone` | TEXT | Default `Asia/Karachi` |
| `default_currency` | TEXT | ISO 4217, default `PKR` |
| `subscription_state` | `subscription_state_enum` | trialing/active/past_due/paused_grace/canceled_pending/expired |
| `subscription_plan_id` | TEXT | Internal plan ID from Entitlement Catalog |
| `subscription_paddle_id` | TEXT | Paddle subscription ID |
| `paddle_customer_id` | TEXT | Paddle customer ID |
| `entitlement_snapshot_version` | INTEGER | Invalidation key (Doc 10 A2) |
| `trial_ends_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `wp.membership`

User × Workspace × Role. Soft-delete via `removed_at`.

| Column | Type | Notes |
|---|---|---|
| `membership_id` | UUID PK | |
| `workspace_id` | UUID FK → workspace | |
| `user_id` | UUID | Soft FK to managed auth |
| `role` | `member_role_enum` | owner/admin/member |
| `status` | `membership_status_enum` | active/pending/suspended |
| `invited_email` | TEXT | |
| `invited_at` | TIMESTAMPTZ | |
| `joined_at` | TIMESTAMPTZ | |
| `removed_at` | TIMESTAMPTZ | Soft delete |

**Unique:** `(workspace_id, user_id)`

---

### `wp.workspace_credit_balance`

Single row per workspace. SELECT FOR UPDATE target (ADR-026).

| Column | Type | Notes |
|---|---|---|
| `workspace_id` | UUID PK | |
| `balance` | BIGINT | Hard constraint: >= 0 |
| `version` | INTEGER | Optimistic lock for ADR-026 |
| `updated_at` | TIMESTAMPTZ | |

---

### `wp.credit_ledger_entry` (PARTITIONED)

Append-only ledger. Monthly range partitioned on `created_at`.

| Column | Type | Notes |
|---|---|---|
| `entry_id` | UUID | |
| `workspace_id` | UUID | |
| `entry_type` | `ledger_entry_type_enum` | allowance_grant/topup_purchase/consumption/expiry/refund_adjustment/promo_grant/reversal/reserve/release/commit |
| `amount` | BIGINT | Positive = credit in, negative = credit out |
| `reference_type` | TEXT | e.g. 'enrichment', 'live_search' |
| `reference_id` | UUID | |
| `provider_cost_snapshot` | JSONB | Margin analytics |
| `period` | TEXT | 'YYYY-MM' |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | Partition key |

**PK:** `(entry_id, created_at)` — composite required for partitioning

---

### `wp.workspace_creator_link` (ADR-024)

The GCP/WP cross-plane bridge. NO FK to `gcp.creator`.

| Column | Type | Notes |
|---|---|---|
| `link_id` | UUID PK | |
| `workspace_id` | UUID FK → workspace | |
| `creator_id` | UUID | Soft FK to gcp.creator |
| `added_by` | UUID | |
| `tags` | TEXT[] | |
| `first_linked_at` | TIMESTAMPTZ | |
| `last_active_at` | TIMESTAMPTZ | |
| `workspace_removed_at` | TIMESTAMPTZ | Tier-1 deletion |
| `pii_deleted_at` | TIMESTAMPTZ | GDPR erasure (ADR-025) |

**Unique:** `(workspace_id, creator_id)`

---

### `wp.list` and `wp.list_member`

Lists are workspace-scoped collections of creators. Members reference `workspace_creator_link`.

---

### `wp.interaction_timeline` (PARTITIONED)

Append-only workspace event log. M7 sole writer. Monthly range partitioned.

---

## Partitioning Strategy

Both `credit_ledger_entry` and `interaction_timeline` are partitioned by month on `created_at`. Partitions are pre-created M+2 (two months ahead). The partition creation job runs on the 15th of each month.

---

## RLS

All WP tables have RLS enabled (Doc 21 layer 3). Primary enforcement is via middleware (layer 1) and repository (layer 2). RLS is the safety net.
