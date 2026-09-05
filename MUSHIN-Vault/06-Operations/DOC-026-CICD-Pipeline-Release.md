# Document 26: CI/CD Pipeline & Release Management

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 21 (Security), Doc 22 (Infrastructure), Doc 23 (Observability), Doc 24 (Testing), Doc 25 (Standards)
**Governing ADRs:** ADR-017, ADR-019, ADR-020, ADR-022, ADR-026, ADR-027, ADR-028
**Applied Patches:** PATCH-003 (partition gate), PATCH-004/005/006/009/010 (suite gating and infra deploy paths)

---

## 1. Pipeline Architecture Overview

### 1.1 Platform Selection — GitHub Actions

- **Selection gates:** OIDC federation to AWS IAM (Doc 22 §4 — no long-lived CI cloud keys, hard requirement), native Vercel/Railway/Neon integrations, matrix + reusable workflows, per-job secret scoping, merge queue support.
- Pipeline definitions are **pipeline-as-code**: `.github/workflows/*.yml` plus reusable composite actions under `.github/actions/`. Workflow changes are reviewed like any code — and changes to *deploy* workflows require two approvals (CODEOWNERS, extending Doc 25 §2's sensitive-domain rule: the pipeline is itself a privileged system).
- **Merge queue:** MRs merge through a queue that runs the release-blocking suite against the *merged* result — eliminating "green on branch, red on main" races on a trunk-based repo (Doc 25 §2).

### 1.2 Stage Graph

```
[Static Analysis] ──┬── [Unit] ──────────────┐
                    ├── [Build & Package] ────┤
                    └── [Prompt Eval]* ───────┤
                                              ▼
                          [Integration] ── [Contract]
                                              ▼
                                     [Deploy Staging]
                                              ▼
                                     [Staging Smoke]
                                              ▼
                                          [E2E]
                                              ▼
                                 [Production Promotion Gate]
                                              ▼
                                    [Deploy Production]
                                              ▼
                                  [Post-Deploy Verification]

Nightly/pre-release (parallel track): [Performance] [Security-Extended] [Adapter Sandbox] [Contract Drift]
```
\* Prompt Eval runs only when `prompts/**` changes.

**Parallelization rules:** Static, Unit, Build, and Prompt Eval fan out in parallel from the same commit (no interdependencies). Integration waits on Static only (fail fast on lint before paying for a Neon branch). Contract runs alongside late Integration shards. Everything downstream of Deploy Staging is strictly sequential — deploys are not parallelizable events.

### 1.3 Caching Strategy

| Cache | Mechanism | Key |
|---|---|---|
| Dependencies | `pnpm` store cache (Actions cache) | lockfile hash |
| Build artifacts | Turborepo remote cache (§11) | task hash (inputs + deps) |
| Test results | Turborepo cache — unchanged modules' unit tests are cache hits, not re-runs | task hash |
| Container layers | Registry layer cache | Dockerfile + context hash |

**Cache poisoning guard:** remote cache writes only from `main` and merge-queue runs; branch pipelines read-only. A cache-restored test result is trusted only because its inputs hash identically — Turborepo's model, stated here as policy.

---

## 2. Build Stages

### 2.1 Static Analysis Stage (~3 min, fail-fast)

Runs as parallel jobs within the stage:

| Check | Source |
|---|---|
| ESLint incl. all six custom MUSHIN rules (`no-raw-sql`, `no-advisory-session-lock`, `no-cross-plane-join`, `metric-attribute-allowlist`, `no-c1-in-logs`, `adapter-import-boundary`) | Doc 25 §1.1 |
| Prettier check | Doc 25 §1.1 |
| `tsc --noEmit` strict | Doc 25 §1.1 |
| Migration linter (runs only when `migrations/**` changes; enforces the five rules of Doc 25 §5) | Doc 22 §6.2 |
| Tenancy annotation audit (`@TenancyExempt` inventory diff — new exemptions flagged for the two-approver path) | Doc 21 §2.2 |
| Secret scanning (gitleaks-class, full diff) | Doc 21 §6.2 |
| License allowlist check (lockfile changes only) | Doc 25 §9 |
| Dependency vulnerability scan; critical CVE → repo-wide merge block flag | Doc 21 §8, Doc 25 §9 |
| commitlint on MR title (squash-merge message) | Doc 25 §2 |

### 2.2 Unit Test Stage (~5 min)

- Module-scoped via Turborepo (§11): only changed modules + dependents execute; the rest are cache hits.
- Coverage ratchet enforced per module manifest (`coverage_gate`, Doc 24 §2.1 / Doc 25 §4) — the ratchet's high-water marks are stored as a repo artifact updated on main merges.
- Property suites (ledger, identity resolution, pagination — Doc 24 §2.3) run in **reduced-iteration mode per-MR** (20 iterations, fixed seeds) and full randomized mode nightly (≥100 iterations, per Doc 24 §7).
- Prompt snapshot tests (Doc 24 §2.4): render + schema snapshots; content-change-without-version-bump fails here.

### 2.3 Integration Test Stage (~12 min)

**Provisioning preamble (composite action `provision-ci-env`):**
1. Create Neon branch `ci-<pipeline_id>` from the migration-baseline branch (a maintained branch with schema + minimal seed, so per-pipeline setup applies only *new* migrations — keeps A-075's <60 s target realistic).
2. Apply pending migrations; run schema assertions (RLS presence per `wp.*` table, PATCH-003 index existence, partition layout).
3. Create SQS queues `ci-<pipeline_id>-*` (full class set incl. FIFO + DLQs) via a scoped IAM role that can only create/delete `ci-*`-prefixed resources.
4. Seed synthetic corpus (pinned seed per suite, Doc 24 §1.3).

**Suites (sharded across 4 runners):**
- **The ten ARB patch suites (Doc 24 §3.1) — release-blocking, every MR.** PATCH-004 runs both direct and pooled-connection variants (R-INF-001 gate).
- DB integration: RLS raw-SQL sweep, generated columns, migration forward-compat (previous app version's repository suite vs. new schema — Doc 24 §3.2).
- Queue integration: FIFO per-key ordering, DLQ, priority-by-class, outbox relay crash/redelivery (Doc 24 §3.3).
- Adapter tests against **conformance fakes** (real sandbox runs are nightly only — provider flakiness must not block merges, Doc 24 §3.4).

**Teardown (always-runs, even on failure):** destroy Neon branch + `ci-*` queues; a nightly janitor deletes any orphaned `ci-*` resources older than 6 h (R-CI-003 mitigation).

### 2.4 Contract Test Stage (~4 min)

- API contract tests: response schemas, all 35 error codes, rate-limit headers, pagination contracts (Doc 24 §8).
- Adapter conformance suite vs. every adapter's fake (seven ADR-022 obligations, Doc 25 §7).
- Webhook fixture contracts (Paddle/Gmail/Outlook recorded fixtures).
- LLM output schema contracts on golden-set fixtures.
- **OpenAPI diff:** spec generated from route schemas (A-080) → diffed against the committed Doc 20 inventory → breaking changes (removed endpoint, narrowed type, new required field) fail with a labeled report; additive changes require the inventory file updated in the same MR (keeping Doc 24 §6.1's tenancy sweep auto-enrollment honest).

### 2.5 Build & Package Stage (~6 min, parallel with tests)

- Next.js production build (Vercel build output API).
- Worker container image: multi-stage Dockerfile, distroless runtime, SBOM generated and attached, image signed (cosign) — deploy stages verify signatures (supply-chain, R-ENG-004 adjacency).
- **Module manifest cross-checks** (Doc 25 §4): declared API surface vs. generated OpenAPI; declared metrics vs. static emission scan; declared suites exist and are in the pipeline graph.
- **Prompt eval pipeline** (conditional on `prompts/**`): golden-set conformance + quality regression + injection eval set (Doc 25 §6.1 steps 1-3); cost delta report posted as an MR comment; **promotion label check** — the `cpo-cost-gate-approved` label (applied only by CPO role) is required for merge when a prompt version bump is present (ADR-028 gate, mechanized).

### 2.6 Deploy Staging Stage

Sequence (strictly ordered):
1. **Migration gate job:** apply migrations to staging DB → verify (schema assertions + **next-month Timeline partition existence check**, Doc 22 §6.2) → proceed only on green. A migration failure stops everything before any app deploy.
2. Vercel staging deployment (aliased atomically).
3. Worker fleet rolling deploy to staging (drain-then-replace).
4. **Staging smoke** (Doc 24 §10.4 suite pointed at staging): login, search, canary-workspace job create+poll, webhook receiver health, consumer liveness. Red smoke → staging marked broken, main frozen for deploys until fixed (fix-forward or revert MR).

---

## 3. E2E, Performance & Security Stages

### 3.1 E2E Stage (merge-to-main, ~25 min)

The five journeys of Doc 24 §4 against staging with sandbox providers: onboarding, Two Brains full flow (reserve → discover → poll → PATCH-009 searchability → settle), Paddle lifecycle (incl. duplicate-webhook and suppressed-webhook heal cases), outreach sequence (clock-controlled Jumu'ah + PATCH-006 last-gate), GDPR erasure E2E. **E2E green is a production promotion gate** — production never receives a build whose E2E didn't pass on staging.

### 3.2 Performance Stage (nightly + pre-release, not per-MR — Doc 24 R-QA-005)

- k6 NFR suites (P01/P02/P03) against staging at S2-scale corpus; **trend gate:** p95 regression >10% vs. 7-day baseline fails and blocks the next production promotion until triaged.
- Ledger contention at 500-concurrent scale; Timeline 24-month query set; queue/outbox throughput; Meilisearch sync-write p99 (A-069 tracking).
- Results published to a Grafana dashboard — performance history is an artifact, not a CI log.

### 3.3 Security Stage (nightly + pre-release)

- Full tenancy endpoint sweep (per-MR runs a changed-endpoints subset; nightly runs all of Doc 20's inventory).
- Prompt injection corpus through the staging Brain 2 pipeline (Doc 24 §6.3, differential assertions).
- Webhook forgery matrix, OAuth theft simulation, staff-plane separation tests (Doc 24 §6.4).
- DAST scan against staging (Doc 21 §8 weekly commitment satisfied by nightly).
- Annual external pentest is scheduled *outside* CI but its findings enter as required-fix gates on the release checklist.

### 3.4 Nightly Auxiliary Tracks

Adapter sandbox runs (all six Apify actors vs. canary panel, Paddle sandbox lifecycle, mail test tenants, BSP sandbox — Doc 24 §3.4); webhook contract drift detection (Doc 24 §8, A-031 watch); full-iteration race matrix (Doc 24 §7); flaky-test detector updating the quarantine list (Doc 24 §9).

---

## 4. Environment Provisioning

- **Neon branches:** lifecycle per §2.3; baseline branch refreshed weekly (migrations + reseed) to keep per-pipeline migration application shallow.
- **Queue namespaces:** `ci-*` creation via the scoped provisioner role; Terraform manages *shared* queues (dev/stg/prod), the provisioner action manages *ephemeral* ones — the split keeps Terraform state free of transient resources.
- **Secret injection:** GitHub OIDC → AWS IAM role per workflow, with **per-stage role granularity**: Static/Unit stages get *zero* cloud credentials; Integration gets the `ci-provisioner` role; Deploy Staging gets staging-scoped roles; Deploy Production gets prod deploy roles gated by environment protection rules (required reviewers on the `production` environment = the human promotion approval, §9). Provider tokens (Vercel, Railway, Neon API) live in GitHub environment-scoped secrets synced from the central secret manager (Doc 22 §4 single source of truth).
- **No pipeline stage can read a secret it doesn't need** — the Doc 22 §4 stage-scoping requirement realized via GitHub environments + job-level secret references.

---

## 5. Deployment Strategy

### 5.1 Web Tier (Vercel)

- Preview deployment per branch (MR reviewers get a URL; preview uses dev-tier providers, never prod data).
- Staging and production are aliased atomic deployments; **promotion is an alias flip of the already-built, already-staged artifact** — production deploys exactly the bytes E2E tested, never a rebuild.

### 5.2 Worker Fleet (Railway)

- Rolling drain-then-replace (Doc 22 §6.1): SIGTERM → stop polling → finish in-flight (bounded by job timeout) → exit; redelivery via at-least-once + idempotent consumers (ADR-020) covers hard kills.
- **Canary step (production only):** deploy one worker instance on the new image consuming `q-discovery-standard`; hold 15 minutes; automated comparison of canary vs. fleet on `adapter.errors`, job failure rate, and processing latency; healthy → fleet rollout; unhealthy → canary killed, promotion reverted, Sev3 raised.
- Images pinned by digest (not tag) in the deploy manifest — rollback re-pins the previous digest (§6).

### 5.3 Database Migrations

- Pre-deploy gate job order: **migrate → verify → deploy app** (Doc 22 §6.2). Expand-contract (Doc 25 §5) guarantees the running previous version tolerates the migrated schema, so the gate job and app deploy need not be atomic.
- Contract-phase migrations additionally require: the expand-phase release has been in production ≥1 release cycle (checked via migration metadata linking expand→contract MRs, Doc 25 §5).
- Partition pre-creation is the monthly scheduled job (Doc 22 §5); the deploy gate's existence check is the backstop, never the creator.

---

## 6. Rollback Procedures

| Tier | Mechanism | Time | Notes |
|---|---|---|---|
| Web | Vercel alias revert to previous deployment | Instant | One command / one click; previous deployment always retained |
| Workers | Re-pin previous image digest → rolling redeploy | ~5 min | Queue durability means rollback = brief throughput dip, no loss |
| Config/flags | Flag revert (§7) — preferred first response when the change was flag-wrapped | Instant | Try the flag before the deploy rollback |
| Database | **Never rolled back with the app.** Expand-contract means old app + new schema is safe. Data-corruption events → PITR restore (Doc 22 §8) + fetch-to-heal reconciliation for Paddle-sourced state (R-FIN-007) + ledger reconciliation replay (ADR-012 auditability) | ≤4 h RTO | Sev1 path, runbook in Doc 27 |

- **Auto-rollback:** post-deploy smoke failure (§10) triggers automatic web alias revert + worker re-pin, then pages (Sev2) — rollback first, diagnose second.
- **Quarterly drill** (Doc 24 §10.3) exercises the full manual path including worker re-pin and a PITR restore-to-staging; drill results feed Doc 27's runbook accuracy.

---

## 7. Feature Flag Management

- **Platform: Unleash** (self-hostable-later, managed now) — selection gates: server-side evaluation (flags must not require shipping evaluation logic + flag data to clients for workspace-scoped gating), audit log of flag changes, API for CI integration. LaunchDarkly is functionally superior but cost-disproportionate at S1 (integration-first ≠ price-insensitive).
- **Evaluation:** server-side only at S1/S2; flag context = `workspace_id`, `user_id`, `env`. Client receives resolved booleans via the session payload — no flag SDK in the browser (smaller attack/perf surface, consistent with ADR-023's no-public-API posture).
- **Lifecycle:** `draft → active → deprecated → removed`, with **flag debt control:** every flag declares an owner and an expiry review date in the module manifest (`flags_owned`, extending Doc 25 §4); CI warns on flags past review date; a flag `deprecated` >2 releases must be removed (lint on flag-key references).
- **Release integration:** risky features ship flag-wrapped and dark; deploy ≠ release. Kill-switch flags are mandatory for: new adapters, prompt-pipeline behavior changes, and outreach scheduling changes (the domains where Doc 21/24 concentrate risk).
- **A/B testing:** out of scope at S1 (no experimentation platform); Unleash gradual rollouts (percentage by workspace) suffice for canarying features.

---

## 8. OpenAPI Spec Generation & Publication

- Generated from route schema declarations at build time (§2.4; A-080).
- **Diff gates:** breaking-change detector classifies diffs (breaking / additive / docs-only); breaking → fail unless MR carries `api-breaking-approved` label (two approvals, Doc 25 §2); additive → inventory file must be updated in-MR.
- **Publication:** spec artifact versioned per release and published to an internal developer portal (simple static docs site rendered from the spec, deployed as part of the docs pipeline). **Internal only** — ADR-023: no public API at S1/S2, so no public spec; the publication pipeline is nonetheless built now, making the eventual S3+ public API a policy change rather than an engineering project.
- The spec is also the source for: contract test generation (§2.4), tenancy sweep enrollment (Doc 24 §6.1), and Doc 20 inventory reconciliation — one artifact, four consumers.

---

## 9. Production Promotion Gates

Promotion to production requires **all** of:

1. Merge-queue pipeline green: static, unit (ratchet), integration incl. **all ten ARB patch suites**, contract, manifest cross-checks.
2. Staging deploy + smoke green.
3. E2E suite green on the exact candidate build.
4. Nightly security stage green within last 24 h (or re-run on demand); per-MR tenancy subset green.
5. Performance trend gates within budget (last nightly run; a red trend blocks until triaged).
6. Migration gate verified incl. next-month partition existence.
7. No open Sev1/Sev2 bugs (label query against the tracker, checked mechanically).
8. **Human approval on the `production` GitHub environment** (one engineer; two during the first month post-GA) — the deliberate, auditable "go" moment.
9. Worker canary healthy (15-min hold, §5.2) before fleet completion.

Gates 1-7 are mechanical; gate 8 is judgment; gate 9 is empirical. Nothing else may be added to this list without an ADR — promotion-gate creep is a named failure mode (R-CI-002).

---

## 10. Post-Deploy Verification

1. **Smoke suite** (<5 min, Doc 24 §10.4): login, Brain 1 search, canary-workspace minimal discovery job create+poll, webhook receiver health probes, queue consumer liveness. **Failure → auto-rollback (§6) + Sev2 page.**
2. **Continuous canaries resume watch:** tenancy probe (5-min cadence, Sev1 on breach — Doc 24 §6.1) and Apify canary panel (4×/day — Doc 24 §11.1) are deployment-independent but their first post-deploy cycles are explicitly checked in the deploy log.
3. **Alerting self-verification:** post-deploy job emits a synthetic test event per critical alert path (test DLQ message in a designated verification queue, synthetic error-rate blip in a sandbox metric) and confirms the alert pipeline fires to a verification channel — deploys must not silently break the *detectors* (Doc 23 §4 rules are code too, deployed via this same pipeline).
4. **Observability config deploy:** dashboards/alerts-as-code (Doc 23 §7) apply in the same production deploy stage, diffed and versioned with the release.

---

## 11. Monorepo Tooling

**Decision (resolving Doc 25 open question #1): Turborepo.**

- **Rationale:** our graph is simple (modules + shared libs + two deploy targets); Turborepo's task-hash caching model directly implements §1.3 and module-scoped CI with near-zero config; Vercel-native remote cache removes a service to operate (ADR-002 instinct). Nx's generators/plugins solve problems we don't have at 3-5 engineers; revisit at S3 if the graph deepens.
- **Module-scoped CI:** `turbo run test --filter=...[origin/main]` — changed modules + dependents execute; manifest-declared suites are wired as Turborepo tasks so the manifest and the task graph cannot diverge (Doc 25 §4 cross-check).
- **Remote cache:** Vercel remote cache; write-restricted to main/merge-queue (§1.3 poisoning guard); cache hit rates exported as a CI health metric (a collapsing hit rate silently doubles pipeline cost — watched under R-CI-001).

---

## 12. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-CI-001 (new)** | Delivery | Pipeline duration creep erodes trunk-based flow (>30 min to merge) | M-H | M | Duration budget per stage tracked on dashboard; cache hit-rate metric; module-scoped execution; quarterly pipeline review alongside Doc 25's standards review |
| **R-CI-002 (new)** | Delivery | Promotion-gate creep makes releases rare and risky | M | M-H | Gate list is ADR-controlled (§9); deploy frequency is a tracked health metric (target: ≥daily) |
| **R-CI-003 (new)** | Cost/Hygiene | Orphaned `ci-*` Neon branches / SQS queues accumulate cost | M | L-M | Always-run teardown + nightly janitor + scoped provisioner role that can *only* touch `ci-*` |
| **R-CI-004 (new)** | Security | CI compromise (malicious workflow change, poisoned action) reaches production credentials | L-M | Critical | Two-approver deploy workflows, pinned third-party actions by SHA, OIDC short-lived creds, environment protection on prod, image signing + verify-at-deploy |
| **R-CI-005 (new)** | Delivery | Auto-rollback flaps on a flaky smoke test | L-M | M | Smoke suite held to zero-flake standard (immediate quarantine bypass = fix now); rollback trigger requires 2 consecutive smoke failures |
| R-INF-002 | Infrastructure | Railway platform risk | M | H | **Strengthened:** image-digest pinning + registry independence keeps Fly.io failover a config change (Doc 22 mitigation operationalized) |

---

## 13. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-083 | GitHub Actions merge queue + environments support the promotion model at our concurrency without enterprise-tier pricing surprises | Med-High |
| A-084 | Turborepo task hashing correctly captures all test inputs (incl. migrations, fixtures, prompt files) so cache hits are always safe | Med-High (audit task `inputs` globs in week 1; wrong globs = silent test skipping — the failure mode behind R-QA-001's spirit) |
| A-085 | Per-pipeline Neon branch + queue provisioning stays under 90 s end-to-end (refines A-075 with queue creation included) | Med |
| A-086 | Unleash managed tier supports server-side evaluation latency budget (<5 ms p99 in-process cached) | High |
| A-087 | Vercel "promote staged artifact" flow (no rebuild between staging and prod) is achievable with our Next.js config | Med-High (spike; fallback is build-twice with source-hash assertion) |

**Dependencies:** Doc 24 (every suite this pipeline orchestrates), Doc 25 (every gate this pipeline mechanizes), Doc 22 (deploy targets, secret model, migration strategy), Doc 23 (alert self-verification, pipeline health metrics), Doc 27 (rollback and deploy-failure runbooks; drill schedule), Doc 29 (who may approve production environment deploys, apply `cpo-cost-gate-approved` and `api-breaking-approved` labels — label-permission mapping lands there).

**Open questions:**
1. Deploy-frequency target enforcement: soft metric vs. hard "stale main" alert when main is undeployed >48 h — recommend soft at S1.
2. Whether staging Paddle sandbox isolation (Doc 22 open question #3) requires a second sandbox account before E2E Paddle suites run in parallel pipelines — likely yes once pipeline concurrency >1; decide at CI build-out.
3. SBOM publication/retention policy (compliance-grade supply-chain evidence) — coordinate with Doc 28's audit posture.

---

**End of Document 26.**

[AWAITING APPROVAL]