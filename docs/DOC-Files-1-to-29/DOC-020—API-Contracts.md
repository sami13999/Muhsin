---
title: "Doc 20 — API Design & Contracts"
status: In Review
last_updated: 2026-07-05
tags: [api-design, rest, contracts, endpoints, authentication, rate-limiting]
phase: 6
doc_number: 20
depends_on: [Doc-14, Doc-16, Doc-17, Doc-18, Doc-19]
---

# Document #20 — API Design & Contracts

**Version:** 1.0-draft
**Status:** In Review
**Authors:** MUSHIN Architecture Team
**Review Cycle:** Pre-implementation review required before S1 development begins

---

## Executive Summary

This document defines the complete REST API surface for MUSHIN's first-party client-facing API. MUSHIN has **no public API at S1/S2** (ADR-023); all endpoints are first-party-only, served through a managed edge/WAF layer, and consumed exclusively by the MUSHIN SPA (ADR-013). This document establishes: authentication and tenancy resolution contracts, request/response envelope standards, error catalogue, rate-limiting architecture, pagination strategy, versioning policy, per-module endpoint inventories (M1–M13), job-progress polling pattern (ADR-021), webhook reception contracts for inbound third-party events, and the API evolution protocol.

Every endpoint is workspace-scoped unless it operates at the platform level (admin, auth). Every business operation is gated by entitlement checks before execution. No raw database identifiers are exposed; all public identifiers are UUIDs.

---

## Purpose & Scope

**In scope:**
- Complete endpoint inventory for modules M1–M13
- Authentication and tenancy resolution middleware specification
- Standard request/response envelope, header, and error formats
- Rate limiting at three concentric layers (edge, workspace, endpoint)
- Pagination patterns (cursor-based and offset)
- API versioning and deprecation policy
- Inbound webhook reception contracts (Paddle, Gmail, Outlook)
- Job progress polling contract (ADR-021)
- Security envelope per endpoint category
- Integration stack interface notes for adapter-touching endpoints

**Out of scope:**
- Public API (deferred to S3; trigger: ≥3 enterprise prospects requiring API access — ADR-023)
- Mobile API variants (S1 is SPA-only — ADR-013)
- GraphQL or gRPC surfaces (not in scope at S1/S2)
- Internal inter-module RPC contracts (these are internal monolith contracts, not API contracts)
- OpenAPI/Swagger spec file (this doc IS the specification source of truth; a machine-readable spec shall be generated from it in Doc 26)

---

## Non-Goals

- Designing for external developer consumption — MUSHIN has no external developers at S1/S2
- Providing a public discovery/read API over the GCP — the GCP is a private intelligence asset
- Supporting webhook outbound delivery to customer systems (S3+ feature)
- Designing admin-impersonation endpoints in this document — covered in Doc 29

---

## Objectives & Success Criteria

| Objective | Criterion |
|---|---|
| NFR-P01 compliance | Filtered search endpoint p95 < 1s |
| NFR-P02 compliance | NL/semantic search endpoint p95 < 3s |
| NFR-S01 compliance | Zero cross-workspace data in any API response |
| NFR-C01 compliance | All credit-consuming endpoints emit cost events |
| No overdraft | All credit operations use reserve-commit (ADR-026) |
| Idempotency | All mutating operations accept idempotency keys |
| Consent TOCTOU safety | All outreach endpoints perform last-gate consent check (PATCH-006) |

---

## Part A — API Philosophy & Architectural Constraints

### A1. Core Constraints

1. **First-party only (ADR-023):** The API is a private implementation detail of the MUSHIN SPA. No external consumers at S1/S2. No public documentation. No API key issuance to customers.

2. **Managed edge (ADR-023):** All traffic enters through a managed WAF/CDN layer. No custom API gateway build — managed product (Cloudflare or equivalent) handles TLS termination, DDoS protection, and IP-level rate limiting.

3. **Tenancy-first:** Every request resolves a `TenancyContext` (user, workspace, role, entitlement snapshot) before any business logic executes. No endpoint skips this middleware.

4. **Write-path isolation (ADR-018):** API endpoints never invoke LLM scoring inline. All intelligence operations are triggered asynchronously via workers. API responses are always fast, deterministic reads from the indexed GCP or WP data.

5. **Adapter exclusivity (ADR-022):** No endpoint calls external services directly. All external calls route through the Adapter Layer. This is enforced at the monolith module boundary, not enforced by the API layer itself.

6. **Idempotency-by-default:** All `POST` and `PATCH` endpoints accept an `Idempotency-Key` header. Duplicate submissions within a 24-hour window return the cached response without re-executing side effects.

### A2. URL Structure

```
Base URL:   https://api.mushin.app/api/v1/
Webhooks:   https://api.mushin.app/webhooks/
Admin:      https://api.mushin.app/api/v1/admin/   (staff identity plane only — ADR-011)
```

All paths are lowercase with hyphens. No trailing slashes. Resource collections use plural nouns. Actions that do not map cleanly to CRUD use sub-resource verbs (e.g., `/enroll`, `/cancel`, `/erase`).

### A3. Content Negotiation

- All requests: `Content-Type: application/json`
- All responses: `Content-Type: application/json`
- No XML, form-data, or multipart at this API layer (file uploads handled via pre-signed URLs to object storage)

---

## Part B — Authentication & Authorization

### B1. Authentication Model

MUSHIN uses a BaaS-provided JWT authentication layer (provider selected in Doc 22). The authentication flow:

```
1. User authenticates against BaaS auth endpoint (outside /api/v1/ prefix)
2. BaaS issues a short-lived JWT (access token, 15-minute expiry)
3. SPA includes JWT in every API request: Authorization: Bearer <jwt>
4. API middleware validates JWT signature against BaaS JWKS endpoint (cached)
5. User identity (user_id, email) extracted from JWT claims
6. TenancyContext resolved from user_id + X-Workspace-ID header
```

**Token characteristics:**
- Access token: 15-minute expiry; stateless JWT; RS256 signed
- Refresh token: 7-day expiry; opaque token; handled entirely by BaaS layer
- MUSHIN backend never stores tokens; validates only via JWKS

### B2. Staff Identity Plane (ADR-011)

Staff (admin/support) authentication uses a **completely separate auth realm** from customer auth:

```
Staff auth endpoint: (separate BaaS project / separate JWKS)
Mandatory MFA:       TOTP or WebAuthn
JWT claim:           "realm": "staff"
```

Any request to `/api/v1/admin/*` that does not carry a staff-realm JWT receives `403 Forbidden` regardless of the workspace entitlement state. Staff JWT validity is cross-workspace; staff `X-Workspace-ID` is optional (some admin endpoints operate globally).

### B3. TenancyContext Resolution

