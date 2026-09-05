---
type: api
doc-id: 20
status: draft
created: "2026-07-05"
---

# Doc-20: API Design

## Overview

API design principles, versioning strategy, and authentication patterns for MUSHIN platform.

## Authentication

- Bearer token (JWT) with `sub` claim
- API key for workspace-scoped access
- See [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]

## Versioning

- URL path versioning: `/v1/`, `/v2/`
- Backward compatibility maintained within major versions

## Error Handling

- Standard error format: `{"error": {"code": "E001", "message": "..."}}`
- See [[03-API/error-catalogue|Error Catalogue]]

## Rate Limiting

| Tier | Default Limit |
|------|---------------|
| Free | 60 req/min |
| Pro | 300 req/min |
| Enterprise | 1000 req/min |

## Endpoints

- [[03-API/_API-MOC|API MOC]] — Full endpoint listing
- [[03-API/endpoints/m1-identity/get-workspaces|M1: Identity]]
- [[03-API/endpoints/m2-creator-store/get-creator|M2: Creator Store]]
- [[03-API/endpoints/m3-search/post-search|M3: Search]]
- [[03-API/endpoints/m4-discovery/post-discovery-jobs|M4: Discovery]]
- [[03-API/endpoints/m10-billing/get-credits-balance|M10: Billing]]

## Webhooks

- [[03-API/webhooks/paddle|Paddle Webhooks]]
- [[03-API/webhooks/gmail|Gmail Webhooks]]
- [[03-API/webhooks/outlook|Outlook Webhooks]]

## References

- [[03-API/_API-MOC|API MOC]]
- [[03-API/error-catalogue|Error Catalogue]]
- [[01-Architecture/Doc-17-System-Architecture|System Architecture]]
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]
