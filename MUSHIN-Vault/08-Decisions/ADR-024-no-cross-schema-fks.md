---
title: "ADR-024: No Cross-Schema Foreign Keys"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, database, schema, gcp, wp]
---

# ADR-024: No Cross-Schema Foreign Keys

## Status

Accepted

## Context

MUSHIN has three database schemas: `gcp` (Global Creator Plane), `wp` (Workspace Plane), `platform` (infrastructure). Cross-schema FKs would create tight coupling between planes and make plane separation unenforceable at the database level.

## Decision

**No database-level foreign key crosses a schema boundary.**

- `wp.workspace_creator_link.creator_id` is a plain UUID column, NOT a `.references()` call to `gcp.creator`
- The application layer is responsible for verifying that `creator_id` exists in `gcp.creator` before creating a link
- Cross-plane reads happen via composed read APIs, never via cross-plane SQL joins
- The Doc 19 schema review gate requires that NO migration adds a cross-schema FK

## Consequences

### Positive

- Plane separation is enforced structurally (not just by convention)
- Each plane can be independently scaled, backed up, or migrated
- No cascading deletes across planes
- Clear ownership boundaries (Doc 14)

### Negative

- Application must enforce referential integrity for cross-plane references
- No database-level cascade on cross-plane deletes
- More application code for validation

## Related

- Doc 14 (Module map, plane separation)
- Doc 19 Part A (Schema architecture)
- `wp.workspace_creator_link` table
