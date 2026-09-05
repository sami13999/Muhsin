---
title: "ADR-025: GDPR Erasure = PII Nullification Tombstone"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, security, gdpr, erasure, doc-21]
---

# ADR-025: GDPR Erasure = PII Nullification Tombstone

## Status

Accepted

## Context

GDPR requires the "right to erasure." Hard-deleting rows breaks referential integrity (WP data references GCP creators). Soft-deleting with flags leaves PII in the database.

## Decision

**GDPR erasure = PII nullification tombstone. Never DELETE rows.**

When a creator requests erasure:
1. Null all PII fields: `display_name = '[erased]'`, `primary_handle = '[erased]'`
2. Set `pii_erased_at = now()` (the tombstone timestamp)
3. Emit `creator.gdpr_erased` event
4. Consumer sets `pii_deleted_at` on `wp.workspace_creator_link` rows
5. Blocklist the creator's identifiers (hashed) to prevent re-discovery

The row is retained for WP referential integrity. WP entities display "Creator [Removed]" after `pii_deleted_at`.

## Consequences

### Positive

- Referential integrity preserved (WP data still references valid GCP rows)
- Audit trail maintained (row exists, PII is gone)
- Blocklist prevents re-discovery of erased creators

### Negative

- PII must be identified and nulled across all tables
- Blocklist adds complexity to discovery pipeline
- Must verify no PII leaks through JSONB fields

## Related

- Doc 21 (Security & Privacy)
- `pii_erased_at` columns on `gcp.creator`, `gcp.profile`, `gcp.contact_record`
- `pii_deleted_at` on `wp.workspace_creator_link`