Every non-auth, non-webhook request goes through tenancy middleware in this sequence:

```
1. Extract user_id from JWT claims
2. Read X-Workspace-ID header (required for workspace-scoped endpoints)
3. Load workspace membership record → resolve role (owner/admin/member/viewer)
4. Load workspace entitlement snapshot (cached 60s; invalidated by Paddle webhook)
5. Attach TenancyContext to request: { user_id, workspace_id, role, entitlements }
6. If workspace is suspended/read-only → enforce read-only mode for mutating ops
```

**TenancyContext failure modes:**
| Condition | HTTP Status | Error Code |
|---|---|---|
| No/invalid JWT | 401 | `AUTH_TOKEN_INVALID` |
| Valid JWT, no X-Workspace-ID | 400 | `WORKSPACE_ID_REQUIRED` |
| Valid JWT, workspace not found | 404 | `WORKSPACE_NOT_FOUND` |
| User not member of workspace | 403 | `WORKSPACE_ACCESS_DENIED` |
| Workspace suspended | 403 | `WORKSPACE_SUSPENDED` |
| Feature not in entitlement tier | 403 | `FEATURE_NOT_ENTITLED` |

### B4. Role-Based Access Control

| Role | Scope | Mutate | Billing | Admin |
|---|---|---|---|---|
| `owner` | Full workspace | ✅ | ✅ | ✅ |
| `admin` | Full workspace | ✅ | ✅ read-only | ❌ |
| `member` | Assigned resources | ✅ | ❌ | ❌ |
| `viewer` | Read-only | ❌ | ❌ | ❌ |

Role requirements are documented per endpoint in Part I. Endpoints that require `owner` or `admin` return `403 ROLE_INSUFFICIENT` for lower roles.

---

## Part C — Request & Response Standards

### C1. Standard Request Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |
| `X-Workspace-ID` | ✅ (workspace endpoints) | UUID of the target workspace |
| `Content-Type` | ✅ (body requests) | `application/json` |
| `Idempotency-Key` | Recommended | Client-generated key (UUID); prevents duplicate side effects within 24h |
| `X-Request-ID` | Optional | Client-generated trace ID; echoed in response |

### C2. Standard Response Headers

| Header | Description |
|---|---|
| `X-Request-ID` | Echo of client's X-Request-ID, or server-generated UUID if not provided |
| `X-RateLimit-Limit` | Total requests allowed in current window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-Entitlement-Tier` | Current workspace subscription tier slug |
| `X-Credits-Balance` | Current usable credit balance (on credit-consuming responses only) |

### C3. Success Response Envelope

**Single resource:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

**Collection:**
```json
{
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6IjAxSlhYWCJ9",
    "has_more": true,
    "total_count": 1450
  },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

