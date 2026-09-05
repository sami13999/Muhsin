---
type: migration
version: V008
status: Applied
date: 2026-07-09
phase: 6
tags: [database, migration, pgvector, search]
---

# V008: pgvector extension and creator embeddings

**Source:** ADR-033 (Stack Pivot — pgvector alongside Meilisearch)

## Purpose

Enables semantic similarity search ("find creators like this one") using pgvector. Meilisearch continues to handle keyword/filter/facet search.

## Changes

- `CREATE EXTENSION IF NOT EXISTS vector`
- `ALTER TABLE gcp.creator ADD COLUMN embedding vector(1536)`
- `CREATE INDEX idx_creator_embedding ON gcp.creator USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- `CREATE FUNCTION gcp.find_similar_crears(...)` — similarity search function

## Design

- 1536 dimensions = OpenAI text-embedding-3-small
- IVFFlat index for approximate nearest neighbor search
- Cosine distance operator for similarity calculation
- Additive to Meilisearch — not a replacement

## Related

- [[08-Decisions/ADR-033-stack-pivot|ADR-033]]
- [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
