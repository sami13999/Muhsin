# Document 27: Operational Runbooks & Incident Response

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 21 (Security), Doc 22 (Infrastructure), Doc 23 (Observability), Doc 24 (Testing), Doc 26 (CI/CD)
**Governing ADRs:** ADR-012, ADR-020, ADR-021, ADR-022, ADR-025, ADR-026, ADR-027
**Applied Patches:** PATCH-005, PATCH-006, PATCH-009 (runbook subjects), PATCH-002 (erasure SLA operations)

---

## 1. Incident Response Lifecycle

### 1.1 Severity Definitions (binding, per Doc 23 §4.1)

| Sev | Definition | Ack SLA | Examples |
|---|---|---|---|
| **Sev1** | Data breach, tenancy leak, ledger corruption, total outage | 15 min | Tenancy canary breach; balance/ledger mismatch; prod down |
| **Sev2** | Credential leak, provider hard-down, payment pipeline stalled, erasure SLA breach imminent, auto-rollback fired | 30 min | Paddle circuit open; leaked API key; outbox lag >5 min |
| **Sev3** | Degraded pipeline, backlog, elevated error rates | Business hours | Sweeper spike; projection retries; queue backlog |
| **Sev4** | Trends, cost anomalies, quota drift | Weekly review | Amber margin band; quota forecast warnings |

**Classification rule:** when in doubt between two severities, pick the higher and downgrade explicitly with a stated reason — downgrades are logged in the incident timeline; silent downgrades are a PIR finding.

### 1.2 Incident Command Structure

At S1 team size (3-5 eng), roles are hats, not people:

- **Incident Commander (IC):** the responder who acknowledges the page. Owns the timeline, decisions, and role delegation. The IC does **not** debug while commanding — if the IC must go hands-on-keyboard, they hand IC to the secondary first.
- **Technical Lead (TL):** hands-on diagnosis/remediation. Default: the on-call secondary or the module owner (manifest `owner`, Doc 25 §4).
- **Communications Lead (CL):** status page, customer comms, regulator-clock tracking. For Sev1/Sev2 this defaults to founder/CTO; for Sev3 the IC absorbs it.
- Sev1 involving personal data additionally opens the **breach-assessment track** (Doc 21 §8): the GDPR 72-hour notification clock starts at *awareness of a likely breach*, not at resolution — CL logs the clock-start timestamp in the incident channel as the first action.

### 1.3 Lifecycle Stages

1. **Detection:** alert (Doc 23 §4.2), canary failure, customer report, or eng observation. Every incident gets a PagerDuty incident + auto-created Slack channel `#inc-<yyyymmdd>-<slug>`.
2. **Triage:** classify severity; assign hats; post the initial situation summary (template §1.4) within 15 min of ack.
3. **Mitigation:** stop the bleeding first — flag kill-switch (Doc 26 §7) before rollback, rollback (Doc 26 §6) before hotfix, hotfix last. Mitigation ≠ resolution; the incident stays open.
4. **Resolution:** root cause addressed or consciously deferred with a ticket; alerts quiet; verification steps of the relevant runbook green.
5. **PIR:** §7, within 5 business days for Sev1/Sev2.

### 1.4 Communication Protocols

- **Internal:** all decisions and observations go in the incident channel with timestamps — the channel *is* the timeline; PIRs are reconstructed from it. No side-channel DMs for incident decisions.
- **Customer status page** (Doc 23 §7): Sev1 always; Sev2 when customer-visible. Template ladder: *Investigating → Identified → Monitoring → Resolved*, plain language, no internal identifiers, update cadence ≥ every 60 min while open.
- **Regulator notification:** pre-drafted template (with counsel, Doc 28); decision to notify is made by founder + counsel, informed by CL's breach-assessment log; the 72 h clock discipline means the *assessment* must conclude within 48 h to leave notification headroom.

---

## 2. On-Call Rotation & Escalation