**Async job initiated:**
```json
{
  "data": {
    "job_id": "job_01JXXXXXXXXXXXXXXX",
    "status": "queued",
    "poll_url": "/api/v1/discovery/jobs/job_01JXXXXXXXXXXXXXXX",
    "estimated_duration_seconds": 45
  },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

### C4. HTTP Status Code Usage

| Code | Usage |
|---|---|
| `200 OK` | Successful GET, PATCH, PUT |
| `201 Created` | Successful POST creating a new resource |
| `202 Accepted` | POST that triggers an async job |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Validation error, malformed request |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Valid auth but insufficient permission |
| `404 Not Found` | Resource does not exist or is not accessible to workspace |
| `409 Conflict` | Idempotency key collision, or resource state conflict |
| `422 Unprocessable Entity` | Business rule violation (insufficient credits, etc.) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |
| `503 Service Unavailable` | Circuit breaker open (adapter degraded) |

---

## Part D — Error Catalogue

All error responses use the same envelope:

```json
{
  "error": {
    "code": "ERROR_CODE_SNAKE_UPPER",
    "message": "Human-readable error description",
    "details": { },
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

### D1. Authentication & Authorisation Errors (401/403)

| Code | Message | HTTP |
|---|---|---|
| `AUTH_TOKEN_INVALID` | JWT is missing, expired, or signature invalid | 401 |
| `AUTH_TOKEN_EXPIRED` | JWT access token has expired; refresh required | 401 |
| `WORKSPACE_ID_REQUIRED` | X-Workspace-ID header is required for this endpoint | 400 |
| `WORKSPACE_NOT_FOUND` | Workspace does not exist | 404 |
| `WORKSPACE_ACCESS_DENIED` | User is not a member of this workspace | 403 |
| `WORKSPACE_SUSPENDED` | Workspace subscription is suspended | 403 |
| `WORKSPACE_READ_ONLY` | Workspace is in read-only grace period; mutation not permitted | 403 |
| `ROLE_INSUFFICIENT` | Your role does not permit this action | 403 |
| `FEATURE_NOT_ENTITLED` | Your subscription tier does not include this feature | 403 |
| `STAFF_REALM_REQUIRED` | This endpoint requires staff authentication | 403 |

### D2. Validation Errors (400/422)

| Code | Message | HTTP |
|---|---|---|
| `VALIDATION_ERROR` | Request body failed schema validation; see `details` for field errors | 400 |
| `INVALID_UUID` | Provided ID is not a valid UUID | 400 |
| `INVALID_CURSOR` | Pagination cursor is malformed or expired | 400 |
| `INVALID_DATE_RANGE` | Date range is invalid or exceeds maximum window | 400 |

### D3. Credit & Billing Errors (422)

| Code | Message | HTTP |
|---|---|---|
| `CREDIT_INSUFFICIENT` | Insufficient credits; required: X, available: Y | 422 |
| `CREDIT_RESERVE_FAILED` | Credit reservation could not be completed; try again | 422 |
| `CREDIT_RESERVATION_EXPIRED` | The credit reservation for this operation has expired | 422 |
| `BILLING_STATE_INVALID` | Billing state prevents this operation | 422 |

### D4. Business Logic Errors (404/409/422)

| Code | Message | HTTP |
|---|---|---|
| `RESOURCE_NOT_FOUND` | The requested resource does not exist | 404 |
| `CREATOR_NOT_FOUND` | Creator does not exist in the Global Creator Plane | 404 |
| `DUPLICATE_IDEMPOTENCY_KEY` | Request with this idempotency key was already processed | 409 |
| `CAMPAIGN_ALREADY_COMPLETED` | Campaign is completed and cannot be modified | 409 |
| `SEQUENCE_ENROLLMENT_EXISTS` | Creator is already enrolled in this sequence | 409 |
| `CONSENT_OPT_OUT` | Creator has opted out; outreach blocked | 422 |
| `MAILBOX_NOT_CONNECTED` | No mailbox is connected to this workspace | 422 |
| `WABA_NOT_PROVISIONED` | WhatsApp Business Account not provisioned for this workspace | 422 |
| `JOB_NOT_CANCELLABLE` | Job is in a terminal state and cannot be cancelled | 409 |
| `GDPR_ERASED` | Creator data has been erased per GDPR request | 404 |

### D5. Service & Rate Limit Errors (429/503)

| Code | Message | HTTP |
|---|---|---|
| `RATE_LIMIT_WORKSPACE` | Workspace API rate limit exceeded; see X-RateLimit-Reset | 429 |
| `RATE_LIMIT_ENDPOINT` | Endpoint-specific rate limit exceeded; see X-RateLimit-Reset | 429 |
| `ADAPTER_DEGRADED` | External service adapter is in degraded mode; operation not available | 503 |
| `DISCOVERY_CAPACITY` | Live Discovery capacity exceeded; retry in X seconds | 503 |

---

## Part E — Rate Limiting Architecture

Three concentric layers enforce rate limits (from Doc 17 C1):

### E1. Layer 1 — Edge / IP-Level (WAF)

Managed by the WAF/CDN provider (Cloudflare or equivalent). Not configurable per workspace.

| Protection | Limit |
|---|---|
| Flood protection | 1000 req/min per IP |
| DDoS mitigation | Managed WAF policy |
| Bot challenge | Adaptive (not applied to API traffic with valid JWT) |

### E2. Layer 2 — Workspace / Subscription-Tier Level

Applied by API middleware after TenancyContext resolution. Limits vary by subscription tier.

| Tier | Requests/min | Discovery jobs/hour | Enrichment calls/day |
|---|---|---|---|
| Free / Trial | 60 | 5 | 20 |
| Starter | 300 | 20 | 100 |
| Pro | 1000 | 60 | 500 |
| Agency | 3000 | 200 | 2000 |

Rate limit state is stored in a fast in-memory store (Redis-class, separate from PostgreSQL). Window is sliding 60-second.

### E3. Layer 3 — Endpoint-Specific Limits

Applied per user (not per workspace) for computationally expensive endpoints:

| Endpoint | Limit |
|---|---|
| `POST /api/v1/discovery/jobs` | 10 concurrent active jobs per workspace |
| `POST /api/v1/creators/add-by-url` | 50/hour per user |
| `POST /api/v1/search` (Brain-2 path) | 20/min per user |
| `POST /api/v1/sequences/{id}/enroll` (batch) | 100 enrollments/request |

### E4. Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 947
X-RateLimit-Reset: 1751721600
```

On `429` responses, a `Retry-After` header is also included (seconds until reset).

---

## Part F — Pagination Strategy

### F1. Cursor-Based Pagination (large/unbounded collections)

Used for: Timeline, Credit Ledger, Discovery Results, Notification stream, Admin audit log.

**Request:**
```
GET /api/v1/timeline?cursor=eyJpZCI6Ii4uLiJ9&limit=50
```

**Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6Ii4uLiJ9",
    "has_more": true,
    "total_count": null
  }
}
```

- `cursor` is an opaque base64-encoded continuation token (encodes `occurred_at + entry_id`)
- `limit` default: 25; max: 100
- `total_count` is `null` for partitioned tables (count is too expensive); returned for bounded collections
- Cursor is valid for 24 hours; expired cursor returns `INVALID_CURSOR` error

### F2. Offset Pagination (bounded/small collections)

Used for: Workspace members, Campaign creators, List creators, Sequences, Notifications.

**Request:**
```
GET /api/v1/campaigns?offset=0&limit=20
```

**Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total_count": 87,
    "has_more": true
  }
}
```

- `limit` default: 20; max: 100
- `total_count` always returned for offset-paginated collections

---

## Part G — Versioning Policy

### G1. URL Versioning

All endpoints are versioned under `/api/v1/`. A version increment to `/api/v2/` requires:
- A breaking change (field removal, type change, semantic change)
- Documented migration path
- 90-day deprecation window running both versions in parallel
- Change-Control-Log entry

### G2. Additive-Only Evolution

Within `/api/v1/`, only additive changes are permitted:
- ✅ New optional request fields
- ✅ New response fields
- ✅ New endpoints
- ✅ New error codes
- ❌ Removing request/response fields
- ❌ Changing field types
- ❌ Changing HTTP method for existing endpoints
- ❌ Changing status code semantics

### G3. Deprecation Signaling

Deprecated fields are flagged with a `X-Deprecated-Fields: field_name` response header and a `deprecated: true` annotation in the spec. Consumers have 90 days to migrate before a version increment.

---

## Part H — Idempotency Protocol

All `POST` and `PATCH` endpoints support idempotency via the `Idempotency-Key` header:

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Behaviour:**
- If a request with this key was completed within 24h, the cached response is returned with status `200` (not `201`)
- If a request with this key is in-flight, returns `409 DUPLICATE_IDEMPOTENCY_KEY` until complete
- Key scope: per workspace + per user (same key from different workspaces is treated as different)
- Keys expire after 24h; after expiry, re-using the key triggers a fresh execution

---

## Part I — Module API Surfaces

### I1. M1 — Identity & Tenancy Kernel

Authentication endpoints are outside the `/api/v1/` prefix and are handled entirely by the BaaS auth layer. The following workspace/membership endpoints are exposed through the MUSHIN backend:

#### Workspace Management

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces` | Any | List all workspaces the user is a member of |
| `POST` | `/api/v1/workspaces` | — | Create a new workspace (triggers Paddle customer creation) |
| `GET` | `/api/v1/workspaces/{workspace_id}` | viewer+ | Get workspace details and entitlement snapshot |
| `PATCH` | `/api/v1/workspaces/{workspace_id}` | owner | Update workspace name, timezone, settings |
| `DELETE` | `/api/v1/workspaces/{workspace_id}` | owner | Soft-delete workspace (suspends; 30-day data retention before purge) |

#### Membership Management

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/workspaces/{workspace_id}/members` | viewer+ | List workspace members with roles |
| `POST` | `/api/v1/workspaces/{workspace_id}/members/invite` | admin+ | Invite user by email; sends BaaS invitation |
| `PATCH` | `/api/v1/workspaces/{workspace_id}/members/{user_id}/role` | owner | Change member role |
| `DELETE` | `/api/v1/workspaces/{workspace_id}/members/{user_id}` | admin+ | Remove member from workspace |
| `GET` | `/api/v1/me` | Any | Current user profile + all workspace memberships |

**Key behaviours:**
- `POST /workspaces` is not workspace-scoped (no `X-Workspace-ID` required)
- `DELETE /workspaces/{id}` requires owner role and emits a workspace suspension event to the outbox; does not immediately purge data

---

### I2. M2 — Creator Store (GCP)

These endpoints read from the GCP schema. They return workspace-scoped views (relationship data from `workspace_creator_link` merged with GCP intelligence data). No raw GCP mutations via API — the GCP is mutated only by M4/M5/M6 workers.

#### Creator Detail

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/creators/{creator_id}` | viewer+ | Full creator detail: GCP attributes + workspace relationship data |
| `GET` | `/api/v1/creators/{creator_id}/profiles` | viewer+ | All social profiles for this creator |
| `GET` | `/api/v1/creators/{creator_id}/profiles/{profile_id}` | viewer+ | Single profile with enrichment snapshot |
| `GET` | `/api/v1/creators/{creator_id}/enrichment` | viewer+ | Enrichment status, payload completeness tier, last enrichment timestamp |
| `POST` | `/api/v1/creators/{creator_id}/enrich` | member+ | Trigger deep enrichment (credit-consuming; reserves credits before dispatching) |

