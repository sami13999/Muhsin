# Document 22: Infrastructure & Deployment Strategy

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 17 (Architecture), Doc 19 (Physical Schema), Doc 20 (API Design), Doc 21 (Security)
**Governing ADRs:** ADR-002, ADR-017, ADR-020, ADR-021, ADR-023, ADR-026, ADR-027
**Applied Patches:** PATCH-003, PATCH-005, PATCH-009, PATCH-010

---

## 1. Cloud Provider & Service Selection

Integration-first (ADR-002) governs every selection below: we orchestrate managed services and own only the modular monolith + worker fleet (ADR-017). Each selection carries hard requirements inherited from prior documents, listed as **Selection Gates** — any provider failing a gate is disqualified regardless of other merits.

### 1.1 Application Hosting — Vercel

- **Hosts:** Next.js SPA + API routes (the modular monolith web tier).
- **Selection gates:** managed edge with WAF-class controls (ADR-023), preview deployments per branch, SOC 2 Type II (A-063).
- **Constraint acknowledged:** Vercel serverless functions are unsuitable for long-running Brain 2 pipeline work (execution time limits, no persistent workers). Therefore the **worker fleet deploys separately** (§1.6) — Vercel hosts only the request/response plane. This split is a first-class architectural boundary, not an afterthought: web tier scales on request volume, workers scale on queue depth.

### 1.2 Managed PostgreSQL — Neon (primary candidate) / Supabase (fallback)

- **Selection gates (non-negotiable):**
  - Full PostgreSQL RLS support — required by Doc 21 §2.2 tenancy layer 3.
  - Native `RANGE` partitioning + ability to run partition pre-creation jobs — required by Doc 19 Timeline strategy (PATCH-003).
  - `SELECT FOR UPDATE` row locking with predictable behavior under connection pooling — required by ADR-026/PATCH-004. **This gate has a subtlety:** transaction-mode poolers (PgBouncer-style) are compatible with `SELECT FOR UPDATE` only when lock acquisition and settlement occur within a single transaction, which Doc 19's ledger design guarantees. Session-level advisory locks are therefore *banned* from the codebase — a linted rule.
  - Point-in-time recovery (PITR) — required by §8.
  - Private networking or IP allowlisting — required by Doc 21 §6.3.
- **Why Neon first:** branch-per-environment database copies accelerate staging/preview workflows with masked data (§2.2); scale-to-zero economics fit pre-revenue S1.
- **GENERATED ALWAYS AS STORED** columns (`usable_balance`, Doc 19) and Flyway-class migrations are standard Postgres — no provider risk.

### 1.3 Managed Queue — AWS SQS FIFO (primary) via thin adapter

- **Selection gates:** per-key ordering (FIFO `MessageGroupId` = ordering key, satisfying ADR-020 per-key ordering), at-least-once delivery, dead-letter queues, delayed delivery (for retry backoff), and **priority segregation** (PATCH-006 priority queue, PATCH-010 low-priority class).
- **Realization:** priority is implemented as **separate queues per class** (SQS has no intra-queue priority): `q-discovery-high`, `q-discovery-standard`, `q-rescore-low`, `q-outbox-relay`, `q-erasure`. Workers poll classes with weighted priority (high drained before standard; `q-rescore-low` consumed only by a capped worker allocation, §5.3).
- Queue access confined to worker-fleet IAM identity (Doc 21 §6.3). All queue interaction passes through the queue adapter (ADR-022 uniformity applies to infrastructure adapters as well as data providers).

### 1.4 Object Storage — Cloudflare R2

- **Purpose:** raw scraped payload archives (Doc 14) — the immutable evidence trail behind `enrichment_snapshot.content_hash` (PATCH-010), plus GDPR export bundles.
- **Selection gates:** lifecycle policies (payload retention windows per Doc 28), zero egress fees (payloads are re-read during re-scoring campaigns, ADR-028 — egress-priced storage would inflate the CPO cost-gate calculus), S3-compatible API.
- **Erasure interaction (ADR-025):** raw payloads for tombstoned creators are hard-deleted (not tombstoned — archives have no referential integrity constraints), driven by the erasure outbox event.

