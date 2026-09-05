# Document 23: Monitoring, Logging & Observability

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 17 (Architecture), Doc 20 (API Design), Doc 21 (Security), Doc 22 (Infrastructure)
**Governing ADRs:** ADR-012, ADR-017, ADR-019, ADR-020, ADR-021, ADR-022, ADR-026, ADR-027, ADR-028
**Applied Patches:** PATCH-005, PATCH-006, PATCH-009, PATCH-010

---

## 1. Structured Logging Strategy

### 1.1 Log Schema

Every log line is a single JSON object conforming to a versioned schema:

```json
{
  "ts": "2026-07-05T10:32:01.443Z",
  "level": "warn",
  "schema_v": 2,
  "service": "worker-discovery",
  "env": "prod",
  "msg": "apify actor run exceeded latency budget",
  "request_id": "req_9f3c...",
  "trace_id": "4bf92f35...",
  "workspace_id": "wsp_01H...",
  "actor_id": "usr_01H...",
  "job_id": "job_01H...",
  "module": "M5",
  "adapter": "apify.instagram-scraper",
  "duration_ms": 48211,
  "ctx": { }
}
```

**Rules:**
- `msg` is a static, grep-stable string — variable data goes in structured fields, never interpolated into `msg`.
- `workspace_id` / `actor_id` present on every request-scoped and job-scoped line; `system` sentinel for platform jobs (sweeper, partition pre-creation).
- `adapter` field mandatory on any line emitted inside an adapter call (ADR-022) — this is what makes per-provider health queries (§6) trivial.
- `ctx` is the only free-form object and passes through the redaction middleware (§1.4) with fail-closed semantics.

### 1.2 Log Levels

| Level | Use | Examples |
|---|---|---|
| `fatal` | Process cannot continue | Missing KMS handle at worker boot; unmigrated schema detected |
| `error` | Operation failed, no automatic recovery | DLQ delivery; settlement failure after retries; webhook signature failure |
| `warn` | Degraded or anomalous, self-healing engaged | PATCH-009 projection retry; sweeper releasing an expired reservation; adapter circuit-open |
| `info` | Business-significant state transitions | Job created/completed; credit settlement; prompt version promotion; erasure executed |
| `debug` | Diagnostic detail | Adapter request/response metadata (never bodies); scoring pipeline stage timings |

`debug` is disabled in prod by default, enableable per-service via config flag (not redeploy) for time-boxed investigations (auto-reverts after 4 h — prevents forgotten debug logging from leaking C2-adjacent detail and inflating cost).

### 1.3 Correlation Model

- **`request_id`:** minted at the edge for every HTTP request; returned in the `X-Request-Id` response header (support asks users for it — feeds Doc 29 Support workflows).
- **`trace_id`:** OTel trace identifier (§3); `request_id` ↔ `trace_id` linked on the root span so either can pivot to the other.
- **`job_id`:** discovery/outreach job identity; carried in queue message attributes so every worker line for a job is correlated even across retries and redeliveries — the polling contract (ADR-021) means a customer-reported job ID leads directly to the full worker log history.
- **Outbox lineage:** outbox relay (ADR-020) stamps `origin_trace_id` into relayed messages — a consumer's logs link back to the transaction that produced the event.

### 1.4 Redaction Rules

Realizing Doc 21 §6.4 as a concrete middleware contract:

- **C1 (tokens, credentials, secrets):** structurally unloggable — the logger's serializer maintains a denylist of field names (`token`, `refresh_token`, `authorization`, `client_secret`, `api_key`, plus adapter-registered names) and replaces values with `"[C1_REDACTED]"`. Additionally, an entropy heuristic flags high-entropy strings >32 chars in `ctx` for redaction.
- **C2 (PII):** creator/user emails, names, handles replaced with stable HMAC-based pseudonyms (`crt_hash:ab12…`) — allows correlation ("same creator appears in 3 failed jobs") without PII exposure. The HMAC key lives in KMS and is *not* rotated with other keys (rotation would break historical correlation) — documented exception.
- **Fail-closed:** unknown nested objects in `ctx` deeper than 2 levels are dropped with a `_redaction_dropped: true` marker. A missing redaction middleware (misconfigured service) is a **boot failure**, not a warning.
- **Scraped payloads never logged** — payload references are logged as R2 object keys + `content_hash` (PATCH-010), pointing to the archive instead of inlining hostile content (R-SEC-006 hygiene: logs must not become a prompt-injection or XSS vector in log-viewer UIs).