**Add-by-URL (triggers Brain-2 fast path):**

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/creators/add-by-url` | member+ | Add creator by social profile URL; triggers M4 minimal ingestion if not in GCP |

Request body:
```json
{
  "profile_url": "https://www.instagram.com/creator_handle/",
  "platform": "instagram",
  "workspace_list_id": "list_01JXXXXXXX"
}
```

Response: `202 Accepted` with job reference if new URL (pending M4 ingestion); `200 OK` with creator_id if URL already in GCP.

**Note:** `POST /api/v1/creators/{creator_id}/enrich` is credit-consuming. It executes the reserve-commit pattern (ADR-026): credits are reserved before the worker job is dispatched, and committed on success or released on failure.

#### Lists

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/lists` | viewer+ | List all workspace lists |
| `POST` | `/api/v1/lists` | member+ | Create a new list |
| `GET` | `/api/v1/lists/{list_id}` | viewer+ | List detail with creator count |
| `PATCH` | `/api/v1/lists/{list_id}` | member+ | Update list name/description |
| `DELETE` | `/api/v1/lists/{list_id}` | admin+ | Soft-delete list (removes list; does not delete creators) |
| `GET` | `/api/v1/lists/{list_id}/creators` | viewer+ | Paginated creators in list (with workspace relationship data) |
| `POST` | `/api/v1/lists/{list_id}/creators` | member+ | Add creator(s) to list (batch: up to 100) |
| `DELETE` | `/api/v1/lists/{list_id}/creators/{creator_id}` | member+ | Remove creator from list |

---

### I3. M3 — Search Coordinator

The Search Coordinator routes to Brain-1 (fast indexed search) or Brain-2 (Live Discovery) based on query type. The SPA always calls the same endpoint; routing is backend-determined.

#### Search

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/search` | viewer+ | Execute search query against creator index |
| `GET` | `/api/v1/search/facets` | viewer+ | Available filter facets and their value counts for current index |

**Search request body:**
```json
{
  "query": "Pakistani fashion micro-influencers Karachi",
  "filters": {
    "platform": ["instagram", "tiktok"],
    "niche": ["pk_fashion_textile"],
    "min_followers": 10000,
    "max_followers": 100000,
    "min_authenticity_score": 70,
    "payload_completeness_tier": ["rich", "standard"]
  },
  "sort": {
    "field": "authenticity_score",
    "direction": "desc"
  },
  "pagination": {
    "cursor": null,
    "limit": 25
  },
  "routing_hint": "brain1"
}
```

**`routing_hint` values:**
- `brain1` (default): Forced Brain-1 only; fast; returns only indexed creators
- `brain2`: Triggers Live Discovery job; returns `202 Accepted` with job reference
- `auto`: Backend decides based on query characteristics (if query implies undiscovered creators, routes to Brain-2)

**Search response (Brain-1):**
- `200 OK` with paginated creator list (p95 < 1s per NFR-P01)
- Each result includes: creator_id, display_name, primary_platform, follower_count, authenticity_score, payload_completeness_tier, workspace relationship status
- NL query translation is applied transparently by M3 (cached 24h per normalised query)

**Search response (Brain-2):**
- `202 Accepted` with job reference → client polls `/api/v1/discovery/jobs/{job_id}` per ADR-021

---

### I4. M4 — Live Discovery Pipeline

The Live Discovery pipeline is entirely asynchronous (ADR-021). Clients submit jobs and poll for status/results.

#### Discovery Jobs (ADR-021 Polling Protocol)

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/discovery/jobs` | member+ | Initiate a new discovery job |
| `GET` | `/api/v1/discovery/jobs/{job_id}` | viewer+ | Poll job status and progress |
| `GET` | `/api/v1/discovery/jobs/{job_id}/results` | viewer+ | Get paginated discovery results (credit-consuming on reveal) |
| `DELETE` | `/api/v1/discovery/jobs/{job_id}` | member+ | Cancel an in-progress job |
| `GET` | `/api/v1/discovery/jobs` | viewer+ | List all jobs for workspace (active + recent) |

**Job creation request:**
```json
{
  "type": "niche_discovery",
  "parameters": {
    "query": "PK fashion creators Lahore",
    "platforms": ["instagram", "tiktok"],
    "niche_hints": ["pk_fashion_textile"],
    "max_results": 50
  },
  "target_list_id": "list_01JXXXXXXX"
}
```

**Job types:**
- `niche_discovery`: Serper → Apify actor(s) → M5 → M6 pipeline
- `add_by_url`: Single URL fast-path through M4/M5 (triggered by `POST /creators/add-by-url`)
- `hashtag_discovery`: `apify/instagram-hashtag-scraper` → M5 pipeline

**Job status polling response:**
```json
{
  "data": {
    "job_id": "job_01JXXXXXXX",
    "type": "niche_discovery",
    "status": "running",
    "progress": {
      "stage": "apify_scraping",
      "completed_stages": ["serper_query", "url_dedup"],
      "percent": 45,
      "candidates_found": 23,
      "candidates_scored": 18,
      "candidates_failed": 2
    },
    "created_at": "2026-07-05T10:00:00Z",
    "estimated_completion_at": "2026-07-05T10:01:30Z"
  }
}
```

**Job status values:**
- `queued` → `running` → `completed` | `partial` | `failed` | `cancelled`
- `partial`: Some candidates succeeded, some failed (pipeline degraded)

**Polling recommendation (per ADR-021):**
- Initial poll: after 3 seconds
- Subsequent polls: every 2–5 seconds while `running`
- Progressive results available via `GET /results` even before job is `completed`
- Client library handles backoff; not enforced by API

**Intra-Job Dedup (PATCH-007):** The backend transparently deduplicates URLs within a job using `gcp.inflight_url_lock` + GCP URL lookup. The API surface does not expose this; duplicate candidates are silently deduplicated and counted in `candidates_found` without LLM double-billing.

---

