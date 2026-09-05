---
title: "Repository Structure"
status: Active
last_updated: 2026-07-09
tags: [meta, repo, monorepo]
---

# Repository Structure

## Root Layout

```
D:\New folder (2)\MUSHIN 2.0\
├── mushin-2.0/              ← Canonical monorepo root
├── MUSHIN-Vault/            ← Obsidian vault (29 design docs + notes)
├── spikes/                  ← Prototype code
│   ├── ponytail/            ← Ponytail library spike
│   └── apify-llm-validation/
├── MUSHIN-MASTER-DOCS-11-29.md  ← Combined reference doc
├── .env                     ← Root env (legacy — prefer mushin-2.0/.env)
└── .obsidian/               ← Obsidian config
```

## Monorepo (`mushin-2.0/`)

```
mushin-2.0/
├── .github/workflows/ci.yml   ← CI pipeline (build, lint, format, typecheck, test, gitleaks)
├── apps/
│   └── workers/               ← SQS worker fleet
│       └── src/
│           ├── index.ts       ← Worker entry point
│           └── worker.ts      ← EventWorker framework (SQS consumption, idempotency)
├── packages/
│   ├── adapters/              ← External service adapters (ADR-022)
│   │   └── src/
│   │       ├── meilisearch/   ← Meilisearch adapter (search)
│   │       ├── llm/           ← LLM adapter (Groq T-A/T-B, Anthropic T-C)
│   │       ├── paddle/        ← Paddle adapter (billing) — NEW Phase 2
│   │       ├── serper/        ← Serper adapter (Google SERP) — NEW Phase 5
│   │       ├── apify/         ← Apify adapter (scraping) — NEW Phase 5
│   │       └── shared/        ← Shared adapter types
│   ├── api/                   ← Hono API server
│   │   └── src/
│   │       ├── middleware/     ← tenancy, error-handler
│   │       ├── routes/        ← m1-workspace, m2-creator, m3-search, m4-billing
│   │       ├── services/      ← entitlement, enrichment, CRM, outreach, analytics,
│   │       │                    similarity, discovery, cross-platform
│   │       └── __tests__/     ← 11 test files, 128 tests
│   ├── config/                ← Environment config (Zod validated)
│   ├── database/              ← Drizzle ORM + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── enums/     ← 21 PostgreSQL enum definitions
│   │   │   │   ├── gcp/       ← 6 tables (creator, profile, enrichment_snapshot, etc.)
│   │   │   │   ├── wp/        ← 10 tables (workspace, membership, billing, etc.)
│   │   │   │   └── platform/  ← 2 tables (outbox, processed_event_ledger)
│   │   │   ├── identity/      ← ADR-029 identity resolution scoring — NEW Phase 3
│   │   │   ├── migrations/    ← Migration runner
│   │   │   ├── repositories/  ← workspace, creator, credit (ADR-026)
│   │   │   └── projections/   ← creator-index-projection (ADR-027)
│   │   └── drizzle.config.ts
│   ├── events/                ← Event contracts (Doc 16)
│   │   └── src/
│   │       ├── envelope.ts    ← EventEnvelope interface
│   │       ├── taxonomy.ts    ← 40+ event types across 10 families
│   │       ├── emit.ts        ← Outbox emission (ADR-020)
│   │       └── relay.ts       ← Outbox relay (FOR UPDATE SKIP LOCKED) — NEW Phase 4
│   ├── shared/                ← Shared types, errors, utils
│   └── testing/               ← Test utilities (mock DB, mock adapters, JWT helpers)
├── supabase/
│   └── migrations/            ← Raw SQL migrations (V001–V008)
│       ├── V001__schemas_roles_enums.sql
│       ├── V002__gcp_schema.sql
│       ├── V003__platform_outbox.sql
│       ├── V004__wp_core_schema.sql
│       ├── V005__rls_policies.sql         ← NEW Phase 1
│       ├── V006__billing_tables.sql       ← NEW Phase 2
│       ├── V007__minor_signal.sql         ← NEW Phase 3
│       └── V008__pgvector_embeddings.sql  ← NEW Phase 6
├── architecture-state.json    ← Open decisions, module status — NEW Phase 0
├── PHASE-SUMMARY.md           ← Phase 0-16 implementation record — NEW
├── LAUNCH-HARDENING-CHECKLIST.md ← Pre-launch checklist — NEW Phase 13
├── PRODUCTION-AUDIT.md        ← Production readiness report — NEW Phase 15
├── LIVE-INFRASTRUCTURE-AUDIT.md ← Provider validation results — NEW Phase 16
├── CREDENTIAL-STATUS.md       ← All credentials inventory — NEW
├── REDIS-FIX-INSTRUCTIONS.md  ← Redis token fix guide — NEW
├── AGENTS.md                  ← AI agent operating law
├── .env.example               ← Environment variable template (30+ vars)
├── .env                       ← Live credentials (DO NOT COMMIT)
├── package.json               ← Root package (Turborepo)
├── turbo.json                 ← Turborepo config
├── pnpm-workspace.yaml        ← pnpm workspace config
├── tsconfig.base.json         ← Shared TypeScript config (strict mode)
├── vitest.workspace.ts        ← Vitest workspace config
└── scripts/                   ← Test and utility scripts
    ├── full-search-test.ts    ← Full search validation
    ├── full-e2e-test.ts       ← End-to-end provider tests
    ├── bulk-search-redis-test.ts ← 100+ search + Redis tests
    ├── ranking-demo.ts        ← Ranking scoring demonstration
    ├── validate-providers.ts  ← Provider connectivity tests
    └── diagnose-*.ts          ← Diagnostic scripts
```

## Obsidian Vault (`MUSHIN-Vault/`)

```
MUSHIN-Vault/
├── 00-Meta/           ← DOC-001 through DOC-013, conventions, glossary
├── 01-Architecture/   ← DOC-014 through DOC-018, architecture MOC
├── 02-Database/       ← DOC-019, table specs, schema docs
├── 03-API/            ← DOC-020, endpoint specs, webhooks
├── 04-Functions/      ← Edge functions, workers
├── 05-Security-Legal/ ← DOC-021, DOC-028, DOC-029
├── 06-Operations/     ← DOC-022, DOC-023, DOC-027
├── 07-Quality-Standards/ ← DOC-024, DOC-025, DOC-026, periodic audits
├── 08-Decisions/      ← ADRs, ARB audit reports
├── 09-Registers/      ← Risk, assumption, patch registers
├── 10-Bugfixes/
└── 11-Meetings/
```

## Key Conventions

- **Single monorepo root:** `mushin-2.0/` — all code lives here.
- **No cross-schema FKs** (ADR-024): `gcp`, `wp`, `platform` schemas are isolated at DB level.
- **Module manifests:** Every module has a `manifest.yaml` (see `docs/templates/`).
- **Migrations:** Raw SQL in `supabase/migrations/`, versioned `V{N}__{description}.sql`.
- **ORM:** Drizzle for type generation + query building. Partitioned tables use raw SQL.
