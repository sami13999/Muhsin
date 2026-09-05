---
title: wp.campaign_creator
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, campaign_creator]
---

# 🗄 `wp.campaign_creator`

> [!abstract] Purpose
> Junction table assigning creators to campaigns. Tracks invitation status and compensation terms for each creator-campaign pairing.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| campaign_id | uuid | NOT NULL, FK → wp.campaign.id | Parent campaign |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Assigned creator |
| status | text | NOT NULL, DEFAULT 'invited' | Enum: invited, accepted, declined, completed, cancelled |
| fee_amount | numeric(12,2) | | Agreed compensation amount |
| fee_currency | text | DEFAULT 'USD' | ISO 4217 currency code |
| invited_at | timestamptz | NOT NULL, DEFAULT now() | When invitation was sent |
| responded_at | timestamptz | | When creator accepted/declined |
| completed_at | timestamptz | | When deliverables completed |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cc_campaign_creator | campaign_id, creator_id | UNIQUE | One assignment per creator per campaign |
| idx_cc_creator | creator_id | Btree | All campaigns for a creator |
| idx_cc_status | status | Btree | Filter by status |

## Relationships

- **[[wp.campaign]]** → `campaign_id` FK (many-to-one): Parent campaign
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Assigned creator
- **[[wp.task]]** → campaign_creator_id FK (one-to-many): Deliverable tasks

## Lifecycle & Retention

- Status transitions: invited → accepted/declined → completed/cancelled
- Fee immutable once status = 'accepted'
- Retained indefinitely for financial reconciliation
- Campaign tasks assigned via [[02-Database/tables/wp/wp.task|wp.task]]
