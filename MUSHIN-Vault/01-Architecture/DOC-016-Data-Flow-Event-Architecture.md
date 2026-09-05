Generating Document #16.

---

#### DOC-016 — Data Flow, Event Architecture & Scalability Strategy
**Status:** Draft v1.0 | **Phase:** 5 | **Owner:** Principal Architect (Software) + Principal Architect (Data) | **Consumes:** Doc 14 (topology, modules), Doc 15 (write-path intelligence), Docs 8–10 (behavioral contracts)

---

#### Executive Summary

This document defines MUSHIN's asynchronous nervous system: a **canonical event taxonomy** with a uniform envelope, **transactional-outbox emission with at-least-once delivery and idempotent consumers (ADR-020)** as the correctness foundation, a **consumer reaction matrix** specifying exactly which modules react to which events, and step-by-step specifications of the three hardest flows — the **Paddle money path**, the **Live Discovery ingestion path**, and the **time-delayed Outreach Sequence path** (whose central correctness rule is *eligibility is evaluated at send time, never at enqueue time*). It closes Doc 14's deferred decision with **ADR-021: polling for job progress in v1**, with a defined trigger for upgrading to server push. The scalability strategy is deliberately boring: horizontal worker scaling per queue class, read replicas, and index scaling cover S1/S2 by wide margins; module extraction (M4 first candidate) is governed by **four explicit numeric/organizational triggers**, not architectural fashion.

#### Purpose & Scope

Event envelope and taxonomy, emission/delivery/consumption semantics, the consumer matrix, three critical flow specifications, queue class design, backpressure and rate-limiting policy, load model, scaling axes, and extraction triggers. Binding on Doc 17 (webhook/adapter transports), Doc 19 (outbox/event persistence), Doc 22 (runtime scaling config), Doc 23 (queue/flow observability), Doc 26 (idempotency and flow tests).

#### Non-Goals

- Vendor selection for queue/scheduler (managed-service category fixed by ADR-002/017; named in Doc 22).
- Event payload field-level schemas (Doc 18/20 own entity and contract shapes; envelope only here).
- Analytics warehouse design — reaffirmed deferred (Doc 10); projections remain DB-level read models.
- Disaster recovery flows (Doc 24) — replay capabilities are *enabled* here, exercised there.
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every state change that other modules react to is expressed as a taxonomy event — no hidden side-channel coupling (reviewable via the matrix).
- Zero lost events under crash-between-write-and-publish (outbox guarantee).
- Every consumer is idempotent under duplicate delivery and tolerant of out-of-order arrival within its ordering scope (testable, Doc 26).
- All three critical flows fully specified with failure behavior at every step.
- Extraction triggers are numeric and pre-agreed — no mid-crisis architecture debates.

#### Detailed Content

**Part A — Event Fundamentals**

**A1. Envelope (uniform, all events):** event ID (globally unique, the idempotency key), type (taxonomy name), schema version, `occurred_at`, **scope class** (`GCP` | `WP` — Doc 14 A2 declaration surfaces here; WP events carry workspace ID), actor (user / system / staff-dual-attributed per FS-10.02), correlation ID (job/flow linkage), causation ID (triggering event), payload (or payload reference for large bodies — raw scrape payloads are *referenced*, never embedded).

**A2. Emission — Transactional Outbox (ADR-020 — Accepted):** modules never publish directly to the queue. State change and its events are written atomically to the module's DB transaction (outbox table); a relay publishes to the queue and marks dispatched. Guarantees: no phantom events (emitted without commit), no lost events (committed without emission). Consequence: eventual delivery (relay lag is a monitored metric, target p95 < 2s — Doc 23).

**A3. Delivery semantics:** at-least-once; consumers **must** be idempotent keyed on event ID (processed-event ledger per consumer group). Ordering: global ordering is **not** guaranteed; per-key ordering (partition by subscription ID for billing, by sequence-enrollment ID for outreach steps, by job ID for discovery stages) where flows require it; consumers otherwise resolve order via `occurred_at` + fetch-current-state (the FS-08.02 fetch-to-heal pattern generalized). Retries: exponential backoff, max attempts per class, then **DLQ** with M12 alerting; poison messages never block a partition beyond the retry budget.

