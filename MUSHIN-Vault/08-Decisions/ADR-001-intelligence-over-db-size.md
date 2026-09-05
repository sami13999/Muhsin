---
type: adr
adr-id: "ADR-001"
status: accepted
date: "2026-07-05"
deciders: []
---

# ADR-001: Intelligence Over DB Size

## Status

Accepted

## Context

MUSHIN needs to balance database size with intelligent data processing. Storing all raw data leads to bloat; intelligent processing can reduce storage while maintaining value.

## Decision

Use AI/ML processing to enrich and compress data before storage, rather than storing raw platform data indefinitely.

## Consequences

### Positive

- Reduced storage costs
- Faster query performance
- Better data quality through enrichment

### Negative

- Processing latency for enrichment
- Dependency on AI/ML services
- Potential data loss if processing fails

## References

- [[08-Decisions/_ADR-Index|ADR Index]]
- [[02-Database/tables/gcp/gcp.enrichment-snapshot|Enrichment Snapshot]]
- [[02-Database/tables/gcp/gcp.creator|gcp.creator]] — payload_completeness_tier
- [[04-Functions/workers/discovery-worker|Discovery Worker]]
