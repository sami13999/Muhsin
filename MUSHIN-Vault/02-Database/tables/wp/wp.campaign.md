---
title: wp.campaign
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, campaign]
---

# 🗄 `wp.campaign`

> [!abstract] Purpose
> Core campaign entity representing a marketing initiative or collaboration. Tracks lifecycle from draft through completion with budget and timeline metadata.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| name | text | NOT NULL | Campaign display name |
| status | text | NOT NULL, DEFAULT 'draft' | Enum: draft, active, paused, completed, archived |
| start_date | date | | Planned start date |
| end_date | date | | Planned end date |
| budget_amount | numeric(12,2) | | Total campaign budget |
| budget_currency | text | DEFAULT 'USD' | ISO 4217 currency code |
| description | text | | Campaign brief/summary |
| created_by | uuid | NOT NULL, FK → wp.app_user.id | User who created the campaign |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_camp_workspace | workspace_id | Btree | All campaigns in workspace |
| idx_camp_status | status | Btree | Filter by status |
| idx_camp_dates | start_date, end_date | Btree | Date range queries |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `created_by` FK (many-to-one): Campaign creator
- **[[wp.campaign-brief-version]]** → campaign_id FK (one-to-many): Brief revision history
- **[[wp.campaign-creator]]** → campaign_id FK (one-to-many): Assigned creators
- **[[wp.task]]** → campaign_id FK (one-to-many): Campaign tasks

## Lifecycle & Retention

- Soft-archive via status = 'archived'
- Budget immutable once status = 'active' (requires adjustment entry)
- Retained indefinitely for historical reporting
- Campaign tasks managed via [[02-Database/tables/wp/wp.task|wp.task]]