### I5. M5/M6 — Standardization, Ingestion & Intelligence (no direct API surface)

M5 (standardization/ingestion) and M6 (LLM scoring) are pure worker-side modules. There are no client-facing API endpoints. Their outputs are consumed via M2 creator/profile read endpoints and the search index.

**Observable effects exposed via API:**
- `gcp.enrichment_snapshot.is_current` → surfaced in `GET /creators/{id}/enrichment`
- `payload_completeness_tier` → included in all search results and creator detail responses
- `prompt_version` / `model_version` → included in enrichment snapshot response (ADR-028 traceability)

---

### I6. M7 — CRM & Interaction Timeline

The Interaction Timeline is an append-only, workspace-scoped event log (no updates, no deletes). All entries are immutable. Filtering is handled by index-backed queries.

#### Timeline

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/timeline` | viewer+ | Workspace timeline (cursor-paginated; most recent first) |
| `GET` | `/api/v1/creators/{creator_id}/timeline` | viewer+ | Timeline for specific creator in this workspace |
| `POST` | `/api/v1/timeline/entries` | member+ | Create a manual timeline entry (note, call log, etc.) |

**Timeline filter parameters (GET):**
```
?creator_id=<uuid>
&campaign_id=<uuid>
&entry_type=outreach_sent|reply_received|note|status_change|enrichment|campaign_added
&from=2026-01-01T00:00:00Z
&to=2026-07-05T23:59:59Z
&cursor=<cursor>
&limit=50
```

**Timeline entry types** (read-only by default; `POST` creates `note`, `call_log`, `custom` types only):

| Type | Created by |
|---|---|
| `enrichment_triggered` | M5 |
| `enrichment_completed` | M5 |
| `outreach_sent` | M9 |
| `reply_received` | M9 |
| `campaign_added` | M8 |
| `campaign_stage_changed` | M8 |
| `status_changed` | User action |
| `note` | User (via POST) |
| `call_log` | User (via POST) |
| `consent_granted` | M9 |
| `consent_revoked` | M9 |

---

### I7. M8 — Campaigns

#### Campaign CRUD

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/campaigns` | viewer+ | List workspace campaigns |
| `POST` | `/api/v1/campaigns` | member+ | Create campaign |
| `GET` | `/api/v1/campaigns/{campaign_id}` | viewer+ | Campaign detail with pipeline summary |
| `PATCH` | `/api/v1/campaigns/{campaign_id}` | member+ | Update campaign (name, dates, budget, status) |
| `DELETE` | `/api/v1/campaigns/{campaign_id}` | admin+ | Soft-delete campaign |

#### Campaign Creators (Pipeline)

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/campaigns/{campaign_id}/creators` | viewer+ | Paginated creator list with pipeline stage |
| `POST` | `/api/v1/campaigns/{campaign_id}/creators` | member+ | Add creator(s) to campaign (batch: up to 50) |
| `PATCH` | `/api/v1/campaigns/{campaign_id}/creators/{creator_id}` | member+ | Update pipeline stage, notes, deal terms |
| `DELETE` | `/api/v1/campaigns/{campaign_id}/creators/{creator_id}` | member+ | Remove creator from campaign |

**Campaign pipeline stages** (workspace-configurable; defaults provided):
`prospect` → `shortlisted` → `contacted` → `negotiating` → `confirmed` → `live` → `completed` | `rejected`

**Outcome recording (S1 manual):**
```json
PATCH /api/v1/campaigns/{id}/creators/{creator_id}
{
  "stage": "completed",
  "outcome": {
    "agreed_rate_pkr": 150000,
    "deliverables_completed": 3,
    "actual_reach": 45000,
    "actual_engagement_rate": 0.034,
    "notes": "Delivered on time; strong audience response"
  }
}
```

---

### I8. M9 — Outreach (Email + WhatsApp)

All outreach endpoints are credit-consuming and enforce consent checking. The consent TOCTOU fix (PATCH-006) is implemented as middleware: the opt-out queue is prioritised over the sequence execution queue, and the adapter call is preceded by a final consent version read.

#### Sequences

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/sequences` | viewer+ | List workspace sequences |
| `POST` | `/api/v1/sequences` | member+ | Create sequence (define steps, templates, schedule) |
| `GET` | `/api/v1/sequences/{sequence_id}` | viewer+ | Sequence detail with step definitions |
| `PATCH` | `/api/v1/sequences/{sequence_id}` | member+ | Update sequence (draft state only) |
| `DELETE` | `/api/v1/sequences/{sequence_id}` | admin+ | Soft-delete sequence |
| `POST` | `/api/v1/sequences/{sequence_id}/activate` | member+ | Activate sequence (validates all steps; locks for editing) |
| `POST` | `/api/v1/sequences/{sequence_id}/pause` | member+ | Pause sequence (halts pending sends) |
| `POST` | `/api/v1/sequences/{sequence_id}/enroll` | member+ | Enroll creator(s) in sequence (batch: up to 100) |
| `GET` | `/api/v1/sequences/{sequence_id}/enrollments` | viewer+ | List enrollments with status |
| `DELETE` | `/api/v1/sequences/{sequence_id}/enrollments/{enrollment_id}` | member+ | Unenroll creator (cancels pending steps) |

**Step definition (in sequence body):**
```json
{
  "steps": [
    {
      "step_number": 1,
      "channel": "email",
      "delay_days": 0,
      "send_window": { "from": "09:00", "to": "17:00", "timezone": "Asia/Karachi" },
      "exclude_jumu_ah": true,
      "template_id": "tpl_01JXXXXXXX"
    },
    {
      "step_number": 2,
      "channel": "email",
      "delay_days": 3,
      "condition": "no_reply_to_step_1",
      "template_id": "tpl_01JXXXXXXX"
    }
  ]
}
```

**Jumu'ah exclusion:** When `exclude_jumu_ah: true`, the backend shifts sends scheduled between 12:00–14:00 PKT on Fridays to 14:00 PKT. This is enforced by the sequence scheduler, not the API layer.

#### Direct Messaging

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/messages/send` | member+ | Send a single direct message (email or WhatsApp) |
| `GET` | `/api/v1/messages/{message_id}` | viewer+ | Message detail with delivery status |

**Consent Management**

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/creators/{creator_id}/consent` | viewer+ | Current consent state for this creator in this workspace |
| `POST` | `/api/v1/creators/{creator_id}/consent` | member+ | Record consent grant with source and evidence |
| `DELETE` | `/api/v1/creators/{creator_id}/consent` | member+ | Record opt-out (immediately blocks outreach) |

**Consent opt-out** takes effect synchronously at the API layer (consent_state record updated; opt-out event emitted to priority queue). Any in-flight sequence step for this creator will perform the last-gate check (PATCH-006) and abort the send if the opt-out version has advanced.

