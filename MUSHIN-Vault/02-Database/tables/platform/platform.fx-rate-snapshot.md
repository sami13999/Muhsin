---
title: platform.fx_rate_snapshot
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, fx_rate_snapshot]
---

# 🗄 `platform.fx_rate_snapshot`

> [!abstract] Purpose
> Foreign exchange rate snapshots for multi-currency support. Rates are captured periodically and used for billing conversions and reporting.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| base_currency | text | NOT NULL | ISO 4217 base currency code (e.g., "USD") |
| quote_currency | text | NOT NULL | ISO 4217 quote currency code (e.g., "EUR") |
| rate | numeric(12,6) | NOT NULL, CHECK (rate > 0) | Exchange rate: 1 base = X quote |
| source | text | NOT NULL | Rate provider: ecb, openexchangerates, manual |
| captured_at | timestamptz | NOT NULL | When rate was captured |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_fx_pair_captured | base_currency, quote_currency, captured_at DESC | Btree | Latest rate per currency pair |
| idx_fx_captured | captured_at | Btree | Time-based queries |
| idx_fx_pair | base_currency, quote_currency | Btree | Active pair lookups |

## Relationships

- No FK relationships — reference data table
- **[[wp.paddle-subscription]]** → used for multi-currency billing (indirect)
- **[[wp.entitlement-catalog]]** → price_currency (indirect): Currency conversion

## Lifecycle & Retention

- Captured daily from European Central Bank (ECB) feed
- Latest rate per pair materialized for fast billing lookups
- Historical rates retained for 24 months for audit
- Manual overrides allowed (source = 'manual') for rate corrections
- Used by [[03-API/endpoints/m10-billing/get-credits-balance|M10: Billing]] for multi-currency support
- Referenced by [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]] for billing