### 1.5 Aggregation Pipeline

- **Web tier:** Vercel log drains → log backend.
- **Workers:** stdout JSON → platform collector → same backend.
- **Backend decision (Doc 22 gate resolved):** **Axiom** — selected for ingest-priced (not retention-priced) economics fitting our 24-month security-audit stream, and query performance on JSON fields without Loki's label-cardinality constraints (`workspace_id` as a queryable field would explode Loki label cardinality; in Axiom it's just a column). Grafana Cloud remains the metrics/tracing/alerting home (§7) — split-backend is acceptable because alerting on *logs* is limited to a small set of patterns (§4) forwarded via Axiom monitors.
- **Streams:** `ops` (30-day retention), `audit` (24-month: staff actions, ledger events, consent checks, erasure lifecycle, impersonation — per Doc 21 §6.4), `access` (edge/WAF logs, 90-day).

---

## 2. Metrics Collection & Dashboards

### 2.1 OTel Integration

- OTel SDK in monolith and workers; metrics exported via OTLP to Grafana Cloud.
- **Naming convention:** `mushin.<domain>.<metric>` with bounded-cardinality attributes. **Cardinality rule:** `workspace_id` is *never* a metric attribute (unbounded); workspace-level analysis happens in logs/traces. Attributes are drawn from closed sets: `queue_class`, `adapter`, `module`, `job_type`, `prompt_version`, `model_version`, `error_code` (the 35-code catalogue from Doc 20).

### 2.2 Metric Inventory (Core)

| Domain | Metrics |
|---|---|
| **Credits** | `credits.reserved`, `credits.settled`, `credits.released`, `credits.swept` (PATCH-005), `ledger.lock_wait_ms` (ADR-026 contention histogram) |
| **Jobs** | `jobs.created/completed/failed` by `job_type`; `jobs.duration_ms`; `jobs.items_processed`; `jobs.poll_requests` (ADR-021 polling load) |
| **Queues** | `queue.depth`, `queue.oldest_message_age_s`, `queue.dlq_depth` — all by `queue_class` |
| **Adapters** | `adapter.calls`, `adapter.errors` by `error_class`, `adapter.latency_ms`, `adapter.circuit_state`, `adapter.degraded_responses` (ADR-022 obligation telemetry) |
| **Ingestion** | `ingestion.payloads_validated/rejected` (R-TEC-008 gate), `scoring.grounding_failures` (R-SEC-006 signal), `projection.sync_success/retry/healed` (ADR-027, PATCH-009) |
| **Consent** | `consent.last_gate_checks`, `consent.last_gate_blocks` (PATCH-006 — a nonzero block rate is the TOCTOU fix visibly working) |
| **Cost** | §5 inventory |
| **Security** | `authz.workspace_mismatch` (tenancy signal), `webhook.signature_failures`, `auth.refresh_reuse_detected` |

### 2.3 Dashboards

Four canonical dashboards, provisioned as code (Grafana JSON in the repo, deployed via CI — dashboards are reviewed artifacts, not hand-edited):

1. **Cost & Margin (FS-10.03):** §5's guardrail view — per-provider spend, margin by action type, 3x COGS status band.
2. **Queue & Pipeline Health:** per-class depth/age, DLQ status, sweeper rate, projection retry/heal rates, outbox relay lag (unrelayed row age — the ADR-020 health signal).
3. **Provider Health:** §6's per-adapter panels — success rate, latency percentiles, circuit states, quota headroom.
4. **Security Posture:** `authz.workspace_mismatch` timeline, webhook signature failures, refresh-token reuse detections, impersonation session count, erasure SLA tracker (open Tier 2 requests vs. 72 h target).

**Tenancy isolation note:** `authz.workspace_mismatch` counts *rejected* attempts — an elevated rate is either an attack or a client bug; a successful cross-tenant read would by definition not appear here, which is why the metric is paired with the Doc 24 continuous tenancy test suite (detection of enforcement failure, not just enforcement activity).

---

## 3. Distributed Tracing

