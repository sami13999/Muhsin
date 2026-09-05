Two Brains directive internalized. Before the document, three register actions this pivot forces — recorded transparently, as this is a material amendment to prior canon:

- **ADR-016 (Two Brains dynamic ingestion pipeline) — Accepted by supervisor directive.** This *amends* ADR-002's "licensed data providers, no scrapers" clause: we still build no scraping infrastructure ourselves (Apify is a managed orchestration platform), but the data-sourcing posture shifts from licensed databases to **first-party aggregation of public data**. Doc 5's SWOT ("dependency on licensed providers") and Doc 8's A1 Provider Capability Contract are reinterpreted: the "provider" is now **our own pipeline**, and the 70% PK-panel gate (A-023) now validates pipeline resolution quality rather than a vendor's index.
- **Strategic upside logged:** this materially de-risks R-TEC-003 — PK coverage is no longer hostage to a Western vendor's index; we discover on demand. The moat also strengthens (ADR-001: our enriched index compounds).
- **Strategic costs logged:** R-LEG-001 elevates (platform ToS exposure of scraping), R-TEC-001 elevates (scraper breakage volatility), and one hard technical truth is surfaced in the Gap Analysis: **audience demographics cannot be scraped directly** — they must be *estimated*, which changes FS-01.01's data contract.

---

#### DOC-014 — High-Level Software Architecture, Service Boundaries & Module Breakdown
**Status:** Draft v1.0 | **Phase:** 5 — Technical Architecture | **Owner:** Principal Architect (Software) | **Consumes:** Docs 7–13, ADR-016 directive

---

#### Executive Summary

MUSHIN's topology is a **modular monolith + asynchronous worker fleet** (ADR-017) fronted by a responsive web client, backed by a managed relational database with two strictly separated data planes (Global Creator Plane / Workspace Plane — the NFR-S01 tenancy invariant, addressed first per R-TEC-002), and surrounded by an **Adapter Layer** that is the sole gateway to all external services (Apify, Serper, LLM inference, Paddle, Gmail/Outlook, BSP, FX). The **Search Coordinator** module implements the Two Brains model: every query hits the internal database first (fast brain); insufficient results trigger an explicit, credit-quoted **Live Discovery job** (discover brain) executed by workers — Serper finds candidates, Apify scrapes platform data, the LLM layer computes scores and summaries, and the Standardization stage persists new creators into the internal database, permanently cheapening every future search. All money-events (Paddle), messages (mailbox/BSP), and external costs flow through single choke points where idempotency, signature verification, and cost telemetry (FS-10.03) are structurally guaranteed rather than per-feature remembered.

#### Purpose & Scope

System topology, module boundaries and ownership, the Two Brains data flow, communication patterns (sync/async/webhook), tenancy enforcement architecture, and the module ↔ Epic/FS mapping that gives Mimo a build skeleton. Technology *categories* are fixed here (managed relational DB, managed queue, object storage); named vendor selections belong to Docs 15/17/22.

#### Non-Goals

