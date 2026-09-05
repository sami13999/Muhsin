# Document 24: Testing Strategy & QA Process

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 19 (Schema), Doc 20 (API), Doc 21 (Security), Doc 22 (Infrastructure), Doc 23 (Observability)
**Governing ADRs:** ADR-011, ADR-019, ADR-020, ADR-021, ADR-022, ADR-024, ADR-025, ADR-026, ADR-027, ADR-028
**Applied Patches:** PATCH-001 through PATCH-010 (all — this document is their verification contract)

---

## 1. Testing Philosophy & Strategy

### 1.1 Test Pyramid

| Layer | Share | Target Runtime | Environment |
|---|---|---|---|
| Unit | ~70% | < 3 min full suite | In-process, no I/O |
| Integration | ~25% | < 15 min | Real Postgres (ephemeral Neon branch), real/localstack SQS, mocked external providers |
| E2E | ~5% | < 30 min | Staging, sandbox providers |

**Guiding principle:** the ARB patches exist because the failure modes are *concurrency, cross-plane, and provider-boundary* failures — none of which unit tests can catch. Therefore MUSHIN's integration layer is unusually load-bearing: **the ten ARB patch suites (§3.1) are release-blocking on every merge to main**, not nightly.

### 1.2 Shift-Left Principles

- Contract-first: Doc 20's API schema and ADR-022's adapter obligations are testable artifacts; violations fail at MR time.
- Migration linter (Doc 22 §6.2), metric-cardinality lint (Doc 23 R-OBS-003), advisory-lock ban lint (Doc 22 §1.2), and tenancy-annotation checks (Doc 21 §2.2) run as static gates *before* any test executes.
- Every alert rule in Doc 23 §4.2 that guards a mechanism (sweeper, projection retry, last-gate) has a corresponding test that deliberately triggers the mechanism — we test the *detector* as well as the behavior.

### 1.3 Test Data Management

- **Synthetic creator corpus** (Doc 22 §2.2): seeded, deterministic generator producing PK-market profiles across all 48 niche categories, with controlled distributions (follower counts, engagement rates, Urdu/Roman-Urdu/English bios, cross-platform identity clusters for PATCH-008 testing).
- **Adversarial corpus:** a versioned set of hostile payloads — prompt-injection bios, XSS handles, homoglyph names, oversized fields, malformed actor outputs — shared by security tests (§6), payload-gate tests (R-TEC-008), and grounding tests (§11.2). Grows via PIR discipline: every production incident adds its trigger payload.
- **Never real PII in tests.** Staging masked snapshots (Doc 22 §2.2) are for exploratory QA only; automated suites use synthetic data exclusively.

### 1.4 Environment Strategy

- **Unit/static:** every commit, every branch.
- **Integration:** every MR — ephemeral Neon branch + isolated queue namespace (`ci-<pipeline_id>-` prefix), torn down post-run.
- **E2E:** merge-to-main → staging deploy → E2E suite; also nightly full run.
- **Production:** smoke tests post-deploy (§10.4) + continuous tenancy canary (§6.1) + Apify canary panel (§11.1). Production testing is *read-only and canary-scoped* — no synthetic writes into customer-visible planes except the dedicated canary workspace.

---

## 2. Unit Testing Requirements

### 2.1 Coverage Targets

| Layer / Domain | Line Coverage Gate | Rationale |
|---|---|---|
| Ledger domain logic (M-billing) | 95% + branch coverage | ADR-012/026 — money |
| Consent & sequence scheduling | 95% | PATCH-006, Jumu'ah logic |
| Identity resolution state machine | 90% | PATCH-008 tier transitions |
| Adapters (unit-testable portions) | 85% | ADR-022 obligation logic |
| API handlers / validation | 85% | Doc 20 error catalogue mapping |
| Overall repo | 80% | Floor, not target |

Coverage is a **ratchet**: CI fails if a module's coverage drops below its high-water mark minus 1%. New modules declare their gate in module manifest.

### 2.2 Mocking Strategy

