---

# ARB AUDIT #1 + DOCUMENT #18
**Date:** 2026-07-05 | **Scope:** Docs 1–17 full corpus | **Auditor:** Staff Engineer & Security Auditor hat | **Phase:** 6 Prerequisite Gate + Phase 6 Opening

---

---

# PART I — ARCHITECTURE REVIEW BOARD (ARB) AUDIT REPORT

## Preamble

This audit steps outside the "Documentarian" role and applies a Staff Engineer & Security Auditor lens to the canonical baseline (Docs 1–17). The purpose is to find structural gaps, contradictions, and edge cases **before** they are embedded in schema, migrations, and working code. Every finding is cross-referenced to the document and line that surfaces the partial or missing specification.

---

## SECTION 1 — ARB GAP REPORT

Ten critical gaps were identified across the five audit directives. Gaps are rated by blast radius: **Critical** (causes data loss, security breach, or regulatory violation if unaddressed), **High** (violates an NFR or requires architectural rework), **Medium** (causes cost leakage or operational pain at scale).

---

### DIRECTIVE 1: The Data Plane Intersection (GCP vs. WP)

---

#### GAP-ARB-001 — The GCP/WP Cross-Plane Junction is Unnamed and Undesigned
**Blast Radius: Critical**

**Finding:** Doc 14 A2 states "Cross-plane reads happen exclusively via composed read APIs, never via cross-plane joins in feature code." This is architecturally correct but leaves a structural void: what is the *entity* that enables a workspace to reference a GCP creator? The following WP records all carry a `creator_id` originating in the GCP: `list_membership`, `campaign_pipeline_creator`, `timeline_entry`, `consent_state`, `reveal`, `rate_history`. None of these tables are formally defined anywhere, and crucially:

1. **Referential integrity strategy is absent.** Database-level foreign keys across schemas (GCP → WP) would couple the planes; application-level integrity is fragile. The docs are silent on which approach is chosen and how it is enforced.
2. **The "composed read API" pattern is named but its underlying entity is not.** When rendering a creator profile page, the system must compose GCP data and workspace-specific relationship data. There is no defined record that anchors this composition — no "workspace has this creator in scope" entity. This means the composed-read boundary cannot be formally tested or audited for NFR-S01 compliance.
3. **Soft-FK discipline vs. hard-FK enforcement is an open choice** that will materially affect the GDPR deletion design (GAP-ARB-002) and the merge fan-out design (GAP-ARB-008).

**Affected documents:** Doc 14 (A2), Doc 8 (A5, ADR-008), Doc 9 (A1 timeline entity), Docs 18–19 (not yet written).

---

#### GAP-ARB-002 — GCP Creator Deletion / GDPR Right to Erasure Has No Cascade Strategy
**Blast Radius: Critical**

**Finding:** Doc 7 records a stub: "creator personal data must be deletable per workspace and globally." Doc 8 FS-01.03 notes "reveal events logged for GDPR/data-provenance accounting (Doc 21 hook)." Neither document nor any subsequent document defines what "globally deletable" means operationally across the two-plane architecture. The gap has two distinct failure modes:

1. **Workspace-scoped delete** (user wants to remove a creator from their workspace): straightforward WP record deletion, GCP untouched. Not defined but tractable.
2. **Global GCP deletion** (right to erasure under GDPR): requires removing the GCP creator record — which is currently referenced by WP records across **every workspace that has ever interacted with this creator**. A hard-delete of the GCP record would orphan `timeline_entry`, `list_membership`, `reveal`, and `consent_state` rows across an arbitrary number of workspaces. No cascade strategy (soft-delete, PII-field nullification, tombstone pattern) is defined anywhere.

The raw-scrape payload archive in object storage (Doc 14 D2 step 2) contains personal data and has no defined GDPR deletion hook either. R-SEC-005 (raw scrape archive as sensitive personal-data lake) flags the risk but the control is deferred to Doc 21 with no structural anchor.

**Affected documents:** Doc 7 (gap item), Doc 14 (D2, raw archive), Doc 9 (A1 timeline), Doc 10 (FS-08.03 ledger entries).

---

### DIRECTIVE 2: The Append-Only Substrates (Timeline + Ledger)

---

#### GAP-ARB-003 — Interaction Timeline Indexing Strategy is Undefined
**Blast Radius: High**

**Finding:** The Interaction Timeline (Doc 9 A1, M7) is described as append-only, with entries typed and workspace-scoped. Doc 10 FS-09.01 mandates that all metrics derive exclusively from the timeline. No indexing strategy is specified. The following query patterns must be sub-second (NFR-P01) or near-sub-second for M11 analytics:

| Query Pattern | Required For |
|---|---|
| All entries for creator X in workspace Y, sorted by time | Creator relationship panel (FS-04.04) |
| All entries in campaign Z, sorted by time | Campaign history view (FS-05.02) |
| All entries of type `email_sent` in workspace Y, date range | Response-rate metric (FS-09.01) |
| All entries linked to sequence enrollment E | Sequence activity log |
| Workspace Y activity feed (all recent entries) | Admin/Owner overview (FS-09.02) |

Without composite indexes defined as schema requirements, each of these becomes a full-table scan as the timeline grows. At 500 workspaces × 200 timeline entries/day × 365 days = ~36M rows/year, a table scan on an unindexed timeline destroys NFR-P01 for analytics. The partition strategy (by time period, by workspace) is entirely absent from the canonical record.

**Affected documents:** Doc 9 (A1), Doc 10 (FS-09.01), Doc 16 (A4, consumer matrix), Docs 18–19 (not yet written).

---

#### GAP-ARB-004 — Ledger Balance Derivation Has No Defined Concurrency Control
**Blast Radius: High**

**Finding:** Doc 10 FS-08.03 states: "Concurrency contract: metered actions follow reserve → execute → commit (or release on failure) semantics so parallel actions cannot overdraw." The reserve-commit pattern is named and is correct — but the **mechanism** for enforcing it atomically is absent. Two concurrent workers, both reading a balance of 10 credits and both needing 8, could both pass the "sufficient balance?" check and both reserve 8 credits, producing a -6 credit balance that the spec declares "unrepresentable."

- No locking mechanism is specified (row-level locking, optimistic locking with version fields, serialized writer queue, or database-level advisory locks).
- The nightly integrity check ("materialized vs. derived — mismatch is a P1 incident") requires summing all ledger entries for a workspace. At high transaction volume (bulk enrichment), this sum over an unpartitioned ledger is an O(n) operation that degrades as the ledger grows.
- The materialized balance is mentioned but its update atomicity relative to the reserve-entry insert is unspecified.

**Affected documents:** Doc 10 (FS-08.03), Doc 16 (D2 — discovery job reserve-commit), Doc 14 (M10 module).

---

### DIRECTIVE 3: Event Flow Edge Cases

---

#### GAP-ARB-005 — Credit Reservations That Span a Subscription State Change Have No Behavioral Contract
**Blast Radius: High**

**Finding:** Doc 16 D2 specifies that discovery jobs reserve credits at job-start and commit/release at job-end. Doc 10 FS-08.02 specifies what happens on subscription state changes (e.g., `past_due`, `expired`). R-FIN-011 notes "reservation TTL + sweeper job" but the TTL value is explicitly listed as "unset" in Doc 16's gap analysis. No behavioral contract exists for the following collision scenarios:

1. **Scenario A:** A credit reservation is made during the `active` state. Before the job completes, a `subscription_payment_failed` event arrives and the subscription moves to `past_due`. Should the in-flight reservation be honored or released? (Current answer: undefined.)
2. **Scenario B:** A reservation is made at 11:59 PM on a subscription renewal day. The `transaction_completed` (renewal) event arrives and triggers allowance expiry + new allowance grant. The reservation was made against the expiring allowance credits. Is the reservation honored against the new period's allowance, or does the sweeper release it as "expired"? (Current answer: undefined.)
3. **Scenario C:** A subscription moves to `expired` (terminal). Pending reservations held by long-running discovery jobs need a defined disposition — the spec says "full release" only for job-level failures (Doc 16 D2 step 5).

**Affected documents:** Doc 10 (FS-08.02, FS-08.03), Doc 16 (D2, R-FIN-011 gap), Doc 14 (M10).

---

#### GAP-ARB-006 — Outreach Sequence Consent State Has a TOCTOU Race Condition Window
**Blast Radius: High (Regulatory)**

**Finding:** Doc 16 D3 correctly specifies that eligibility (consent, stop conditions, caps, send window) is re-evaluated at execution time, not enqueue time. This resolves the stated scenario ("hours or days pass between scheduling and execution"). However, a narrower race remains unaddressed:

- Worker 1 (sequence executor) dequeues a step, reads consent state = `contactable` (eligible).
- Worker 2 (opt-out processor) — triggered by `outreach.optout_recorded` — reads the same creator's consent record and sets it to `opted_out`.
- Worker 1, having already passed the eligibility check, calls the mailbox adapter and sends the message.

Doc 9 A3 mandates: "Opt-out honored across all campaigns and workspace members instantly." This is a regulatory compliance statement (anti-spam law). The TOCTOU window (between consent-check and adapter-call) potentially violates it if Worker 1 and Worker 2 execute concurrently. Doc 16's consumer matrix shows `outreach.optout_recorded` triggers "M9: consent state → `opted_out`, all sequences stop" — but two separate consumers running in parallel have no defined concurrency boundary between them.

The risk is not theoretical at PK outreach volumes where bulk sends occur simultaneously, and is regulatory (violates CAN-SPAM/PECR-analogous rules if a message is sent to an opted-out contact).

**Affected documents:** Doc 9 (A3), Doc 16 (D3, consumer matrix for `outreach.optout_recorded`).

---

#### GAP-ARB-007 — Intra-Job Creator Deduplication is Undefined (Same URL, Same Job)
**Blast Radius: Medium**

