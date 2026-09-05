#### DOC-008 — Deep Feature Specs: Creator Intelligence, Search & AI Layer
**Status:** Draft v1.0 | **Phase:** 3 | **Owner:** CPO + Principal Architect (AI/Search) | **Implements:** EPIC-01, EPIC-02, EPIC-03 (Doc 7)

---

#### Executive Summary

This document decomposes EPIC-01 (Creator Intelligence), EPIC-02 (Search & Discovery), and EPIC-03 (AI Intelligence Layer) into atomic, engineering-ready feature specifications with deterministic behaviors, state models, credit-consumption triggers, and explainability mechanics. It is written for direct implementation by Mimo and requirement-ID-level review by Qwen. Two constraints dominate the design: (1) **Pakistan-first data reality** — provider coverage of Pakistani creators is unproven, so every discovery/enrichment flow specifies explicit data-gap fallbacks, multilingual handling (Urdu / Roman Urdu / English code-switching), and coverage instrumentation; (2) **margin protection** — every metered action has a defined credit trigger, cost-telemetry hook (NFR-C01), and cache policy. Spec IDs follow `FS-<epic>.<fr>.<n>`.

#### Purpose & Scope

Atomic specifications for all M/S1 and S/S1 requirements of EPICs 01–03, plus behavioral contracts (state models, error/fallback behavior, credit triggers, explainability standards) binding on Docs 11 (UX), 15 (architecture), 18–20 (data/API), 26 (testing).

#### Non-Goals

- CRM/Campaign/Outreach specs (Doc 9); Workspace/Billing/Analytics/Admin specs (Doc 10).
- Final search architecture selection (Doc 15, ADR-SEARCH-001) — this doc *constrains* it, it does not decide it.
- Provider selection (Doc 17) — this doc defines the **pipeline capability contract** Doc 17 must satisfy.
- UI layouts (Docs 11–13). Zero code (policy upheld).

#### Objectives & Success Criteria

- Every FR from EPICs 01–03 decomposed into specs with behavior, states, credit trigger, and failure mode defined.
- Mimo can implement any FS without asking "what happens when…" for the top failure paths.
- Pakistan data-gap behavior is specified for every discovery/enrichment surface — no silent empty states.
- 100% of metered actions appear in the Credit Consumption Matrix.

#### Detailed Content

**Part A — Cross-Cutting Contracts**

**A1. Pipeline Capability Contract (binding input to Docs 15/17)**
Under the Two Brains architecture (ADR-016), creator intelligence is generated via our own multi-stage discovery and enrichment pipeline (Brain 2: Serper → Apify → LLM → M5 → GCP) rather than a single vendor database. Each pipeline component must satisfy specific output requirements for Pakistani-market viability:
- **Serper (Candidate Discovery):** must surface candidate creator URLs by geo=PK and South Asia using query operators and intent filtering.
- **Apify (Public Profile Scraping):** must extract public bio, follower count, post history, and engagement metrics across Instagram, TikTok, and YouTube (Facebook: Should, given PK usage patterns; exact actor contracts pinned in Doc 17 B2.1).
- **LLM Engine (M6 Scoring & Ingestion):** must derive authenticity scoring, niche classification (48-category controlled vocabulary), and audience demographic estimation from scraped signals (per CC-003, audience demographics are LLM estimates, not directly observable DB fields).
**Pipeline Acceptance Gate:** the Brain 2 pipeline must resolve ≥70% of a 500-creator PK validation panel (assembled manually from known local creators across tiers) with usable enrichment data. Failure → escalate to ADR-007 review (the beachhead itself is at stake).