- **Propagation:** W3C `traceparent` on HTTP; embedded in SQS message attributes at enqueue; workers extract and continue the trace. Outbox-relayed events carry `origin_trace_id` as a span link (not a parent — the outbox transaction boundary is a legitimate trace break, linked for navigation).
- **Span conventions:** one span per adapter call (attributes: `adapter`, `error_code`, `degraded`), per DB transaction touching the ledger (`ledger.lock_wait_ms` recorded here), per pipeline stage in Brain 2 (scrape → validate → score → resolve identity → ingest → project) — making the canonical discovery trace a readable waterfall of the entire two-brain write path.
- **Sampling:** tail-sampling in the Grafana Cloud/Tempo pipeline — 100% of traces containing errors or `duration > p95 budget`, 10% baseline, 100% of anything touching the ledger (low volume, high forensic value per ADR-012/026).
- **Debug workflow:** support/eng receives `request_id` → Axiom log lookup → `trace_id` pivot → Tempo waterfall → per-span job/adapter context. Target: any customer-reported job issue diagnosable without SSH or DB access.

---

## 4. Alerting Rules & Escalation

### 4.1 Severity Ladder

| Sev | Definition | Channel | Ack SLA |
|---|---|---|---|
| **Sev1** | Data breach, tenancy leak, ledger corruption, total outage | PagerDuty (page) | 15 min |
| **Sev2** | Credential leak, provider hard-down, payment/webhook pipeline stalled, erasure SLA breach imminent | PagerDuty (page) | 30 min; credential rotation ≤ 4 h (Doc 21) |
| **Sev3** | Degraded pipeline, queue backlog, elevated error rates | Slack `#mushin-alerts` | Business hours |
| **Sev4** | Cost anomalies (non-runaway), quota trends, canary warnings | Slack digest | Weekly review |

### 4.2 Alert Rules (Canonical Set)

| Alert | Threshold | Sev |
|---|---|---|
| Cross-workspace access spike | `authz.workspace_mismatch` > 0 sustained (>5 in 5 min from one principal) | **Sev1** (single events are Sev3-logged; a burst pattern pages) |
| Tenancy canary failure | Doc 24 continuous tenancy probe fails | **Sev1** |
| Ledger anomaly | Balance reconciliation mismatch, or `ledger.lock_wait_ms` p99 > 2 s | **Sev1** / Sev2 |
| Webhook signature failures | > 10 in 5 min per source | Sev2 (possible R-SEC-007 event) |
| DLQ non-empty | `queue.dlq_depth` > 0 for > 1 min | Sev2 (prod business queues); Sev3 (`q-rescore-low`) |
| Queue backlog | depth > 1000 for > 5 min, or `oldest_message_age_s` > 900 | Sev3; escalates Sev2 at 30 min |
| Sweeper rate | `credits.swept` > 5/h | Sev3 (upstream settlement failures — PATCH-005 telemetry) |
| Projection retries | > 10/h, or any row pending > 1 h (heal backstop firing) | Sev3 (ADR-027 degradation) |
| Provider error rate | `adapter.errors`/`adapter.calls` > 5% over 5 min per adapter | Sev3; Sev2 if circuit opens on Paddle or LLM |
| Credit burn / campaign spend | Re-scoring campaign spend > 120% of cost-gate estimate → **auto-pause** (Doc 22 §5.3) + alert | Sev2 |
| Margin guardrail | Marginal COGS ratio enters red band (§5.4) | Sev2 (business), Slack + email to CPO |
| Consent last-gate block spike | `consent.last_gate_blocks` > 20/h | Sev3 (legitimate mechanism, but a spike means upstream queue latency or a consent-flapping bug) |
| Erasure SLA | Tier 2 request open > 48 h | Sev2 (72 h target, Doc 21 §3.3) |
| Outbox relay lag | Oldest unrelayed row > 5 min | Sev2 (ADR-020 — everything downstream depends on this) |

**Alert hygiene:** every rule has an owning runbook link (Doc 27); any alert firing >3× in a week without action is tuned or deleted in the weekly review — noisy alerting is treated as an incident class of its own (R-OBS-002, §9).

---

## 5. Cost Telemetry Implementation (FS-10.03)

### 5.1 Per-Action Cost Model

Every cost-incurring adapter call emits a `cost_event` (structured log to a dedicated Axiom stream + OTel counter):

```json
{
  "event": "cost_event",
  "provider": "llm",
  "unit": "tokens",
  "quantity_in": 3812, "quantity_out": 411,
  "unit_cost_usd": 0.000003,
  "cost_usd": 0.012669,
  "attribution": {
    "stage": "authenticity_scoring",
    "prompt_version": "pv_014",
    "model_version": "claude-x-2026-05",
    "job_id": "job_01H...", "job_type": "discovery",
    "campaign_id": null
  }
}
```

