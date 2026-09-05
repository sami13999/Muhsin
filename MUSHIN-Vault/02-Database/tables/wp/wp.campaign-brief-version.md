---
title: wp.campaign_brief_version
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, campaign_brief_version]
---

# 🗄 `wp.campaign_brief_version`

> [!abstract] Purpose
> Versioned history of campaign briefs. Each edit to a campaign brief creates a new immutable version, enabling rollback and audit trail.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| campaign_id | uuid | NOT NULL, FK → wp.campaign.id | Parent campaign |
| version | integer | NOT NULL | Sequential version number (1, 2, 3...) |
| content | text | NOT NULL | Full brief text (markdown) |
| created_by | uuid | NOT NULL, FK → wp.app_user.id | User who created this version |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Version creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cbv_campaign_version | campaign_id, version | UNIQUE | One version per number per campaign |
| idx_cbv_campaign | campaign_id | Btree | All versions for a campaign |

## Relationships

- **[[wp.campaign]]** → `campaign_id` FK (many-to-one): Parent campaign
- **[[wp.app-user]]** → `created_by` FK (many-to-one): Version author

## Lifecycle & Retention

- Immutable — versions are never updated or deleted
- Latest version determined by MAX(version) WHERE campaign_id = ?
- Retained indefinitely for audit trail