#### Mailbox Connection Status

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/outreach/mailbox-status` | viewer+ | Connected mailboxes and their OAuth health status |
| `DELETE` | `/api/v1/outreach/mailboxes/{mailbox_id}` | owner | Revoke mailbox OAuth access |

---

### I9. M10 — Billing & Entitlements

#### Subscription & Entitlements

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/billing/subscription` | viewer+ | Current subscription state from Paddle (via entitlement cache) |
| `GET` | `/api/v1/billing/entitlements` | viewer+ | Full entitlement snapshot: tier, feature flags, limits |
| `POST` | `/api/v1/billing/portal` | owner | Generate Paddle billing portal session URL (redirect to Paddle) |

**Subscription state values** (derived from Paddle webhook state machine):
`trialing` | `active` | `past_due` | `read_only_grace` | `suspended` | `cancelled`

#### Credits

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/credits/balance` | viewer+ | Current credit balance: allowance, top-up, reserved, usable |
| `GET` | `/api/v1/credits/ledger` | owner | Paginated credit ledger (cursor-based; append-only view) |
| `GET` | `/api/v1/credits/transactions/{entry_id}` | owner | Single ledger entry detail |

**Balance response:**
```json
{
  "data": {
    "allowance_balance": 350.00,
    "topup_balance": 50.00,
    "total_balance": 400.00,
    "reserved_balance": 12.50,
    "usable_balance": 387.50,
    "allowance_expiry_at": "2026-08-05T00:00:00Z",
    "currency": "credits"
  }
}
```

**Note:** Credit reserve/commit operations are internal API calls between modules (M10 is called by M4, M6, M9 internally). They are not exposed as client-facing endpoints. The `POST /credits/reserve` internal route is an intra-monolith call, not an HTTP API endpoint.

---

### I10. M11 — Analytics Projections

Analytics endpoints serve from pre-computed projection tables (not live query). Projections are updated asynchronously by M11 workers.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | viewer+ | Workspace overview: creator count, campaign count, outreach funnel, credit spend |
| `GET` | `/api/v1/analytics/campaigns/{campaign_id}` | viewer+ | Campaign-specific metrics: pipeline conversion, ROI, engagement outcomes |
| `GET` | `/api/v1/analytics/outreach` | viewer+ | Outreach funnel: sent/opened/replied/converted rates per sequence |
| `GET` | `/api/v1/analytics/credits` | owner | Credit consumption breakdown by category (enrichment, discovery, outreach) |

**Date range parameters:**
```
?from=2026-06-01&to=2026-07-05&granularity=day|week|month
```

---

### I11. M12 — Admin & Platform Ops

Admin endpoints are protected by the staff identity plane (ADR-011). All admin actions are audit-logged.

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/workspaces` | staff | List all workspaces with subscription state |
| `GET` | `/api/v1/admin/workspaces/{workspace_id}` | staff | Workspace admin view: members, billing, usage |
| `POST` | `/api/v1/admin/workspaces/{workspace_id}/suspend` | staff | Manually suspend workspace |
| `POST` | `/api/v1/admin/workspaces/{workspace_id}/reinstate` | staff | Reinstate suspended workspace |
| `GET` | `/api/v1/admin/creators/{creator_id}` | staff | GCP creator admin view (full attributes, all workspaces linked) |
| `POST` | `/api/v1/admin/creators/{creator_id}/gdpr-erase` | staff | Trigger GDPR erasure (PII nullification per ADR-025) |
| `GET` | `/api/v1/admin/audit-log` | staff | Platform-wide audit log (paginated; filterable by actor, event_type, workspace) |
| `GET` | `/api/v1/admin/queue-health` | staff | Queue health: DLQ depths, active workers, in-flight jobs |
| `POST` | `/api/v1/admin/creators/{creator_id}/merge` | staff | Manually trigger creator identity merge (requires merge_status='candidate') |

**GDPR Erasure flow** (ADR-025):
`POST /admin/creators/{id}/gdpr-erase` → emits `creator.gdpr_erase_requested` event → M5 worker nullifies all PII fields in GCP → emits `creator.gdpr_erased` event → WP records updated with `[Removed]` labels → raw payload archive deletion scheduled (30-day window)

---

### I12. M13 — Notifications

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | viewer+ | List notifications for current user in current workspace |
| `PATCH` | `/api/v1/notifications/{notification_id}/read` | viewer+ | Mark single notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | viewer+ | Mark all notifications as read |
| `GET` | `/api/v1/notifications/preferences` | viewer+ | Get notification preferences |
| `PATCH` | `/api/v1/notifications/preferences` | viewer+ | Update notification preferences |

---

## Part J — Job Progress Polling Contract (ADR-021)

ADR-021 mandates polling v1 for all async job progress. The push upgrade trigger is: SPA polling interval degradation observed in telemetry (p95 poll cycle > 30s indicates WebSocket upgrade is warranted).

### J1. Polling Protocol

1. Client receives `202 Accepted` with `job_id` and `poll_url`
2. Client waits 3 seconds, then begins polling `GET /api/v1/discovery/jobs/{job_id}`
3. While `status == "running"`: poll every 2–5 seconds (client-side exponential backoff with max 10s interval)
4. When `status` reaches terminal state (`completed`, `partial`, `failed`, `cancelled`): stop polling
5. Fetch results from `GET /api/v1/discovery/jobs/{job_id}/results` (paginated)

### J2. Progressive Results

Results become available before job completion. The SPA should fetch from `GET /results` on each poll cycle to render progressively as candidates are scored:

```
Poll 1: status=running, candidates_scored=5  → GET /results?limit=25 → render 5 rows
Poll 2: status=running, candidates_scored=18 → GET /results?cursor=... → render 13 more
Poll 3: status=completed, candidates_scored=31 → GET /results?cursor=... → render 13 more
```

### J3. Job Expiry

Job records and results are retained for 72 hours after completion. After 72 hours, `GET /jobs/{id}` returns `404 RESOURCE_NOT_FOUND`. The SPA must save desired results to a list before job expiry.

---

## Part K — Webhook Reception Contracts

Inbound webhooks from third-party services are received at `/webhooks/*`. These endpoints do not require user authentication (they use payload signature verification instead).

### K1. Paddle Webhooks (`POST /webhooks/paddle`)

**Security:** Paddle signature verification using per-source HMAC secret (ADR-022, R-SEC-007). Signature in `Paddle-Signature` header. Any request with invalid or missing signature returns `401`.

**Processed event types:**
| Paddle Event | MUSHIN Action |
|---|---|
| `subscription.created` | Upsert entitlement; emit `entitlement.updated` to outbox |
| `subscription.updated` | Update tier/limits; emit `entitlement.updated` |
| `subscription.cancelled` | Mark cancelled; begin grace period |
| `subscription.past_due` | Transition to past_due state |
| `transaction.completed` | Create credit ledger entry (top-up) |
| `transaction.payment_failed` | Increment failed_payment_count; trigger dunning |

