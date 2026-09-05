---
title: API MOC
type: moc
tags: [api, moc]
---

# API Map of Content

## Endpoints by Module

### M1 - Identity & Tenancy
- [[03-API/endpoints/m1-identity/get-workspaces|GET /workspaces]]
- [[03-API/endpoints/m1-identity/post-workspaces|POST /workspaces]]
- [[03-API/endpoints/m1-identity/get-workspaces-id|GET /workspaces/{id}]]
- [[03-API/endpoints/m1-identity/post-invite-member|POST /workspaces/{id}/members]]
- [[03-API/endpoints/m1-identity/delete-member|DELETE /workspaces/{id}/members/{id}]]

### M2 - Creator Store
- [[03-API/endpoints/m2-creator-store/get-creator|GET /creators/{id}]]
- [[03-API/endpoints/m2-creator-store/get-creators|GET /creators]]
- [[03-API/endpoints/m2-creator-store/post-creators|POST /creators]]

### M3 - Search
- [[03-API/endpoints/m3-search/get-search|GET /creators/search]] — Brain 1 (filtered)
- [[03-API/endpoints/m3-search/post-nl-search|POST /creators/search/nl]] — Brain 2 (NL)
- [[03-API/endpoints/m3-search/post-quote|POST /search/quote]] — Credit cost estimate

### M4 - Billing (Webhooks)
- [[03-API/webhooks/paddle|POST /webhooks/paddle]]

## Webhooks
- [[03-API/webhooks/paddle|Paddle Webhooks]] — subscription lifecycle, payment events

## Authentication
- JWT/JWKS verification via tenancy middleware
- [[05-Security-Legal/DOC-021-Security-Privacy-Compliance|DOC-021]]

## Rate Limiting
- [[03-API/error-catalogue|Error Catalogue]]

## Services (New — implemented in Phase 2-12)
- **Entitlement Resolver:** `packages/api/src/services/entitlement.service.ts`
- **Enrichment:** `packages/api/src/services/enrichment.service.ts` — authenticity, quality, audience
- **CRM:** `packages/api/src/services/crm.service.ts` — lists, tags, members
- **Outreach:** `packages/api/src/services/outreach.service.ts` — minor_signal gating enforced
- **Analytics:** `packages/api/src/services/analytics.service.ts` — workspace, creator, benchmark
- **Similarity:** `packages/api/src/services/similarity.service.ts` — pgvector similarity
- **Discovery:** `packages/api/src/services/discovery/orchestrator.ts` — Serper→Apify→LLM
- **Cross-Platform:** `packages/api/src/services/cross-platform.service.ts` — ADR-029 scoring

## Related

- [[01-Architecture/_Architecture-MOC|Architecture]]
- [[02-Database/_Database-MOC|Database]]
- [[08-Decisions/_ADR-Index|Decisions]]
