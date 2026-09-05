---
title: GET /api/v1/credits/balance
type: api-endpoint
module: m10
date: 2026-07-05
status: draft
tags: [api, billing, credits]
---

# 🔌 `GET /v1/credits/balance`

> [!abstract] Purpose
> Returns the current credit balance for the workspace, including available, reserved, and lifetime consumed amounts.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** Any authenticated user with workspace access
- **Tenancy:** Returns balance for the specified workspace only

## Request

### Headers
```
Authorization: Bearer <jwt>
X-Workspace-Id: <uuid>
```

### Response `200 OK`
```json
{
  "data": {
    "workspace_id": "uuid",
    "balance": 1500.00,
    "reserved": 25.00,
    "available": 1475.00,
    "lifetime_consumed": 525.00,
    "currency": "credits",
    "plan_tier": "pro",
    "renews_at": "2026-08-01T00:00:00Z",
    "breakdown": {
      "subscription_credits": 1500.00,
      "purchased_credits": 0.00,
      "bonus_credits": 0.00
    }
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| CREDIT_001 | 404 | Workspace not found or no credit balance |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| All | 120 req | 1 minute |

## Tenancy Notes

- Reads from [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]] (materialized balance)
- `available = balance - reserved`
- `reserved` reflects active [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]] rows
- Balance updated atomically via `SELECT FOR UPDATE` (ADR-026)
- Nightly reconciliation job verifies balance matches ledger SUM from [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]]