**Idempotency:** Paddle webhook handler uses event_id as idempotency key. Duplicate deliveries are silently acknowledged (200 OK) without re-processing.

**State machine:** Entitlement state transitions are validated against the allowed state machine before application. Invalid transitions are rejected and logged to `platform.outbox` for manual review.

### K2. Gmail Push Notifications (`POST /webhooks/gmail`)

**Security:** Google-signed JWT in `Authorization: Bearer <google-jwt>`. Verified against Google's JWKS. Workspace mailbox association verified from `historyId` to `mailbox_id` mapping.

**Processed events:**
- New message in watched mailbox → M9 reply-detection worker triggered
- Token expiry notification → OAuth re-auth flow prompted to workspace user

**Privacy constraint (ADR-010):** MUSHIN never performs full mailbox sync. Reply detection operates only on thread IDs matching known outreach sends.

### K3. Outlook Push Notifications (`POST /webhooks/outlook`)

**Security:** Microsoft subscription validation token during setup; thereafter, `ClientState` secret verification per Microsoft notification spec.

Same reply-detection behaviour as Gmail.

---

## Part L — Security Envelope

### L1. Injection Prevention

- All query parameters and path segments validated against allow-lists before use in database queries
- No dynamic SQL construction from user input; all queries use parameterised statements (ORM/query builder enforced)
- Scraped content from Apify actors is treated as untrusted data-only at all API boundaries (R-SEC-006)
- Prompt injection defence: Creator-provided content reaching LLM prompts is framed as structured data, not instructions

### L2. Sensitive Data Handling

- No card data or PII flows through MUSHIN API (Paddle MoR handles all — NFR-S03)
- OAuth tokens stored encrypted at rest; never returned in API responses
- Creator contact records (emails, phone numbers) are workspace-revealed only (explicit reveal action; credit-consuming; logged to timeline)
- GDPR-erased creator records return `404 GDPR_ERASED` not field-nullified data

### L3. Tenancy Isolation (NFR-S01)

Every data-layer query is parameterised with `workspace_id` from TenancyContext. No endpoint accepts a `workspace_id` in the request body that can override the TenancyContext. The `workspace_id` is always sourced from the resolved TenancyContext, not from client-provided data.

### L4. Audit Logging

All admin operations (staff plane) are written to `platform.admin_action_log` synchronously before the action executes (audit-first invariant from ADR-011). All credit-consuming operations are written to the credit ledger atomically (ADR-026). All consent changes are written to `wp.consent_state` and emitted to the interaction timeline atomically.

---

## Part M — Adapter-Touching Endpoint Notes

Endpoints that indirectly trigger adapter calls (via workers) are subject to adapter circuit breaker states (ADR-022):

| Endpoint | Adapter(s) Involved | Degraded Behaviour |
|---|---|---|
| `POST /discovery/jobs` | Serper, Apify (`apify/instagram-scraper`, `clockworks/tiktok-scraper`, `apify/instagram-hashtag-scraper`) | Brain-1-only degraded posture; job returns `partial` status |
| `POST /creators/{id}/enrich` | Apify actors (platform-dependent), YouTube Data API v3, Instagram/YouTube Comment Scrapers | Returns `503 ADAPTER_DEGRADED` with circuit-breaker state; credits not reserved |
| `POST /messages/send` | Gmail/Outlook OAuth adapter | Returns `503 ADAPTER_DEGRADED`; message not sent; credits not consumed |
| `POST /webhooks/paddle` | Paddle API read (fetch-to-heal reconciliation) | Logs inconsistency; queues reconciliation retry |

**Sandbox parity (ADR-022 obligation 7):** All adapter-touching endpoints behave identically in sandbox mode (test environment) using Paddle Sandbox, Gmail test accounts, and Apify actor test datasets. No mock-only paths.

---

## Part N — API Evolution & Deprecation Policy

### N1. Backward Compatibility Commitment

Within `/api/v1/`, MUSHIN commits to additive-only evolution. The SPA is the sole consumer, so breaking changes are coordinated deployments, not versioned API contracts. However, the additive-only rule is enforced to facilitate future public API readiness (S3 trigger from ADR-023).

### N2. Deprecation Process

1. Field/endpoint marked `deprecated` in spec with target removal date (min. 90 days from announcement)
2. `X-Deprecated-Fields` response header added
3. Deprecation entry added to Change-Control-Log
4. SPA migrated before removal date
5. Version increment (`/api/v2/`) created if breaking change cannot be avoided

### N3. Public API Readiness (S3 Trigger)

When ≥3 enterprise prospects request API access (ADR-023 trigger), the following additional work is required before public API launch:
- OpenAPI 3.1 spec generated from this document (Doc 26)
- API key management system added (Paddle-backed or custom)
- Per-key rate limiting layer added
- Webhook outbound delivery system designed
- Developer portal and documentation site

---

## Dependency Mapping

| Dependency | Direction | Nature |
|---|---|---|
| Doc 14 (System Architecture) | Inbound | Module boundary definitions, TenancyContext model |
| Doc 15 (AI Search Architecture) | Inbound | Query translation, routing ladder, Brain-1/Brain-2 contract |
| Doc 16 (Event Architecture) | Inbound | Outbox pattern, async job protocol |
| Doc 17 (Integration Contracts) | Inbound | Adapter contract, rate limit constraints, webhook security |
| Doc 18 (Domain Model) | Inbound | Entity definitions, PATCH-006 consent TOCTOU |
| Doc 19 (Physical Schema) | Inbound | Table/column names used in response schema descriptions |
| Doc 21 (Security & Compliance) | Outbound | Security envelope details handed off to Doc 21 |
| Doc 22 (Infrastructure) | Outbound | BaaS JWT provider selection, managed edge/WAF selection |
| Doc 24 (Testing Strategy) | Outbound | API contract testing, idempotency test class requirements |
| Doc 26 (CI/CD) | Outbound | OpenAPI spec generation from this document |

---

## Assumptions & Constraints

| ID | Assumption | Confidence | Impact if False |
|---|---|---|---|
| A-021 | Gmail/Outlook APIs permit sequence automation within ToS at our scale | Med-High | Outreach scope reduction |
| A-031 | Paddle webhook payloads + API reads suffice for full state machine | Med-High | State machine rework |
| A-060 | Polling-v1 acceptable UX for discovery jobs (with progressive results) | Med-High | ADR-021 trigger fires early → WebSocket upgrade |
| A-065 | Mailbox polling intervals achieve reply-detection latency <15 min worst case | Med-High | Push upgrade for reply detection pulled forward |

