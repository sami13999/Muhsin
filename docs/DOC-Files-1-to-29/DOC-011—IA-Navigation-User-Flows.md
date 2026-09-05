Entering Phase 4. Generating Document #11.

---

#### DOC-011 — Information Architecture, Navigation Maps & Core User Flows
**Status:** Draft v1.0 | **Phase:** 4 — System Design & UX | **Owner:** Principal Architect (UX) + CPO | **Consumes:** Docs 7–10, Audit #1

---

#### Executive Summary

This document defines MUSHIN's information architecture as a **two-layer object model**: a **global Creator layer** (index-level data, ADR-008) overlaid by a **workspace lens** (lists, campaigns, timeline, consent — NFR-S01), and translates it into a navigable structure: global navigation, workspace switching, screen inventory with stable screen IDs, and the canonical user flows. The centerpiece deliverables are (1) the **Golden Path onboarding (UF-00)** — engineered so that a thin Pakistani index *cannot* produce an empty first experience, by converting the Data-Gap Ladder (Doc 8 A2) from a fallback into an onboarding feature ("bring your creators with you"); and (2) the **J1 lifecycle flows for Agency Alex (UF-A series) and Brand Bianca (UF-B series)**, specified stage-by-stage with entry points, decision branches, and failure states. Every screen and flow carries an ID for Mimo implementation and Qwen review traceability.

#### Purpose & Scope

- Canonical object model and containment/reference hierarchy (Creator ↔ List ↔ Campaign ↔ Timeline).
- Global navigation map, workspace context model, screen inventory (SCR-nn), URL-hierarchy principles (structure, not literal routes).
- Golden Path onboarding (UF-00) and primary J1 flows (UF-A1…A4, UF-B1…B3).
- Cross-cutting UX state catalog (empty/denial/read-only/stale/quote states) binding on all screens.

#### Non-Goals

- Visual design, layout, component specs (Docs 12–13).
- Interaction micro-patterns, accessibility detail (Doc 12).
- Admin-panel IA (internal tool; minimal standard per Doc 10 gap, confirmed in Doc 13).
- Mobile-native apps — **responsive web only for S1/S2** (discharges Doc 7 gap; ADR-013 below).
- Copywriting/localization strings (S1 UI is English; Urdu UI logged as S2+ question).

#### Objectives & Success Criteria

- Every FS from Docs 8–10 has a home: mapped to ≥1 screen ID (coverage matrix obligation on Qwen review).
- A new user reaches first insight (enriched creator view) in ≤5 minutes / ≤6 steps even with **zero** index coverage of their niche (A-006 rescue).
- No screen can render a dead end: every empty/denied/failed state offers a next action (testable, Doc 26).
- Alex can navigate between two clients' campaigns in ≤2 interactions.

#### Detailed Content

**Part A — Object Model & Hierarchy (canonical)**

**A1. Two-layer model (ADR-013 — Accepted: workspace-shell navigation over a global creator layer)**
- **Global layer:** Creator/Profile records + enrichment (shared index, ADR-008). Navigationally, a Creator page is *one canonical screen* wherever reached from.
- **Workspace lens:** everything else — lists, campaigns, timeline, consent, notes, reveals, budgets — renders *into* the Creator page as workspace-scoped panels (Doc 9 FS-04.04 Relationship panel). Consequence: no duplicate "creator in list" vs. "creator in campaign" pages; one creator, many contexts. This kills the classic CRM navigation smell of context-fragmented duplicate records.

**A2. Containment vs. reference (binding relationships)**
- Workspace **contains** Lists, Campaigns, Members, Settings, Ledger view.
- Lists and Campaigns **reference** Creators (many-to-many; adding to a campaign never removes from a list).
- Campaign **contains** Brief, Pipeline (stages containing creator-references), Tasks, Budget, Inbox-view, Performance.
- **Interaction Timeline is not a place** — it is a substrate (Doc 9 A1) surfaced as: (a) the Relationship panel on Creator pages, (b) the activity strip on campaign creator-cards, (c) workspace Activity feed. Users never "go to the timeline"; they meet it in context. (IA decision: prevents an unusable raw event log becoming a primary surface.)