**A2. Data-Gap Ladder (mandatory fallback order & completeness tiers for every profile surface)**
1. **Cached enriched data (Rich / Standard Tier)** (fresh within TTL) → serve immediately from Brain 1 index.
2. **Stale cache** → serve with staleness badge + refresh affordance (FR-01.06; triggers Brain 2 re-scrape of stages 2–4).
3. **Live Discovery job (Brain 2 — credit-metered)** → triggers asynchronous Serper → Apify → LLM pipeline; progressive streaming results via ADR-021 polling.
4. **Partial data (Sparse Tier)** → render available sections (<80% schema coverage — e.g., bio + follower count only); each missing section shows an explicit "not available for this creator" state with a one-tap *Request Deep Enrichment* action (queued, credit-quoted before confirm).
5. **Unknown creator (Minimal Tier)** → *Add Creator by URL/handle* flow (UF-06): user submits a profile URL; system validates, queues Brain 2 enrichment (stages 2–4, skipping Serper), notifies on completion. This is the pressure valve for PK coverage gaps and doubles as index growth. All ladder transitions are instrumented (coverage telemetry feeds Admin FR-10.02 and the A1 gate).

**A3. Multilingual & Naming Normalization (PK-specific)**
- Search and matching must handle: Urdu script, Roman Urdu transliteration variance (e.g., "Ayesha/Aisha/Aysha"), English/Urdu code-switching in bios and content, and honorific/stage-name conventions.
- Requirement: transliteration-tolerant matching for creator name/handle lookup (implementation approach — phonetic/variant expansion via managed search capabilities — is Doc 15's decision; the *behavior* is binding: a search for one common variant must retrieve creators indexed under another).
- Content-topic extraction must not degrade to zero on Urdu/Roman-Urdu content; where language coverage is missing, topic fields follow the A2 partial-data state, never a wrong-language guess.

**A4. Explainability Standard (operationalizes NFR-E01; binding on every scored output)**
Every AI/derived score ships as a triple: **(a) verdict** (score/label), **(b) evidence breakdown** (enumerated signals with direction and weight class High/Medium/Low), **(c) confidence + data-basis statement** (what data was available, its freshness, and what was missing). Prohibitions: no score without evidence; no evidence item not traceable to actual retrieved data (R-PRD-004: fabricated rationale = release-blocking defect, testable in Doc 26); confidence must degrade visibly when the A2 ladder served partial data.

**A5. Credit Consumption Matrix (canonical; prices deferred to Doc 3/10 calibration)**

| Action | Trigger point | Metered? | Cache/TTL rule |
|---|---|---|---|
| Filtered/keyword search (indexed) | Query execution | No (tier fair-use caps) | n/a |
| NL search interpretation | Query submit | Micro-metered or tier-capped (Doc 3 decides) | Interpretation cached per session (Groq 8B T-A) |
| Live Discovery (Brain 2 job) | Explicit "search live" action only — never implicit | Yes | Results cached to index (Serper + Apify + LLM M6 cost rollup per OD-001) |
| YouTube Data API v3 fetch | Profile open / refresh for YT-native creators | No (free within daily 10k quota) | TTL 30d (metrics), 90d (demographics) |
| Profile enrichment (standard) | Profile open with no fresh cache, **after** user-visible confirm on first occurrence per session | Yes | TTL 30d (metrics), 90d (demographics) — tunable flags |
| Deep enrichment | Explicit request (A2 step 4) | Yes (quoted before confirm) | TTL 30d |
| Contact reveal | Explicit reveal click | Yes | Permanent per workspace once revealed |
| Authenticity analysis | Bundled with standard enrichment | Included in enrichment cost | Recomputed only on refresh |
| AI summary | Explicit generate (auto for S1 design partners behind flag) | Yes (low) | Cached until underlying data refresh |
| Refresh (FR-01.06) | Explicit | Yes | Overrides TTL |

Rules: (1) no metered action without prior cost visibility (R-PRD-003); (2) all metered actions emit cost-telemetry events with provider/model/stage attribution (NFR-C01; Serper, Apify, Groq/Claude per ADR-022); (3) enrichment results are cached workspace-agnostically (index-level) while notes/reveals stay workspace-scoped (NFR-S01) — this cache-sharing decision is **ADR-008 — Accepted** (consequence: one workspace's paid enrichment cheapens the next; margin improves with scale; privacy review required in Doc 21).

**Part B — EPIC-01 Feature Specs (Creator Intelligence)**

**FS-01.01 Unified Creator Profile**
- Canonical Creator entity aggregates ≥1 Profiles (glossary, Doc 7). Sections: identity header (name, handles, platforms, location, languages), audience (size, demographics: age/gender/geo split — PK-share prominently surfaced, since export-focused agencies also need *international* audience shares), engagement (rate, trend, benchmark vs. category median), growth (6-month follower trajectory with anomaly flags), authenticity module (FS-01.02), contact module (FS-01.03), collaborations (S2), content insights (S2).
- Every section independently follows the A2 ladder. Profile header must render from minimal data (handle + platform) — the page never hard-fails on partial coverage.
- Benchmarks: category medians computed per market; **PK-market benchmark set is mandatory** — comparing a Karachi lifestyle creator against US medians is a spec violation.

**FS-01.02 Explainable Authenticity Analysis**
- Output per A4 triple. Evidence signal families (v1): follower-quality distribution (suspicious-account share), engagement-consistency (likes/comments ratio anomalies, comment authenticity patterns), growth-pattern anomalies (spike detection vs. organic curves), audience-geo plausibility (e.g., PK creator with implausible audience-geo mix — calibrated carefully: PK creators legitimately have large Gulf/diaspora audiences; this **must not** be naively penalized — calibration requirement logged), engagement-velocity patterns.
- Verdict: score 0–100 + banded label (Strong/Moderate/Weak signals of authentic audience). Confidence: High/Medium/Low tied to data completeness.
- Derived from provider signals + our reasoning layer; where the provider supplies opaque sub-scores, we display them as *provider-attributed evidence*, never repackaged as our own reasoning (trust integrity).
- Failure mode: insufficient data → module renders "Not enough data to assess" + deep-enrichment CTA. Never a default score.

**FS-01.03 Contact Reveal**
- Explicit action, credit-quoted, permanent per workspace post-reveal (A5). Source attribution + confidence shown (provider-verified vs. scraped-confidence tiers). Legal overlay: reveal events logged for GDPR/data-provenance accounting (Doc 21 hook). PK note: WhatsApp-number prevalence in local creator commerce — capture as a contact type; outreach via WhatsApp remains out of scope for S1 (logged to Feature Intelligence Log, revisit in Doc 9 given PK norms).

**FS-01.06 Freshness & Refresh**
- Every data section timestamped ("Data as of…"). Staleness badge past TTL. Refresh = explicit, quoted, rate-limited (max 1/profile/24h/workspace) to prevent credit-burn accidents and provider abuse.

**Part C — EPIC-02 Feature Specs (Search & Discovery)**

**FS-02.01 Filtered Search**
- Filter taxonomy v1: platform, follower band, engagement-rate band, creator geo (country→city for PK: Karachi/Lahore/Islamabad+), creator language (Urdu/English/Punjabi/Sindhi/Pashto + code-switch flag), audience geo share (e.g., "≥40% audience in PK" or "≥30% in GCC" — the export-agency killer filter), audience age/gender, category/niche, authenticity band, contact-available flag, last-active recency.
- Behavior: results stream progressively (NFR-P01 p95 <1s on indexed corpus); zero-result states trigger the A2 ladder step 3 offer (live search, quoted) — never a dead end.

**FS-02.02 Natural-Language Search**
- Pipeline (behavioral contract, architecture per Doc 15): NL query → structured interpretation (filters + intent + ranking hints) → **interpretation is shown to the user as editable chips** before/alongside results ("Understood: niche=skincare, geo=PK, size=10k–100k, authenticity=high"). This is the explainability-and-trust move competitors skip, and it converts NL failures into recoverable filter edits.
- Must handle Urdu/Roman-Urdu queries per A3 ("makeup artist Lahore waali" must resolve geo+niche). Misinterpretation fallback: user edits chips; edits are logged as training/eval signal (feedback loop spec'd, model retraining out of scope per ADR-002).

**FS-02.03 Intelligent Ranking**
- Ranking = fit score over candidate set, composed of (weight classes, not formulas — tuning is Doc 15's): query-relevance, audience-fit vs. stated criteria, authenticity band, engagement quality, freshness of data, long-tail fairness term (T5: small creators must surface when fit; follower count is **not** a dominant prior).
- Binding constraints: deterministic for identical query+index state (Qwen reviewability + user trust); FR-02.06 ranking explanations ("Ranked high: 62% PK audience, strong authenticity, niche exact-match") are **pulled forward from C/S2 to S/S1** for design partners — rationale: it is Wedge #1 made visible and cheap to derive if ranking is evidence-based from day one. *This is a change-control action against Doc 7:* logged as **CC-001** for CPO approval in the Doc 10 audit.
- Sponsored/boosted results: prohibited (trust positioning; ADR-001).

**FS-02.04 Saved Searches**
- Save (query + chips + filters), rename, re-run, workspace-shared visibility per role. Re-run diffs: "12 new creators since last run" (S2 flag). No metering on save/re-run of indexed queries.

**Part D — EPIC-03 Feature Specs (AI Layer)**

**FS-03.01 AI Creator Summary**
- Input basis: only retrieved profile data (grounding requirement — the summary generator may not assert facts absent from the data payload; violations are release-blocking, per A4). Output: decision brief ≤150 words — who they are, audience essence, authenticity posture, fit considerations, red flags — plus data-basis footer. Regenerates only on data refresh (cache per A5). Language: English v1; Urdu output logged as S2 candidate (PK agency client reports may need it — validate with design partners).

**FS-03.02 AI Query Construction**
- Assists FS-02.02: suggests filter refinements from campaign context ("For your Ramadan campaign brief, consider audience-geo PK ≥50% + family-content niche"). Suggestions are always chips the user accepts — never auto-applied (Philosophy #2 / FR-03.06).

**FS-03.05/03.06 AI Governance (system-wide behavioral spec)**
- Model routing: default = cost-efficient model; frontier model only for flagged complex tasks (summary of sparse/conflicting data). Routing decisions logged with cost attribution (NFR-C01/C02).
- Every AI feature registers in an internal AI-feature manifest: gates passed (value/complexity/cost/impact), unit cost, cache policy, fallback behavior. Manifest is Qwen's review artifact and Admin-visible (FR-10.02).
- Universal AI fallback: on model/provider failure → feature degrades to non-AI equivalent (raw data view, manual filters) with honest messaging. AI unavailability must never block a non-AI workflow.

#### Dependency Mapping

- **Depends on:** Doc 7 (EPIC/FR contract), ADR-007 (PK beachhead), ADR-002, Doc 3 (credit guardrail).
- **Enables:** Doc 15 (constraints A1–A5, FS-02.03; ADR-SEARCH-001 decision), Doc 17 (pipeline capability contract A1), Doc 11 (states/ladders → UX), Doc 18 (Creator/Profile entities), Doc 26 (testable prohibitions), Doc 10 (credit catalog).
- **Blocks:** Mimo implementation of EPICs 01–03 pends Doc 15 + Doc 17 selections; PK validation panel (A1) blocks pipeline verification.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-023 | Brain 2 pipeline resolves ≥70% of PK validation panel with usable enrichment data | **Low-Medium** | A1 validation panel (immediate spike) | Beachhead review (ADR-007); or index-building via FS user-submission becomes primary, changing cost model |
| A-024 | Transliteration-tolerant matching achievable via managed search features (no custom NLP build) | Medium | Doc 15 spike | Scope A3 to handle-exact + English-only v1 |
| A-025 | Diaspora/GCC audience patterns can be calibrated to avoid false fraud flags | Medium | Design-partner ground truth on known-authentic PK creators | Authenticity module credibility damaged in beachhead market — high severity |
| A-026 | Design partners accept English-only AI outputs for S1 | Medium-High | S1 interviews | Urdu summary pull-forward |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-TEC-003 | Technical | **PK pipeline resolution quality inadequate — Pillars 1–2 fail in beachhead** | M-H | Critical | A1 gate before full launch; A2 ladder + user-submitted indexing as structural hedge; escalation path to ADR-007 |
| R-PRD-006 | Product | Authenticity miscalibration on PK/diaspora audiences → false accusations against legitimate creators | M | H | A-025 calibration panel; conservative banded labels; confidence display; human-overridable (Philosophy #2) |
| R-FIN-005 | Financial | Enrichment-on-profile-open burns credits unexpectedly → bill shock + support load | M | M | First-open confirm, quotes, rate limits, TTL caching (A5) |
| R-SEC-002 | Security | Cross-workspace cache sharing (ADR-008) leaks workspace-inferable signals | L | H | Only provider-sourced public data shared; all workspace-origin data excluded; Doc 21 privacy review gate |
| R-UX-004 | UX | Data-gap states dominate PK early experience → product feels empty | M | H | A2 ladder UX priority in Doc 11; seed index with PK validation panel + design-partner rosters pre-launch |

#### Alternatives Considered & Trade-offs

- **Living Thread (Search/Discovery):** Traditional filtered search alone fails FS-02.02/A3 (NL + transliteration); pure LLM/vector retrieval fails NFR-P01 determinism/latency and cost guardrails on filter-heavy queries. This document's constraints (deterministic ranking, <1s filters, NL interpretation, semantic S2, per-query cost visibility) **structurally imply a hybrid architecture** — but selection, vendor, and topology remain ADR-SEARCH-001 / Doc 15. Recorded as a constraint funnel, not a decision.
- **Auto-enrich everything on ingest** — rejected: COGS explosion (R-FIN-005), violates Doc 3 guardrail. Chosen: lazy, user-triggered, cached.
- **Build PK scraper for coverage gaps** — rejected: violates ADR-002 and legal posture (R-LEG-001). Chosen: user-submitted URL ingestion via pipeline lookups.
- **Hide authenticity when confidence is low** — rejected: silent omission erodes trust promise. Chosen: explicit "not enough data" honesty state.

#### Gap Analysis Report

- **Blocking:** PK validation panel (500 creators) doesn't exist — must be assembled now; owner: Strategist + design partners. Blocks A1 gate, pipeline verification, R-TEC-003 retirement.
- Facebook coverage (PK-relevant) is Should-tier but unspecified in filter taxonomy v1 — deferred; log to Feature Intelligence Log.
- WhatsApp as outreach channel (PK norm) unresolved — escalated to Doc 9 scoping.
- Category/niche taxonomy undefined (needed for FS-02.01 filters + benchmarks) — assign to Doc 18 as controlled vocabulary with PK-relevant categories.
- CC-001 (ranking-explanation pull-forward) awaits CPO ratification at Doc 10 audit.

#### Cross-References & Decision Traceability

**ADR-008 (index-level cache sharing) — Accepted here.** Implements FR-01.01–01.06, FR-02.01–02.04 (+02.06 pull-forward via CC-001), FR-03.01/02/05/06. Operationalizes NFR-E01 (A4), NFR-C01 (A5), NFR-P01/P02 (Part C). Consumes ADR-007 throughout (A1–A3, benchmarks, calibration). Constraint funnel feeds ADR-SEARCH-001.

#### Open Questions & External Dependencies

1. Provider shortlist + PK coverage evidence (Doc 17 — most urgent external dependency in the project).
2. Credit price points per A5 row (Doc 3/10 calibration).
3. Urdu AI output demand (S1 interviews).
4. Legal posture on user-submitted profile ingestion under PK + GDPR-adjacent rules (Doc 21/28).

#### Future Revision Triggers

A1 gate result (either direction); authenticity calibration findings from first 50 PK profiles; NL-search chip-edit rate >40% (interpretation quality failure); enrichment COGS per profile exceeding Doc 3 guardrail; CC-001 rejection.

#### Review Checklist & Validation Criteria

- [ ] Every FS has behavior, failure mode, credit trigger, and data-gap state. ✅
- [ ] PK constraints addressed in every discovery/enrichment surface. ✅
- [ ] No architecture or vendor selected prematurely. ✅
- [ ] Prohibitions written as testable assertions for Doc 26. ✅
- [ ] Zero code. ✅
- [ ] Sign-off: CPO, Principal Architect (AI/Search), Principal Architect (Data), Engineering Director; Qwen review against Doc 7 FR contract.

---

[AWAITING APPROVAL]