- Search index/ranking internals, vector/semantic design, LLM routing detail (Doc 15, closing ADR-SEARCH-001's remainder).
- Event taxonomy, queue semantics, scaling numbers (Doc 16).
- Integration contracts per external API, webhook payload handling detail (Doc 17).
- Entity/schema design (Docs 18–19), API surface (Doc 20), infra/deployment (Doc 22).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every Doc 7 Epic maps to exactly one owning module (no orphan features, no shared ownership ambiguity).
- Two Brains flow is deterministic and reviewable: given a query and DB state, the routing decision is predictable.
- NFR-S01 is enforced by construction: a developer cannot accidentally write a cross-tenant query without bypassing a named guard layer (auditable).
- All external spend flows through the Adapter Layer: FS-10.03 cost telemetry coverage is structural, not disciplinary.

#### Detailed Content

**Part A — Tenancy Architecture First (NFR-S01, R-TEC-002)**

**A1. Two data planes (hard boundary):**
- **Global Creator Plane (GCP):** Creators, Profiles, enrichment payloads, scores, index data. Contains **zero** tenant-originated data. Shared by design (ADR-008). Writable only by the Ingestion/Standardization module and Intelligence module — never directly by tenant-facing request paths.
- **Workspace Plane (WP):** everything else — memberships, lists, campaigns, timeline, consent, reveals, ledger, notifications. **Every row carries a workspace identifier.** No exceptions; a WP table without workspace scoping fails schema review (Doc 19 gate).

**A2. Enforcement mechanics (architectural, not conventional):**
- Every authenticated request resolves a **Tenancy Context** (user, workspace, role, entitlement snapshot) before any business logic. Data access to WP passes through a **scoped repository layer** that *requires* the context — the unscoped access path exists only in a named, separately-audited internal module (admin plane, reconciliation jobs) with mandatory audit emission (FS-10.01 audit-first invariant).
- Background jobs carry an explicit serialized context (workspace-scoped jobs) or are declared **plane-global** (ingestion, reconciliation) at registration — a job without a declared scope class cannot be enqueued (fail-closed).
- Cross-plane reads (Creator page rendering WP relationship data over GCP profile data) happen exclusively via composed read APIs, never via cross-plane joins in feature code.
- Admin/staff plane (ADR-011): separate authentication realm, separate service surface; shares the database read paths through the same guarded layers with dual-attribution context (FS-10.02).

**Part B — System Topology**

**B1. Runtime components:**
1. **Web Client** — responsive SPA (ADR-013), talks only to the Backend API; renders progressive/streamed results per Doc 12 budgets.
2. **Backend API** — the modular monolith (Part C): synchronous request handling, tenancy kernel, entitlement enforcement (Doc 10 A2 single evaluation contract).
3. **Worker Fleet** — same codebase, separate processes consuming the managed job queue: Live Discovery jobs, enrichment/refresh, scoring, sequence scheduling (FS-06.03 send windows), webhook post-processing, daily reconciliation (FS-08.02), notification dispatch, ledger integrity checks.
4. **Managed Relational Database** — GCP + WP schemas (physical strategy — same cluster, separated schemas with distinct access roles — detailed in Doc 19).
5. **Search Index** — read-optimized projection of GCP for SCR-01 queries (engine selection = Doc 15).
6. **Managed Job Queue + Scheduler** — at-least-once delivery assumed; all consumers idempotent (Doc 16 semantics).
7. **Object Storage** — files/attachments (FS-04.03), raw scrape payload archive (below).
8. **Webhook Gateway** — dedicated ingress path for Paddle / BSP / mailbox push events: signature verification, raw-event append-only store, idempotency keying, then enqueue for processing (implements FS-08.02 robustness requirements structurally, reused for every webhook source).
9. **Adapter Layer** — one adapter per external service (Apify, Serper, LLM inference, Gmail, Outlook, BSP, FX, email-notification service). Every adapter uniformly provides: credential management, retry/backoff, **circuit breaker wired to FS-10.03 budget caps**, per-call cost-event emission, and a degraded-mode signal consumed by feature fallback ladders (Doc 8). **No module may call an external service except through its adapter** (lintable boundary for Mimo; Qwen review checkpoint).

**B2. Communication patterns:**
- Client ↔ API: synchronous JSON over HTTPS; long operations return job references; client receives progress via lightweight polling v1 (push channel deferred — Doc 16 decision) consistent with Doc 12 async patterns (enrichment progress, bulk receipts).
- API ↔ Workers: exclusively via queue (no direct invocation) — the API never blocks on external services for user-facing requests except sub-second cached reads.
- Inbound events: exclusively via Webhook Gateway.
- Internal module-to-module: in-process interfaces within the monolith, respecting ownership boundaries (Part C); domain events emitted onto the queue for cross-module async reactions (Timeline appends, notifications, telemetry) — taxonomy in Doc 16.

**Part C — Module Breakdown (monolith internals; ownership = review responsibility)**

| # | Module | Owns | Implements (trace) |
|---|---|---|---|
| M1 | **Identity & Tenancy Kernel** | Users, memberships, roles, Tenancy Context, managed-auth adapter (NFR-S02) | FS-07.01/02 |
| M2 | **Creator Store (GCP)** | Canonical Creator/Profile records, dedup/merge identity resolution, freshness/TTL state | FS-01.01/06, glossary entities |
| M3 | **Search Coordinator** | Query parsing, NL interpretation orchestration, **Two Brains routing**, result assembly/ranking invocation, saved searches | FS-02.01–04, CC-001 |
| M4 | **Live Discovery Pipeline** (worker-side) | Discovery job state machine: Serper candidate finding → Apify scrape orchestration → payload validation → handoff to M5/M6 | ADR-016 core |
| M5 | **Standardization & Ingestion** | Cleaning, normalization (A3 transliteration variants), schema mapping, GCP persistence, index projection, raw-payload archival | ADR-016 "MUSHIN Backend" stage |
| M6 | **Intelligence & Scoring** | LLM adapter consumption: authenticity scoring (FS-01.02 evidence assembly), quality scores, audience estimation, summaries (FS-03.01), query construction (FS-03.02), AI manifest + routing policy | EPIC-03, A4 triple |
| M7 | **CRM** | Lists, notes, tags, files, comments, **Interaction Timeline substrate** (append API + projections), relationship memory reads | EPIC-04, Doc 9 A1 |
| M8 | **Campaigns** | Briefs, clients, pipelines, tasks, budgets (FX adapter consumer), outcome recording | EPIC-05 |
| M9 | **Outreach** | Channel abstraction (Doc 9 A2), consent state machine (A3), mailbox adapters, sequence engine, campaign inbox, WhatsApp S1 links / S2 BSP | EPIC-06 |
| M10 | **Billing & Entitlements** | Paddle webhook processing, subscription state machine (FS-08.02), credit ledger + reserve-commit (FS-08.03/ADR-012), Entitlement Catalog, enforcement API | EPIC-08 |
| M11 | **Analytics Projections** | Metric definitions catalog, timeline/ledger-derived read models | EPIC-09, FS-09.01 |
| M12 | **Admin & Platform Ops** | Staff plane, impersonation, flags, cost-telemetry aggregation, circuit-breaker budgets, provider health | EPIC-10 |
| M13 | **Notifications** | Trigger catalog subscriptions, tray + email digest dispatch | FS-07.03 |

Boundary rule: modules touch each other's data only through owned interfaces; the Timeline (M7) and Ledger (M10) are append-only substrates other modules *write to via API* and *read via projections* — never raw-table access (Doc 19 enforces).

**Part D — The Two Brains Flow (canonical, per ADR-016)**

**D1. Query path (Search Coordinator, M3):**
1. Query arrives (filters or NL). NL → M6 interpretation → editable chips (FS-02.02) — **chips render before retrieval** (Doc 12 latency ordering).
2. **Brain 1 — Database Search:** structured query against the Search Index (GCP projection). Sub-second (NFR-P01), zero marginal cost, no metering. Results ranked (FS-02.03; internals Doc 15).
3. **Sufficiency check:** deterministic rule — result count ≥ threshold (default 8, matching UF-00 step 3) *and* fit-score floor met. Sufficient → done.
4. **Insufficient → Live Search offer:** never implicit (Doc 8 A5 rule). User sees Brain-1 results plus a quoted "Search live" action (or, in UF-00's zero-result branch, the add-by-URL pivot). Confirmation → credit reserve (FS-08.03 reserve-commit) → Discovery job enqueued → user gets progressive results as the job streams (Doc 12: queue-and-notify beyond 30s).

**D2. Live Discovery job (M4 pipeline, worker-side; each stage checkpointed and independently retryable):**
1. **Candidate discovery (Serper adapter):** intelligent Google queries constructed from the interpreted intent (niche + geo + platform operators); yields candidate profile URLs, articles, public pages. Dedup against GCP (already-known creators skip to freshness check).
2. **Scrape orchestration (Apify adapter):** platform-appropriate actors fetch public profile data — bio, follower counts, post history, engagement metrics, posting cadence — for Instagram/TikTok/YouTube. Per-candidate isolation: one candidate's failure never kills the job. Raw payloads archived to object storage (reprocessability: scoring improves later without re-scraping — cost asset).
3. **Understanding layer (LLM adapter via M6):** processes raw payloads → authenticity evidence + score, quality score, audience summary and **audience-composition estimates** (see Gap Analysis — estimates, not measurements), niche classification (controlled vocabulary), brand-fit signals vs. query intent. All outputs grounded in the payload (A4 anti-fabrication rule applies at the pipeline level).
4. **Standardization & persistence (M5):** normalize → identity-resolve (transliteration-aware matching per A3) → **persist to GCP → project to Search Index**. The creator now exists for every future Brain-1 query, any workspace (ADR-008 economics: each live search permanently cheapens the platform).
5. **Result assembly (M3):** new creators merged into the ranked result set, streamed to the client; credit reservation committed (or partially released per per-candidate failure accounting — no silent credit loss, FS-08.03).
6. **Same pipeline, second entry point:** add-by-URL (UF-06) and Deep Enrichment (A2 ladder) are Discovery jobs with a pre-known candidate list — one pipeline, three triggers (design economy; single test surface for Doc 26).

**D3. Refresh path:** FS-01.06 refresh = re-scrape job for one creator through stages 2–4, honoring rate limits.

#### Dependency Mapping

- **Depends on:** ADR-016 directive, Docs 7–10 (FS behaviors), Docs 11–12 (async UX, budgets), ADR-002 (as amended), ADR-011/012/013.
- **Enables:** Doc 15 (index/ranking/LLM-routing within M3/M5/M6 frames), Doc 16 (queue semantics, event taxonomy, scaling), Doc 17 (adapter contracts per named service), Doc 18–19 (GCP/WP schemas, append-only substrates), Doc 20 (API surface per module), Doc 22 (runtime deployment of B1 components).
- **Blocks:** Mimo backend scaffolding order = Part C table; nothing else blocked.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-047 | Apify actors deliver reliable IG/TikTok/YT public-profile data at required depth for PK creators | Medium | **Immediate spike: run validation panel (A-023 repurposed) through the pipeline** | Two Brains discover-brain degrades; ADR-016 review |
| A-048 | Serper-constructed queries surface PK creator candidates with usable precision | Medium | Same spike, candidate-precision measurement | Heavier reliance on add-by-URL entry point |
| A-049 | LLM scoring from scraped payloads reaches acceptable authenticity/quality accuracy | Medium | Ground-truth panel (A-025 merged) | Score scope reduction; confidence-band honesty (A4 absorbs gracefully) |
| A-050 | Public-data scraping posture is legally sustainable in operating jurisdictions | Low-Med | Legal review (Doc 28) — **elevated priority** | Sourcing re-architecture; ADR-016 revisit |
| A-051 | Modular monolith + workers sustains S1/S2 scale (hundreds of workspaces) | High | Doc 16 load modeling | Extract hot modules (M4 first candidate) — boundaries designed for it |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-LEG-006 | Legal | Platform ToS enforcement against scraping (blocks, legal notices) — **supersedes/elevates R-LEG-001's sourcing aspect** | M-H | H | Public-data-only scope; managed-platform indirection (Apify); rate discipline; legal posture memo (Doc 28); raw-payload provenance records |
| R-TEC-007 | Technical | Scraper breakage volatility (platform DOM/API changes) — **elevates R-TEC-001** | **H** | H | Apify's maintained actors (their business is keeping them alive); per-stage checkpointing; multi-actor fallback per platform (Doc 17); degraded-mode = Brain-1-only with honest messaging |
| R-TEC-008 | Technical | Garbage-in scoring: bad scrapes yield confident-looking wrong scores | M | H | Payload validation stage (M5) with quality gates; A4 confidence tied to payload completeness; anti-fabrication grounding rule at pipeline level |
| R-FIN-009 | Financial | Live-search unit cost variance (Apify compute + Serper + LLM per job) breaks credit pricing | M | H | Per-stage cost telemetry (adapter choke point); per-job cost caps (candidate-count limits); guardrail dashboard red-flag protocol (FS-10.03) |
| R-OPS-005 | Operational | We now own data-quality operations (dedup, drift, misclassification) — a permanent ops workload previously priced into vendor fees | H | M | M5 quality gates + M12 monitoring; weekly data-quality review ritual (Doc 28 runbooks); accepted knowingly as the price of ADR-016's moat |
| R-SEC-005 | Security | Raw scrape archive becomes a sensitive personal-data lake | M | H | Retention limits + access controls on archive (Doc 21); GCP-plane isolation; deletion pipeline hooks (GDPR stub from Doc 7) |

#### Alternatives Considered & Trade-offs

- **Licensed database vendors (Modash-class) as primary source** — the prior default, now **rejected by directive**: vendor PK coverage risk (the original R-TEC-003), recurring per-profile fees forever, no moat. Trade-off accepted in exchange: ToS/legal exposure (R-LEG-006), ops burden (R-OPS-005), and the demographics-estimation problem (Gap Analysis). Hybrid fallback (vendor as tertiary source for gaps) remains *architecturally possible* through the Adapter Layer — logged as optionality, not plan.
- **Microservices topology** — rejected for S1/S2: team size and iteration speed favor the monolith; module boundaries (Part C) are drawn so M4/M6 extract cleanly if scale demands (A-051 hedge).
- **Synchronous live search (block until scraped)** — rejected: multi-second-to-minutes latency violates every Doc 12 budget; async job + streaming chosen.
- **Skip raw-payload archival (storage cost)** — rejected: reprocessability is the cheapest future-proofing in the system (rescoring without rescraping).
- **Living Thread status:** ADR-SEARCH-001's *macro* question (traditional vs. AI vs. hybrid) is now resolved by ADR-016 as **hybrid-by-construction** (indexed fast brain + AI-mediated discovery brain). Remaining for Doc 15: index engine choice, ranking implementation, semantic/vector layer, LLM routing policy. Status: **Partially Resolved — remainder scoped.**

#### Gap Analysis Report

- **Material spec impact — audience demographics:** public scraping cannot directly observe audience age/gender/geo (vendor panels could). FS-01.01's audience section becomes **modeled estimates** (e.g., inferred from engager samples, language mix, content signals) and must be labeled as estimates with confidence per A4. **CC-003 raised** against Doc 8 (FS-01.01/FS-02.01 audience-geo filters operate on estimated values; filter UX must signal estimate basis). Awaiting CPO ratification. The A4 explainability standard absorbs this honestly — arguably *more* honest than competitors presenting panel extrapolations as facts.
- Identity resolution (same creator across IG/TikTok/YT) is named (M2/M5) but unspecified — assigned to Doc 18 (matching rules) — hard problem, flagged.
- Scrape scheduling/politeness policy (rate limits per platform) unspecified → Doc 17.
- The validation-panel spike (A-047/48/49) is now the project's most urgent technical action — replaces the old provider-evaluation spike; owner: Engineering Director + Mimo prototype.
- Push-vs-polling for job progress deferred (Doc 16) — acceptable, polling meets S1.

#### Cross-References & Decision Traceability

**ADR-016 (Two Brains pipeline; amends ADR-002 sourcing clause) — Accepted (directive). ADR-017 (modular monolith + worker fleet; queue-only async; adapter-layer exclusivity) — Accepted.** ADR-SEARCH-001 → Partially Resolved (remainder → Doc 15). Discharges R-TEC-002 (Part A first, by construction), R-TEC-003 (restated as A-047/48 pipeline-quality risk). Elevates R-LEG-001→R-LEG-006, R-TEC-001→R-TEC-007. CC-003 raised (audience-as-estimates). FS-10.03 telemetry structurally guaranteed at the Adapter Layer. NFR-S01/S02, FS-08.02/08.03 placements traced in Parts A–C.

#### Open Questions & External Dependencies

1. Pipeline validation spike results (A-047/48/49) — gates everything downstream of ADR-016.
2. Legal posture memo on public-data aggregation (A-050) — Doc 28, elevated.
3. CC-003 ratification (audience estimates) — CPO, next audit or sooner.
4. Apify/Serper/LLM vendor cost sheets → live-search credit price (OD-001 adjacent, Doc 17).
5. Identity-resolution rule design → Doc 18.

#### Future Revision Triggers

Spike failure on any A-047/48/49 axis; platform anti-scraping escalation affecting Apify actors; live-search unit cost >3× estimate; M4 throughput requiring extraction (A-051); hybrid vendor-fallback activation.

#### Review Checklist & Validation Criteria

- [ ] Tenancy invariant addressed first, enforced by construction. ✅
- [ ] Two Brains routing deterministic; live search never implicit. ✅
- [ ] Every Epic → exactly one owning module. ✅
- [ ] All external calls pass one adapter choke point (cost telemetry structural). ✅
- [ ] Pipeline stages checkpointed, idempotent, per-candidate isolated. ✅
- [ ] Honest surfacing of the demographics-estimation consequence (CC-003). ✅
- [ ] Zero code. ✅
- [ ] Sign-off: Principal Architects (Software, AI/Search, Data, Security), Engineering Director, CPO (CC-003); Qwen review against Docs 7–10 trace map.

---

[AWAITING APPROVAL]