**A3. Naming rule:** navigation labels use glossary terms verbatim (Lists, Campaigns, Search) — no synonyms ("Collections," "Projects") anywhere (consistency invariant, Doc 12 audit item).

**Part B — Global Navigation & Workspace Context**

**B1. App shell (persistent):**
- **Workspace switcher** (top-left): current workspace name/logo; menu lists memberships + "Create workspace" (entitlement-gated per A2/Doc 10). Switching swaps the entire shell context; in-flight unsaved edits prompt before switch. Zero cross-workspace bleed (NFR-S01 assertion at the UX layer: no mixed-workspace lists in any picker, ever).
- **Primary nav (sidebar):** `Search` · `Lists` · `Campaigns` · `Inbox` · `Analytics` · `Settings`. Six items, fixed order — deliberately flat (Philosophy #1; R-UX-001 mitigation). Admin/Owner additionally see `Billing` under Settings, not top-level.
- **Omnibar (top):** global creator lookup (name/handle/URL — transliteration-tolerant per Doc 8 A3; pasting a profile URL triggers add-by-URL flow UF-06 inline). Also does saved-search recall and command actions (S2).
- **Credit meter (persistent, top-right):** balance + hover breakdown (allowance vs. top-up per FS-08.03 ordering); turns amber/red at FS-07.03 thresholds; click → usage view. Cost transparency is a navigation-level citizen (R-PRD-003).
- **Notification tray:** per FS-07.03 catalog.

**B2. Screen inventory (primary, S1 scope):**

| ID | Screen | Home of (spec trace) |
|---|---|---|
| SCR-01 | Search & Discovery | FS-02.01/02/03/04; NL chips; Live Discovery job CTA (A2 step 3) & Add-by-URL (UF-06) |
| SCR-02 | Creator Page (canonical) | FS-01.01/02/03/06; Relationship panel (FS-04.04); section-level gap states |
| SCR-03 | Lists index + SCR-03a List detail | FS-04.01/02/03/05 |
| SCR-04 | Campaigns index + SCR-04a Campaign home (Brief · Pipeline · Tasks · Budget · Inbox · Performance as tabs) | FS-05.01–05.05; FS-06.04 (campaign inbox tab) |
| SCR-05 | Inbox (workspace-level, cross-campaign) | FS-06.04 aggregate view |
| SCR-06 | Analytics (workspace overview) | FS-09.02 |
| SCR-07 | Settings (Profile · Members · Notifications · Integrations · Billing · Usage) | FS-07.01/03; FS-08.x customer surfaces; FS-06.01 mailbox connect |
| SCR-08 | Onboarding sequence | UF-00 |

URL-hierarchy principle: workspace-scoped paths nest under a workspace identifier; Creator pages are canonical per creator with workspace context applied by session (Mimo/Doc 20 detail; behavior binding: a shared creator link opened by another workspace member shows *their* workspace lens).

**Part C — UF-00: The Golden Path (J2 onboarding, A-023-proof)**

Design thesis: **when the index is thin, the user's own roster is the content.** The Data-Gap Ladder's step 5 (add-by-URL) is promoted from fallback to a first-class onboarding act, so the "empty index" worst case still produces a personally relevant, enriched first experience.

*Steps (target ≤5 min; instrumented per step for funnel telemetry):*
1. **Sign-up → workspace auto-created** (FS-08.04 trial; PKT/PKR defaults per FS-07.01). Single question asked: "What best describes you?" (Agency / Brand / Other) — branches copy only, not structure (keeps flow singular; R-UX-003).
2. **Intent capture:** "Who are you looking for?" — one NL search box with PK-relevant example chips ("fashion creators in Lahore", "tech reviewers, 50k–500k, PK audience"). Runs FS-02.02 with editable interpretation chips.
3. **Branch on result density (the A-023 hinge):**
   - **≥8 strong results:** ranked results with explanation badges (CC-001) → proceed to step 4.
   - **Thin results (1–7):** results shown *plus* two distinct, explicitly differentiated options with clear latency expectations:
     - **Option A: "Search live for more creators" (Live Discovery job, Brain 2)** → quotes credit budget → on confirm, triggers asynchronous Serper → Apify → LLM pipeline (takes 2–10 minutes). Displays progressive streaming results as each candidate completes ingestion (ADR-021 polling); Brain-1 results remain browsable in the background while the job runs.
     - **Option B: "Add a specific creator by link" (Add-by-URL flow UF-06)** → paste profile URL inline → skips Serper discovery (stages 2–4 only) → completes in ~30s for known URLs.
   - **Zero results:** full-screen pivot (never a blank list) offering both Option A (Live Discovery search) and Option B (paste specific link), plus 3 seeded showcase creators from the validation-panel index (pre-enriched, guaranteed-rich examples so the *capability* is demonstrable immediately).
4. **First enrichment moment (the "aha"):** user opens one creator (search result or their own added URL) → SCR-02 renders progressively: header instantly, then authenticity module with **evidence breakdown** (A4 triple) — this explainability reveal is scripted as *the* wow beat. Trial credits absorb the enrichment (quoted per Doc 8 A5 confirm-first rule, framed as "using 1 of your 25 free credits").
5. **Capture value:** one-tap "Save to List" → first list auto-named from the query.
6. **Multiply value (soft close):** "Invite a teammate" + "Turn this list into a campaign" cards — both skippable; onboarding never blocks exploring.

*Failure states:* enrichment provider timeout at step 4 → seeded showcase creator substituted with apology microcopy + queued notification for their creator (FS-07.03) — the wow beat happens on *a* creator even if not *their* creator. Add-by-URL invalid link → inline correction, platform examples. All exits from onboarding resumable via a persistent checklist widget (dismissible; gone after completion or 7 days).

**Part D — J1 Core Flows: Agency Alex (UF-A) and Brand Bianca (UF-B)**

**UF-A1 — New client campaign setup** (J1:1–2)
Entry: SCR-04 → "New campaign" → client picker (create client inline, FS-05.01) → structured brief with machine-readable criteria → **"Find creators for this brief"** deep-links to SCR-01 pre-filtered from the criteria block (the J1 stage-1→2 seam closure, Doc 9). Branch: Alex may instead attach an existing List to the pipeline (agencies reuse rosters — reference model per A2 makes this trivial).

**UF-A2 — Vet & shortlist for client approval** (J1:3–4)
SCR-01 results → multi-select → "Add to List" → SCR-03a working list → per-creator vetting on SCR-02 (authenticity evidence, PK/GCC audience-geo splits per FS-02.01 filters — the export-agency signature move) → list comments between team members (FS-04.02) → **client approval v1 = entitlement-gated CSV export** (known limitation; "client portal lite" S2 candidate per Doc 9 gap — Alex's workaround is spec'd honestly, not hidden).

**UF-A3 — Outreach & negotiation across the pipeline** (J1:5–6)
SCR-04a Pipeline → drag creator `Prospect → Contacted` prompts channel choice: email compose (template + variables, FS-06.02) or WhatsApp click-to-chat (S1, FS-06.06) → sends/logs land in Timeline → replies surface in Campaign Inbox tab with awaiting-reply filter → stage moves any-to-any with reason codes on drops → `rate_recorded` prompt on move to `Agreed` (a deliberate micro-friction: relationship memory demands the rate be captured at the moment it exists — one field, currency pre-set).

**UF-A4 — Multi-client context switching**
Alex's reality-check flow: SCR-04 index groups campaigns **by client**; switching client contexts = one click within the same workspace (clients are workspace-internal entities, *not* separate workspaces — decision: agencies get one workspace per agency, clients as entities; separate workspaces per client remains possible but unrecommended; documented trade-off below). ≤2 interactions requirement satisfied.

**UF-B1 — Fraud-safe creator selection (Bianca's trust journey)** (J1:2–3)
SCR-01 with authenticity-band filter ≥ Moderate → SCR-02 evidence review — including diaspora-calibrated framing (R-PRD-006: evidence text must present GCC-audience share neutrally, never as an implied red flag) → contact reveal (quoted, FS-01.03) → save to list.

**UF-B2 — Campaign execution & budget watch** (J1:6–7)
SCR-04a → Budget tab: planned vs. committed auto-summing agreed rates (FX-normalized PKR/USD, FS-05.03) → over-budget warning state (warn-not-block) → tasks/milestones for deliverables → manual outcome recording (FS-05.05) at `Published`.

**UF-B3 — Repeat collaboration (relationship-memory payoff)** (J1:8)
Entry: new campaign brief → "Suggested: creators you've worked with" module (Timeline-derived: past `Agreed`+positive outcomes) → SCR-02 Relationship panel shows last rate + past performance → re-outreach pre-filled with history context. **This flow is the Wedge-#2 demo** and must exist in S1 even in minimal form (spec: module appears once workspace has ≥1 completed campaign).

**UF-06 — Add-by-URL (global affordance):** paste URL anywhere (omnibar, search, lists) → validate → queued Brain 2 enrichment (stages 2–4 only, skipping Serper discovery; ~30s p95 per NFR-P03a) with progress state → notification on ready (FS-07.03) → creator lands in origin context (search results/list). This is the index-growth engine (R-TEC-003 hedge) and must be frictionless from every surface.

**Part E — Cross-Cutting UX State Catalog (binding on every screen)**

| State class | Behavior contract |
|---|---|
| **Empty (no data yet)** | Never blank: explain + primary action (e.g., empty pipeline → "Add creators from a list or search"). Each SCR's empty state enumerated in Doc 13 inventory |
| **Data-gap (partial creator data)** | Doc 8 A2 states verbatim: section-level "not available" + deep-enrichment CTA; staleness badges + refresh |
| **Credit quote/confirm** | Any metered action: cost shown before execution; balance-after preview; insufficient balance → top-up prompt with exact shortfall (A2/Doc 10 denial reasons) |
| **Entitlement denial** | Machine-readable reason → human message + upgrade path; never a dead modal |
| **Read-only (billing states)** | Persistent banner (state-specific: past-due vs. paused vs. trial-expired per FS-08.02); all data visible; blocked actions render disabled-with-reason, not hidden (users must see what they're missing — conversion honesty) |
| **Degraded (provider/AI down)** | Doc 8 fallback ladders: honest unavailability + non-AI alternative path |
| **Destructive confirmations** | Archive-first policy: campaigns/lists archive (recoverable) rather than delete; true deletion only in Settings with typed confirmation |

#### Dependency Mapping

- **Depends on:** Docs 7–10 (all FS), Audit #1 amendments (PK personas, A-006 downgrade), ADR-007/008/013.
- **Enables:** Doc 12 (interaction standards per state catalog), Doc 13 (component inventory per screen inventory), Doc 20 (URL/resource hierarchy alignment), Doc 26 (flow-level E2E test scripts map 1:1 to UF IDs), Mimo frontend build order.
- **Blocks:** Doc 13 component inventory blocked until this screen inventory approved.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-035 | Clients-as-entities (one workspace per agency) matches PK agency operating reality | Medium | S1 partner observation | Workspace-per-client pattern support; RBAC pull-forward pressure |
| A-036 | Onboarding step-3 zero-result branch occurs in <30% of S1 signups (index seeding works) | Low-Med | UF-00 funnel telemetry | Golden Path re-weighting toward add-by-URL-first |
| A-037 | Six-item flat nav accommodates S2 additions (WhatsApp inbox, reports) without restructure | Med-High | Doc 12/13 stress test | Nav grouping revision |
| A-038 | Rate-capture micro-friction at `Agreed` achieves >60% capture without workflow abandonment | Medium | S1 telemetry | Optional-field fallback; memory quality degrades |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-UX-005 | UX | Golden Path's honesty banners ("index is growing") read as weakness, damaging premium positioning | M | M | Copy testing with S1 partners; frame as freshness/curation, never apology; showcase creators guarantee capability proof |
| R-UX-006 | UX | Client-as-entity model insufficient for agencies needing hard client data separation | M | M | A-035 validation; workspace-per-client escape hatch documented |
| R-UX-007 | UX | Canonical Creator page overloads (intelligence + relationship + actions) | M | H | Progressive disclosure zones (Doc 12 owns section prioritization); NFR-U02 audit |
| R-UX-008 | UX | Onboarding branch logic (step 3) complicates funnel analysis and Mimo build | L | M | Branches share instrumentation schema; single flow ID with branch tags |
| R-PRD-008 | Product | UF-B3 memory module underwhelms with sparse S1 data (cold-start on our own wedge) | M | M | Module gated on ≥1 completed campaign; S1 partner data seeds it fast in agency contexts |

#### Alternatives Considered & Trade-offs

- **Workspace-per-client for agencies** — rejected as default: fragments Alex's cross-client view, multiplies billing/seat complexity; retained as escape hatch (trade-off documented for A-035 review).
- **Timeline as a top-level nav destination** — rejected: raw event streams are archaeologically interesting and operationally useless; contextual surfacing chosen (A2).
- **Wizard-style multi-step onboarding with role/team/goals questionnaires** — rejected: every question before the aha moment taxes A-006's 5-minute budget; single intent question chosen.
- **Hiding blocked features in read-only states** — rejected: disabled-with-reason converts better and is honest (aligns with explainability culture).
- **Search architecture note (Living Thread):** IA assumes progressive result rendering and editable NL chips regardless of the ADR-SEARCH-001 outcome; no IA element constrains the Doc 15 decision — verified.

#### Gap Analysis Report

- Coverage matrix (FS → SCR mapping completeness) drafted for Parts B/D but not exhaustively enumerated here — **Qwen review artifact to be generated at Doc 13** (every FS row must land on a screen/component).
- Urdu UI localization posture undefined (S1 English confirmed; S2+ open) → logged to OD-002.
- Workspace Activity feed (A2c surface) named but under-spec'd — assigned to Doc 12 as a minor surface.
- Notification tray interaction detail deferred to Doc 12 (catalog exists, FS-07.03).
- Keyboard/power-user navigation (agencies live in this tool daily) unaddressed — assigned to Doc 12 interaction standards.

#### Cross-References & Decision Traceability

**ADR-013 (workspace-shell over global creator layer; responsive web only S1/S2) — Accepted.** Implements the UX obligations of: Doc 8 A2 (ladder states), A4 (evidence display), A5 (quote states); Doc 9 A1–A3 (timeline surfacing, channel choice, consent-blocked sends render as disabled-with-reason); Doc 10 A2 (denial reasons), FS-08.02 (billing-state banners). Discharges audit handoffs R-UX-003 (golden path), R-UX-004 (gap-state design), R-OPS-004 (read-only clarity). UF-B3 operationalizes Wedge #2; CC-001 explanation badges placed at SCR-01.

#### Open Questions & External Dependencies

1. OD-002: Urdu UI for S2 — partner demand signal needed.
2. A-035: client-separation depth — observe first 5 agency partners.
3. Showcase-creator set (step-3 zero-result branch): requires validation-panel creators cleared for demo use (consent/legal check → Doc 28).
4. Does the omnibar's add-by-URL need rate-limiting against scraping-abuse patterns? (→ Doc 21.)

#### Future Revision Triggers

UF-00 funnel telemetry: any step >25% drop-off; A-036 breach (zero-result branch >30%); A-035 invalidation; S2 WhatsApp inbox arrival (nav stress test per A-037); client-portal-lite promotion (would add SCR-09 and revise UF-A2).

#### Review Checklist & Validation Criteria

- [ ] Every screen has enumerated empty/denied/degraded states. ✅
- [ ] No flow terminates in a dead end. ✅
- [ ] Golden Path survives zero-coverage worst case. ✅
- [ ] Glossary-verbatim navigation labels. ✅
- [ ] No visual/component design decisions made (Docs 12–13 authority preserved). ✅
- [ ] Zero code. ✅
- [ ] Sign-off: CPO, Principal Architect (UX), Engineering Director; Qwen review against Docs 8–10 FS coverage.

---

[AWAITING APPROVAL]
