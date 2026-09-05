---
type: security
doc-id: 21
status: draft
created: "2026-07-05"
---

# Doc-21: Security, Privacy & Compliance

## Overview

Security posture, privacy obligations, and compliance frameworks for MUSHIN platform.

## Authentication & Authorization

- JWT-based authentication with `sub` claim
- RBAC via [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] roles
- API key support for workspace-scoped access
- See [[03-API/Doc-20-API-Design|API Design]]

## Data Protection

- PII encryption at rest (GCP KMS)
- GDPR erasure via [[02-Database/tables/gcp/gcp.creator|gcp.creator]].pii_erased_at
- Contact data gated by [[02-Database/tables/wp/wp.reveal|wp.reveal]] (credit-gated)

## Compliance

- **GDPR** — User consent tracking via [[02-Database/tables/wp/wp.consent-state|wp.consent_state]]
- **SOC 2** — Admin audit trail via [[02-Database/tables/platform/platform.admin-audit-log|platform.admin_audit_log]]
- **PCI DSS** — Payment data handled by Paddle (out of scope)

## Threat Model

- API authentication bypass
- SQL injection (mitigated by parameterized queries)
- PII exposure (mitigated by encryption + reveal gating)

## References

- [[05-Security-Legal/Doc-28-Legal-Data-Governance|Legal & Data Governance]]
- [[06-Operations/Doc-22-Infrastructure|Infrastructure]]
- [[03-API/Doc-20-API-Design|API Design]]
- [[01-Architecture/Doc-17-System-Architecture|System Architecture]]