- **Adapters (ADR-022):** every adapter ships a **conformance fake** — an in-process implementation satisfying all seven obligations, with scriptable failure modes (timeout, rate-limit, malformed payload, degraded response, circuit-open). Application code is tested against fakes; the fake itself is tested against the recorded contract (§8.2). **Rule: application tests never mock HTTP directly** — only the adapter interface. This keeps the adapter boundary (adapter-layer exclusivity, ADR-017) real in tests.
- **Clock and randomness injected** everywhere (TTL logic, Jumu'ah windows, backoff jitter are all time-dependent — PATCH-005 and I8 tests require a controllable clock).
- **Postgres is never mocked** — repository-layer logic runs against real Postgres in the integration layer; unit tests stop at the repository interface.

### 2.3 Property-Based Testing

Applied to the invariant-dense cores, using generated operation sequences:

- **Ledger:** for any interleaving of grant/reserve/settle/release/sweep operations: (a) `usable_balance ≥ 0` always; (b) sum of ledger entries equals derived balance (ADR-012: balances derived, never mutable); (c) every reservation terminates in exactly one disposition (PATCH-005 contract totality); (d) replaying any operation is a no-op (idempotency).
- **Identity resolution (PATCH-008):** any sequence of evidence events yields a valid `merge_status`; no transition skips a confidence tier; merges are commutative where the state machine says they are.
- **Pagination:** any dataset + cursor walk yields each row exactly once, no duplicates/omissions under concurrent inserts (Doc 20 cursor contract).

### 2.4 Prompt Snapshot Testing (ADR-019)

- Every registered prompt version has snapshot tests: fixed input payload → rendered prompt text snapshot (catches accidental template drift) and → output *schema* validation against the registry-bound schema.
- Snapshots are per `(prompt_version)`; a prompt change without a version bump fails CI — the Prompt Registry's versioning discipline is enforced mechanically, and PATCH-010's provenance triple stays truthful.

---

## 3. Integration Testing

### 3.1 ARB Patch Test Suites (Release-Blocking)

Each patch has a named, owned suite. Summarized contracts:

**PATCH-001 — Bridge entity (ADR-024):**
- Link creation, idempotent re-link, unlink; hydration joins only via bridge.
- **Negative:** static analysis asserts no query text joins `gcp.*` to `wp.*` except through `workspace_creator_link`; orphan-link healing (GCP row tombstoned → link resolves to tombstone view, never 500).

**PATCH-002 — GDPR erasure (ADR-025):**
- Tier 1: workspace delete soft-deletes WP rows + link; GCP untouched; second workspace's link unaffected.
- Tier 2: all C2 fields nulled; tombstone markers set; row persists; soft FKs still resolve; re-ingestion blocklist blocks a subsequent Brain 2 encounter of the same handles; `enrichment_snapshot` cascade rules applied; R2 archive deletion event emitted; search index purged (verify via query).
- Erasure is idempotent (double-submit of same request).

**PATCH-003 — Timeline partitioning/indexes:**
- Inserts route to correct monthly partition; queries spanning partition boundaries correct.
- All 5 composite indexes exist post-migration (schema assertion) and are *used*: `EXPLAIN` assertions on the canonical Timeline query set — plans must show index scans, no seq scan on partitioned parent.
- Missing-next-month-partition condition trips the deploy-gate check (Doc 22 §6.2).

**PATCH-004 — Ledger concurrency (ADR-026):**
- N=50 parallel reservation attempts against a balance sufficient for k<50: exactly k succeed, balance never negative, no deadlocks, `version` increments correctly.
- Same test executed against **pooled connections** (transaction-mode pooler) — the R-INF-001 validation gate.
- Contention histogram (`ledger.lock_wait_ms`) emitted and sane under load (ties to Doc 23 alert).

**PATCH-005 — Sweeper:**
- Clock-advanced expiry: each reservation state maps to its contracted disposition; sweeper vs. late-settling worker race (both grab the row) → row lock serializes, both paths idempotent, final state deterministic.
- Overlapping sweeper runs no-op (advisory xact lock); swept metrics emitted.

**PATCH-006 — Consent TOCTOU:**
- Concurrent opt-out + in-flight send: opt-out lands after enqueue but before send → **last-gate check blocks the send**; `consent.last_gate_blocks` incremented; consent version recorded in the audit log.
- Priority queue: opt-out events overtake queued sends (ordering assertion across queue classes).
- Fuzzed interleavings (100 randomized schedules) — zero sends after opt-out timestamp, ever.

**PATCH-007 — Intra-job dedup:**
- Same URL twice in one job input → scraped once, both result rows resolve; `inflight_url_lock` honored across two workers processing the same job; lock TTL (15 min) expiry allows retry after worker crash (clock-advanced).

**PATCH-008 — Identity resolution:**
- Synthetic identity clusters: high-confidence auto-merge, mid-tier flagged `pending_review`, low-tier kept separate; merge fan-out updates links and snapshots; no cross-tier skips; un-merge (reversal) path preserves audit trail.

**PATCH-009 — Synchronous projection (ADR-027):**
- New creator searchable (index query returns it) **before** job result row is marked deliverable.
- Forced index failure → `projection_status='pending'`, retry via outbox with backoff, heal backstop fixes rows older than 1 h; degraded result flag present in polling payload (Doc 20 contract).

**PATCH-010 — Score invalidation (ADR-028):**
- Prompt promotion enqueues campaign; dedup key `(prompt_version, model_version)` skips already-scored snapshots at enqueue *and* execution; campaign restart after partial completion is cheap (assert LLM-fake call count); cost-gate refusal blocks enqueue entirely; re-scoring uses R2 archive via `content_hash`, never triggers scraping (assert zero Apify-fake calls).

### 3.2 Database Integration Tests

- **RLS:** for every `wp.*` table — a generated test sets `app.workspace_id` to workspace A and asserts zero visibility of workspace B rows, *bypassing* the repository layer (raw SQL) — this tests layer 3 independently of layer 2 (Doc 21 §2.2). New table without an RLS test fails a schema-coverage check (R-SEC-008 mitigation).
- **Generated columns:** `usable_balance` correctness across all ledger mutations.
- **Migration tests:** every migration applies against a snapshot of the previous schema + representative data; expand-contract verified by running previous app version's repository test suite against migrated schema.

### 3.3 Queue Integration Tests

- FIFO ordering per `MessageGroupId` (per-key ordering, ADR-020) under multi-consumer competition; cross-key parallelism confirmed.
- DLQ behavior: poison message → max receives → DLQ, `queue.dlq_depth` metric fires.
- Priority-by-queue-class semantics: high drained before standard under load; `q-rescore-low` cap respected (Doc 22 §5.3).
- Outbox relay: transactional write + relay; relay crash mid-batch → no event loss, duplicates absorbed by consumer idempotency (§7.4).

### 3.4 Adapter Integration Tests

Against **sandbox/recorded** environments, nightly (not per-MR — provider flakiness must not block merges):

- Apify: dev-token runs of all six actors against the canary panel; schema validation of outputs.
- YouTube Data API: quota-cheap endpoint smoke + quota accounting assertion.
- Paddle sandbox: full subscription lifecycle event sequence (§4.3 feeds from this).
- Gmail/Outlook: OAuth flow against test tenants; token refresh; revocation detection probe (Doc 23 §6).
- BSP sandbox: template send + status callback.

---

## 4. End-to-End Testing

Staging, sandbox providers, synthetic corpus. Critical journeys (Doc 11 UF series):

1. **UF-00 Onboarding:** signup → workspace creation → seat invite → first search (Brain 1) — asserts sub-second search on seeded index.
2. **Two Brains flow:** Brain 1 query with thin results → user triggers Live Discovery (Brain 2) → job created (credits reserved, PATCH-005 states observable) → polling (ADR-021 protocol: progressive results, terminal state) → new creators searchable immediately (PATCH-009) → credits settled → ledger and balance consistent.
3. **Paddle lifecycle:** sandbox checkout → webhook → entitlement + credit grant → upgrade → downgrade → cancellation → dunning path; each step asserts entitlement state *and* ledger entries; duplicate webhook delivery mid-sequence (idempotency, R-FIN-007); fetch-to-heal reconciliation corrects an artificially suppressed webhook.
4. **Outreach sequence:** mailbox connect (test tenant) → sequence enrollment → sends respecting schedule incl. Jumu'ah exclusion (clock-controlled staging time) → reply detection stops sequence → opt-out mid-sequence triggers last-gate block (PATCH-006 E2E confirmation).
5. **GDPR erasure E2E:** creator present in 2 workspaces → Tier 2 request → PII nullified, tombstone visible in both workspaces' UI as anonymized record, search purged, R2 archive deleted (assert object absence), blocklist prevents re-discovery in a subsequent Brain 2 job.

E2E failures block promotion to production (Doc 26 gate).

---

## 5. Performance Testing

### 5.1 NFR Budget Validation

| NFR | Budget | Method |
|---|---|---|
| NFR-P01 | Filtered search p95 < 1 s | k6 load: 10k concurrent virtual users against staging index seeded with S2-scale corpus (500k creators); **RLS overhead measured** (A-064 validation: same suite with RLS disabled on a throwaway branch, delta must be < 10%) |
| NFR-P02 | NL/semantic search p95 < 3 s | Same harness; includes LLM query-translation path with Urdu/Roman-Urdu query mix (Doc 15 B2) |
| NFR-P03 | Profile enrichment p95 < 30 s | Brain 2 single-profile enrichment with adapter fakes at recorded-latency distributions; then nightly against real sandbox actors |

Budgets are CI-enforced trend gates on staging: >10% p95 regression vs. 7-day baseline fails the release.

### 5.2 Database Performance

- **Ledger contention:** PATCH-004 suite scaled to 500 concurrent reservations across 50 workspaces; p99 `lock_wait_ms` < 2 s (the Doc 23 alert threshold is validated as achievable, not aspirational).
- **Timeline:** query performance across 24 months of partitions at S2 volume (10M rows); partition pruning verified in plans; PATCH-003 index efficacy under realistic write load.

### 5.3 Queue & Pipeline Throughput

- Discovery job storm: 200 concurrent jobs → queue depth, oldest-age, and outbox relay lag stay under Doc 23 alert thresholds at target worker fleet size; measured throughput documents the fleet-sizing model for Doc 27 capacity runbook.
- Meilisearch sync-write p99 < 5 s under ingestion load — the **A-069 validation gate**; failure here triggers the PATCH-009-heavy fallback posture review before GA.

### 5.4 LLM & Apify

- LLM latency distribution per model tier; timeout + retry behavior under injected slow responses; rate-limit headroom behavior (backpressure engages before 429 storms).
- Apify per-platform throughput with rate-limit handling; multi-actor fallback switchover time (R-TEC-007).

---

## 6. Security Testing

### 6.1 Tenancy Isolation Suite (NFR-S01) — Highest-Priority Suite

Three components:

1. **Endpoint sweep:** generated from Doc 20's endpoint inventory — for *every* M1-M13 endpoint, an authenticated workspace-A session attempts access to workspace-B resources (path IDs, body references, cursor tampering). Expected: 403/404 per Doc 20 catalogue, never 200, never a B-plane field in an error body. New endpoints are auto-included (inventory-driven generation); an endpoint missing from the inventory fails CI.
2. **RLS verification:** §3.2's per-table raw-SQL suite.
3. **Continuous production canary:** two dedicated canary workspaces in prod; a probe (every 5 min) attempts a fixed set of cross-workspace reads; any success → **Sev1 page** (Doc 23 §4.2). This is the only test that runs against production continuously.

### 6.2 Penetration Testing & OWASP

- Pre-GA external pentest + annual thereafter (Doc 21 §8 scope: tenancy, auth, webhook forgery, staff-plane separation, prompt injection).
- OWASP Top 10 mapped to automated coverage: injection (§3.2 parameterization + SQLi payload corpus in the endpoint sweep), broken access control (§6.1), auth failures (token family revocation tests, refresh reuse detection test), SSRF (adapter egress allowlist test — workers attempt disallowed egress, must fail), etc. The mapping matrix lives in the repo and is a pentest-prep artifact.

### 6.3 Prompt Injection Testing (R-SEC-006)

- Adversarial corpus (§1.3) seeded through the *full* Brain 2 pipeline in staging: injection bios ("ignore previous instructions…", encoded payloads, homoglyphs, schema-mimicry) → assert: payload gate rejections where applicable; scoring output remains schema-valid; grounding validator rejects fabricated evidence; **no score deviates beyond tolerance from the same profile without the injected content** (differential assertion — the strongest signal that isolation held).
- Corpus versioned; new LLM/model version promotion (ADR-028) must pass the injection eval set before the cost-gate is even consulted (Doc 21 §8 checklist).

### 6.4 Webhook, OAuth, Staff-Plane

- **Webhook forgery:** invalid signature, valid-signature-stale-timestamp (replay), body tamper post-signature, duplicate event-id — all against Paddle/Gmail/Outlook receivers; assert verify-before-parse (malformed body with bad signature never reaches the parser — instrumented assertion).
- **OAuth theft simulation:** exfiltrated refresh token replayed → family revocation triggers; C1 fields absent from every API response and log line (automated response/log scan against C1 field denylist).
- **Staff plane (ADR-011):** customer JWT against every staff endpoint → 401 (issuer/audience rejection, not role rejection — asserted specifically); staff mutation with induced audit-write failure → whole action fails (audit-first invariant test); impersonation session cannot read decrypted tokens or trigger sends.

---

## 7. Idempotency & Race Condition Testing

Consolidated race matrix (some overlap with §3.1, listed here as the canonical inventory):

| # | Race | Suite | Key Assertion |
|---|---|---|---|
| 7.1 | Parallel reserve/settle (ADR-026) | PATCH-004 | Exactly-k success, non-negative balance |
| 7.2 | Opt-out vs. in-flight send | PATCH-006 | Zero post-opt-out sends across fuzzed schedules |
| 7.3 | Duplicate Paddle webhooks (R-FIN-007) | Webhook suite | Single ledger effect; idempotent entitlement |
| 7.4 | Outbox relay redelivery (ADR-020) | Outbox suite | At-least-once absorbed; consumer effects exactly-once-equivalent |
| 7.5 | Duplicate URL / competing workers | PATCH-007 | Single scrape; lock TTL recovery |
| 7.6 | Sweeper vs. late settlement | PATCH-005 | Deterministic disposition via row lock |
| 7.7 | Client idempotency-key replay | Doc 20 protocol suite | Same key + same body → cached response; same key + different body → 409 |
| 7.8 | Concurrent identity merges | PATCH-008 | State machine validity under interleaving |

All race tests run with **randomized scheduling and ≥100 iterations** in the nightly build (deterministic reduced set per-MR for speed).

---

## 8. Contract Testing

- **API contracts (Doc 20):** OpenAPI-derived tests assert response schemas, all 35 error codes reachable and correctly shaped, rate-limit headers present, pagination contracts (cursor stability, offset bounds). Breaking-change detector diffs the spec per MR.
- **Adapter contracts (ADR-022):** a shared conformance suite runs against *every* adapter's fake and (nightly) real sandbox: seven obligations verified — including timeout ceilings, degraded-response shape, telemetry emission (Doc 23 §6 fields), credential confinement (adapter cannot be constructed in the web tier — compile/DI-level test), and error taxonomy mapping.
- **Webhook contracts:** recorded fixture library per provider version; provider payload drift (new fields, changed types) detected nightly against sandbox → alerts before prod impact (A-031 watch).
- **LLM output contracts (ADR-019):** every registered prompt's output schema validated against golden-set runs per version; schema violation rate must be < 0.5% on the golden set for promotion eligibility.

---

## 9. Continuous Testing & CI/CD Integration

- **Pipeline stages (detail in Doc 26):** static gates → unit → integration (ephemeral Neon branch + `ci-` queue namespace, provisioned per pipeline, destroyed after) → deploy staging → E2E → performance trend gates → production promotion → post-deploy smoke.
- **Seeding:** synthetic corpus generator runs as a pipeline step with a pinned seed per suite (deterministic) and a rotating seed nightly (exploratory).
- **Flaky test policy:** a test failing then passing on retry is auto-tagged; 3 flakes/14 days → quarantined (excluded from gates, ticketed, 2-week fix SLA; expired SLA blocks the owning module's merges). Quarantine list size is a dashboard metric — a growing list is R-QA-002 materializing.
- **Coverage gates:** §2.1 ratchet enforced in CI; patch-suite completeness check: a diff touching ledger/consent/identity/projection code without touching its patch suite raises a review flag.

---

## 10. QA Process & Release Gates

### 10.1 Definition of Done (Feature)

Code + tests at gate coverage; patch suites green if touched domain; endpoint added to Doc 20 inventory (auto-includes it in §6.1 sweep); metrics/alerts added per Doc 23 conventions with runbook link; security checklist (Doc 21 §8) passed in review; docs updated.

### 10.2 Release Readiness

All release-blocking suites green (unit, integration incl. ten patch suites, E2E, tenancy sweep); no open Sev1/Sev2 bugs; performance trend gates within budget; migration linter clean; next Timeline partition exists.

### 10.3 Rollback Testing

Quarterly drill: deploy → forced rollback (Vercel alias revert + worker fleet re-pin) against the expand-contract schema — previous version's suite must pass against current schema (§3.2 migration test makes this continuous, the drill validates the *operational* path, feeding Doc 27).

### 10.4 Production Verification

Post-deploy smoke (< 5 min): login, Brain 1 search, job creation + poll (canary workspace, minimal credit job), webhook receiver health, queue consumer liveness. Failure → auto-rollback trigger (Doc 26).

---

## 11. Specialized Testing

### 11.1 Apify Canary (operationalizing Doc 23 §6)

- Fixed panel: 10 profiles/platform, publicly stable accounts; 4×/day runs of all six actors; field-level schema diff (added/removed/retyped fields) against expected schema version; payload-validation pass-rate trend is the R-TEC-007 leading indicator.
- **Panel refresh runbook** (A-072): monthly panel health check; a private/deleted panel account is replaced within 48 h; panel changes are versioned so diff baselines reset cleanly.

### 11.2 LLM Quality

- **Golden set** (Doc 15 Part E): per-prompt-version evaluation — scoring accuracy vs. human-labeled ground truth (PK-market labeled set), regression tolerance ±2% on aggregate metrics for promotion.
- **Grounding adversarial:** §6.3 corpus + synthetic "plausible fabrication" cases (evidence that *almost* matches payload spans) — validator false-negative rate < 1% on this set.
- **Audience estimation accuracy (CC-003):** estimated vs. known-demographic validation panel; MAE thresholds per demographic dimension; tracked per model version.

### 11.3 Localization

- **Urdu/Roman-Urdu query translation (Doc 15 B2):** golden query set (200 queries: Urdu script, Roman Urdu, code-switched) → intent-preservation assertions on translated structured queries; NFR-P02 budget applies to this path specifically (§5.1).
- **Bidi rendering (Doc 12 Part E):** visual regression tests (Playwright screenshots) on mixed RTL/LTR creator names, bios, and notes; Urdu fallback typography (ADR-015) renders without tofu on the CI font matrix.
- **Jumu'ah exclusion (Doc 20 I8):** clock-controlled tests around window boundaries (start/end edge minutes, timezone of workspace vs. UTC storage), DST-irrelevant but Ramadan-adjacent schedule shifts covered as parameterized cases; property test: no send timestamp ever falls inside the configured window for any generated schedule.

---

## 12. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-QA-001 (new)** | Quality | Race suites give false confidence (schedulers don't explore real interleavings) | M | H | ≥100 randomized iterations nightly; pooled-connection variants; production metrics (sweeper/last-gate/lock-wait) as the runtime backstop |
| **R-QA-002 (new)** | Quality | Flaky-test accumulation erodes gate trust | M | M-H | Quarantine policy + SLA + dashboard; merge-block on expired SLA |
| **R-QA-003 (new)** | Quality | Golden sets drift from real PK creator distribution | M | M | Quarterly golden-set refresh from production sampling (anonymized per Doc 21 classification) |
| **R-QA-004 (new)** | Quality | Sandbox provider behavior diverges from production (esp. Paddle, BSP) | M | M-H | Nightly contract drift detection (§8); fetch-to-heal as prod backstop; A-031 monitoring |
| **R-QA-005 (new)** | Cost | S2-scale perf environments (500k corpus, 10k VU) inflate CI cost | M | L-M | Perf suite on staging nightly/pre-release only, not per-MR; scale-to-zero Neon branches |
| R-TEC-008 | Technical | Garbage-in scoring | M | H | **Strengthened:** adversarial corpus + differential scoring assertions (§6.3); residual Low-Med |

---

## 13. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-075 | Neon ephemeral branches provision fast enough (< 60 s) for per-MR integration runs | Med-High (validate week 1 of CI build-out) |
| A-076 | A human-labeled PK ground-truth set (~500 creators) is producible for §11.2 accuracy testing | Med (labeling effort budgeted; blocks CC-003 validation otherwise) |
| A-077 | Canary panel accounts remain stable enough that panel churn < 20%/quarter | Med (A-072 runbook hedges) |
| A-078 | k6 staging load tests at 10k VU don't trip provider abuse controls (Vercel/Neon) | Med (coordinate with providers; use load-test headers) |
| A-064 | *(validation scheduled)* RLS overhead < 10% on NFR-P01 path — §5.1 test is the resolution gate | Med-High |
| A-069 | *(validation scheduled)* Meilisearch sync-write p99 < 5 s — §5.3 is the resolution gate | Med |

**Dependencies:** Doc 26 (pipeline realization of §9, auto-rollback wiring for §10.4), Doc 27 (rollback drill runbook, capacity model from §5.3, canary panel refresh runbook), Doc 25 (review checklist integration of §10.1), Doc 23 (every mechanism-guarding alert paired with its trigger test), Doc 29 (canary workspace access rules for staff).

**Open questions:**
1. Ownership of golden-set labeling (internal vs. contracted) and inter-rater reliability threshold — needed before A-076 resolves.
2. Whether the tenancy production canary should also perform *write* probes (stronger signal, more blast-radius risk) — recommend read-only until S2, revisit after first pentest.
3. Visual regression baseline management for Bidi tests across font-rendering differences in CI runners — pin a rendering container image?

---

**End of Document 24.**

[AWAITING APPROVAL]