---
type: migration
version: V007
status: Applied
date: 2026-07-09
phase: 3
tags: [database, migration, minor-signal]
---

# V007: Add minor_signal column to gcp.creator

**Source:** ADR-029 (Identity Resolution — Minor-Safety Default)

## Purpose

Adds `minor_signal` boolean column to `gcp.creator`. When true, contact-reveal, campaign-add, and outreach-enrollment are closed by default.

## Changes

- `ALTER TABLE gcp.creator ADD COLUMN minor_signal BOOLEAN NOT NULL DEFAULT false`
- `CREATE INDEX idx_creator_minor_signal ON gcp.creator (minor_signal) WHERE minor_signal = true`

## Rationale

ADR-029: identity resolution can ship without waiting on a full child-safety policy because the commercially-risky surface is closed by default rather than open by default.

## Reversal

Requires a real product/legal decision (Decision Authority Matrix: "legal implications").

## Related

- [[08-Decisions/ADR-029-identity-resolution|ADR-029]]
- [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
