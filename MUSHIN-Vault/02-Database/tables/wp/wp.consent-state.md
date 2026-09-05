---
title: wp.consent_state
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, consent_state]
---

# 🗄 `wp.consent_state`

> [!abstract] Purpose
> Records user consent for data processing, marketing communications, and GDPR/CCPA compliance. Includes version column for PATCH-006 TOCTOU (Time-of-Check-Time-of-Use) protection.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| user_id | uuid | NOT NULL, FK → wp.app_user.id | User who consented |
| consent_type | text | NOT NULL | Enum: data_processing, marketing_email, marketing_sms, analytics, third_party_sharing |
| granted | boolean | NOT NULL | True = consented, False = revoked |
| version | integer | NOT NULL, DEFAULT 1 | Optimistic lock for TOCTOU protection on PATCH |
| ip_address | inet | | IP at time of consent (audit trail) |
| user_agent | text | | Browser/client at time of consent |
| created_at | timestamptz | NOT NULL, DEFAULT now() | When consent was recorded |
| expires_at | timestamptz | | When consent expires (NULL = indefinite) |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cs_user_type | user_id, consent_type | UNIQUE | One active consent per type per user |
| idx_cs_workspace | workspace_id | Btree | All consents in workspace |
| idx_cs_expires | expires_at | Btree | Find expired consents for cleanup |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `user_id` FK (many-to-one): Consenting user

## Lifecycle & Retention

- PATCH operations must include `version` for TOCTOU check (PATCH-006)
- If version mismatch on PATCH, return 409 Conflict
- Expired consents treated as revoked
- Retained for 7 years post-expiry for regulatory compliance (see [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]])