### 1.5 Search Index — Meilisearch Cloud

- **Selection gates:** synchronous-confirmable writes — ADR-027/PATCH-009 requires that a newly ingested creator be searchable before the discovery job reports the result row as complete; Meilisearch task API allows awaiting task completion. Typo tolerance and faceting for the 48-category niche vocabulary; filterable attributes for score ranges.
- **Index topology:** single global creator index (GCP plane — search is on global creator data, tenancy applies at result-hydration time through `workspace_creator_link`, per ADR-024). No WP data ever enters the search index — this keeps the index outside the tenancy blast radius (Doc 21 §1.2).

### 1.6 Worker Fleet — Railway (primary candidate) / Fly.io (fallback)

- Long-running Node.js worker processes: queue consumers, outbox relay (ADR-020), Apify orchestration, LLM scoring, sweeper jobs.
- **Selection gates:** persistent processes, horizontal scaling on metrics, cron/scheduled job support (PATCH-005 sweeper, partition pre-creation), private networking to Postgres, per-service secret injection.

### 1.7 Supporting Services

| Service | Provider | Gate |
|---|---|---|
| KMS / secrets | Cloud KMS + provider-native secret stores | Doc 21 §6.2: injection at runtime, per-env isolation, access audit |
| Auth | Managed auth provider (per Doc 21 §2.1) | Separate staff tenant (ADR-011) |
| Email infra | User mailboxes only (ADR-010) — no transactional-outreach infra; app transactional email via Resend/Postmark | DKIM/SPF on app domain only |
| Edge/CDN | Vercel Edge Network + Cloudflare (DNS/WAF) | ADR-023 managed edge; Layer 1 rate limiting |

---

## 2. Environment Strategy

### 2.1 Three Environments, Hard Isolation

| | Development | Staging | Production |
|---|---|---|---|
| Data | Synthetic only | Masked subset + synthetic | Real |
| Secrets | Dev-tier providers, sandbox keys | Sandbox keys (Paddle sandbox, Apify dev token, LLM dev key) | Production keys, KMS-wrapped |
| DB | Neon branch (ephemeral per PR optional) | Neon branch from masked snapshot | Primary |
| Queue | Isolated queue set (`dev-` prefix) | `stg-` prefix | `prod-` prefix |
| Paddle | Sandbox | Sandbox | Live (MoR) |
| Cross-env access | **Impossible by construction:** per-env IAM identities, per-env secret scopes (Doc 21 §6.2) | | |

**Rule:** no environment shares any credential, queue, bucket, or database with another. Dev secrets cannot authenticate against prod providers — enforced by separate provider accounts/projects, not just separate keys.

### 2.2 Data Masking for Lower Environments

- Staging refreshes from a **masked snapshot pipeline**: C1 fields (Doc 21 classification) are dropped entirely (OAuth tokens are useless and dangerous outside prod); C2 PII (creator names, emails, handles) is replaced with format-preserving synthetic values; C3 tenant data is either synthetic or drawn from consenting internal test workspaces only.
- Masking runs as a transform step during snapshot restore — masked data never round-trips through developer machines.
- Synthetic creator corpus: a seeded generator producing realistic PK-market creator profiles across all 48 niche categories, used for search relevance tuning and PATCH-008 identity-resolution testing without real PII.

---

## 3. Region & Latency Strategy

### 3.1 Region Selection (R-UX-011)

- **Primary compute + database region: AWS `ap-south-1` (Mumbai)** equivalents across providers (Neon Mumbai region, SQS ap-south-1, R2 APAC location hint). Mumbai delivers ~30-60 ms RTT to Karachi/Lahore/Islamabad — the best managed-service region for Pakistan, since no hyperscaler operates a Pakistan region.
- **Rationale against Singapore:** `ap-southeast-1` adds ~60-90 ms to PK users; acceptable for GCC expansion (ADR-007 S3) but Mumbai serves both PK and GCC (~100-120 ms to Dubai) adequately for S1/S2.
- **Data residency note:** Mumbai placement is compatible with A-062 (no PK localization mandate); if that assumption breaks, the expand-contract migration posture (Doc 19) plus IaC (§6.3) makes region migration tractable, though costly — tracked as R-INF-004 (§9).

