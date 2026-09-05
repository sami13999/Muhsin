Generating the Phase 5 finale.

---

#### DOC-017 — Third-Party Integrations, Webhooks & API Gateway Strategy
**Status:** Draft v1.0 | **Phase:** 5 | **Owner:** Principal Architects (Software, Cloud, Security) | **Consumes:** Doc 14 (Adapter Layer, Webhook Gateway), Doc 15 (routing ladder, vendor criteria), Doc 16 (flows, queue classes)

---

#### Executive Summary

This document turns the Adapter Layer from an architectural box into a set of enforceable behavioral contracts. It defines the **Uniform Adapter Contract (ADR-022)** — the seven obligations every adapter satisfies identically (credentials, retries, circuit breaking, cost emission, health, degraded-mode signaling, sandbox parity) — then specifies each critical integration: **Paddle** (verification, idempotency, and the full reconciliation decision table), **Apify/Serper** (politeness policies, breakage detection via output-schema canaries, multi-actor fallback), **LLM providers** (timeout/fallback chains realizing Doc 15's routing ladder, with provider-failure degradation that never fabricates), **Gmail/Outlook** (OAuth lifecycle with revocation-first design), and **BSP/WhatsApp** (S2, selection gates fixed now because Meta onboarding lead times demand early action). The API Gateway strategy is deliberately minimal for S1/S2: **no public API (ADR-023)** — a managed edge (CDN/WAF-class) in front of one first-party API surface with app-level rate limiting, because our gateway complexity should serve the product we have, not the platform we might become.

#### Purpose & Scope

Adapter contracts and per-integration behavioral specifications; webhook handling realization (Doc 16 D1 pattern generalized); vendor selection criteria and decision gates for pending selections (index engine, LLM providers, BSP, FX); API gateway/edge strategy, rate limiting, and credential/key management. Binding on Doc 20 (API surface), Doc 21 (secret storage, token security), Doc 22 (edge/runtime realization), Doc 26 (contract-test classes).

#### Non-Goals

- Vendor *pricing negotiations* and final commercial signatures (procurement; criteria and gates fixed here).
- Public/partner API design — explicitly deferred (ADR-023); Doc 20 defines the first-party API only.
- Infrastructure providers (cloud, queue, DB hosting) — Doc 22.
- Secret-management implementation detail (Doc 21; requirements stated here).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every external call site satisfies the seven adapter obligations — structurally verifiable (one adapter base contract, per-service implementations; Qwen checklist).
- Every integration has: failure taxonomy, fallback behavior, and a sandbox/test story (Doc 26 dependency).
- Scraper breakage is *detected by us before users report it* (canary objective: detection within 1 hour of systematic breakage).
- No credential lives outside the secret store; no adapter shares credentials with another.

#### Detailed Content

**Part A — Uniform Adapter Contract (ADR-022 — Accepted)**

Every adapter provides, identically:
1. **Credential management:** secrets from the managed secret store only (Doc 21); per-adapter isolation; rotation without deploy (hot-reload on rotation signal); customer-owned credentials (OAuth tokens, WABA) stored encrypted per Doc 21, never in adapter config.
2. **Retry discipline:** idempotent-safe retries only (GET/idempotency-keyed writes); exponential backoff + jitter; per-adapter retry budget; retryable-vs-terminal error classification table (each adapter defines its own, reviewed).
3. **Circuit breaker:** error-rate and latency thresholds per adapter; **wired to FS-10.03 budget caps** (spend trip = same breaker); open-circuit → degraded-mode signal consumed by feature fallback ladders (Doc 8) — features never see raw provider errors.
4. **Cost emission:** `cost.recorded` per call (Doc 16 taxonomy) with unit cost, operation, attribution (model×prompt for LLM; actor×platform for Apify) — no exceptions, including failed calls that still bill.
5. **Health reporting:** rolling success rate, latency percentiles, quota headroom → M12 provider health board (FS-10.04).
6. **Degraded-mode contract:** every adapter declares its degraded behaviors (cached-only, queue-and-retry, honest-unavailable) so feature ladders bind to named states, not ad-hoc conditions.
7. **Sandbox parity:** every adapter has a test double + provider-sandbox configuration (where the provider offers one) — contract tests in Doc 26 run against doubles; scheduled verification runs against sandboxes.

**Part B — Integration Specifications**

**B1. Paddle (money path — realizes Doc 16 D1)**
- **Inbound:** Webhook Gateway verifies Paddle signature per delivery (invalid → 4xx, alert, never processed); raw payload appended before any processing; ack within seconds (processing always async).
- **Idempotency:** Paddle event ID is the processed-ledger key (Doc 16 A3).
- **Reconciliation decision table (fetch-to-heal, canonical):** trigger conditions — (a) event `occurred_at` older than last-applied for that subscription, (b) event implies a transition the state machine disallows from current state, (c) gap detection (sequence anomaly), (d) daily sweep. Action: fetch subscription + latest transactions from Paddle API → recompute expected local state → if divergent, apply Paddle truth, emit `billing.reconciliation_healed` with diff, alert on heal. **Paddle API truth always wins**; local state is a cache of Paddle's reality plus our ledger consequences.
- **Outbound:** catalog sync (FS-08.01 mapping validated against Paddle products on deploy — drift fails the deploy); checkout session creation with workspace-ID passthrough metadata (D1 binding requirement).
- **Sandbox:** full state-machine test coverage against Paddle sandbox required before S1 billing go-live (A-031 validation vehicle); simulated-event replay harness for Doc 26.

**B2. Apify (scrape orchestration — Primary for IG/TikTok/Web, Fallback for YouTube)**
- **Actor inventory & strategy:** per-platform primary actor + designated fallback actor (different maintainer where possible — R-TEC-007 hedge). The canonical actor inventory comprises:
  - **Instagram Primary:** `apify/instagram-scraper` (profile, recent posts, engagement metrics).
  - **Instagram Fallback:** `apify/instagram-profile-scraper` and `apify/instagram-post-scraper`.
  - **TikTok Primary:** `clockworks/tiktok-scraper` (profile, video view counts, engagement history).
  - **TikTok Fallback:** `clockworks/tiktok-profile-scraper`.
  - **Hashtag & Trend Discovery:** `apify/instagram-hashtag-scraper` (candidate discovery for Brain 2).
  - **Comment Analysis:** Instagram Comment Scraper & YouTube Comment Scraper (audience sentiment, language detection, and authenticity scoring).
  - **Web & Bio Extraction:** Web Scraper (extracting emails and contact info from personal websites and link-in-bios).
- **Actor versioning governance (Doc 26 rule):** actor version tags or build hashes MUST be pinned at deploy time in configuration/secrets (via environment variables or M12 config), never hardcoded in PRD text. This enables rapid hot-reload on scraper breakage without requiring document rewrites or code releases. Upgrades pass the validation-panel regression before adoption (mirrors Doc 15 eval-gate discipline).
- **Politeness policy (binding):** per-platform concurrency ceilings and request pacing set conservatively (values configured in M12, reviewed monthly); no authenticated-session scraping — public surfaces only (A-050 legal posture line); per-candidate depth limits (posts sampled, not exhaustive archives) — depth is a cost *and* politeness control.
- **Breakage detection (the canary system):** every scrape output passes M5's schema/completeness validation; per-actor rolling validity rate tracked; drop below threshold (default 80% over 1h) → automatic actions: switch to fallback actor, open circuit on the failing actor, M12 alert, affected jobs re-queued. This is how we detect platform DOM changes within the hour, not via support tickets.
- **Credential/infra:** proxy management is Apify's business (ADR-002); our credentials = Apify API tokens, rotated quarterly.
- **Degraded modes:** platform-level outage → discovery jobs proceed with remaining platforms + honest per-platform notice; total outage → Brain-1-only mode (Doc 14 fallback).

**B2a. YouTube Data API v3 (Native API — Primary for YouTube)**
- **Role & Priority:** YouTube Data API v3 is the **sole primary source** for YouTube channel profiles, video metrics, subscriber counts, and comment threads. Apify YouTube scraping is strictly designated as a circuit-breaker fallback when native API quota is exhausted or rate-limited.
- **Quota & Batching Strategy:** YouTube Data API v3 operates under a default 10,000 units/day quota. To maximize efficiency:
  - Channel profile and statistics lookups MUST use batching (up to 50 channel IDs per request via `channels.list` with `part=snippet,statistics,contentDetails`), consuming only 1 quota unit per 50 channels.
  - Video metrics lookups similarly batch up to 50 video IDs per request (1 quota unit).
  - Search requests (`search.list` costing 100 units) are strictly minimized; candidate discovery relies primarily on Serper (B3) followed by direct channel ID resolution.
- **Quota Monitoring & Circuit Breaking:** M12 tracks daily quota consumption in real time. At 80% daily quota consumption, an alert fires to Ops. At 95% consumption, the circuit breaker trips, automatically degrading YouTube ingestion to the Apify YouTube Scraper fallback until quota reset.

**B3. Serper (candidate discovery)**
- Query construction per interpreted intent (Doc 15 B2 output); **SERP response cache** (query-normalized, TTL 7d) — candidate discovery tolerates staleness well and this is the cheapest cost lever on the discovery path; per-job query budgets (cost cap); degraded mode → add-by-URL-only discovery (honest notice).

**B4. LLM providers (realizes Doc 15 C1 ladder)**
- **Multi-provider posture & Model Inventory:** ≥2 providers configured per tier (primary + fallback), pinned model versions per Prompt Registry linkage; provider choice per tier is configuration, not code. The canonical model inventory is:
  - **Tier T-A (Primary):** Groq API running `llama-3.1-8b-instant` (ultra-low latency classification, translation, extraction).
  - **Tier T-A (Fallback):** Hosted open-source Llama 3.1 8B via secondary inference provider or Together AI / Fireworks.
  - **Tier T-B (Primary):** Groq API running `llama-3.3-70b-versatile` (summaries, audience estimation, evidence assembly).
  - **Tier T-B (Fallback):** Anthropic `claude-3-haiku` / OpenAI `gpt-4o-mini`.
  - **Tier T-C (Primary/Escalation):** Anthropic `claude-3-5-sonnet` / OpenAI `o1` / `gpt-4o` (high-stakes authenticity reasoning, dispute evaluation).
- **Timeout/fallback chain per task:** timeout (per-task budget) → single same-provider retry → alternate-provider same-tier attempt → tier-appropriate degradation: T-A tasks may escalate to T-B (quality up, cost up — acceptable for small volumes); T-B/T-C tasks **degrade to honest failure** (Doc 8 fallback states) — never a cheaper-model substitution for reasoning tasks, because silent quality downgrades on authenticity scoring are trust poison. Substitution *downward* happens only via eval-gated configuration change (Doc 15 Part E), never at runtime.
- **Token budget enforcement:** per-task input/output ceilings from the registry; over-budget context → deterministic truncation per task's RAG rules (Doc 15 C3), never silent overflow billing.
- **Selection criteria (Doc 15 handoff, fixed here):** schema-output reliability on golden sets, PK/Urdu handling (A-052), prefix-caching support (Part D2 economics), rate-limit headroom vs. F1 envelope, data-usage terms (no training on our payloads — hard gate, Doc 21/28 review).

**B5. Gmail / Outlook (mailbox adapters)**
- **OAuth lifecycle:** authorization-code grant, minimal scopes (send + thread read per FS-06.01 privacy boundary); refresh-token handling with proactive expiry refresh; **revocation-first design:** every send/sync failure is checked against auth-error signatures → immediate `outreach.mailbox_revoked` (Doc 16 matrix reactions: freeze sequences, alert owner) — revocation is a first-class state, not an error to retry.
- **Reply/thread sync:** polling v1 (interval tiered: active-campaign mailboxes minutes-level, idle mailboxes hourly) consistent with ADR-021; provider push (Gmail watch/Graph subscriptions) is the pre-approved upgrade path when ADR-021's trigger fires — noted so Mimo builds the sync layer poll/push-agnostic.
- **Cap enforcement:** daily send caps counted at the adapter (single choke point — sequences, manual sends, and future channels all decrement one counter per mailbox); cap headroom exposed to M9's execution-time eligibility check (Doc 16 D3).
- **ToS posture:** A-021 validation task attached here — automation limits reviewed against current Google/Microsoft platform terms before S1 send volumes ramp.

**B6. BSP / WhatsApp (S2 — selection gates fixed now, onboarding started now)**
- **Selection gates (binding):** PK phone-number provisioning support; embedded signup availability; template management API completeness (submit/status/pause states per FS-06.06); webhook delivery states coverage; conversation-category pricing transparency (feeds credit pricing); Meta Tech Provider pathway support. Twilio/MessageBird/360dialog-class candidates evaluated against these six gates only.
- **Lifecycle obligations:** per-workspace WABA binding (never shared, ADR-009); quality-rating webhook → `outreach.whatsapp_quality_changed` → auto-pause reactions (FS-06.06); template state machine synced via BSP API with local cache of approval states.
- **Action item (schedule-critical):** Meta Tech Provider onboarding + BSP sandbox account initiated during S1 — the lead time is the reason this S2 feature has S1 procurement work.

**B7. Supporting adapters (abbreviated):** **FX rates** — daily-fetch managed rate API, rates stored with timestamps (FS-05.01), staleness >48h → conversions flagged in UX; **Managed auth** (NFR-S02) — session issuance/validation only, no user PII duplication beyond the identity contract (Doc 18); **Transactional email/notification service** — digest dispatch (M13), suppression-list sync; **Virus scanning** (FS-04.03) — async scan-on-upload, quarantine state.

**Part C — API Gateway & Edge Strategy**

**C1. ADR-023 — Accepted: no public API at S1/S2.** One first-party API surface (Doc 20) consumed only by our web client. Rationale: a public API is a product with versioning, support, abuse, and deprecation obligations — none of which serve S1 partners; workflow-gravity strategy (ADR-001) is UI-led at this stage. Consequence: gateway needs are modest; revisit trigger: ≥3 enterprise prospects requiring API access, or partner-integration strategy activation (Doc 5 optionality log).
- **Edge:** managed CDN/WAF-class front (ADR-002): TLS termination, static asset caching, basic WAF rules, DDoS absorption, geo latency mitigation (PK-relevant, pairs with Doc 22 region choice).
- **App-level middleware (behind edge):** authentication (managed-auth session validation → Tenancy Context, Doc 14 A2), then rate limiting, then routing to the monolith.
- **Rate limiting (three concentric layers):** edge-level anonymous/IP limits (abuse floor) → per-user session limits (generous; power-user grammar in Doc 12 must never trip it — budget: 10× observed p99 usage) → per-workspace action-class limits (M12-tunable; the abuse instrument for scrape-adjacent actions like add-by-URL, closing Doc 11's open question: **yes, add-by-URL is rate-limited per workspace**, default 50/day, tier-adjustable).
- **Key management:** no customer API keys exist (ADR-023). Internal service credentials (adapter tokens, webhook signing secrets) live in the secret store with per-credential rotation schedules (Doc 21 registry). Webhook endpoints are per-source paths with per-source secrets — one leaked secret never exposes another source.
- **Versioning posture:** single evolving first-party API contract co-deployed with the client (no version negotiation needed v1); breaking-change discipline still applies (Doc 20 rules) because mobile-web caching means old clients briefly exist.

#### Dependency Mapping

- **Depends on:** Doc 14 (adapter/gateway architecture), Doc 15 (ladder, vendor criteria), Doc 16 (D1–D3 flows, taxonomy), Docs 8–10 (fallback ladders, FS-06/08 behaviors), ADR-002/009/016/021.
- **Enables:** Doc 20 (first-party API under ADR-023), Doc 21 (secret/token security requirements enumerated), Doc 22 (edge + region realization), Doc 26 (contract tests, sandbox suites, canary tests), Mimo adapter build, procurement (criteria fixed).
- **Blocks:** Live-search credit pricing awaits spike cost telemetry through these adapters (OD-001 chain); S2 WhatsApp awaits B6 procurement.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-061 | Apify actor ecosystem provides viable fallback actors per platform | Medium | Procurement scan during spike | Single-actor risk accepted per platform + faster breakage response SLO |
| A-062 | ≥2 LLM providers meet B4 gates incl. no-training terms | Med-High | Provider terms review | Single-provider risk logged; open-model host as forced second |
| A-063 | SERP caching (7d TTL) doesn't materially degrade candidate freshness | Med-High | Spike precision comparison | TTL reduction (cost rises) |
| A-064 | Edge/WAF managed tier suffices without custom gateway build through S2 | High | Doc 22 realization | Managed API-gateway product adoption (still ADR-002-compliant) |
| A-065 | Mailbox polling intervals achieve reply-detection latency acceptable for sequence stops (<15 min worst case) | Med-High | S1 telemetry | Push upgrade pulled forward (pre-approved path, B5) |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-TEC-014 | Technical | Coordinated platform anti-bot escalation defeats actor fallbacks simultaneously | M | H | Canary detection (1h objective) + Brain-1-only degraded posture + user-submitted flow keeps product alive; strategic hedge: vendor-fallback optionality (Doc 14) |
| R-SEC-007 | Security | Webhook secret/credential leak enables forged money events | L | Critical | Per-source secrets, signature verification before processing, secret-store isolation, rotation schedules; forged-event attempt alerting (signature-failure spike = incident) |
| R-TEC-015 | Technical | LLM provider rate limits throttle discovery bursts | M | M | Multi-provider same-tier spillover (B4 chain), queue-class backpressure (Doc 16 E), per-job pacing |
| R-OPS-007 | Operational | Adapter sprawl: each new integration hand-rolls obligations inconsistently | M | M | ADR-022 base-contract pattern + Qwen checklist per adapter PR; contract-test template (Doc 26) |
| R-LEG-007 | Legal | Mailbox automation breaches Google/Microsoft platform terms → app suspension | L-M | H | A-021 review pre-ramp; conservative caps; user-mailbox model (ADR-010) keeps volumes per-account modest |
| R-FIN-012 | Financial | Failed-but-billed external calls leak COGS invisibly | M | M | Cost emission on failures (A obligation 4); failed-call cost dashboard slice (M12) |

#### Alternatives Considered & Trade-offs

- **Full API-gateway product (Kong/Apigee-class) now** — rejected: serves a public API we don't have (ADR-023); edge + middleware covers first-party needs at a fraction of ops weight.
- **Custom scraping infrastructure instead of Apify** — re-affirmed rejected (ADR-002/016 boundary: we orchestrate managed scraping, we don't operate proxy fleets).
- **Single LLM provider for simplicity** — rejected: R-FIN-010/R-TEC-015; two-provider posture is the minimum honest hedge for a core dependency.
- **Runtime downward model substitution on failure** — rejected (B4): silent quality degradation on trust-bearing scores; honest failure chosen.
- **Webhook processing inline with ack** — rejected (B1): Paddle retry behavior becomes our failure mode; async-after-ack chosen (Doc 16 D1).
- **Search/Discovery thread:** closed; this doc realizes vendor criteria only — no new constraints (verified).

#### Gap Analysis Report

- Vendor selections remain open pending spike results: index engine (Doc 15 criteria), LLM providers (B4 gates), Apify actor shortlist (A-061), BSP (B6 gates) — all criteria now fixed; procurement can run in parallel with Phase 6. Owner: Engineering Director.
- Politeness-policy numeric defaults (B2) set conservatively at spike time — values are config, review ritual monthly (M12).
- Outlook/Graph-specific behavioral deltas vs. Gmail (thread models differ) flagged for adapter design detail — Mimo build note, not a spec gap.
- Webhook Gateway raw-store retention duration unset → Doc 21 retention schedule (stub: 13 months, covering annual billing disputes).
- Provider data-usage/no-training contractual verification (B4 hard gate) needs legal execution → Doc 28 checklist.

#### Cross-References & Decision Traceability

**ADR-022 (Uniform Adapter Contract, seven obligations) — Accepted. ADR-023 (no public API S1/S2; managed edge + app middleware) — Accepted.** Realizes: Doc 16 D1 (B1 decision table), D2 dependencies (B2/B3/B4), D3 (B5 cap choke point + execution-time eligibility input); Doc 15 C1 ladder transport (B4) and Part D economics (B3 SERP cache, B4 prefix-caching gate); FS-10.03/10.04 (obligations 4–5); Doc 8 fallback ladders (obligation 6 named states); ADR-009/010 (B5/B6 postures). Closes Doc 11's add-by-URL rate-limit question (C1). A-021/A-031/A-050 validation vehicles assigned. Doc 16's Paddle-retry-envelope question absorbed into B1 sandbox work.

#### Open Questions & External Dependencies

1. Spike execution across B2/B3/B4 (the gating evidence for A-047/48/49/52/54/55 — now fully instrumentable through these adapter specs).
2. Provider procurement against fixed gates (Engineering Director; parallel with Phase 6).
3. Meta Tech Provider + BSP onboarding start (calendar-critical for S2).
4. Legal: no-training terms verification; mailbox ToS review; scraping posture memo (Doc 28 consolidated).
5. Edge/region realization pairing (Doc 22, R-UX-011).

#### Future Revision Triggers

Canary threshold breaches becoming weekly (politeness/actor strategy revision); any B4 gate failure in procurement; ADR-023 revisit trigger (enterprise API demand); Paddle API/webhook schema version changes; Meta platform policy shifts affecting B6.

#### Review Checklist & Validation Criteria

- [ ] Every adapter obligation enumerable and testable (seven, uniformly). ✅
- [ ] Money path: verification → raw store → async processing → fetch-to-heal, fully specified. ✅
- [ ] Scraper breakage detected by canaries, not customers. ✅
- [ ] LLM failures degrade honestly; no silent downward substitution. ✅
- [ ] Revocation-first mailbox design; caps enforced at one choke point. ✅
- [ ] No customer API keys exist; per-source webhook secrets. ✅
- [ ] Zero code. ✅
- [ ] Sign-off: Principal Architects (Software, Cloud, Security, AI/Search), Engineering Director; Qwen review of adapter-contract conformance plan.

---

Phase 5 (Technical Architecture) is complete: Docs 14–17 fix the topology, the intelligence/search engine, the asynchronous nervous system, and the external-boundary contracts. Next per blueprint: **Phase 6 — Data & API Design, opening with Doc 18 (Domain Model, Entity Relationships & Data Lifecycle)**, which inherits three named obligations: the Interaction Timeline and Ledger persistence models, the identity-resolution rules (Doc 14 gap), and the controlled niche vocabulary (Doc 15 blocker).

[PHASE 5 COMPLETE - AWAITING APPROVAL FOR PHASE 6]