- **Structure:** weekly primary + secondary; founder/CTO permanent tertiary (Doc 23 §8). Rotation calendar in PagerDuty; swaps self-service with 24 h notice.
- **Escalation:** Primary (15 min ack) → auto-escalate Secondary (+15) → CTO (+15). Manual escalation is always permitted and never criticized — under-escalation is the failure mode we police, not over-escalation.
- **Compensation:** off-hours Sev1/Sev2 pages earn time-off-in-lieu (half day per disrupted night, full day per disrupted weekend day); tracked honor-system at S1, formalized at S2 hiring.
- **Handoff checklist (Monday, 15 min sync):**
  1. Open incidents and their state
  2. Quarantined/flaky suites (Doc 24 §9) that might page falsely
  3. Deploys shipped last week + anything flag-dark awaiting release
  4. Alert-tuning changes made (Doc 23 §4.2 hygiene rule outcomes)
  5. Upcoming: scheduled campaigns (PATCH-010 re-scoring), partition pre-creation run, DR drill, canary panel refresh
  6. Provider advisories (Apify actor deprecations, Paddle/Meta policy notices)

---

## 3. Runbook Template & Structure

All runbooks live at `docs/runbooks/<slug>.md`, versioned with code, linked from their alert rule (**"no runbook, no alert"** — Doc 23; CI checks the link's existence when alert rules deploy, Doc 26 §10.4).

**Template (mandatory sections):**

```markdown
# RB-<slug>
**Trigger:** <alert name + threshold, Doc 23 §4.2 reference>
**Severity:** <default sev + upgrade conditions>
**Impact:** <who/what is affected, in customer terms>
## Diagnosis
<numbered steps with EXACT Axiom/Grafana queries, copy-pasteable>
## Remediation
<decision tree: cheapest reversible action first>
## Escalation
<when to page whom; when this becomes a different runbook>
## Verification
<observable conditions proving resolution; which metrics return to baseline>
**Last drill/real execution:** <date> — runbooks unexecuted for 6 months are flagged stale
```

---

## 4. Canonical Runbooks

Condensed operational content; full copy-pasteable query text lives in the repo versions.

### RB-01: Ledger Sweeper Rate Spike (PATCH-005)

- **Trigger:** `mushin.credits.swept` > 5/h (Sev3; Sev2 if sustained 4 h or paired with customer reports).
- **Impact:** reservations expiring instead of settling — customers' jobs may be completing without settlement (revenue leak) or failing silently (UX harm). The sweeper is *working correctly*; something upstream is failing to settle.
- **Diagnosis:** (1) Axiom: swept reservation IDs → join to `job_id`s → are jobs completing? (2) If jobs complete but don't settle → check worker errors at settlement step; check `ledger.lock_wait_ms` p99 (contention starving settlement, ADR-026 path). (3) If jobs aren't completing → this is a pipeline incident, pivot to RB-06/queue diagnosis. (4) Check for a deploy correlation (Doc 26 deploy log).
- **Remediation:** worker crash-loop → re-pin previous image (Doc 26 §6); DB contention → check for a runaway campaign hogging locks, pause `q-rescore-low` consumers; settlement code bug → kill-switch flag if flagged, else rollback.
- **Verification:** sweep rate < 1/h for 2 h; disposition audit confirms swept reservations landed in contract-correct states (PATCH-005 per-state table).

### RB-02: Projection Retry Storm (PATCH-009 / ADR-027)

- **Trigger:** projection retries > 10/h, or heal backstop touching rows (Sev3).
- **Impact:** newly discovered creators delayed appearing in search; discovery jobs deliver flagged/degraded results (Doc 20 contract) — customer-visible but self-healing.
- **Diagnosis:** (1) Meilisearch task API status + latency panel (index overload vs. hard failure). (2) Distinguish: timeouts under load (A-069 territory) vs. 4xx (schema/payload bug — correlate with deploys) vs. network partition (Railway↔Meilisearch connectivity).
- **Remediation:** overload → reduce ingestion concurrency (worker env config, no deploy) and let retries drain; hard index failure → engage Meilisearch Cloud support (Sev2), rows remain `pending` and heal on recovery; schema bug → rollback. **Never** hand-edit `projection_status` — the heal backstop is the only writer that reconciles.
- **Verification:** `projection.sync_success` back to baseline; zero rows `pending` > 1 h; a manual new-creator probe is searchable pre-job-completion (the ADR-027 invariant, re-confirmed).

### RB-03: Consent Last-Gate Block Spike (PATCH-006)

- **Trigger:** `consent.last_gate_blocks` > 20/h (Sev3).
- **Impact:** none to compliance — **the blocks are the system succeeding** (zero post-opt-out sends is preserved). A spike signals upstream latency or consent flapping, and blocked sends are silently consumed credits/scheduling slots.
- **Diagnosis:** (1) Sample blocked events in Axiom: time delta between opt-out and attempted send. Large deltas → queue latency (check `queue.oldest_message_age_s` on send queues; opt-outs should overtake via priority class — verify priority consumption is healthy). (2) Same contacts flapping opt-in/opt-out → possible consent-state bug or a customer misusing re-enrollment; check consent version history for the sampled contacts.
- **Remediation:** queue latency → scale send-queue consumers (§6.1); priority inversion → verify `q-*-high` consumer weighting config; flapping → if product bug, kill-switch re-enrollment flag; if customer abuse pattern, flag to support (Doc 29 workflow).
- **Verification:** block rate < 5/h; audit sample confirms every block has consent-version evidence logged (Doc 21 audit stream).

### RB-04: Apify Canary Failure (R-TEC-007)

- **Trigger:** canary run schema diff failure or actor error, any of the six actors (Sev3; Sev2 if primary actor for a platform is hard-down and customer jobs are failing).
- **Impact:** impending or active scraper breakage — canaries fire *before* customer impact by design (Doc 23 §6); check whether customer jobs are already degrading (payload validation pass-rate panel).
- **Diagnosis:** (1) Canary diff report: field removed/renamed/retyped vs. run error. (2) Panel account issue (private/deleted — A-072) vs. actor issue: is the failure uniform across panel accounts? Uniform → actor; single account → panel refresh, not an incident. (3) Check Apify actor changelog/issues for a pushed update.
- **Remediation (decision tree):** single-account → replace panel account (48 h SLA, versioned panel baseline reset — Doc 24 §11.1). Field rename with same semantics → adapter mapping patch (small MR, expedited). Actor hard-broken → activate **multi-actor fallback** (R-TEC-007 mitigation): flip adapter config to the designated fallback actor for that platform (kill-switch flag, Doc 26 §7 — mandatory flag for adapters); accept degraded field coverage per the adapter's named degraded state (ADR-022 obligation 6). Prolonged outage → pause affected discovery job intake (feature flag) rather than sell failing jobs; reservations release per PATCH-005.
- **Verification:** canary green on 2 consecutive runs; payload validation pass rate ≥ baseline; if fallback active, a ticket exists to restore/re-evaluate the primary.

### RB-05: Paddle Webhook Drift (R-FIN-007)

- **Trigger:** webhook delivery lag alert, reconciliation mismatch, or customer entitlement complaint (Sev2 — money and access).
- **Impact:** entitlement/credit state diverges from Paddle truth — customers over- or under-entitled.
- **Diagnosis:** (1) Axiom: last received event per source vs. Paddle dashboard event log — missing events? signature failures (possible R-SEC-007, escalate to RB-08 if so)? (2) Received-but-unprocessed → check webhook consumer DLQ.
- **Remediation:** **fetch-to-heal** — run the reconciliation job scoped to affected subscription IDs: fetch authoritative state from Paddle API, diff against local, apply corrections through the normal idempotent event handlers (never direct DB writes to entitlement or ledger; ledger corrections are new append-only entries with `reconciliation` reason codes, ADR-012). DLQ'd events → redrive after fixing the processing fault.
- **Verification:** reconciliation job reports zero drift on two consecutive runs; affected customers' entitlements spot-checked; ledger audit trail shows correction entries, not mutations.

### RB-06: Outbox Relay Lag (ADR-020)

- **Trigger:** oldest unrelayed row > 5 min (Sev2 — everything downstream depends on the outbox: projections, erasure propagation, campaign events).
- **Diagnosis:** (1) Relay worker alive? (Railway process status, consumer liveness probe). (2) Alive but slow → poison event throwing repeatedly (Axiom: relay errors by event type) vs. SQS throttling vs. outbox table bloat (dead tuples — check autovacuum recency). (3) Burst backlog after an incident → expected drain, monitor only.
- **Remediation:** dead relay → restart/re-pin. Poison event → move to the outbox dead-letter table (dedicated runbook step with two-person confirmation — skipping an event is a data-loss decision; log event ID in incident channel). Throughput → scale relay workers (relay is per-key-order-safe to parallelize by design). Bloat → manual `VACUUM ANALYZE` off-peak.
- **Verification:** lag < 30 s sustained 30 min; downstream consumers (projection, erasure) show no gap — spot-check the oldest previously-stuck event's effects landed exactly once.

### RB-07: Database Connection Pool Exhaustion

- **Trigger:** pool saturation metric / connection errors in logs (Sev2 if request failures occur).
- **Diagnosis:** (1) Grafana: connections by service — which tier is consuming (web vs. workers vs. relay)? (2) Long-running transactions holding connections (`pg_stat_activity` sorted by `xact_start` — exact query in repo runbook): a stuck ledger transaction (ADR-026 lock chain) shows here. (3) Leak signature: connections climbing monotonically post-deploy → deploy correlation.
- **Remediation:** stuck transactions → `pg_terminate_backend` on the blocker after logging its query (ledger transactions are idempotent-safe to kill: reservation either committed or it didn't — PATCH-004 semantics); leak → rollback the correlated deploy; genuine load → raise pool ceiling within Neon plan limits and ticket capacity review (§6.2).
- **Verification:** pool utilization < 70% steady; zero connection errors 1 h; `ledger.lock_wait_ms` back to baseline.

### RB-08: Leaked Credential (R-SEC-007 / Doc 21 §6.2)

- **Trigger:** secret-scan hit, provider notice, webhook signature failure spike, or anomalous usage (Sev2; Sev1 if exploitation confirmed).
- **Remediation (clock: rotation ≤ 4 h from detection):** identify blast radius from the secret's scope (per-env, per-stage scoping limits it — Doc 22 §4) → rotate at provider → update secret manager (dual-secret overlap for webhook secrets) → verify consumers picked up the new version → audit usage logs for the exposure window → if customer data plausibly accessed, open breach-assessment track (§1.2).

---

## 5. Disaster Recovery & Backup Procedures

- **PITR execution (RTO ≤ 4 h, Doc 22 §8):** (1) Declare Sev1, freeze deploys, pause worker fleet (stop consuming — queues buffer). (2) Neon PITR restore to target timestamp on a new branch. (3) Validation gate on the restored branch: schema assertions, ledger balance derivation check, row-count sanity vs. metrics history. (4) Repoint app/workers (connection string via secret manager). (5) **Reconciliation pass:** Paddle fetch-to-heal across the gap window (RB-05 machinery); outbox events created-but-unrelayed pre-restore re-relay naturally; customers notified of the gap window via CL. (6) Post-restore: search index consistency check → §5's rebuild if drifted.
- **Search index full rebuild (RTO ≤ 6 h):** provision fresh index with settings-as-code → bulk reprojection job streams all non-tombstoned GCP creators (reuses ADR-027 projection code path in batch mode) → verify count parity + sampled query correctness → atomic index alias swap. Tombstoned creators (ADR-025) are excluded by the projector's source query — a rebuild is also an erasure-consistency repair.
- **Queue rehydration:** queues are not backed up by design — the outbox is the durable source (Doc 22 §8). Recreate queues via Terraform → relay resumes from unrelayed outbox rows → in-flight job state machines resume from persisted job state (ADR-021 job records) with redelivered messages absorbed idempotently.
- **Emergency secret rotation:** RB-08.
- **DR drill schedule (quarterly, Doc 24 §10.3):** rotating scenario — Q1 PITR restore-to-staging (validates A-067), Q2 rollback drill (web+worker), Q3 index rebuild, Q4 secret rotation + break-glass access (Doc 22 §8). Every drill updates the runbook's "last executed" stamp and files gaps as `pir`-labeled tickets.

---

## 6. Capacity Planning & Scaling Runbooks

### 6.1 Worker Fleet Scaling

- **Signal:** sustained `queue.depth` growth + `oldest_message_age_s` trend (not instantaneous spikes).
- **Action:** raise Railway service replica count per consumer group; respect the `q-rescore-low` 20% cap (Doc 22 §5.3) — scaling the fleet raises the cap's absolute value, which is correct; never scale rescore consumers independently above cap.
- **Model:** the Doc 24 §5.3 throughput measurements define jobs/worker/hour per job type; capacity reviews (monthly, §2 handoff feeds it) compare demand forecast vs. fleet size.

### 6.2 Database Scaling

- **Read pressure:** Neon read replica for Brain 1 search-adjacent reads and Timeline queries — **never** for ledger reads (ADR-026 requires primary-consistency for balance reads; replica lag would break reserve correctness). Repository layer already routes by consistency requirement.
- **Write/lock pressure:** `ledger.lock_wait_ms` trending → first verify no misbehaving long transactions (RB-07), then compute-tier upgrade; partitioning already contains Timeline write costs (PATCH-003).

### 6.3 Meilisearch Scaling

- **Signal:** sync-write p99 approaching the 5 s budget (A-069 panel).
- **Action:** tier upgrade with Meilisearch Cloud; if ceiling reached, ingestion concurrency cap (RB-02 lever) trades throughput for latency until re-architecture review — a persistent breach reopens the ADR-027 posture discussion at ARB.

### 6.4 LLM Rate-Limit Headroom

- **Signal:** headroom panel < 30% at peak (Doc 23 §6).
- **Action ladder:** provision higher TPM tier → shift `q-rescore-low` campaigns to off-peak windows (scheduler config) → per-tier model routing adjustments (cheaper tier for lower-stakes stages, via Prompt Registry model pins — full eval flow applies, Doc 25 §6). Backpressure engages automatically before 429 storms (Doc 24 §5.4 verified behavior).

---

## 7. Post-Incident Review (PIR)

- **Blameless, mandatory** for Sev1/Sev2 within 5 business days; optional-but-encouraged for instructive Sev3s.
- **Template:** timeline (from the incident channel) → impact quantification (customers, duration, credits/refunds, data) → **5 Whys** root-cause chain (stopping at systemic causes, not human error — "engineer missed X" always yields a sixth why: what made X missable?) → what went well → action items.
- **Required outputs (hard rule, Doc 23 §8):** ≥1 **detection** improvement (alert/metric/canary gap) and ≥1 **prevention** item (test, lint, design change). Adversarial corpus additions (Doc 24 §1.3) count as prevention for injection/payload incidents.
- **Tracking:** `pir`-labeled tickets with owners and due dates; open `pir` items reviewed in the weekly alert-tuning session; a `pir` item slipping twice escalates to founder review. PIR docs live in the repo (`docs/pirs/`) — searchable institutional memory.

---

## 8. SLA Definitions & Monitoring

| SLA | Target | Measured By |
|---|---|---|
| Sev1 ack | 15 min | PagerDuty analytics |
| Sev2 ack | 30 min | PagerDuty analytics |
| Uptime (customer-facing, S1/S2) | 99.5% monthly (internal target 99.9%) | Synthetic probes (Doc 23 §7); status page history |
| Support first response | Business hours: 8 h (Pro), 24 h (Starter) — PK business week, Sun-Thu aware | Ticket system |
| GDPR Tier 2 erasure | 30-day legal / **72 h target** | Erasure SLA tracker (Doc 23 dashboard); Sev2 at 48 h open |
| Job progress freshness (ADR-021 polling) | Status staleness < 30 s | Pipeline metrics |

External SLA commitments are published in ToS terms (Doc 28) at the 99.5% level — we publicly commit only what a Sev1's worst-case recovery (RTO 4 h ≈ 99.45% monthly if fully consumed) cannot casually break; 99.9% remains the internal bar.

---

## 9. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-OPS-001 (new)** | Operational | Runbooks rot (queries drift from schema/dashboards) | M-H | M-H | "Last executed" staleness flag (6 mo); drills execute runbooks verbatim; runbooks versioned with code so schema MRs can update them in-diff |
| **R-OPS-002 (new)** | Operational | Single-person incident load at S1 team size (IC+TL+CL collapse into one) | M | H | Hat-handoff discipline (§1.2); founder as standing CL; under-escalation policing; hiring trigger: >2 Sev2/month sustained |
| **R-OPS-003 (new)** | Operational | Manual interventions (DLQ redrive, event skip, backend terminate) cause secondary damage | L-M | H | Two-person confirmation on destructive runbook steps; all manual actions logged in incident channel; idempotent-by-design substrates (ADR-020/026) limit blast radius |
| **R-OPS-004 (new)** | Operational | DR drill findings not actioned (drills become theater) | M | M | Drill gaps are `pir`-labeled with the same escalation as incident PIRs |
| **R-OPS-005 (new)** | Compliance | Breach-assessment clock mismanaged during chaotic Sev1 | L-M | Critical | CL logs clock-start as first action (§1.2); pre-drafted regulator template; 48 h assessment deadline leaves headroom |

---

## 10. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-088 | S1 team can sustain the weekly rotation without burnout at projected alert volume (<5 pages/month) | Med (alert hygiene rule is the guard; R-OPS-002 hiring trigger the escape) |
| A-089 | Neon PITR + repoint completes within the 4 h RTO at production data volume | Med (Q1 drill resolves — refines A-067) |
| A-090 | Paddle API supports bulk state fetch at reconciliation scale without rate-limit pain | Med-High (verify during RB-05 first execution/drill) |
| A-091 | Meilisearch bulk reprojection sustains full-rebuild ≤ 6 h at S2 corpus size | Med (Q3 drill resolves) |

**Dependencies:** Doc 23 (every trigger references its alert; dashboards are the diagnosis surface), Doc 26 (rollback/flag machinery invoked by remediations; deploy freeze mechanics), Doc 24 (drill schedule shared; smoke suite = post-remediation verification), Doc 28 (regulator template counsel review; ToS SLA publication; erasure legal windows), Doc 29 (Support's role in customer-facing incident comms and RB-03 abuse-pattern escalation; who may execute destructive runbook steps).

**Open questions:**
1. Status page provider selection (Instatus vs. Statuspage) — trivial, decide at setup; requirement: API-driven updates from incident tooling.
2. Whether PagerDuty analytics suffice for SLA reporting or a lightweight incident-metrics rollup (MTTA/MTTR by sev) should live in Grafana — recommend Grafana rollup at S2.
3. Two-person confirmation mechanics for destructive steps at S1 (when only one responder is awake) — proposal: founder/CTO async confirmation with 15-min timeout allows proceed-with-log; ratify at first drill.

---

**End of Document 27.**

[AWAITING APPROVAL]