- **LLM attribution:** `model × prompt_version × stage` — exactly the provenance triple discipline of PATCH-010, reused for money. Prompt Registry promotions (ADR-019/028) automatically get before/after cost-per-score comparison, closing the CPO cost-gate loop with measured rather than estimated data.
- **Apify attribution:** `actor × platform × job_type`, priced from actor compute-unit consumption reported per run.
- **YouTube:** quota units consumed per endpoint (quota is the scarce resource; dollar cost ~0, but quota exhaustion is an availability cost — tracked in the same pipeline with `unit: "quota_units"`).

### 5.2 Margin Monitoring

- Each credit-spending action type has a **standard credit price** (ADR-004) and a **measured marginal COGS** (rolling 7-day mean of `cost_usd` per action from cost_events).
- `margin_ratio = credit_revenue_per_action / marginal_COGS` computed per action type, refreshed hourly.

### 5.3 Reconciliation

Metered costs are estimates; monthly provider invoices are truth. A monthly reconciliation job compares metered totals vs. invoiced totals per provider; drift > 10% triggers a metering-model correction task. (Same fetch-to-heal philosophy as R-FIN-007, applied to cost data.)

### 5.4 Guardrail Dashboard (3x COGS)

| Band | Condition | Action |
|---|---|---|
| 🟢 Green | margin_ratio ≥ 3.0 | None |
| 🟠 Amber | 2.0 ≤ ratio < 3.0 | Weekly digest flags action type; pricing review queued |
| 🔴 Red | ratio < 2.0 | Sev2 alert to CPO; new prompt promotions for that stage frozen (ADR-028 gate hardens automatically) |

### 5.5 Anomaly Detection

- **Runaway spend:** hourly spend per provider > 3× trailing 7-day same-hour mean → Sev2 + investigation runbook (distinguishes traffic growth from a retry storm or pricing change).
- **Provider price change:** `unit_cost_usd` is config-sourced; a config change requires an MR (auditable), and reconciliation drift (§5.3) catches unannounced provider-side changes.

---

## 6. Provider Health Monitoring

Per-adapter panels on the Provider Health dashboard, all derived from ADR-022's uniform telemetry obligations:

- **Apify actors:** per-actor (`apify/instagram-scraper`, `clockworks/tiktok-scraper`, `apify/instagram-hashtag-scraper`, comment scrapers, web scraper) run success rate, run duration, items-per-run, and **payload validation pass rate** — the leading breakage indicator (R-TEC-007): a scraper that "succeeds" but returns schema-invalid payloads shows up here before it shows up as job failures. **Canary system (Doc 17):** scheduled canary runs against a fixed panel of known-stable public profiles per platform (4×/day); field-level diff against expected schema; canary failure → Sev3 alert *before* customer jobs degrade.
- **LLM provider:** latency percentiles, error/rate-limit rates, **rate-limit headroom** (consumed vs. provisioned TPM), grounding-failure rate (quality signal, R-SEC-006/R-TEC-008).
- **YouTube Data API:** daily quota consumed vs. cap with forecast line; alert at 70% projected end-of-day consumption; per-endpoint quota attribution.
- **Paddle:** webhook delivery lag (event `created_at` vs. our receipt), signature failure count, reconciliation drift status (R-FIN-007).
- **Gmail/Outlook OAuth health:** proactive token validity probe per connected mailbox (daily lightweight call); `revoked`/`expired` states surface to the workspace UI (Doc 20 connection status) *and* metrics — a fleet-wide revocation spike suggests a provider policy change (A-021 watch signal).
- **BSP/WhatsApp:** message send success rate, template rejection rate, per-workspace WABA credential validity.

---

## 7. Observability Infrastructure

| Concern | Backend | Notes |
|---|---|---|
| Logs | **Axiom** (§1.5 decision) | 3 streams; audit stream 24-month retention |
| Metrics | Grafana Cloud (Mimir) | OTLP ingest; dashboards as code |
| Traces | Grafana Cloud (Tempo) | Tail sampling per §3 |
| Alerting | Grafana alerting + Axiom monitors | → PagerDuty (Sev1/2), Slack (Sev3/4) |
| Uptime | External synthetic probes (Grafana synthetic monitoring) on login, search, job-poll endpoints from an APAC vantage (validates R-UX-011 in production continuously) | |
| Status page | Managed status page (S2) | Manual updates per Doc 27 comms templates |

