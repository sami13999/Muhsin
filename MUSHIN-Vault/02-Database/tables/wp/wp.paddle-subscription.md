---
title: wp.paddle_subscription
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, paddle_subscription]
---

# 🗄 `wp.paddle_subscription`

> [!abstract] Purpose
> Tracks active Paddle payment subscriptions for workspaces. Links workspace billing to Paddle's subscription management with webhook-synced state.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id, UNIQUE | One active subscription per workspace |
| paddle_subscription_id | text | NOT NULL, UNIQUE | Paddle's subscription ID |
| paddle_customer_id | text | NOT NULL | Paddle's customer ID |
| plan_code | text | NOT NULL, FK → wp.entitlement_catalog.plan_code | Current plan |
| status | text | NOT NULL, DEFAULT 'active' | Enum: active, past_due, paused, cancelled, trialing |
| current_period_start | timestamptz | NOT NULL | Billing period start |
| current_period_end | timestamptz | NOT NULL | Billing period end |
| cancel_at | timestamptz | | Scheduled cancellation date |
| cancelled_at | timestamptz | | When actually cancelled |
| trial_ends_at | timestamptz | | Trial expiration (NULL = not trialing) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_ps_workspace | workspace_id | UNIQUE | One subscription per workspace |
| idx_ps_paddle_id | paddle_subscription_id | UNIQUE | Paddle webhook lookups |
| idx_ps_status | status | Btree | Filter by status |
| idx_ps_period_end | current_period_end | Btree | Find expiring subscriptions |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (one-to-one): Subscribed workspace
- **[[wp.entitlement-catalog]]** → `plan_code` FK (many-to-one): Current plan
- **[[platform.paddle-webhook-raw]]** → paddle_subscription_id (indirect): Source of subscription updates

## Lifecycle & Retention

- Synced via Paddle webhook ([[03-API/webhooks/paddle|Paddle Webhook]])
- Status transitions driven by Paddle; MUSHIN does not override
- Cancelled subscriptions retained for 12 months