### 3.2 Edge Configuration (ADR-023)

- Static assets + SPA shell served from Vercel's global edge — PK users hit nearby PoPs for everything except API calls.
- API routes pinned to Mumbai-adjacent serverless region to keep the API-to-database hop under 5 ms; the dominant latency term becomes user-to-region, already minimized.
- Polling endpoints (ADR-021) are cheap-by-design (indexed job-status reads, PATCH-003 discipline), so polling from PK at Doc 20's specified intervals stays within NFR-P01 budgets.
- Cloudflare fronts DNS + WAF (Layer 1 rate limiting, DDoS) before Vercel — the managed-edge stack of Doc 21 §6.3.

---

## 4. Secret Management Integration

Realizing Doc 21 §6.2:

- **Source of truth:** cloud KMS-backed secret manager; per-environment secret scopes with distinct IAM principals.
- **Injection paths:**
  - Vercel: environment variables synced from secret manager via CI (never hand-entered); marked sensitive; scoped per environment.
  - Worker fleet: secrets injected at container start from the platform secret store, itself synced from the same source of truth — single rotation point.
  - CI: OIDC federation to cloud IAM (no long-lived CI cloud keys); each pipeline stage receives only its stage-scoped secrets.
- **Envelope encryption runtime:** workers performing adapter calls (Gmail/Outlook/BSP sends, Doc 21 §3.2) fetch the KMS master key handle at start; per-record data-key unwrap happens in-process per operation. The web tier holds **no** KMS decrypt permission for C1 keys — enforced at IAM level, making Doc 21's "decrypt only in workers" invariant infrastructural rather than conventional.
- **Rotation:** dual-secret overlap for webhook secrets (Doc 21 §5); 90-day adapter token rotation executed as a runbook (Doc 27) with secret-manager versioning enabling instant rollback.

---

## 5. Infrastructure Realization of ARB Patches

### 5.1 PATCH-005 — Reservation TTL Sweeper

