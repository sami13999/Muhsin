---
type: adr
status: Recommended — pending formal adoption
date: 2026-07-09
module: Infrastructure
related_docs: ["DOC-015", "DOC-017", "DOC-022"]
tags: [adr, infrastructure, stack, migration]
---

# ADR-033: Stack Pivot

## Context

The Master Implementation Plan (2026-07-09) requested a build target that differs from what [[01-Architecture/DOC-017-Integrations-Webhooks-Gateway|DOC-017]]/[[06-Operations/DOC-022-Infrastructure-Deployment|DOC-022]] specify. This ADR documents the delta and the recommendation.

## Stack Comparison

| Layer | DOC-017/022 (original) | Current directive | Status |
|---|---|---|---|
| Database | Neon Postgres | Supabase Postgres | Cosmetic — both managed Postgres; DDL is portable |
| Search | Meilisearch Cloud | pgvector | **Not a drop-in swap** — different tools for different jobs |
| LLM routing | Groq → Claude/GPT-4o → o1 ladder | OpenAI/Ollama | Keep the ladder architecture; treat "OpenAI/Ollama" as which providers currently sit in it |
| Cache | *(none specified)* | Upstash Redis | New component |

## Recommendation

### Search: Meilisearch + pgvector alongside

Keep [[01-Architecture/DOC-015-AI-Search-Discovery-Architecture|DOC-015]]'s Meilisearch design for the search surface (keyword/filter/facet). Add pgvector *alongside* it specifically for semantic/similarity features ("find creators like this one") that Meilisearch doesn't natively do well. This is **additive, not a replacement**.

### LLM Routing: Keep the ladder architecture

The existing confidence-based escalation behind a provider-agnostic Adapter ([[08-Decisions/ADR-022-uniform-adapter-contract|ADR-022]]) is sound. "OpenAI/Ollama" describes which providers currently sit in the ladder, not a redesign. Ollama specifically implies self-hosted inference that DOC-022 never scoped — hold off until there's an actual cost/latency reason.

### Upstash Redis

New. Scope: rate-limit counters, hot-path caching (facet counts, entitlement checks). Not the outbox, not the ledger — nothing durability-sensitive.

## Implementation

- **pgvector migration:** [[02-Database/migrations/V008-pgvector-embeddings|V008]]
- **Similarity search:** `packages/api/src/services/similarity.service.ts`
- **Meilisearch adapter:** `packages/adapters/src/meilisearch/adapter.ts` (unchanged)
- **LLM adapter:** `packages/adapters/src/llm/adapter.ts` (Groq T-A/T-B, Anthropic T-C)

## Consequences

- Preserves everything DOC-015/017 already got right
- pgvector is additive — no existing search functionality lost
- LLM ladder architecture unchanged — only provider configuration differs
- Upstash Redis is a new dependency but scoped to non-durable use cases

## Related

- [[01-Architecture/DOC-015-AI-Search-Discovery-Architecture|DOC-015]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|DOC-022]]
- [[08-Decisions/ADR-022-uniform-adapter-contract|ADR-022]]
