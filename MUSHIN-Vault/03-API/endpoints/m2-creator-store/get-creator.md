---
title: GET /api/v1/creators/{creator_id}
type: api-endpoint
module: m2
date: 2026-07-05
status: draft
tags: [api, creator-store, creators]
---

# 🔌 `GET /v1/creators/{creator_id}`

> [!abstract] Purpose
> Retrieve a creator's public profile data. Reveals contact information only if the workspace has an active reveal for this creator.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** Any authenticated user with workspace access
- **Tenancy:** Creator is global (gcp.creator); contact data gated by workspace reveals

## Request

### Headers
```
Authorization: Bearer <jwt>
X-Workspace-Id: <uuid>
```

### Path Parameters
| Param | Type | Description |
|---|---|---|
| creator_id | uuid | Creator identifier |

### Query Parameters
| Param | Type | Default | Description |
|---|---|---|---|
| include | string | null | Comma-separated: profile, contacts, niches, analytics |

### Response `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "platform": "youtube",
    "handle": "@creator",
    "display_name": "Creator Name",
    "avatar_url": "https://...",
    "bio": "...",
    "follower_count": 150000,
    "engagement_rate": 0.045,
    "yt_subscriber_count": 150000,
    "yt_view_count": 5000000,
    "niches": [
      {"code": "tech_reviews", "confidence": 0.95, "is_primary": true}
    ],
    "contacts": [
      {"contact_type": "email", "contact_value": "***@***.com", "verified": true}
    ],
    "reveal_status": "revealed"
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| CREATOR_001 | 404 | Creator not found |
| CREATOR_002 | 403 | Contact data not revealed (insufficient credits) |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Free | 100 req | 1 minute |
| Pro | 500 req | 1 minute |
| Enterprise | 2000 req | 1 minute |

## Tenancy Notes

- Creator data is global ([[02-Database/tables/gcp/gcp.creator|gcp.creator]]) — not workspace-scoped
- Contact fields masked unless workspace has active [[02-Database/tables/wp/wp.reveal|wp.reveal]] for this creator
- PII fields (email, phone) returned as masked `***@***.com` unless revealed
- GDPR-erased creators return 404 with CREATOR_001
