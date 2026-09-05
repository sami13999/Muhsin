---
type: adr
status: Proposed
date: 2026-07-09
module: Data
related_docs: ["DOC-019", "DOC-022", "DOC-028"]
tags: [adr, data-retention, archival, r2]
---

# ADR-035: Data Retention and Archival

## Context

`interaction_timeline` and `credit_ledger_entry` are partitioned and append-only. Old partitions consume hot Postgres storage. A retention/archival strategy is needed.

## Decision

- Tables stay append-only and immutable (audit requirement, unchanged)
- Partitions older than defined threshold move to Cloudflare R2 as compressed archives
- Archival is separate from GDPR erasure (ADR-025) — both can coexist
- Retention threshold depends on DOC-028's data-governance obligations (not yet decided)

## Open Question

Retention threshold (12 months? 24?) needs answer from DOC-028 owner before hardcoding.

## Implementation Path

1. Archival job: detect partitions older than threshold
2. Export partition to R2 as compressed Parquet
3. Mark partition as archived
4. Query path: normal hot queries skip archived partitions; archived data accessible via explicit path

## Related

- [[08-Decisions/ADR-025-gdpr-erasure|ADR-025]] (GDPR erasure — different concern)
- [[05-Security-Legal/DOC-028-Legal-Terms-Data-Governance|DOC-028]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|Infrastructure]]