All observability config (dashboards, alert rules, monitors) lives in the repo and deploys via CI — drift between declared and live alerting is itself checked weekly.

---

## 8. On-Call & Incident Response

*(Full runbooks in Doc 27; structure fixed here.)*

- **Rotation:** single weekly primary + secondary rotation across the engineering team (team size at S1 doesn't support specialist rotations); founder/CTO is permanent Sev1 escalation.
- **Escalation path:** Primary (15 min ack) → Secondary (+15 min) → CTO (+15 min). Sev1 tenancy/breach events additionally trigger the Doc 21 §8 breach-assessment track (GDPR 72 h clock) immediately on confirmation, not on resolution.
- **Communication templates:** internal incident channel auto-created per PagerDuty incident; customer-facing template set (investigating / identified / resolved) for status page; regulator-notification template pre-drafted with counsel (Doc 28).
- **Post-incident review:** blameless PIR within 5 business days for Sev1/Sev2; PIR must produce at minimum one detection improvement (alert/metric gap) and one prevention item, tracked in the backlog with a `pir` label. Sweeper-rate, projection-retry and consent-block alerts (§4.2) exist precisely because PIR discipline says self-healing machinery firing silently is a masked failure.

---

## 9. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-OBS-001 (new)** | Observability | Redaction gap leaks C2 PII into logs | M | H | Fail-closed middleware, boot-failure on missing redaction, entropy heuristic, quarterly log-sample audit |
| **R-OBS-002 (new)** | Observability | Alert fatigue erodes Sev1 response | M | H | Weekly tuning review; >3 firings/week rule; strict Sev ladder |
| **R-OBS-003 (new)** | Observability | Metric cardinality explosion (workspace/creator attributes) inflates cost and breaks dashboards | M | M | Closed attribute sets, `workspace_id` ban in metrics, CI lint on metric declarations |
| **R-OBS-004 (new)** | Observability | Cost metering drifts from invoiced truth → wrong margin decisions | M | M-H | Monthly reconciliation (§5.3), 10% drift trigger |
| **R-OBS-005 (new)** | Observability | Split backend (Axiom + Grafana) creates correlation gaps during incidents | L-M | M | `request_id`/`trace_id` dual-pivot convention (§3); incident runbooks reference both tools explicitly |
| R-TEC-007 | Technical | Scraper breakage volatility | H | H | **Strengthened:** canary panel + payload-validation pass-rate leading indicator (§6); detection latency now hours, not customer-report-driven |

---

## 10. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-070 | Axiom ingest pricing remains economical at S2 log volume (~50 GB/day projected) | Med-High |
| A-071 | Apify exposes per-run compute-unit consumption sufficient for §5.1 attribution | High (verify API field availability) |
| A-072 | Canary panel of stable public profiles remains representative of actor health (profiles may go private/delete) | Med (panel refresh runbook mitigates) |
| A-073 | Tail-sampling config in Grafana Cloud supports the ledger-100% rule without full-trace-forwarding cost blowup | Med-High |
| A-074 | Grafana → PagerDuty integration meets 15-min Sev1 ack SLA end-to-end | High |

**Dependencies:** Doc 24 (tenancy canary probe implementation, perf budgets that alerts reference), Doc 26 (dashboards/alerts-as-code deployment pipeline), Doc 27 (runbooks for every §4.2 alert — a rule may not ship without its runbook), Doc 28 (log retention legal alignment; regulator notification template), Doc 29 (Support access to Axiom `ops` stream, *not* `audit` stream).

**Open questions:**
1. Whether the `audit` stream should additionally mirror to R2 (WORM-style) for tamper-evidence beyond Axiom retention — leaning yes, cost is trivial; decide with Doc 27.
2. Synthetic probe vantage point for PK specifically (Grafana synthetic locations don't include Pakistan; Mumbai vantage is a proxy — acceptable?).
3. Per-workspace cost attribution (customer-facing usage analytics) is deliberately deferred — cost_events carry `job_id` from which workspace attribution is derivable later without schema change; confirm this satisfies future FS-10.03 phase 2.

---

**End of Document 23.**

[AWAITING APPROVAL]