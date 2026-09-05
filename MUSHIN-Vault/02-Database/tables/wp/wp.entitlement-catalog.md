---
title: wp.entitlement_catalog
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, entitlement_catalog]
---

# 🗄 `wp.entitlement_catalog`

> [!abstract] Purpose
> Defines available subscription plans and their feature limits. Referenced by paddle_subscription to determine workspace capabilities.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| plan_code | text | NOT NULL, UNIQUE | Machine-readable plan identifier (e.g., pro_monthly) |
| name | text | NOT NULL | Display name |
| description | text | | Plan feature summary |
| price_amount | numeric(12,2) | NOT NULL | Price per billing period |
| price_currency | text | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| billing_interval | text | NOT NULL | Enum: monthly, yearly |
| limits | jsonb | NOT NULL | Feature limits: {creators, reveals, campaigns, storage_mb, seats} |
| is_active | boolean | NOT NULL, DEFAULT true | Available for new subscriptions |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_ec_plan_code | plan_code | UNIQUE | Fast lookup by plan code |
| idx_ec_active | is_active | Btree | Filter active plans |

## Relationships

- **[[wp.paddle-subscription]]** → plan_code FK (one-to-many): Subscriptions on this plan

## Lifecycle & Retention

- Plans are never deleted; deactivated via is_active = false
- Existing subscriptions retain their plan limits at subscription time
- Limits JSONB schema versioned in application layer
- Referenced by [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]]
