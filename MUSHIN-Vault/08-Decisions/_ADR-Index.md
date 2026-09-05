---
type: moc
section: decisions
---

# Architecture Decision Records — Index

## Active

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [[08-Decisions/ADR-001-intelligence-over-db-size|ADR-001]] | Intelligence over DB size | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-016-two-brains-pipeline|ADR-016]] | Two Brains Pipeline | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-017-modular-monolith|ADR-017]] | Modular Monolith + Worker Fleet | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-018-write-path-intelligence|ADR-018]] | Write-Path Intelligence | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-020-transactional-outbox|ADR-020]] | Transactional Outbox | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-022-uniform-adapter-contract|ADR-022]] | Uniform Adapter Contract (7 Obligations) | Accepted | 2026-07-06 |
| [[08-Decisions/ADR-024-no-cross-schema-fks|ADR-024]] | No Cross-Schema Foreign Keys | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-025-gdpr-erasure|ADR-025]] | GDPR Erasure = PII Nullification Tombstone | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-026-select-for-update-credit|ADR-026]] | SELECT FOR UPDATE on Credit Balance | Accepted | 2026-07-05 |
| [[08-Decisions/ADR-027-synchronous-index-projection|ADR-027]] | Synchronous Index Projection | Accepted | 2026-07-06 |
| [[08-Decisions/ADR-028-batch-rescoring-cost-gate|ADR-028]] | Batch Re-Scoring Cost Gate & Governance | Accepted | 2026-07-06 |
| [[08-Decisions/ADR-029-identity-resolution|ADR-029]] | Identity Resolution Matching Algorithm | Accepted | 2026-07-09 |
| [[08-Decisions/ADR-030-credit-reservation-subscription|ADR-030]] | Credit Reservation ↔ Subscription-State Interaction | Proposed | 2026-07-09 |
| [[08-Decisions/ADR-031-queue-class-mapping|ADR-031]] | Queue-Class-to-Infrastructure Mapping | Accepted | 2026-07-09 |
| [[08-Decisions/ADR-033-stack-pivot|ADR-033]] | Stack Pivot | Recommended | 2026-07-09 |
| [[08-Decisions/ADR-034-rate-limiting-strategy|ADR-034]] | Rate Limiting Strategy | Accepted | 2026-07-09 |
| [[08-Decisions/ADR-035-data-retention-archival|ADR-035]] | Data Retention and Archival | Proposed | 2026-07-09 |
| [[08-Decisions/ADR-036-slo-error-budget|ADR-036]] | SLO and Error Budget Policy | Accepted | 2026-07-09 |
| [[08-Decisions/ADR-037-cost-circuit-breaker|ADR-037]] | Cost Circuit Breaker | Proposed | 2026-07-09 |
| [[08-Decisions/ADR-038-staff-rbac-implementation|ADR-038]] | Staff RBAC Implementation | Accepted | 2026-07-09 |
| [[08-Decisions/ADR-039-observability-implementation|ADR-039]] | Observability Implementation | Accepted | 2026-07-09 |

<!-- Add ADRs as they are created -->

## Deprecated / Superseded

<!-- Move superseded ADRs here -->

## How to Create an ADR

1. Copy [[00-Meta/Templates/tpl-adr|the ADR template]].
2. Name it `ADR-NNN-slug.md`.
3. Fill in Context, Decision, Consequences.
4. Add a row to the table above.

## Related

- [[01-Architecture/_Architecture-MOC|Architecture]]
- [[02-Database/_Database-MOC|Database]]
- [[03-API/_API-MOC|API]]