**Finding:** Doc 14 D2 step 1 specifies "Dedup against GCP (already-known creators skip to freshness check)" — this is correct for creators already persisted. However, within a single Live Discovery job, Serper may return the same profile URL on multiple result pages (e.g., page 1 and page 3 of Google results for a niche query). The dedup check at step 1 only catches GCP-persisted creators. Two URLs for the same creator, both previously unknown to GCP, will both be dispatched to Apify for scraping in parallel (Doc 16 D2 step 2: "parallel per-candidate fan-out"). Both scrapes succeed, both pass M5 validation, both enter the scoring pipeline and pay LLM costs, both attempt GCP persistence. The result is:

- **Double LLM scoring cost** (charged to the workspace's credits for one discovery intent).
- **Potential concurrent INSERT conflict** on the creator's canonical identifier at M5 persistence.
- At minimum, one M5 worker "wins" and the other duplicates work. At worst, non-idempotent side effects (e.g., two `creator.discovered` events for the same creator in the same job) cause downstream consumer reactions twice (two timeline entries, two analytics projections).

**Affected documents:** Doc 14 (D2 steps 1–4), Doc 16 (D2 steps 1–4), Doc 15 (dedup rule in Part D3).

---

### DIRECTIVE 4: The "Two Brains" Deduplication

---

#### GAP-ARB-008 — Creator Identity Resolution Has No Defined Behavioral Contract
**Blast Radius: High**

**Finding:** Doc 14 explicitly flags identity resolution as "the hard problem, flagged" and assigns it to Doc 18. Doc 15 B1 mentions transliteration variant expansion at ingestion. The problem is more than algorithmic — it is an architectural integrity issue because merge operations have cross-plane WP consequences:

1. **No confidence threshold policy:** At what match-confidence level does M5 auto-merge two candidate creator records vs. flag for manual review? The canonical baseline contains no answer. Shipping without this means either: (a) over-eager auto-merging creates wrong creator records (data corruption), or (b) every near-match creates a separate GCP record (index pollution, rising dedup debt).

2. **No intermediate "match_candidate" state:** The current data model (implied) is binary: a creator either exists in GCP or doesn't. But probabilistic identity matching always produces a "probable match, pending confirmation" category. Without this state, M5 must make a binary commit decision under uncertainty, both choices being risky.

3. **Merge fan-out violates NFR-S01 audit posture:** If M5 auto-merges Creator Record A (creator_id=101) into Creator Record B (creator_id=99), all WP records across every workspace that referenced creator_id=101 must be repointed to creator_id=99. This is a background job that writes to the WP plane across potentially hundreds of workspaces' data — it must be a declared `plane-global` job with mandatory audit emission (per Doc 14 A2 requirements), but no such job is defined or declared.

**Affected documents:** Doc 14 (M2, M5, D2 step 4, A2), Doc 15 (B1 dedup rule), gap assigned to Doc 18.

---

### DIRECTIVE 5: AI Cost & Caching

---

#### GAP-ARB-009 — Search Index Projection Lag Creates an LLM Re-Scoring Window
**Blast Radius: Medium**

**Finding:** Doc 15 B1 states "Projection is rebuildable from GCP at any time (index is disposable state)." Doc 14 D2 step 4 states "Standardization & persistence (M5): normalize → identity-resolve → persist to GCP → project to Search Index." The GCP write and the Search Index projection are listed as sequential steps but their relative atomicity is unspecified.

If the index projection is asynchronous (queued event, eventual), there is a window (potentially 2-30 seconds per Doc 16 A2's outbox relay target of p95 < 2s for relay, plus index write time) during which a creator exists in GCP but is absent from the Search Index. During this window:

- A second Live Discovery job for the same search intent starts.
- The pre-Apify dedup check (Doc 14 D2 step 1) says "Dedup against GCP" — but if this check queries the **Search Index** (as the natural access pattern for the Search Coordinator), it will miss the recently-ingested creator. If it queries **GCP directly**, this works, but that access pattern is not specified.
- If the second job proceeds to Apify scraping and LLM scoring for the same creator, the workspace pays double LLM costs for one intent.

In production, the risk is acute for popular PK creators who appear across many agencies' search queries. The first discovery by any workspace permanently cheapens the platform (ADR-008 economics) — but only after the projection lag resolves.

**Affected documents:** Doc 14 (D1 sufficiency check, D2 dedup), Doc 15 (B1 projection, Part D), Doc 16 (D2 step 2), Doc 17 (B2 Serper cache).

---

#### GAP-ARB-010 — Prompt Version Change Does Not Invalidate Existing Scores
**Blast Radius: Medium**

**Finding:** Doc 15 Part D3 specifies: "Semantic deduplication: unchanged payload sections (content-signature hash) skip re-scoring on refresh — only deltas re-enter the ladder; full re-score forced past a staleness horizon." This is the cost-control mechanism for refreshes. However, it is keyed on **payload changes only**, not on **prompt version changes**.

When a new Prompt Registry version improves the authenticity scoring rubric (a routine quality-improvement event, per Doc 15 Part E), existing GCP records with scores computed by older prompt versions are NOT invalidated by the current spec. The semantic deduplication rule would skip them on refresh (payload unchanged). This means:

1. Old scores persist indefinitely in the index, served to all Brain-1 queries.
2. The improvement in the Prompt Registry has no practical effect until each creator's payload changes (content refresh).
3. There is no mechanism to batch-re-score the existing population with an improved prompt — Doc 15 only mentions "Model deprecations trigger batch re-scoring from archives," not prompt version changes.

At scale (500k indexed creators), a prompt version promotion without a defined re-scoring trigger means score quality silently lags the current rubric. This is a product integrity risk that R-TEC-009 names broadly ("LLM output instability silently degrades scoring") but doesn't structurally address for the prompt-version axis.

**Affected documents:** Doc 15 (Part D3, Part E), Doc 14 (M5, M6), Doc 17 (B4 Prompt Registry linkage).

---

## SECTION 2 — ARCHITECTURAL PATCHES

The following patches are binding on Doc 18 (generated below) and on Docs 19–21.

---

### PATCH-001 — Define the Workspace-Creator Bridge Entity (resolves GAP-ARB-001)

**Rule:** All cross-plane references from WP records to GCP creator records are mediated through an explicit `workspace_creator_link` entity (WP plane, workspace-scoped). This entity is created automatically the first time any WP action references a GCP creator_id within a workspace. It carries: `workspace_id`, `creator_id`, `first_linked_at`, `last_active_at`, `pii_deleted_at` (nullable — filled on GDPR erasure).

**Structural consequence:** All WP entities reference creator_id as an **application-level soft FK** (not a database-level FK to GCP). The `workspace_creator_link` record is the single referential anchor for that workspace's relationship to that creator, making GDPR deletion, merge fan-out, and cross-plane integrity auditable via a single entity.

**Access pattern:** The "composed read API" for the creator profile page queries GCP for enrichment data AND uses the `workspace_creator_link` + associated WP entities for relationship context. This is the only legal cross-plane composition path. No other module may join across planes.

---

### PATCH-002 — Define the Two-Tier GCP Creator Deletion Strategy (resolves GAP-ARB-002)

**Tier 1 — Workspace Remove:** M7 soft-deletes the `workspace_creator_link` record (sets `removed_by_workspace_at`). All WP entities linked to this creator in this workspace become inaccessible via the scoped repository layer. GCP record is untouched.

**Tier 2 — Global Erasure (GDPR Right to Erasure):**
1. GCP Creator record undergoes PII nullification: name, handles, bio, contact fields are overwritten with `[erased]` tombstones. The `creator_id` row is retained (structure intact; cascading hard-delete would orphan every workspace's WP records across all time).
2. A `creator.gdpr_erased` event is emitted. All workspace `workspace_creator_link` records have `pii_deleted_at` set by consumer.
3. WP timeline entries, ledger entries, and reveals are NOT deleted (audit trail integrity) — they display "Creator [Removed]" as the actor/subject. This is compliant because the identifying PII is erased at the GCP layer.
4. The raw-scrape payload archive entry for this creator is deleted from object storage within 30 days (GDPR data minimization; deletion job is triggered by `creator.gdpr_erased`).
5. The Search Index projection for this creator is removed synchronously with the GCP PII nullification.

**Binding on Doc 21:** GDPR deletion request flow, right-to-erasure SLA, and audit evidence requirements are formally assigned to Doc 21.

---

### PATCH-003 — Define Timeline Indexing Strategy as a Schema Contract (resolves GAP-ARB-003)

**Required indexes on the `interaction_timeline` table (binding on Doc 19):**

| Index Name | Columns | Purpose |
|---|---|---|
| `idx_timeline_ws_creator_time` | `(workspace_id, creator_id, occurred_at DESC)` | Creator relationship panel — primary query |
| `idx_timeline_ws_campaign_time` | `(workspace_id, campaign_id, occurred_at DESC)` where campaign_id IS NOT NULL | Campaign history view |
| `idx_timeline_ws_type_time` | `(workspace_id, entry_type, occurred_at DESC)` | Filtered activity view, analytics |
| `idx_timeline_enrollment` | `(sequence_enrollment_id)` where NOT NULL | Sequence tracking |
| `idx_timeline_ws_time` | `(workspace_id, occurred_at DESC)` | Workspace activity feed |

**Partitioning rule:** The `interaction_timeline` table is partitioned by month (`occurred_at` range partitioning). Partitions older than 24 months are moved to a cold-tier storage pool. All analytics queries that span partitions must use partition-pruned range conditions (M11 is responsible for this; queries without a time-bound are a review defect).

**Projection contract (M11):** M11 analytics projections must be materialized views updated by timeline-event consumers, never derived by live aggregation over the raw timeline at query time. The raw timeline is write-optimized; M11 projections are read-optimized. This is a hard boundary.

---

### PATCH-004 — Define Ledger Balance Concurrency Contract (resolves GAP-ARB-004)

**Atomicity mechanism:** The reserve-commit operation on the credit ledger uses **optimistic locking** via a `version` column on the `workspace_credit_balance` materialization row. The sequence is atomic:

1. `SELECT version, balance FROM workspace_credit_balance WHERE workspace_id = ? FOR UPDATE` (row-level write lock).
2. Check `balance >= requested_amount`. If insufficient → fail immediately, no entry written.
3. `INSERT INTO credit_ledger (entry_type='reserved', amount=-requested_amount, ...)`.
4. `UPDATE workspace_credit_balance SET balance = balance - requested_amount, version = version + 1 WHERE workspace_id = ? AND version = ?` (optimistic check; if version mismatch, retry up to 3 times).
5. Release lock and return reservation_id.

If step 4 fails (concurrent reservation modified balance between steps 1 and 4), the INSERT is rolled back and the operation retries. This pattern prevents overdraft under any concurrency scenario.

**Index requirement on ledger:** `(workspace_id, entry_type, period_tag)` for nightly integrity checks and allowance-expiry queries. The nightly sum uses partition-pruned range scans over monthly-partitioned ledger entries — the ledger is partitioned by month identically to the timeline.

**Binding on Doc 19:** The `workspace_credit_balance` materialization row and its locking semantics are schema-level requirements, not application conventions.

---

### PATCH-005 — Define Reservation-Spanning Subscription State Change (resolves GAP-ARB-005)

**Behavioral contract (binding on M10 and M9):**

| Subscription transition | Effect on active reservations |
|---|---|
| `active → past_due` | No effect. Reservations are honored; jobs complete normally. No new metered actions may be started (entitlement check blocks them). |
| `active → paused(grace)` | No new reservations accepted. Active reservations are honored for up to their TTL (default: 2× max job duration; see PATCH-007 for TTL definition). Jobs that complete during grace period commit their reservations normally. |
| `active → expired` (terminal) | All active reservations are immediately released with `credit.released` entry citing `reason='subscription_expired'`. Associated jobs receive `discovery.job_failed` with the same reason and surface honest UX state. |
| Period renewal (`transaction_completed`) | Allowance credits scheduled for expiry are only expired AFTER all in-flight reservations against that allowance are resolved. Reservation TTL sweeper checks allowance-expiry interlock before expiring credits. Sequence: (1) resolve in-flight reservations (TTL-bound), (2) expire unused allowance, (3) grant new allowance. |
| Paddle `subscription_updated` (downgrade) | Effect is period-end only (existing rule). No change to in-flight reservations. |

**TTL contract for reservations:** Reservation TTL = 2× the maximum configured discovery job duration (initial value: 30 minutes). A sweeper job runs every 5 minutes and releases any reservation older than its TTL with `reason='ttl_expired'`, alerting M12 on volume above threshold (>5/hour = defect signal).

---

### PATCH-006 — Define Consent TOCTOU Resolution (resolves GAP-ARB-006)

**Binding rule:** The opt-out event consumer (M9 reacting to `outreach.optout_recorded`) executes in the **`interactive` queue class** — a higher-priority class than the `scheduled` class used for sequence step execution (Doc 16 Part E). This ensures that when both events arrive simultaneously, opt-out processing takes priority by queue design.

**Send-path atomicity rule (binding on M9 implementation):** The eligibility check and the adapter call are wrapped in a named "send unit." Immediately before calling the mailbox adapter, M9 performs a final consent state read (a lightweight lookup, not a full eligibility re-evaluation). If the consent state has transitioned to `opted_out` between the eligibility check and the adapter call, the send is aborted. This is the "last-gate" check.

**Worst-case bound:** The race window is bounded by the time between the last-gate consent read and the adapter acknowledgment. For email sends, this is typically < 500ms. WhatsApp BSP sends carry BSP transmission latency (seconds). The last-gate check must be the final action before adapter invocation with no intermediate blocking operations.

**Idempotency note:** If a message is sent in this window and later confirmed as a TOCTOU breach (opt-out arrived 200ms before send), M9 logs this as a `compliance_race_event` to the admin audit log and the workspace timeline. The platform cannot recall sent emails (ADR-010: user's own mailbox); the incident is surfaced to the workspace Owner. This is an accepted operational residual risk at S1 volumes.

---

### PATCH-007 — Define Intra-Job Creator Deduplication (resolves GAP-ARB-007)

**Per-job deduplication set:** When a Live Discovery job is initialized, M4 allocates an ephemeral per-job deduplication set (keyed by normalized canonical profile URL — scheme-stripped, parameter-stripped, redirect-resolved). Before a candidate URL is dispatched to Apify, it is checked against: (1) the per-job dedup set; (2) GCP directly (by profile URL lookup on indexed field, NOT via Search Index — this is specified as a direct GCP access pattern for this use case only).

If the URL is in the per-job dedup set → skip. If the URL is in GCP (already known) → route to freshness check. Only unknown, non-duplicate URLs proceed to Apify.

**M5 persistence idempotency:** M5 uses UPSERT semantics for GCP creator and profile records, keyed on the canonical profile URL. Concurrent M5 workers processing the same URL in the same job converge to one record. The second UPSERT does NOT re-trigger LLM scoring if the GCP record already has a `scored_at` timestamp from the same job (checked via `job_id` correlation on the in-progress score record). This prevents double LLM cost under any concurrent-write scenario.

**Event deduplication:** M4 emits `creator.discovered` only once per creator per job (checked before emission; the outbox record carries `(job_id, creator_id)` as a unique key).

---

### PATCH-008 — Define Identity Resolution Behavioral Contract (resolves GAP-ARB-008)

**Match confidence tiers (binding on M2/M5):**

| Confidence Band | Action |
|---|---|
| ≥ 90% | Auto-merge. M5 executes merge in the same persistence transaction. Audit log entry emitted. `creator.merge_resolved` event emitted. |
| 60–89% | "Pending merge" state. `creator.merge_candidate` event emitted to M12 admin review queue. The "loser" candidate is persisted as a separate GCP record with `merge_status='candidate'` and `merge_candidate_for={potential_winner_id}`. 7-day auto-decline default (auto-separate) if no admin decision. |
| < 60% | Separate records. Both persist independently. |

**Merge operation (atomic):** A merge transaction: (1) marks the losing record `merge_status='merged_into'`, `merged_into_creator_id={winner_id}`; (2) the winner record is updated with merged profile data (union of profiles, best-available scores). The losing `creator_id` is never deleted — it becomes a permanent redirect stub.

**WP fan-out job (declared global; resolves NFR-S01 audit posture):** After `creator.merge_resolved` is emitted, a declared **plane-global** background job repoints all WP records using `creator_id={loser_id}` to `creator_id={winner_id}`. This job: (a) is declared as `scope_class=plane-global` at registration (Doc 14 A2 requirement); (b) emits a mandatory audit entry for every workspace it modifies; (c) is idempotent (safe to re-run). The `workspace_creator_link` record for the loser_id is merged into the winner_id link (if one exists) or repointed.

**Binding on Doc 18 and Doc 19:** The `creator_merge_status` enum, `merge_candidate` record structure, and the plane-global job declaration are schema-level requirements.

---

### PATCH-009 — Define GCP-to-Index Projection Atomicity and Pre-Apify Dedup Access Pattern (resolves GAP-ARB-009)

**Index projection commitment:** For **new** GCP creator records (first-time discovery), the Search Index projection write is a **synchronous compensating action** immediately following the GCP commit: GCP write succeeds → index write attempted within the same M5 execution unit. If the index write fails, the GCP record is flagged `index_pending=true` and a retry job is enqueued. The record is NOT served in Brain-1 results until `index_pending` is cleared. This closes the window between GCP persistence and search discoverability.

For **update** projections (refresh, re-scoring), async projection via the outbox relay is acceptable (eventual consistency, seconds-level lag is tolerable for non-new records).

**Pre-Apify dedup access pattern (specified):** The D2 step-1 dedup check in M4 (pre-Apify) queries the **GCP persistence layer directly** (by profile URL index) — not via the Search Coordinator or Search Index. This is an explicitly authorized direct GCP access pattern for M4 (declared in M4's module contract; one of the named exceptions to the "composed read API only" rule). The rationale: the Search Index may have projection lag; only GCP has authoritative real-time presence. The GCP profile URL index `(platform, canonical_url)` is a unique composite index (defined in PATCH-007 and codified in Doc 19).

**In-flight URL lock:** When M4 dispatches a candidate URL to Apify, a 15-minute "in-flight" lock record is written (lightweight: `job_id, canonical_url, dispatched_at, expires_at`). Any concurrent job performing a pre-Apify dedup check for the same URL within this window treats the URL as "known, pending persistence" and skips it. This lock table is ephemeral (Redis-class or a lightweight DB table, cleared on job completion).

---

### PATCH-010 — Define Score Invalidation on Prompt Version Change (resolves GAP-ARB-010)

**Score provenance fields (binding on GCP schema):** Every scored GCP creator record carries: `authenticity_score_prompt_version`, `authenticity_score_model_version`, `quality_score_prompt_version`, `quality_score_model_version`, `scored_at`. These are stored alongside the score values.

**Re-scoring invalidation rule:** Semantic deduplication ("skip re-scoring if payload unchanged") is scoped to the conjunction `(content_hash UNCHANGED) AND (active_prompt_version = stored_prompt_version) AND (active_model_version = stored_model_version)`. If either the prompt version or model version has been promoted in the Prompt Registry, the creator is eligible for re-scoring regardless of payload change status.

**Batch re-scoring governance:** When a Prompt Registry version promotion passes its evaluation gate (Doc 15 Part E), a cost estimate for batch re-scoring the affected creator population is generated and submitted for CPO approval before promotion. Approval gates the promotion. The batch re-scoring job runs as a background, low-priority `discovery-bulk` queue class job (spread over hours; the existing population is not user-waiting). Cost is absorbed as a platform operations cost (no workspace charges for prompt-version-driven re-scoring).

---

## SECTION 3 — REGISTER UPDATES

### New Risks Generated by ARB Audit

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-ARC-001 | Regulatory | TOCTOU race condition on consent check at sequence execution → message sent to opted-out contact | L-M | Critical | PATCH-006: priority queue ordering + last-gate consent check; compliance_race_event audit log |
| R-ARC-002 | Financial | Intra-job duplicate URL discovery → double LLM scoring cost per creator | M | M | PATCH-007: per-job dedup set + in-flight URL lock |
| R-ARC-003 | Security | GCP creator merge fan-out touches multiple workspaces' WP data without declared plane-global job — NFR-S01 audit gap | L | H | PATCH-008: declared plane-global job with mandatory audit emission per workspace |
| R-ARC-004 | Financial | Prompt version promotion triggers uncapped batch re-scoring cost that violates 3× guardrail at large indexed population | M | H | PATCH-010: cost estimate + CPO approval gate before any prompt version promotion; batch job is low-priority |
| R-ARC-005 | Technical | Search Index projection lag creates window where same creator is re-discovered and double-scored across concurrent jobs | M | M | PATCH-009: synchronous index projection for new records + in-flight URL lock |

### New Assumptions Generated by ARB Audit

| ID | Description | Confidence | Validation |
|---|---|---|---|
| A-066 | The managed relational DB supports `SELECT FOR UPDATE` or equivalent row-level locking for the ledger reserve operation at acceptable latency (< 50ms) | High | Doc 22 DB engine selection confirms this (standard for Postgres-class DBs) |
| A-067 | Managed search index supports synchronous write latency < 500ms such that GCP-to-index projection can be on the new-creator critical path without violating NFR-P01 | Med-High | Doc 15 index engine spike |
| A-068 | GCP profile URL lookup (direct, non-index path) is performant at S2 scale given a unique composite index on (platform, canonical_url) | High | Standard B-tree index query; no spike needed |
| A-069 | Prompt Registry promotion cost estimation is feasible (population size × per-creator LLM cost) before each promotion | Med-High | FS-10.03 cost telemetry already captures per-creator scoring cost; average × population = estimate |

### ADR Log Additions

| ID | Decision | Status |
|---|---|---|
| ADR-024 | GCP/WP cross-plane references use application-level soft FKs mediated by the `workspace_creator_link` bridge entity; no database-level FKs across plane schemas | Accepted (ARB Audit #1) |
| ADR-025 | GDPR global erasure uses PII nullification (tombstone) at GCP layer + deletion of raw payload archive; WP audit records are retained with "[Removed]" labels | Accepted (ARB Audit #1) |
| ADR-026 | Ledger reserve-commit uses `SELECT FOR UPDATE` row-level locking on the materialized balance row; overdraft prevention is a DB-enforced guarantee, not an application convention | Accepted (ARB Audit #1) |
| ADR-027 | Search index projection is synchronous for new creator records (blocking in M5 persistence transaction); async for update projections | Accepted (ARB Audit #1) |
| ADR-028 | Prompt version promotions require CPO-approved cost estimate for batch re-scoring; existing scores are valid only under the same (prompt_version, model_version) tuple that produced them | Accepted (ARB Audit #1) |

---

---

# PART II — DOCUMENT #18

---

#### DOC-018 — Domain Model, Entity Relationships & Data Lifecycle
**Status:** Draft v1.0 | **Phase:** 6 — Data & API Design | **Owner:** Principal Architects (Data, Software, Security) | **Consumes:** Docs 7–17, ARB Audit #1 Patches (ADR-024 through ADR-028), Doc 9 (A1 timeline), Doc 10 (FS-08.03 ledger), Doc 15 (Part D3 semantic dedup, controlled vocabulary), Doc 16 (event taxonomy)

---

#### Executive Summary

This document is the canonical domain model for MUSHIN 2.0. It defines every entity, its attributes, its plane ownership (GCP or WP), all relationships and their cardinalities, the cross-plane bridge entity (ADR-024), the indexing strategy for both append-only substrates (Timeline and Ledger, closing the NFR-P01 gap identified in ARB Audit #1), the identity-resolution state machine for GCP creator deduplication, the full data lifecycle (TTL, GDPR erasure, archival, score invalidation), and the controlled niche vocabulary (closing the Doc 15 blocker). This document is the authoritative input for Doc 19 (physical schema DDL) and all subsequent data-access design. Zero code, zero DDL — this document specifies *what* and *why*; Doc 19 specifies *how* in SQL.

#### Purpose & Scope

Entity catalogue (attributes, ownership, constraints), relationship map (cardinalities, access patterns), cross-plane bridge design (ADR-024), Timeline substrate schema requirements, Ledger substrate schema requirements and concurrency contract (ADR-026), identity resolution state machine (PATCH-008), GDPR/deletion lifecycle (ADR-025), data lifecycle policies (TTL, archival, score invalidation — ADR-028), and the controlled niche vocabulary (Doc 15 blocker).

#### Non-Goals

- Physical DDL, migration scripts, index syntax (Doc 19).
- API contracts, request/response schemas (Doc 20).
- Secret management, encryption-at-rest specifics (Doc 21).
- Query plans, ORM configuration (Doc 19/implementation).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every entity in the system is named, owned, and plane-classified — no orphan data without a home.
- All cross-plane relationships are mediated through ADR-024 bridge entity — no raw cross-plane FK in any WP table.
- ARB Patch-001 through Patch-010 are codified in entity definitions and lifecycle rules.
- Controlled niche vocabulary is defined as a data artifact, closing Doc 15's blocking gap.
- M11 analytics projections have named source entities and defined update triggers.
- Doc 19 can derive DDL from this document without interpretation.

---

#### Detailed Content

**Part A — Plane Architecture & Access Rules (from ARB Patches)**

**A1. Plane classification (binding):**
Every entity in the system belongs to exactly one plane:
- **GCP (Global Creator Plane):** Entities containing creator intelligence data, shareable across all workspaces. Zero workspace-originating data. Writable only by M2 (Creator Store), M4 (Live Discovery), M5 (Standardization), M6 (Intelligence & Scoring). Read by M3 (Search Coordinator), M7/M8/M9 via the composed-read API.
- **WP (Workspace Plane):** Entities containing tenant-operational data. Every WP entity carries `workspace_id` as a non-nullable, indexed column. No exceptions — a WP table missing `workspace_id` fails Doc 19 schema review.
- **Platform Plane:** Entities that are neither creator-specific nor workspace-specific (e.g., the controlled niche vocabulary, FX rate snapshots, system configuration). Read-only at runtime; updated by ops/admin workflows only.

**A2. Cross-plane access rule (ADR-024, binding on all feature code):**
No WP entity carries a database-level foreign key to a GCP entity. All references from WP to GCP are **application-level soft FKs** through the `workspace_creator_link` bridge entity. The only authorized cross-plane data composition paths are:
1. The creator profile composed-read API (M2 + M7 outputs joined in the read layer — never in the DB query).
2. M4's pre-Apify dedup check querying GCP profile URLs directly (declared exception, PATCH-009).
3. The merge fan-out plane-global job (declared exception, PATCH-008).

Any other cross-plane join in feature code is a review defect and a Qwen checkpoint item.

---

**Part B — Entity Catalogue: Global Creator Plane (GCP)**

**B1. Creator** (the canonical person/entity)

| Attribute | Type | Notes |
|---|---|---|
| `creator_id` | UUID | Immutable primary key; never reused after GDPR erasure |
| `display_name` | text | Nullable on erasure → `[erased]` |
| `primary_handle` | text | Most-stable handle; nullable on erasure |
| `merge_status` | enum | `active` \| `candidate` \| `merged_into` |
| `merged_into_creator_id` | UUID FK→Creator | Nullable; set on merge-into |
| `merge_candidate_for` | UUID FK→Creator | Nullable; set during pending-merge state |
| `index_pending` | boolean | True if index projection not yet confirmed (PATCH-009) |
| `pii_erased_at` | timestamp | Nullable; set on GDPR erasure |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Identity resolution lifecycle:** `merge_status` transitions: `active` → `candidate` (on match 60–89%) → `active` (auto-decline after 7d) OR `merged_into` (on admin approval/auto-merge ≥90%). Once `merged_into`, the record is a permanent redirect stub — never deleted, never reverted. `candidate` records are searchable by admins only; they do not appear in Brain-1 queries.

**B2. Profile** (a single social-platform account)

| Attribute | Type | Notes |
|---|---|---|
| `profile_id` | UUID | Primary key |
| `creator_id` | UUID FK→Creator | The owning Creator entity |
| `platform` | enum | `instagram` \| `tiktok` \| `youtube` \| `twitter` \| `facebook` (others future) |
| `canonical_url` | text | Unique per platform; the identity anchor for dedup (PATCH-007/009) |
| `handle` | text | Current handle; may change |
| `handle_variants` | text[] | Transliteration variants generated by T-A LLM at ingestion (Doc 15 B1) |
| `follower_count` | integer | Enriched value |
| `engagement_rate` | decimal | Enriched value |
| `last_post_at` | timestamp | Staleness signal |
| `enrichment_status` | enum | `fresh` \| `stale` \| `pending` \| `failed` \| `unsupported` |
| `enriched_at` | timestamp | |
| `enrichment_ttl_days` | integer | Per Doc 8 A5: 30d metrics, 90d demographics — stored per-profile for TTL management |
| `scraped_payload_ref` | text | Reference to object-storage archive of raw scrape payload |
| `index_projection_version` | integer | Search Index projection version for stale-projection detection |
| `created_at` | timestamp | |

**Unique constraint:** `(platform, canonical_url)` — the dedup anchor. UPSERT target for M5 (PATCH-007).

**B3. Enrichment Snapshot** (versioned intelligence output; replaces mutable score fields)

Rather than mutable score fields on the Creator/Profile entity, scored intelligence is stored as discrete, versioned enrichment snapshots. This enables score provenance (ARB Patch-010), roll-back to prior scores, and re-scoring without overwriting history.

| Attribute | Type | Notes |
|---|---|---|
| `snapshot_id` | UUID | Primary key |
| `creator_id` | UUID FK→Creator | |
| `snapshot_type` | enum | `authenticity` \| `quality` \| `audience_estimate` \| `summary` \| `niche_classification` |
| `verdict` | jsonb | The scored output (score/label per type) |
| `evidence_breakdown` | jsonb | A4 evidence array (signals, direction, weight class, payload field references) |
| `confidence_level` | enum | `high` \| `medium` \| `low` \| `insufficient_data` |
| `data_basis_statement` | text | What data was available, freshness, what was missing (A4) |
| `prompt_version` | text | Prompt Registry ID + version (ADR-028 provenance) |
| `model_version` | text | LLM provider + model pinned version (ADR-028 provenance) |
| `content_hash` | text | Hash of the payload sections used for scoring (semantic dedup key — PATCH-010) |
| `job_id` | UUID | Correlation to the discovery/enrichment job that produced this snapshot |
| `is_current` | boolean | True for the active score; false for historical snapshots |
| `created_at` | timestamp | |

**Scoring currency rule:** The currently active score for a creator is the snapshot where `is_current=true` AND `(active_prompt_version = prompt_version) AND (active_model_version = model_version)`. If no such snapshot exists (prompt version was promoted), the creator is scheduled for re-scoring. Brain-1 results serve the `is_current` snapshot's verdict fields, with a staleness indicator if the versions don't match the active registry entries.

**B4. Niche Classification** (the controlled vocabulary record for a creator)

| Attribute | Type | Notes |
|---|---|---|
| `classification_id` | UUID | Primary key |
| `creator_id` | UUID FK→Creator | |
| `primary_niche` | enum (Niche Vocabulary) | See Part H |
| `secondary_niches` | enum[] (Niche Vocabulary) | Up to 3 secondary niches |
| `niche_confidence` | enum | `high` \| `medium` \| `low` |
| `prompt_version` | text | Prompt Registry provenance |
| `classified_at` | timestamp | |

**B5. Contact Record** (GCP-level contact information; workspace reveals are in WP)

| Attribute | Type | Notes |
|---|---|---|
| `contact_id` | UUID | Primary key |
| `creator_id` | UUID FK→Creator | |
| `contact_type` | enum | `email` \| `whatsapp_number` \| `website` \| `other` |
| `value` | text | Nullable on GDPR erasure |
| `source` | enum | `scraped` \| `provider_verified` \| `user_submitted` |
| `confidence` | enum | `high` \| `medium` \| `low` |
| `discovered_at` | timestamp | |
| `pii_erased_at` | timestamp | Nullable; set on GDPR erasure |

Contact values are GCP-level (sourced from public/provider data). The reveal action (WP) marks a workspace's permission to use the contact and charges credits — it does not copy the contact into WP storage.

---

**Part C — Entity Catalogue: Workspace Plane (WP)**

**C1. Workspace** (the tenancy/billing boundary)

| Attribute | Type | Notes |
|---|---|---|
| `workspace_id` | UUID | Primary key |
| `name` | text | |
| `logo_url` | text | Nullable |
| `owner_user_id` | UUID FK→User | Exactly one owner v1 |
| `default_timezone` | text | Default `Asia/Karachi` (ADR-007) |
| `default_currency` | enum | `PKR` \| `USD` \| ISO codes |
| `subscription_state` | enum | `trialing` \| `active` \| `past_due` \| `paused_grace` \| `canceled_pending` \| `expired` |
| `subscription_plan_id` | text | Internal plan ID from Entitlement Catalog |
| `subscription_paddle_id` | text | Paddle subscription ID (stored for reconciliation; never used as business key) |
| `entitlement_snapshot_version` | integer | Incremented on state change; M1 invalidation key |
| `created_at` | timestamp | |
| `trial_ends_at` | timestamp | Nullable |

**C2. User** (global identity; cross-workspace)

Note: Users are managed by the BaaS auth provider (NFR-S02). MUSHIN stores a minimal shadow record for foreign-key purposes only.

| Attribute | Type | Notes |
|---|---|---|
| `user_id` | UUID | Mirrors BaaS identity ID |
| `email` | text | Nullable; updated from BaaS sync |
| `display_name` | text | |
| `created_at` | timestamp | |

**C3. Membership** (user × workspace × role)

| Attribute | Type | Notes |
|---|---|---|
| `membership_id` | UUID | Primary key |
| `workspace_id` | UUID FK→Workspace | |
| `user_id` | UUID FK→User | |
| `role` | enum | `owner` \| `admin` \| `member` |
| `status` | enum | `active` \| `suspended` \| `pending_invite` \| `removed` |
| `invited_at` | timestamp | |
| `joined_at` | timestamp | Nullable |
| `removed_at` | timestamp | Nullable; soft-delete: artifacts remain |

**C4. workspace_creator_link** — The GCP/WP Bridge (ADR-024, PATCH-001)

This entity is the sole authorized cross-plane reference anchor. Every WP entity that logically relates to a GCP creator references this entity, not the GCP creator_id directly (in the application layer; the `creator_id` column is physically present in WP tables for query efficiency, but the bridge entity is the logical integrity anchor).

| Attribute | Type | Notes |
|---|---|---|
| `link_id` | UUID | Primary key |
| `workspace_id` | UUID FK→Workspace | |
| `creator_id` | UUID (soft FK to GCP Creator) | Not a DB-level FK; application-enforced |
| `first_linked_at` | timestamp | Auto-set on first WP action referencing this creator in this workspace |
| `last_active_at` | timestamp | Updated on any WP interaction |
| `workspace_removed_at` | timestamp | Nullable; set when workspace removes creator (Tier-1 delete) |
| `pii_deleted_at` | timestamp | Nullable; set when GDPR erasure completes (ADR-025) |

**Unique constraint:** `(workspace_id, creator_id)` — one bridge record per workspace-creator pair.
**Index:** `(creator_id)` — for merge fan-out job to find all workspaces referencing a creator.

**C5. List**

| Attribute | Type | Notes |
|---|---|---|
| `list_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `name` | text | |
| `visibility` | enum | `private` \| `workspace` |
| `owner_user_id` | UUID | |
| `archived_at` | timestamp | Nullable |
| `created_at` | timestamp | |

**C6. ListMembership** (creator in list)

| Attribute | Type | Notes |
|---|---|---|
| `membership_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `list_id` | UUID FK→List | |
| `creator_id` | UUID (soft FK via bridge) | |
| `added_by_user_id` | UUID | |
| `added_at` | timestamp | |
| `removed_at` | timestamp | Nullable; idempotent re-add ignores this and restores |

**Unique constraint:** `(list_id, creator_id, removed_at IS NULL)` — duplicate add is a no-op.

**C7. Tag** (workspace-level folksonomy)

| Attribute | Type | Notes |
|---|---|---|
| `tag_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `name` | text | |
| `color` | text | Hex |

**Unique constraint:** `(workspace_id, name)`.

**C8. Campaign**

| Attribute | Type | Notes |
|---|---|---|
| `campaign_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `name` | text | |
| `client_name` | text | Nullable (agency use) |
| `objective` | enum | `awareness` \| `engagement` \| `conversion` \| `ugc` |
| `budget_amount` | decimal | |
| `budget_currency` | text | ISO code |
| `budget_committed` | decimal | Sum of agreed rates; computed projection |
| `start_date` | date | Nullable |
| `end_date` | date | Nullable |
| `criteria_block` | jsonb | Machine-readable targeting criteria (deep-links to FS-02.01 filters) |
| `stage_config` | jsonb | Customized stage order/labels for this campaign |
| `status` | enum | `active` \| `archived` \| `completed` |
| `created_by_user_id` | UUID | |
| `created_at` | timestamp | |
| `brief_version` | integer | Incremented on brief changes |

**C9. CampaignCreator** (creator in campaign pipeline)

| Attribute | Type | Notes |
|---|---|---|
| `campaign_creator_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `campaign_id` | UUID FK→Campaign | |
| `creator_id` | UUID (soft FK via bridge) | |
| `pipeline_stage` | text | Current stage label |
| `stage_changed_at` | timestamp | |
| `assigned_to_user_id` | UUID | Nullable |
| `drop_reason_code` | text | Nullable; set on terminal transition |
| `added_at` | timestamp | |
| `removed_at` | timestamp | Nullable |

**C10. Task**

| Attribute | Type | Notes |
|---|---|---|
| `task_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `campaign_id` | UUID FK→Campaign | Nullable (campaign-level task) |
| `campaign_creator_id` | UUID FK→CampaignCreator | Nullable (creator-level task) |
| `title` | text | |
| `due_date` | date | Nullable |
| `assignee_user_id` | UUID | Nullable |
| `completed_at` | timestamp | Nullable |
| `created_at` | timestamp | |

**C11. ConsentState** (per creator-contact-channel per workspace)

| Attribute | Type | Notes |
|---|---|---|
| `consent_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `creator_id` | UUID (soft FK via bridge) | |
| `channel` | enum | `email` \| `whatsapp` |
| `contact_ref` | text | The specific contact value this consent applies to |
| `state` | enum | `unknown` \| `contactable` \| `opted_out` \| `bounced_invalid` \| `opt_in_required` |
| `opt_in_evidence` | jsonb | Nullable; source + timestamp + attestor for WhatsApp opt-in |
| `state_changed_at` | timestamp | |
| `state_changed_by` | text | user_id or 'system' |
| `version` | integer | Optimistic lock for TOCTOU check (PATCH-006) |

**Unique constraint:** `(workspace_id, creator_id, channel)` — one consent record per channel per creator per workspace.

**C12. Reveal** (workspace-level contact reveal record)

| Attribute | Type | Notes |
|---|---|---|
| `reveal_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `creator_id` | UUID (soft FK via bridge) | |
| `contact_id` | UUID (soft FK to GCP Contact) | Which GCP contact was revealed |
| `contact_type` | enum | Denormalized from GCP Contact for read efficiency |
| `revealed_by_user_id` | UUID | |
| `revealed_at` | timestamp | |
| `credit_ledger_entry_id` | UUID | Link to the consumption ledger entry |

**C13. SequenceEnrollment**

| Attribute | Type | Notes |
|---|---|---|
| `enrollment_id` | UUID | Primary key |
| `workspace_id` | UUID | |
| `campaign_creator_id` | UUID FK→CampaignCreator | |
| `sequence_template_id` | UUID | Reference to sequence config |
| `channel` | enum | `email` \| `whatsapp` |
| `status` | enum | `active` \| `stopped` \| `completed` |
| `stop_reason` | enum | Nullable: `reply` \| `opt_out` \| `manual` \| `stage_terminal` \| `campaign_archived` \| `mailbox_revoked` \| `quality_pause` |
| `enrolled_at` | timestamp | |
| `next_step_due_at` | timestamp | Nullable |
| `current_step_index` | integer | |

---

**Part D — The Interaction Timeline Substrate**

**D1. TimelineEntry** (append-only; M7 sole writer; WP plane)

| Attribute | Type | Notes |
|---|---|---|
| `entry_id` | UUID | Primary key |
| `workspace_id` | UUID | Non-nullable; partition and isolation key |
| `creator_id` | UUID (soft FK via bridge) | Non-nullable; the creator this entry concerns |
| `entry_type` | enum | Full taxonomy from Doc 9 A1 (see D3) |
| `occurred_at` | timestamp | Authoritative time of the event; used for display ordering |
| `actor_type` | enum | `user` \| `system` \| `ai` \| `staff_impersonated` |
| `actor_id` | text | user_id, 'system', or dual-attr staff string |
| `campaign_id` | UUID | Nullable; campaign linkage |
| `sequence_enrollment_id` | UUID | Nullable; sequence linkage |
| `channel` | enum | Nullable: `email` \| `whatsapp` \| `platform` |
| `payload_ref` | jsonb | Lightweight structured summary of the event content (never full message bodies; references to object storage for large payloads) |
| `source_event_id` | UUID | The domain event ID that triggered this entry (for auditability; links to Doc 16 event taxonomy) |

**Append-only contract:** `TimelineEntry` rows are never updated or deleted (only GDPR tombstoning of PII fields on `creator.gdpr_erased` — creator_id value is retained, payload_ref is checked for PII references and PII fields nulled). Corrections are new entries of type `correction_recorded`.

**D2. Timeline Indexing Strategy (PATCH-003, binding on Doc 19)**

| Index | Columns | Query served |
|---|---|---|
| PRIMARY | `(entry_id)` | Unique lookup |
| `idx_tl_ws_creator_time` | `(workspace_id, creator_id, occurred_at DESC)` | Creator relationship panel; primary access pattern |
| `idx_tl_ws_campaign_time` | `(workspace_id, campaign_id, occurred_at DESC)` PARTIAL where `campaign_id IS NOT NULL` | Campaign history view |
| `idx_tl_ws_type_time` | `(workspace_id, entry_type, occurred_at DESC)` | Analytics filtering; outreach metrics |
| `idx_tl_enrollment` | `(sequence_enrollment_id)` PARTIAL where `sequence_enrollment_id IS NOT NULL` | Sequence activity |
| `idx_tl_ws_time` | `(workspace_id, occurred_at DESC)` | Workspace activity feed |

**Partitioning:** Monthly range partitions on `occurred_at`. Current month = hot partition (index-resident). Previous 12 months = warm (DB-resident). Older = archived to cold tier. All queries must include `occurred_at` range conditions to benefit from partition pruning. M11 projections (D4) are the mandatory access pattern for analytics — raw timeline queries are restricted to the M7 read API with mandatory range predicates.

**D3. Timeline Entry Type Taxonomy (canonical; binding)**

`note_added` | `list_membership_added` | `list_membership_removed` | `email_sent` | `email_delivered` | `email_opened` (if tracking on) | `email_replied` | `email_bounced` | `email_failed` | `whatsapp_click_to_chat_opened` | `whatsapp_message_sent` | `whatsapp_message_delivered` | `whatsapp_message_read` | `whatsapp_message_replied` | `whatsapp_message_failed` | `whatsapp_session_opened` | `whatsapp_session_closed` | `pipeline_stage_changed` | `task_completed` | `rate_recorded` | `deliverable_status_changed` | `file_attached` | `contact_revealed` | `campaign_outcome_recorded` | `sequence_enrolled` | `sequence_step_executed` | `sequence_stopped` | `enrichment_completed` | `deep_enrichment_requested` | `consent_state_changed` | `impersonation_session` | `gdpr_erasure_recorded` | `correction_recorded`

Additions to this taxonomy require a new Doc 16 consumer matrix row before implementation (governance rule, mirroring Doc 13 matrix-first rule).

**D4. M11 Analytics Projections (materialized; updated by event consumers)**

M11 maintains the following projections, each updated asynchronously by timeline-event consumers. These are the exclusive read surfaces for analytics queries.

| Projection | Source events | Update trigger |
|---|---|---|
| `campaign_outreach_metrics` | `email_sent/replied`, `whatsapp_message_sent/replied` | Per event consumer; upsert per campaign |
| `campaign_pipeline_conversion` | `pipeline_stage_changed` | Per event consumer; upsert per stage-pair |
| `campaign_budget_utilization` | `rate_recorded`, campaign budget fields | Per event + FX rate snapshot |
| `workspace_credit_burn_trend` | `credit.consumed` ledger entries | Daily roll-up job |
| `creator_response_rate` | `email_replied`, `whatsapp_message_replied` vs. first-sends | Per campaign |
| `sequence_performance` | `sequence_step_executed`, `sequence_stopped` | Per enrollment completion |

These projections have their own indexes and do not require the timeline to be re-scanned. The "single source of truth is the timeline" principle (Doc 10 FS-09.01) means the projections are derived, but M11 never serves stale data older than the consumer's event-processing lag (target: < 30s for user-visible metrics).

---

**Part E — The Credit Ledger Substrate**

**E1. CreditLedgerEntry** (append-only; M10 sole writer; WP plane)

| Attribute | Type | Notes |
|---|---|---|
| `entry_id` | UUID | Primary key |
| `workspace_id` | UUID | Non-nullable; partition and isolation key |
| `entry_type` | enum | `allowance_grant` \| `topup_purchase` \| `consumption` \| `expiry` \| `refund_adjustment` \| `promo_grant` \| `reversal` \| `reserved` \| `released` \| `committed` |
| `amount` | decimal | Positive = credit added; negative = credit consumed/reserved |
| `balance_after` | decimal | Materialized running balance at entry time (for audit; not the source of truth) |
| `occurred_at` | timestamp | |
| `period_tag` | text | Billing period identifier (e.g., "2026-07") for allowance grouping |
| `action_type` | text | Nullable; the metered action type from Doc 8 A5 (e.g., `live_search`, `enrichment`, `ai_summary`) |
| `action_reference_id` | UUID | Nullable; the specific job/enrichment/reveal that consumed credits |
| `provider_cost_snapshot` | jsonb | Nullable; on `consumption`: {provider, operation, unit_cost, model_version} for margin analytics |
| `reservation_id` | UUID | Nullable; links `reserved` → `committed`/`released` entries |
| `paddle_event_id` | text | Nullable; the Paddle event ID that triggered grant/expiry (idempotency anchor) |
| `admin_reason` | text | Nullable; required for `promo_grant` (FS-10.03 audit) |

**Append-only contract:** Ledger entries are never updated. Corrections are new entries of type `reversal` referencing the original `entry_id`.

**E2. WorkspaceCreditBalance** (materialized; ADR-026)

| Attribute | Type | Notes |
|---|---|---|
| `workspace_id` | UUID | Primary key |
| `balance` | decimal | Materialized current balance; non-negative (hard constraint) |
| `reserved_balance` | decimal | Sum of active reservations; reduces usable balance |
| `usable_balance` | decimal | Computed: `balance - reserved_balance` |
| `version` | integer | Optimistic lock version (PATCH-004, ADR-026) |
| `last_entry_id` | UUID | FK to the most recent CreditLedgerEntry |
| `updated_at` | timestamp | |

This row is updated atomically within the same DB transaction as the ledger entry insert, using `SELECT FOR UPDATE` (PATCH-004, ADR-026). It is the concurrency enforcement point — there is exactly one row per workspace, making it a narrow hot row that remains in the DB buffer pool at S1/S2 scale.

**E3. Ledger Indexing Strategy (binding on Doc 19)**

| Index | Columns | Query served |
|---|---|---|
| PRIMARY | `(entry_id)` | Unique lookup |
| `idx_ledger_ws_time` | `(workspace_id, occurred_at DESC)` | Workspace ledger history |
| `idx_ledger_ws_period` | `(workspace_id, period_tag, entry_type)` | Allowance expiry calculations |
| `idx_ledger_reservation` | `(reservation_id)` PARTIAL where `reservation_id IS NOT NULL` | Reserve-commit-release chain |
| `idx_ledger_action_ref` | `(action_reference_id)` PARTIAL where `action_reference_id IS NOT NULL` | Credit reversal on failed action |
| `idx_ledger_paddle_event` | `(paddle_event_id)` PARTIAL where `paddle_event_id IS NOT NULL` | Idempotency check for Paddle events |

**Partitioning:** Monthly range partitions on `occurred_at`. The nightly integrity check (sum of entries vs. materialized balance) uses partition-pruned range scan over the current period's partition — never a full-ledger scan.

**E4. Reservation Lifecycle (PATCH-005, ADR-026)**

Active reservations are tracked in a `CreditReservation` helper entity:

| Attribute | Type | Notes |
|---|---|---|
| `reservation_id` | UUID | Primary key; linked from ledger entries |
| `workspace_id` | UUID | |
| `action_type` | text | What action holds this reservation |
| `action_reference_id` | UUID | The job/action |
| `amount_reserved` | decimal | |
| `status` | enum | `active` \| `committed` \| `released` \| `expired` |
| `reserved_at` | timestamp | |
| `expires_at` | timestamp | `reserved_at + 2 × max_job_duration_minutes` (initially 30 min TTL) |
| `resolved_at` | timestamp | Nullable |

The sweeper job queries `WHERE status='active' AND expires_at < NOW()` and releases expired reservations (inserts `credit.released` entry with `reason='ttl_expired'`). The sweeper runs every 5 minutes. Reservation TTL is a named configuration value (M12-tunable, not hardcoded).

---

**Part F — Discovery & Ingestion Supporting Entities**

**F1. DiscoveryJob** (WP-linked, GCP-producing)

Note: Discovery jobs have a dual nature — they are initiated by a workspace (WP scope: who pays, who gets results) but produce GCP records (scope-class: mixed). The job entity itself is scoped to the initiating workspace but the produced creator records are GCP-global.

| Attribute | Type | Notes |
|---|---|---|
| `job_id` | UUID | Primary key |
| `workspace_id` | UUID | Initiating workspace (WP scope) |
| `initiated_by_user_id` | UUID | |
| `job_type` | enum | `live_search` \| `add_by_url` \| `deep_enrichment` \| `refresh` |
| `query_intent` | jsonb | Serialized filter set + NL query that triggered this job |
| `status` | enum | `queued` \| `running` \| `completed` \| `failed` \| `cancelled` |
| `reservation_id` | UUID FK→CreditReservation | The credit reservation for this job |
| `candidate_count_target` | integer | |
| `candidate_count_scraped` | integer | Updated as job progresses |
| `candidate_count_succeeded` | integer | Persisted to GCP successfully |
| `candidate_count_failed` | integer | |
| `credits_committed` | decimal | Final credit charge (proportional to success) |
| `correlation_id` | UUID | Links all events in this job's flow |
| `queued_at` | timestamp | |
| `started_at` | timestamp | Nullable |
| `completed_at` | timestamp | Nullable |

**F2. InFlightUrlLock** (ephemeral; PATCH-009)

| Attribute | Type | Notes |
|---|---|---|
| `canonical_url` | text | Primary key (normalized URL) |
| `job_id` | UUID | Job holding the lock |
| `dispatched_at` | timestamp | |
| `expires_at` | timestamp | `dispatched_at + 15 minutes` |

Cleared on job completion (all entries for `job_id` deleted). Queried by M4 pre-Apify dedup (directly on this table, one of the two authorized direct GCP-adjacent access patterns).

---

**Part G — Platform Plane Entities**

**G1. Paddle Webhook Raw Store** (platform plane; append-only)

| Attribute | Type | Notes |
|---|---|---|
| `raw_event_id` | UUID | Primary key |
| `paddle_event_id` | text | Unique; idempotency anchor |
| `source` | enum | `paddle` \| `bsp` \| `mailbox_push` (future) |
| `received_at` | timestamp | |
| `payload` | jsonb | Full raw webhook payload |
| `signature_valid` | boolean | Verified at Gateway ingestion |
| `processed_at` | timestamp | Nullable; set when processing completes |

Retention: 13 months (Doc 17 gap item, now resolved: covers annual billing dispute window).

**G2. ProcessedEventLedger** (per consumer group; idempotency)

| Attribute | Type | Notes |
|---|---|---|
| `consumer_group` | text | Module + event type |
| `event_id` | UUID | The domain event ID (Doc 16 A1 envelope) |
| `processed_at` | timestamp | |

**Unique constraint:** `(consumer_group, event_id)` — duplicate delivery = no-op (at-least-once safety, Doc 16 A3).

**G3. AdminAuditLog** (platform plane; immutable)

| Attribute | Type | Notes |
|---|---|---|
| `audit_id` | UUID | Primary key |
| `staff_user_id` | text | |
| `impersonation_context` | jsonb | Nullable; target workspace + reason + ticket ref |
| `action` | text | Named action |
| `target_type` | text | Entity type |
| `target_id` | text | Entity ID |
| `reason` | text | Mandatory (audit-first invariant — if audit write fails, action fails) |
| `occurred_at` | timestamp | |

---

**Part H — Controlled Niche Vocabulary (Closes Doc 15 Blocker)**

The niche vocabulary is a Platform Plane data artifact. It is the fixed enumeration used by T-A classifiers (Doc 15 C1) and indexed as a filterable attribute in the Search Index. Additions require a change-control review (taxonomy drift is tracked as R-PRD-010).

**v1 Vocabulary — 48 categories organized in 8 parent clusters:**

**Lifestyle & Wellness**
`lifestyle_general` | `health_fitness` | `beauty_skincare` | `fashion_style` | `food_cooking` | `travel_adventure` | `home_interior` | `parenting_family`

**Entertainment & Culture**
`comedy_humor` | `music_performance` | `gaming_esports` | `film_tv_reviews` | `books_literature` | `art_illustration` | `dance_choreography` | `podcasting`

**Knowledge & Education**
`education_tutoring` | `tech_gadgets` | `finance_investing` | `personal_development` | `science_nature` | `history_culture` | `language_learning` | `career_professional`

**Business & Entrepreneurship**
`startup_entrepreneurship` | `marketing_advertising` | `ecommerce_retail` | `freelancing_creator_economy` | `real_estate` | `hr_management`

**Social Impact & Community**
`activism_social_causes` | `religion_spirituality_islamic` | `environment_sustainability` | `community_local`

**Sports & Outdoors**
`cricket_sports` | `football_soccer` | `outdoor_adventure_extreme` | `motorsport`

**Pakistan-Specific High-Value**
`pk_fashion_textile` | `pk_food_street` | `pk_politics_commentary` | `pk_drama_entertainment` | `pk_tech_startups` | `pk_agriculture_rural` | `pk_diaspora_content`

**Commerce & Brands**
`brand_collab_showcase` | `ugc_creator` | `affiliate_review`

**Classifier rules:** A creator carries exactly one `primary_niche` and up to three `secondary_niches`, all drawn from this vocabulary. The classifier may output `confidence=low` when a creator's content spans many clusters — in this case, the first three by signal-strength become the secondaries. The `pk_diaspora_content` category is reserved for creators whose primary content theme is the Pakistani diaspora experience (GCC, UK, NA audiences); it does not overlap with geographic origin.

**Vocabulary change control:** New category additions require: (a) evidence of ≥500 MUSHIN-indexed creators matching the new category, (b) T-A prompt update with eval-gate pass, (c) batch re-classification of potentially affected creators. Removals are prohibited (existing classifications would become invalid) — instead, obsolete categories are marked `deprecated` and their creators re-classified to an active category.

---

**Part I — Data Lifecycle Policies**

**I1. Enrichment TTL & Freshness (binding; closes Doc 8 A5 TTL specification)**

| Data section | TTL | Staleness badge threshold | Notes |
|---|---|---|---|
| Follower count / engagement rate | 30 days | 15 days | High-velocity; users care about freshness |
| Audience demographics estimates | 90 days | 60 days | Lower velocity; expensive to re-score |
| Authenticity score | Until refresh OR prompt/model version change (PATCH-010/ADR-028) | No badge unless version mismatch | Quality event drives invalidation |
| AI summary | Until underlying payload refreshes | No independent TTL | |
| Niche classification | Until content-change signal OR vocabulary change | — | Stable |
| Contact record | No automatic expiry | — | GDPR-governed; reveal record is permanent in WP |

**I2. Score Invalidation on Prompt Version Change (ADR-028, PATCH-010)**

When the Prompt Registry promotes a new `prompt_version` for any scoring task:
1. Cost estimate computed: `count(GCP creators with is_current=true AND prompt_version ≠ new_version) × average_scoring_cost`.
2. CPO approves estimated cost before promotion is effective.
3. On approval: a batch re-scoring job is queued (low-priority, `discovery-bulk` class) that sets `is_current=false` on old snapshots and schedules new scoring passes. The old snapshots remain as historical records.
4. During re-scoring backfill: Brain-1 serves the old (is_current=false) snapshot with a `stale_prompt_version=true` indicator; UI shows a subtle "score being updated" badge rather than hiding the score.

**I3. GDPR / Creator Data Erasure (ADR-025, PATCH-002)**

| Trigger | Action | Timeline |
|---|---|---|
| Workspace-remove request | Soft-delete `workspace_creator_link` (Tier-1) | Immediate |
| Global right-to-erasure (GDPR) | PII nullification of GCP Creator + Contact records + all GCP Profiles; `pii_erased_at` set; raw payload archive deletion queued; Search Index projection removed | PII fields: within 72h; archive deletion: within 30 days |
| `creator.gdpr_erased` event | All workspace `workspace_creator_link` records: `pii_deleted_at` set; WP timeline entries: actor/payload_ref PII scrubbed, entry retained | Within 7 days of event |
| Workspace expired (30-day read-only grace end) | All workspace WP data marked for deletion; 90-day retention before hard purge (Doc 10 stub confirmed here) | 90 days post-expiry |

**I4. Raw Payload Archive Lifecycle**

Raw scrape payloads (object storage) follow:
- Retained for: active creator (GCP record not erased) up to 24 months, with access restricted to M5/M6 re-processing.
- Deleted on: GDPR erasure request (see I3) within 30 days.
- After 24 months without refresh: moved to deep-archive tier (cold, retrieval fee); re-scoring requests trigger restore.

**I5. Ledger & Timeline Retention**

- Ledger entries: retained for the life of the workspace + 7 years post-expiry (financial audit requirement; GDPR exempt for billing records under Art. 6(1)(c) necessity).
- Timeline entries: retained for the life of the workspace + 90-day post-expiry grace. PII within entries is scrubbed on GDPR erasure, but the structural record is retained (audit integrity).

---

#### Dependency Mapping

- **Depends on:** Docs 7–17 (all entity behaviors defined in feature specs), ARB Audit #1 patches (ADR-024 through ADR-028), Doc 9 (A1 timeline taxonomy), Doc 10 (FS-08.03 ledger, concurrency contract), Doc 15 (scoring provenance, ADR-028, niche vocabulary gap), Doc 16 (event taxonomy, discovery job entity).
- **Enables:** Doc 19 (physical DDL, index definitions, migration scripts — derives directly from Parts B–H), Doc 20 (API contracts: entity shapes, pagination patterns, projection vs. raw access rules), Doc 21 (GDPR erasure flow references ADR-025; raw-archive retention I4; consent record PII classification), Doc 26 (cross-plane isolation tests, ledger concurrency tests, Timeline query-plan tests against index strategy, identity-resolution state machine tests).
- **Blocks:** Mimo backend entity scaffolding — Part B–E table naming is canonical from this point. All prior "WP entities carry workspace_id" requirements are now enumerated.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation |
|---|---|---|---|
| A-066 | Managed DB supports `SELECT FOR UPDATE` row-level locking at < 50ms latency under S1/S2 concurrency (standard for Postgres-class) | High | Doc 22 DB engine confirmation |
| A-067 | Managed search index supports synchronous write within 500ms for new creator projections on the critical path | Med-High | Doc 15 index engine spike |
| A-068 | GCP profile URL direct lookup (B-tree index on `platform, canonical_url`) is sub-100ms at S2 scale (≤500k creators) | High | Standard index lookup; no spike needed |
| A-069 | FS-10.03 per-creator scoring cost telemetry enables prompt-version promotion cost estimation within 1h | Med-High | Telemetry pipeline in place per Doc 17 ADR-022 obligation 4 |
| A-070 | Monthly time-partitioned Timeline and Ledger tables provide adequate query performance without requiring sharding at S2 scale | High | Standard DB capability at our F1 load envelope (Doc 16 F1) |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-ARC-001 | Regulatory | TOCTOU race: consent checked at eligibility; opt-out races with adapter call | L-M | Critical | PATCH-006: priority queue + last-gate consent version check; compliance_race_event audit |
| R-ARC-002 | Financial | Intra-job duplicate URL → double LLM scoring cost | M | M | PATCH-007: per-job dedup set + in-flight URL lock + M5 UPSERT idempotency |
| R-ARC-003 | Security | Creator merge fan-out touches multiple workspaces without declared global scope → NFR-S01 audit gap | L | H | PATCH-008: plane-global job declaration + mandatory workspace-level audit emission |
| R-ARC-004 | Financial | Prompt version promotion triggers uncapped batch re-scoring cost | M | H | ADR-028: CPO cost-approval gate before promotion; backfill is low-priority background |
| R-ARC-005 | Technical | Index projection lag → same creator re-discovered and re-scored by concurrent jobs | M | M | PATCH-009: synchronous projection for new records + in-flight URL lock |
| R-DATA-001 | Data | Workspace_creator_link bridge entity becomes a hot table as creator population grows (every WP action checks/creates a link) | L | M | `(workspace_id, creator_id)` unique index keeps lookups O(1); creation is once-per-workspace-creator-pair |
| R-DATA-002 | Data | Niche vocabulary drift: T-A model outputs near-vocabulary values (misspellings, near-synonyms) causing classification scatter | M | M | Schema-constrained output (Doc 15 C2): vocabulary values are an enum in the output schema; off-vocabulary = schema validation failure → T-B escalation |

#### Alternatives Considered & Trade-offs

- **Versioned enrichment snapshots (B3) vs. mutable score fields on Creator** — chosen snapshots: enables score provenance (ADR-028), historical comparison, and rollback. Trade-off: more storage, more complex "current score" query. Mitigated by `is_current` boolean + composite index — the "get current score" query is O(1) even with many historical snapshots.
- **Separate GCP physical DB cluster vs. same cluster, separate schemas** — retained from Doc 14 (same cluster, separate schemas with distinct access roles for S1/S2). The `workspace_creator_link` bridge entity (ADR-024) makes cross-schema joins inadvisable by design even when technically possible — the application-layer soft FK is the enforcement mechanism, not the DB topology.
- **Hard-delete vs. PII nullification for GDPR** — PII nullification chosen (ADR-025): hard-delete of GCP creator records would orphan WP data across all workspaces and collapse the timeline/ledger audit trail. PII nullification + tombstone satisfies GDPR right-to-erasure for the personally-identifiable fields while preserving the structural integrity of the system. Legal review confirmation assigned to Doc 28.
- **Single niche per creator vs. primary + secondary array** — primary + secondary chosen: real creators span multiple niches (PK lifestyle creator also posts fashion content). Forcing single classification loses precision. T-A classifier outputs are constrained to the vocabulary (schema-validated) — the array doesn't introduce vocabulary drift, just richer classification.
- **Eager projection updates vs. lazy/on-demand** — eager (event-consumer-driven) projections chosen for M11: analytics metrics that are visibly stale undermine product trust. < 30s update lag from event is achievable at S1/S2 scale and avoids the "stale dashboard" complaint that erodes usage analytics credibility.

#### Gap Analysis Report

- **Outstanding from Doc 15:** Controlled niche vocabulary — **discharged in Part H.** T-A rubrics can now be written against a fixed enumeration.
- **Outstanding from Doc 14:** Identity resolution rule design — **discharged in PATCH-008 and Part B1 merge_status states.** The confidence-threshold policy and merge fan-out job are defined.
- **New gap surfaced:** GCP-to-Index projection failure recovery path — if the synchronous index write fails at M5, `index_pending=true` is set but the retry mechanism (who retries, with what backoff) is specified at the behavioral level here but the queue/retry infrastructure is Doc 19/22 detail. Assigned to Doc 22 as a named operational requirement.
- **Outstanding from Doc 7 gap item:** Data retention/deletion requirements — **discharged in Part I** (GDPR erasure, retention schedules, archive lifecycle). Doc 21 remains the formal policy owner; Part I provides the structural contract Doc 21 must satisfy.
- **New gap:** `workspace_credit_balance.usable_balance` is a computed field (`balance - reserved_balance`). Its consistency under concurrent reservation + ledger entry transactions is covered by the `SELECT FOR UPDATE` pattern, but the index on `workspace_id` covering both the balance row and the reservation rows needs careful transaction isolation specification — assigned to Doc 19 as a critical implementation note.

#### Cross-References & Decision Traceability

**ADR-024 (GCP/WP cross-plane soft FK via workspace_creator_link) — Accepted (ARB Audit #1). ADR-025 (GDPR: PII nullification tombstone pattern) — Accepted (ARB Audit #1). ADR-026 (SELECT FOR UPDATE ledger reserve-commit) — Accepted (ARB Audit #1). ADR-027 (synchronous index projection for new creators) — Accepted (ARB Audit #1). ADR-028 (prompt-version score invalidation + CPO cost-gate) — Accepted (ARB Audit #1).** Discharges: Doc 15 niche vocabulary blocker (Part H); Doc 14 identity resolution assignment (PATCH-008 + B1); ARB Patches 001–010 in full; Doc 7 retention stub (Part I); Doc 10 reservation TTL stub (E4). Closes: GAP-ARB-001 through GAP-ARB-010. Opens: Doc 21 GDPR policy formalization (references ADR-025 as the structural contract).

#### Open Questions & External Dependencies

1. Legal confirmation that PII nullification (tombstone) satisfies GDPR right-to-erasure for creator records (Doc 28, now assigned — structural contract in ADR-025 provides the "how"; legal must confirm the "whether").
2. Search index engine synchronous write latency validation (A-067) — part of the Doc 15 spike instrument.
3. DB transaction isolation level for the `workspace_credit_balance` + `CreditReservation` concurrent-write scenario — Doc 19 specifies; assumed `READ COMMITTED` + `FOR UPDATE` is sufficient; needs Mimo implementation validation.
4. Niche vocabulary PK-specific categories: `pk_drama_entertainment` and `pk_politics_commentary` may need sub-classification guidance for the T-A classifier rubric — design-partner input in S1, vocabulary refinement as a minor change-control item.
5. Raw payload archive 24-month cutoff — is this short enough for GDPR data-minimization compliance given that re-scoring value declines after model evolution? Legal/data-protection review (Doc 28).

#### Future Revision Triggers

Niche vocabulary reaching capacity (>70 categories triggers a re-structuring review); identity resolution confidence threshold calibration post-launch data (if auto-merge ≥90% produces errors, threshold raised); ledger partition archive strategy revisited if PK agency transaction volumes exceed F1 envelope; ADR-028 re-scoring cost estimate revealing budget unsustainability (would trigger a "lazy re-scoring" alternative where only on-demand fetches re-score with new prompts); GDPR erasure SLA changes from regulators.

#### Review Checklist & Validation Criteria

- [ ] Every entity: named, plane-classified, attributes listed. ✅
- [ ] No WP entity carries a DB-level FK to GCP. ✅
- [ ] workspace_creator_link bridge entity defined with all required indexes. ✅
- [ ] Timeline: all 10 query patterns covered by named indexes; partitioning defined. ✅
- [ ] Ledger: SELECT FOR UPDATE concurrency contract; ReservationTTL; sweeper job. ✅
- [ ] Identity resolution: confidence tiers, merge_status enum, fan-out job declared plane-global. ✅
- [ ] GDPR erasure: two-tier (workspace remove vs. global erasure); tombstone pattern; archive deletion. ✅
- [ ] Niche vocabulary: 48 categories; change-control process; no deletion permitted. ✅
- [ ] ARB Patches 001–010: all codified in entity definitions or lifecycle rules. ✅
- [ ] Zero code, zero DDL. ✅
- [ ] Sign-off: Principal Architects (Data, Software, Security), CPO (ADR-028 cost-gate process, niche vocabulary), Legal/Privacy (ADR-025 GDPR confirmation, retained for Doc 28), Engineering Director; Qwen review against all ARB Patch requirements and Doc 15 niche vocabulary gap.

---

[AWAITING APPROVAL]