**A4. Events vs. Timeline (boundary clarification):** domain events are *transport*; the Interaction Timeline (M7) is *workspace-facing storage*. M7 consumes relevant WP events and appends timeline entries (Doc 9 A1 taxonomy). Not every event becomes a timeline entry (system internals don't), and no module writes timeline entries except through M7's append API — the matrix below is the mapping authority.

**Part B — Event Taxonomy (v1 canonical set)**

| Family | Events (type names) | Scope |
|---|---|---|
| `creator.*` | `creator.discovered`, `creator.enriched`, `creator.scored`, `creator.refresh_completed`, `creator.merge_resolved` | GCP |
| `discovery.*` | `discovery.job_queued`, `discovery.stage_completed` (per stage, per candidate batch), `discovery.job_completed`, `discovery.job_failed` | GCP (job meta) + WP (requesting workspace linkage) |
| `workspace.*` | `workspace.created`, `workspace.member_invited/joined/removed`, `workspace.settings_changed` | WP |
| `list.*` | `list.created/archived`, `list.membership_changed`, `list.note_added`, `list.exported` | WP |
| `campaign.*` | `campaign.created/archived`, `campaign.stage_changed`, `campaign.task_completed`, `campaign.rate_recorded`, `campaign.outcome_recorded`, `campaign.budget_threshold_crossed` | WP |
| `outreach.*` | `outreach.message_sent/delivered/failed`, `outreach.reply_received`, `outreach.opened` (if tracking on), `outreach.optout_recorded`, `outreach.sequence_enrolled/step_executed/stopped`, `outreach.mailbox_revoked`, `outreach.whatsapp_quality_changed` (S2) | WP |
| `billing.*` | `billing.webhook_received` (raw), `billing.subscription_state_changed`, `billing.plan_changed`, `billing.reconciliation_healed` | WP |
| `credit.*` | `credit.granted`, `credit.reserved`, `credit.committed`, `credit.released`, `credit.reversed`, `credit.balance_threshold_crossed` | WP |
| `reveal.*` | `reveal.contact_revealed` | WP |
| `admin.*` | `admin.impersonation_started/ended`, `admin.flag_changed`, `admin.workspace_suspended` | WP + staff attribution |
| `telemetry.cost` | `cost.recorded` (provider, model, prompt version, stage, unit cost — the FS-10.03 feed) | Platform |

Naming rule: `family.past_tense_fact` — events are facts, never commands. Additions require a matrix row before build (governance mirroring Doc 13's matrix-first rule).

**Part C — Consumer Reaction Matrix (v1 core; full table is a living artifact owned with this doc)**

| Event | M7 Timeline | M11 Analytics | M13 Notify | M10 Billing | M12 Ops | Other |
|---|---|---|---|---|---|---|
| `creator.enriched/scored` | Append (requesting WS) | Refresh projections | "Enrichment ready" (A2 ladder step 4/5) | — | Coverage funnel telemetry | M5→index re-projection |
| `discovery.job_completed` | Append summary | — | Job-done notification | Commit/release reservation (via M10 API) | Job cost rollup | M3 result assembly |
| `campaign.stage_changed` | Append | Conversion projections | Owner notification (per prefs) | — | — | M9: stop-condition check (stage=Agreed/terminal → sequence stop) |
| `campaign.rate_recorded` | Append (rate history) | — | — | — | — | — |
| `outreach.reply_received` | Append | Response-rate projections | "Reply received" | — | — | **M9: sequence stop (hard condition)**; session-window open (S2 WhatsApp) |
| `outreach.optout_recorded` | Append | — | — | — | Abuse telemetry | M9: consent state → `opted_out`, all sequences stop across workspace |
| `outreach.mailbox_revoked` | Append | — | Owner alert (FS-06.01) | — | — | M9: freeze user's sequences |
| `billing.subscription_state_changed` | — | Revenue projections | Owner notification (banner + email) | Source | Drift/heal alerts | M1: entitlement snapshot invalidation |
| `credit.balance_threshold_crossed` | — | — | 80%/95% warnings (FS-07.03) | Source | — | — |
| `reveal.contact_revealed` | Append | — | — | Consumption (already committed) | Provenance log (R-LEG accounting) | M9: contact becomes `contactable` |
| `admin.impersonation_started` | Append (dual-attributed) | — | Owner notification (unless contract-suppressed) | — | Audit log (already written, audit-first) | — |
| `cost.recorded` | — | — | — | — | Guardrail dashboard, budgets, anomaly detection | — |

Matrix rule: a module consuming an event not listed for it = review defect (Qwen checkpoint).

**Part D — Critical Flow Specifications**

**D1. Paddle Money Flow (correctness-critical)**
1. Webhook Gateway: signature verify (fail → 4xx + alert, no processing) → append to raw event store → emit `billing.webhook_received` → ack Paddle fast (processing is never inline with the ack — Paddle retries are our safety net, not our threat).
2. M10 consumer (partition-ordered by subscription ID): idempotency check (Paddle event ID) → `occurred_at` comparison vs. last-applied → **on any ambiguity, fetch current subscription from Paddle API and reconcile to truth** (fetch-to-heal) → apply FS-08.02 state machine → ledger entries in the same transaction (grants/expiry per event type) → outbox-emit `billing.subscription_state_changed` / `credit.granted`.
3. Downstream per matrix: M1 invalidates entitlement snapshots (next request re-resolves — Doc 10 A2), M13 notifies, M11 projects, M12 monitors drift.
4. Failure paths: handler crash → redelivery (idempotent); webhook outage → daily reconciliation heals + `billing.reconciliation_healed` emitted (frequent heals = defect alarm); checkout race → pending-purchase record resolves on whichever arrives first (webhook or user return + poll), other path becomes no-op via idempotency.

**D2. Live Discovery Flow (heavy ingestion)**
1. M3 confirms quote → M10 `credit.reserved` (reserve-commit, FS-08.03) → `discovery.job_queued` (correlation ID = job ID).
2. M4 stage execution (per-key ordering by job ID; per-candidate isolation): Serper stage → candidate batch checkpoint → Apify stage (parallel per-candidate fan-out, bounded concurrency per platform politeness policy — Doc 17) → validation gate (M5) → scoring (M6 routing ladder) → persistence (M5: GCP write + index projection, emitting `creator.discovered/enriched/scored` per creator).
3. Progress: each `discovery.stage_completed` updates job state; client polls job state (ADR-021); results stream into the UI as creators persist (Doc 12 progressive rendering).
4. Completion: `discovery.job_completed` with per-candidate accounting → M10 commits reservation proportional to successful candidates, releases remainder (`credit.committed`/`credit.released`) — **no silent credit loss** (testable).
5. Failure paths: stage retry from checkpoint; candidate failure → skip + account; job-level failure → `discovery.job_failed` → full release + honest UX state + M12 alert. Runaway protection: per-job candidate cap + adapter circuit breakers (Doc 15 Part D5).

**D3. Outreach Sequence Flow (time-delayed correctness)**
1. Enrollment: `outreach.sequence_enrolled` → M9 computes next-step due time (wait rules + send window: workspace TZ, PKT default, Jumu'ah exclusion — FS-06.03).
2. Scheduler tick → due steps enqueued (per-key ordering by enrollment ID). **At execution time — never enqueue time — M9 re-evaluates full eligibility:** consent state, stop conditions (reply/stage/opt-out/manual/campaign-archived), mailbox token validity, daily cap headroom, send window still open. Any failure → step skipped or sequence stopped with reason (`outreach.sequence_stopped`), never a stale send. *This rule exists because hours or days pass between scheduling and execution — the world changes; the send must respect the world at send time.*
3. Send via mailbox adapter → `outreach.message_sent` → timeline. Cap exhaustion → step deferred to next window (queue-and-resume per FS-06.01), not dropped.
4. Reply detection: mailbox sync (thread-scoped per FS-06.01 privacy boundary) → `outreach.reply_received` → matrix reactions (sequence stop is consumer-side and idempotent — a reply arriving twice stops an already-stopped sequence harmlessly).

**Part E — Queue Classes, Backpressure & Rate Limiting**

- **Queue classes (isolation by blast radius):** `interactive` (enrichment, add-by-URL — user-waiting; highest priority), `discovery-bulk` (live search fan-out), `scheduled` (sequences, reconciliation, integrity checks), `events` (matrix fan-out consumers), `webhooks` (money path — never starved by discovery load). Class-level concurrency budgets; discovery can saturate its own class only.
- **Backpressure:** `interactive` depth beyond SLO → new live-search offers degrade honestly ("high demand — results may take longer") before intake throttling; `discovery-bulk` depth → job admission queueing with user-visible position. Ingestion never backpressures the money path (class isolation).
- **Rate limiting:** per-workspace action limits (abuse ceiling, M12-tunable), per-platform scrape politeness (Doc 17 policy), per-mailbox caps (FS-06.01).

**Part F — Load Model & Scalability Strategy**

**F1. S1/S2 load envelope (design targets, not predictions):** ≤500 workspaces, ≤2k WAU, ≤50k indexed creators (S1) → ≤500k (S2), ≤5k discovery candidates/day, ≤20k sequence sends/day, ≤100k events/day. Verdict: **one primary DB with read replicas, one index node-set, and horizontally scaled workers cover this envelope with an order of magnitude of headroom** — the monolith is not the bottleneck at this scale; external adapters (Apify throughput, LLM rate limits) are, and they scale by provider quota, not by our topology.

**F2. Scaling axes (in order of use):** worker replicas per queue class → DB read replicas for projections/search-adjacent reads → index scaling (engine-managed) → payload archive is object storage (infinitely boring) → API replicas behind the load balancer (stateless by construction: Tenancy Context per request, no server sessions).

**F3. Module extraction triggers (pre-agreed; M4 first candidate, M6 second):** extract a module into a separate service only when **any** of: (1) its queue class requires sustained concurrency that materially degrades co-tenant workloads despite class isolation (measured: >20% latency SLO erosion attributable to resource contention, 2 consecutive weeks); (2) its deploy cadence blocks others (>2 hotfixes/month delayed by unrelated module freezes); (3) its resource profile diverges hard (M6 GPU-adjacent inference proxying vs. web-serving); (4) team structure splits ownership (Conway trigger, ≥2 teams). Extraction is cheap by design: M4/M6 already communicate only via queue + adapters (Doc 14 boundary rule) — extraction is a deployment change, not a rewrite. **Anti-trigger:** "microservices would be cleaner" is explicitly not a trigger.

**F4. ADR-021 — Accepted: job-progress via client polling v1** (simple, stateless, cache-friendly; intervals tiered by job class). Upgrade trigger to push (SSE-class): polling load >5% of API traffic **or** S2 WhatsApp inbox requiring sub-5s message delivery UX. Decision pre-made to prevent re-litigation.

#### Dependency Mapping

- **Depends on:** Doc 14 (modules, planes, adapter/webhook gateway), Doc 15 (scoring stages, cost events), FS-06/08/10 behavioral contracts, ADR-017/018.
- **Enables:** Doc 17 (transport realization per adapter/webhook), Doc 19 (outbox, processed-event ledger, projection persistence), Doc 22 (queue infra, worker fleets, autoscaling config), Doc 23 (lag/depth/DLQ observability), Doc 24 (replay from raw stores/outbox), Doc 26 (idempotency, ordering, flow tests).
- **Blocks:** Mimo worker implementation pends queue vendor naming (Doc 22) — scaffolding against the semantics here proceeds now.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-057 | F1 load envelope holds through S2 (±3×) | Med-High | Doc 23 capacity dashboards | Earlier replica/index scaling; envelope re-model |
| A-058 | Managed queue provides per-key ordering (partition/FIFO-group semantics) | Med-High | Doc 22 vendor check | Consumer-side ordering buffers (complexity, bounded) |
| A-059 | Outbox relay lag p95 <2s at envelope load | High | Load test (Doc 26) | Relay tuning; UX unaffected (async flows tolerate seconds) |
| A-060 | Polling-v1 acceptable UX for discovery jobs (with progressive results) | Med-High | S1 telemetry | ADR-021 trigger fires early |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-TEC-011 | Technical | Non-idempotent consumer slips through review → duplicate side effects (double sends, double credits) | M | H | Idempotency test class mandatory per consumer (Doc 26); processed-event ledger as shared library pattern; Qwen checklist item |
| R-TEC-012 | Technical | DLQ neglect: poisoned events silently accumulate | M | M | DLQ depth alerting (M12), weekly DLQ review ritual (Doc 28 runbook), replay tooling requirement (Doc 24) |
| R-TEC-013 | Technical | Event schema evolution breaks consumers | M | M | Envelope schema version + additive-only evolution rule; breaking change = new event type (governance, Part B) |
| R-OPS-006 | Operational | Matrix drift: real consumers diverge from documented matrix | M | M | Matrix as living artifact with PR-coupled updates; periodic audit item |
| R-FIN-011 | Financial | Reservation leaks (reserved-never-committed/released) under partial failures | L | M | Reservation TTL + sweeper job (releases expired reservations, alerts on volume); ledger integrity check extension (FS-08.03) |

#### Alternatives Considered & Trade-offs

- **Exactly-once delivery ambitions** — rejected: mythical at system boundaries; at-least-once + idempotency is honest and testable.
- **Event sourcing as system-wide persistence** — rejected: Timeline and Ledger are already the two substrates that *deserve* append-only treatment (Docs 9/10); making everything event-sourced taxes every feature for two substrates' benefit. Events remain transport; state remains relational.
- **Direct module-to-module async calls (no taxonomy)** — rejected: hidden coupling, unreviewable; the matrix is the price and the payoff.
- **WebSockets from day one** — rejected (ADR-021): infrastructure and reconnect complexity ahead of need; trigger defined.
- **Kafka-class streaming platform** — rejected at this scale (ADR-002/ops weight); managed queue with per-key ordering suffices; revisit only via F3-style evidence.
- **Search/Discovery thread:** closed (Doc 15); this document only realizes its transport — verified no new constraints.

#### Gap Analysis Report

- Full consumer matrix (Part C is core subset) must be completed as the living artifact before Mimo consumer build — owner: Engineering Director; format: appendix table PR-coupled to consumer code.
- Reservation TTL value and sweeper cadence unset (R-FIN-011) — Doc 19/22 config; stub default: TTL = 2× max job duration.
- Notification digest batching semantics (M13 instant-vs-daily per FS-07.03) under-specified at the consumer level — assign to M13 build spec with Doc 12 tray behavior.
- `outreach.opened` privacy interaction with workspace-level tracking opt-in (FS-06.04) needs a consumer-side filter rule — one-line spec assigned to M9/M11: events emitted only when tracking enabled; no retroactive emission.
- Cross-region considerations absent by design (single-region S1/S2 assumption) — hands a confirmation requirement to Doc 22 (region choice per R-UX-011 PK latency).

#### Cross-References & Decision Traceability

**ADR-020 (transactional outbox; at-least-once + idempotent consumers; per-key ordering) — Accepted. ADR-021 (polling v1; defined push trigger) — Accepted.** Realizes: FS-08.02 robustness (D1 = the generalized pattern), FS-08.03 reserve-commit transport (`credit.*` family), FS-06.03 stop conditions (D3 execution-time eligibility), Doc 9 A1 (A4 boundary: M7 sole timeline writer), FS-10.03 feed (`cost.recorded`), Doc 14 F3-ready boundaries (extraction economics). Discharges Doc 14's deferred push-vs-poll question. Scale posture consistent with A-051.

#### Open Questions & External Dependencies

1. Queue vendor + per-key ordering capability confirmation (Doc 22, A-058).
2. Region selection for PK latency (Doc 22, carries R-UX-011).
3. Full matrix completion (Engineering Director, pre-build).
4. Paddle webhook retry/backoff envelope documentation review (Doc 17, informs D1 timing tolerances).

#### Future Revision Triggers

Any F3 extraction trigger firing; ADR-021 push trigger; envelope breach (A-057); DLQ volume trend >0.1% of throughput; duplicate-side-effect incident (R-TEC-011 → process tightening); event taxonomy additions (matrix-first rule).

#### Review Checklist & Validation Criteria

- [ ] Every cross-module reaction flows through a taxonomy event (no hidden coupling). ✅
- [ ] Outbox emission atomic with state change. ✅
- [ ] All three critical flows specify failure behavior at every step. ✅
- [ ] Execution-time eligibility rule explicit for delayed actions. ✅
- [ ] Extraction triggers numeric and pre-agreed; anti-trigger stated. ✅
- [ ] Money path isolated from ingestion load (queue classes). ✅
- [ ] Zero code. ✅
- [ ] Sign-off: Principal Architects (Software, Data, Cloud), Engineering Director; Qwen review of matrix completeness and idempotency assertions.

---

[AWAITING APPROVAL]