---

## Risk Register (API-Specific)

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-TEC-011 | Non-idempotent consumer → duplicate side effects (double sends, double credits) | M | H | Idempotency test class mandatory per consumer; idempotency key enforcement at API layer |
| R-ARC-001 | TOCTOU race: consent checked at eligibility; opt-out races with adapter call | L-M | Critical | PATCH-006: priority queue + last-gate consent version check at M9 |
| R-SEC-007 | Webhook secret/credential leak enables forged money events | L | Critical | Per-source secrets; signature verification; secret-store isolation; rotation |
| R-FIN-007 | Webhook/entitlement drift grants unpaid access | M | H | Idempotency + fetch-to-heal + daily reconciliation |
| R-SEC-006 | Prompt injection via scraped content | M | H | Payload treated as data-only; grounding validator at M6 |

---

## Alternatives Considered

### Alt-1: GraphQL instead of REST

**Rejected:** GraphQL provides flexible client-driven queries, reducing over-fetching. However, it adds complexity (schema introspection, N+1 query risks), complicates rate limiting at the field level, and introduces an additional layer between the API and the physical schema. Given that MUSHIN has exactly one client (the SPA) and no external consumers at S1/S2, the GraphQL flexibility value does not justify the cost. REST with well-defined response shapes for known use cases is sufficient. Revisit at S3 if developer API surface requires it.

### Alt-2: Per-module versioned APIs (e.g., `/billing/v1/`, `/search/v2/`)

**Rejected:** Per-module versioning creates a fragmented API surface that is difficult to reason about holistically. Uniform `/api/v1/` prefix with additive evolution is simpler to maintain, document, and test. Module-level breaking changes will be handled as coordinated deployments rather than independent versioning.

### Alt-3: Server-Sent Events (SSE) instead of polling for job progress

**Rejected for S1 (ADR-021):** SSE provides a cleaner UX for progressive updates. However, SSE connections are long-lived and require infrastructure support (connection limits, proxy buffering). For S1 with tens/hundreds of concurrent users, polling is simpler to implement and operate. ADR-021 defines the push upgrade trigger: if polling degradation is observed in telemetry (p95 > 30s), SSE or WebSocket upgrade is authorised.

---

## Gap Analysis

| Gap | Owner | Priority |
|---|---|---|
| OpenAPI 3.1 machine-readable spec not yet generated | Doc 26 (CI/CD) | Medium — required before first external API access |
| Contact reveal endpoint not specified (M2 exposes contact_record) | This doc / Doc 21 | Medium — credit-consuming; needs privacy gate spec |
| WhatsApp template management endpoints (S2) | Not yet designed | Low — S2 feature |
| Webhook outbound delivery (customer webhooks) | S3 scope | Low |
| Refresh token rotation endpoint (BaaS-handled, but MUSHIN may need hook) | Doc 22 | Low |

---

## Cross-References & Decision Traceability

| Decision | ADR | Implemented In |
|---|---|---|
| No public API at S1/S2 | ADR-023 | Part A1, Part N3 |
| Polling v1 for job progress | ADR-021 | Part J, I4 |
| User-owned mailbox sends | ADR-010 | I8, K2, K3 |
| WhatsApp via BSPs only | ADR-009 | I8 |
| Append-only credit ledger | ADR-012 | I9 |
| SELECT FOR UPDATE reserve-commit | ADR-026 | I9, D3 |
| GDPR PII nullification tombstone | ADR-025 | I11, D4 |
| Synchronous index projection for new creators | ADR-027 | I4 (dedup) |
| Prompt version score scoping | ADR-028 | I5 |
| Consent TOCTOU fix | PATCH-006 | I8 |
| Intra-job URL dedup | PATCH-007 | J (transparent) |
| Transactional outbox | ADR-020 | K1 (webhook idempotency) |
| Separate staff identity plane | ADR-011 | B2, I11, L4 |
| Uniform Adapter Contract | ADR-022 | Part M |

---

## Open Questions

| OQ | Question | Owner | Due |
|---|---|---|---|
| OQ-20-01 | BaaS provider selection (affects JWT claim structure and JWKS endpoint format) | Doc 22 | Before S1 dev start |
| OQ-20-02 | Contact reveal: should it be a separate `POST /creators/{id}/reveal-contact` or a query param on the creator GET? | Product | Sprint 1 |
| OQ-20-03 | Creator merge API surface: should admin-triggered merges also be exposable to workspace owners for self-service? | Doc 29 (Roles) | Sprint 2 |
| OQ-20-04 | Analytics projection staleness: what is the acceptable lag for M11 projections? Does the API need to surface a `data_as_of` timestamp? | Doc 23 (Observability) | Sprint 2 |

---

## Future Revision Triggers

- BaaS provider selected (OQ-20-01) → update B1 with actual JWT claim names
- ADR-021 push upgrade trigger fires → add SSE/WebSocket endpoint spec
- ADR-023 public API trigger fires (≥3 enterprise prospects) → add API key management and public spec
- WhatsApp S2 launch → add template management and WABA provisioning endpoints
- Contact reveal endpoint design finalised (OQ-20-02) → add to M2 section
- Any new module added → corresponding API surface section required in this document

---

## Review Checklist

- [x] All modules M1–M13 have explicit API surface documentation
- [x] ADR-023 (no public API) enforced in Part A1 and N3
- [x] ADR-021 (polling v1) fully specified in Part J
- [x] ADR-026 (reserve-commit) reflected in I9 and D3 error catalogue
- [x] ADR-025 (GDPR erasure) reflected in I11 and D4 error catalogue
- [x] PATCH-006 (consent TOCTOU) enforced at I8 outreach endpoints
- [x] PATCH-007 (intra-job dedup) noted as transparent in Part J
- [x] NFR-P01 (search p95 < 1s) referenced in I3 success criteria
- [x] NFR-S01 (tenancy isolation) enforced in B3, L3
- [x] NFR-C01 (COGS telemetry) referenced at all credit-consuming endpoints
- [x] Webhook signature verification specified for all three inbound channels (K1, K2, K3)
- [x] Jumu'ah exclusion window documented in I8
- [x] Apify actor stack reflected at adapter-touching endpoint notes (Part M)
- [x] YouTube Data API v3 (not Apify) reflected at I2 enrichment endpoint
- [x] Rate limiting at three layers (Part E)
- [x] Error catalogue covers all expected failure modes (Part D)
- [x] Open questions documented with owners (OQ-20-01 through OQ-20-04)

---

*[[Home]] | [[ADR-Log]] | [[Risk-Register]] | [[Doc-17-Integration-Contracts]] | [[Doc-19-Physical-Schema]]*

---

**[AWAITING APPROVAL]**