- **Mechanism:** scheduled worker job (platform cron, every 60 s) scanning for expired credit reservations and applying the per-state disposition contract (release / settle / escalate per PATCH-005's state table).
- **Concurrency safety:** the sweeper acquires each reservation via the same `SELECT FOR UPDATE` path as settlement (ADR-026) — sweeper and worker settlement can race safely; the row lock serializes them and the disposition contract makes both outcomes idempotent.
- **Singleton guard:** sweeper runs use a Postgres advisory *transaction* lock (`pg_try_advisory_xact_lock`) keyed to the job name so overlapping cron fires no-op — the one sanctioned advisory-lock usage (exempt from §1.2's ban because it is transaction-scoped).
- **Telemetry:** swept-reservation count and age-at-sweep exported as metrics (Doc 23) — a rising sweep rate signals worker settlement failures upstream.

### 5.2 PATCH-009 — Synchronous Projection Retry

- **Happy path:** ingestion worker writes the new creator row and synchronously awaits the Meilisearch task completion (ADR-027) before marking the discovery result deliverable.
- **Failure path infrastructure:** if the index write fails or times out (5 s budget), the worker (a) marks the creator row `projection_status = 'pending'`, (b) emits a `projection.retry` outbox event (ADR-020). A dedicated consumer on `q-outbox-relay` retries with exponential backoff (30 s → 16 min, 6 attempts) then DLQs.
- **Reconciliation backstop:** nightly job diffs `projection_status = 'pending'` rows older than 1 h against the index and heals — the fetch-to-heal pattern (mirroring R-FIN-007's mitigation) applied to search.
- **Degraded UX contract:** creators pending projection are still returned in the originating job's results (direct DB read) but flagged; Doc 20's job polling payload already carries per-result status to express this.

### 5.3 PATCH-010 — Batch Re-Scoring Infrastructure

- **Trigger:** prompt version promotion passing the CPO cost-gate (ADR-028) enqueues a re-scoring campaign.
- **Queue class:** `q-rescore-low` — consumed by a **capped allocation** (max 20% of worker fleet concurrency; configurable). Re-scoring must never starve live discovery jobs (customer-facing, credit-backed) of LLM throughput or worker capacity.
- **Dedup:** the `(prompt_version, model_version)` scoped dedup key (PATCH-010) is checked before enqueue *and* at execution — a campaign restarted after partial completion skips already-scored snapshots at near-zero cost.
- **Payload source:** raw archives from R2 (§1.4) via `content_hash` lookup — re-scoring never re-scrapes, which is why R2's zero-egress pricing is a selection gate.
- **Cost telemetry:** per-campaign LLM spend metered and reported against the cost-gate estimate (feeds FS-10.03, Doc 23).

---

## 6. Deployment & CI/CD Architecture

*(Pipeline detail in Doc 26; this section fixes the infrastructure-level strategy.)*

### 6.1 Deployment Strategy

- **Web tier (Vercel):** atomic immutable deployments with instant alias rollback — effectively blue-green per deploy, provider-managed.
- **Worker fleet:** rolling deployment with **drain-then-replace**: workers stop polling, finish in-flight jobs (bounded by per-job timeout), then terminate. At-least-once delivery + idempotent consumers (ADR-020) means a worker killed mid-job is safe — the message redelivers.
- **Canary posture:** deferred to S2 for the web tier (Vercel supports gradual rollouts); worker canary achieved cheaply by deploying one worker instance on the new version consuming `q-discovery-standard` and watching error metrics before fleet rollout.

### 6.2 Zero-Downtime Migrations (Doc 19 Requirement)

- Flyway-class migrations run as a **pre-deploy gate job**: migrate → verify → deploy app. Expand-contract discipline (Doc 19) guarantees the previous app version runs correctly against the migrated schema, so migration and deploy need not be atomic.
- **Guards:** migration linter enforces: no `ACCESS EXCLUSIVE`-heavy operations without `lock_timeout`; `CREATE INDEX CONCURRENTLY` for all index additions (PATCH-003 indexes were built this way); RLS policy required in the same migration as any new `wp.*` table (Doc 21 R-SEC-008 mitigation).
- **Partition pre-creation:** monthly scheduled job creates Timeline partitions 3 months ahead (Doc 19); a deploy-time check fails the pipeline if the next month's partition is missing — belt and suspenders.

### 6.3 Infrastructure as Code

- **Approach:** Terraform for cloud-account resources (SQS queues, IAM, KMS, R2 buckets, DNS/WAF); provider-native config-as-code (`vercel.json`, Railway config) committed to the repo for platform-managed services.
- State in a locked remote backend; `terraform plan` posted on infra MRs; applies only from CI, never from laptops.
- Environments are Terraform workspaces sharing modules — guaranteeing the isolation matrix of §2.1 is structural.

---

## 7. Observability Infrastructure

*(Full strategy in Doc 23; infrastructure selections here.)*

- **Log aggregation:** structured JSON (Doc 21 §6.4 redaction middleware) shipped from Vercel (log drains) and workers (stdout collectors) to a centralized store (Axiom or Grafana Loki — decision gate: retention pricing at projected S2 volume). Security audit domains routed to a separate 24-month retention stream.
- **Metrics:** OpenTelemetry SDK throughout monolith and workers → managed backend (Grafana Cloud). Business metrics (credit burn, job throughput, per-provider cost — FS-10.03 groundwork) emitted as first-class OTel metrics, not derived from logs.
- **Tracing:** OTel traces across web → queue → worker via traceparent propagation in message attributes; sampling 100% on errors, 10% baseline.
- **Alerting:** Grafana alerting → PagerDuty (Sev1/Sev2) and Slack (Sev3+); queue-depth, DLQ-nonempty, sweeper-rate, and projection-retry alarms wired from day one since they instrument the ARB patch machinery (§5).

---

## 8. Disaster Recovery & Backup

| Asset | Mechanism | RPO | RTO |
|---|---|---|---|
| PostgreSQL | PITR (WAL-based, provider-managed) + daily snapshot, 30-day window | ≤ 5 min | ≤ 4 h |
| R2 payload archives | Provider durability + versioning; monthly integrity audit against `content_hash` | ≤ 24 h | ≤ 24 h |
| Search index | **Rebuildable, not backed up** — full reprojection from Postgres (ADR-027 machinery reused as bulk rebuild) | N/A | ≤ 6 h |
| Queues | Not backed up; outbox (ADR-020) is the durable source — queues rehydrate from unrelayed outbox rows | 0 (outbox) | ≤ 1 h |
| Secrets | Secret-manager versioning + offline break-glass copy (sealed, two-person access) | 0 | ≤ 2 h |

- **Ledger note:** the credit ledger's append-only design (ADR-012) makes PITR restores auditable — post-restore reconciliation replays Paddle webhook history (fetch-to-heal, R-FIN-007) to detect any paid-but-unrestored credit events.
- **DR drills:** quarterly restore-to-staging exercise (runbook in Doc 27); RTO targets are unvalidated until the first drill — tracked as A-067.
- Multi-region failover is explicitly **out of scope for S1/S2** (cost/complexity vs. ADR-006 MVP boundary); provider-managed intra-region HA suffices.

---

## 9. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-INF-001 (new)** | Infrastructure | Serverless/pooling breaks `SELECT FOR UPDATE` assumptions (ADR-026) | L-M | Critical | Single-transaction lock discipline; advisory-lock ban lint; ledger race test suite (Doc 24) against pooled staging |
| **R-INF-002 (new)** | Infrastructure | Worker platform (Railway) maturity/outage | M | H | Thin platform coupling (containers + env vars only); Fly.io tested as warm fallback; queue durability means outage = delay, not loss |
| **R-INF-003 (new)** | Infrastructure | Meilisearch sync-write latency breaks ADR-027 ingestion throughput | M | M | 5 s budget + PATCH-009 retry path degrades gracefully; benchmark gate before GA |
| **R-INF-004 (new)** | Regulatory | Future PK data-localization mandate forces region migration | L | H | IaC + expand-contract posture keeps migration tractable; monitor PECA/PDPB developments (couples A-062) |
| **R-INF-005 (new)** | Financial | Re-scoring campaigns (PATCH-010) blow LLM budget despite cost-gate | L-M | M | Capped queue allocation; per-campaign spend metering with auto-pause at 120% of estimate |
| R-UX-011 | UX | PK latency degrades experience | M | M | **Strengthened:** Mumbai region + edge strategy (§3); residual risk Low |

---

## 10. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-065 | Neon Mumbai region GA and production-grade (RLS, PITR, partitioning) at build time | Med-High (verify at contract) |
| A-066 | SQS FIFO throughput quotas suffice for S2 discovery volume with per-creator ordering keys | High (quotas documented; headroom >10x) |
| A-067 | 4-hour DB RTO achievable with provider PITR | Med (validate in first DR drill) |
| A-068 | Vercel + separate worker fleet split adds no prohibitive operational overhead vs. single platform | Med-High |
| A-069 | Meilisearch Cloud sustains synchronous write confirmation within 5 s at p99 under ingestion load | Med (benchmark before GA; PATCH-009 is the hedge) |

**Dependencies:** Doc 23 (observability strategy on §7 infrastructure), Doc 24 (perf/race test suites validating gates in §1.2, §5, A-069), Doc 26 (pipeline detail on §6), Doc 27 (DR drills, rotation runbooks), Doc 21 (all security requirements realized here — §4, §6.2 guards).

**Open questions:**
1. Neon vs. Supabase final call — pending Mumbai-region production validation (A-065) and pooler behavior test against the ledger suite.
2. Log backend (Axiom vs. Loki) — pending S2 volume cost model.
3. Whether staging warrants its own Paddle sandbox account vs. shared sandbox with dev (webhook secret isolation argues for separate).

---

**End of Document 22.**

[AWAITING APPROVAL]