#### DOC-012 — UX/UI Design Principles, Accessibility & Interaction Standards
**Status:** Draft v1.0 | **Phase:** 4 | **Owner:** Principal Architect (UX) | **Consumes:** Doc 11 (screens, flows, state catalog), Docs 7–10 (FS behaviors)

---

#### Executive Summary

This document defines how MUSHIN *behaves* — the interaction physics that make a ten-pillar platform feel simple (Philosophy #1) and make an 8-hour-a-day agency workday feel fast. It establishes: (1) **five behavioral design principles** with enforcement rules; (2) **interaction specifications for the hard states** — Data-Gap Ladder rendering, credit quote confirmations, read-only billing lockdowns, evidence disclosure; (3) the **power-user standard**: full keyboard operability, a `Cmd/Ctrl+K` command surface, bulk-action grammar, and perceived-performance budgets that bind Mimo's implementation; (4) **WCAG 2.1 AA accessibility standards** including bidirectional text handling (Urdu/English mixed content is a day-one PK reality, not an i18n afterthought); and (5) **progressive disclosure rules** that keep Starter users in a simple tool while enterprise complexity stays dormant until entitled. A key decision: **ADR-014 — undo-over-confirm**: reversible actions execute optimistically with undo; confirmation dialogs are reserved exclusively for irreversible or credit-consuming actions, preserving both speed and the sanctity of the metered-action quote.

#### Purpose & Scope

Behavioral standards binding on every screen (Doc 11 SCR inventory) and component (Doc 13): principles, state interactions, keyboard/power-user grammar, motion and latency budgets, feedback patterns, accessibility conformance, disclosure rules. Discharges Doc 11 handoffs: keyboard navigation, notification tray detail, Activity feed, R-UX-007 (Creator page overload).

#### Non-Goals

- Visual identity: color values, typography, iconography, spacing tokens (Doc 13).
- Component anatomy/inventory (Doc 13).
- Copy/tone guide (lightweight voice rules included only where interaction-relevant; full guide = Doc 13 appendix).
- Marketing site UX; Admin panel (minimal internal standard, one clause in Part F).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every Doc 11 state-catalog class has a fully specified interaction pattern (no designer/Mimo improvisation on hard states).
- 100% of user-facing actions reachable by keyboard; power path exists for the top-20 agency actions.
- Perceived-performance budgets defined per interaction class and testable (Doc 26).
- WCAG 2.1 AA conformance criteria enumerated as release gates (NFR-U01).
- Disclosure rules stated as deterministic conditions (tier/entitlement/usage), not vibes.

#### Detailed Content

**Part A — Behavioral Design Principles (enforcement-grade)**

1. **Fast by perception, honest by default.** Every interaction acknowledges within 100ms (visual response), completes or shows determinate progress within budget (Part D), and never fakes completion of metered/irreversible actions. Optimism is for reversible actions only.
2. **The next action is always visible.** Dead-end prohibition (Doc 11 Part E) elevated to principle: every terminal state (empty, error, denied, zero-results) names its exit.
3. **Evidence before verdict, on demand.** Scores render collapsed-with-teaser (verdict + top evidence line); one interaction expands the full A4 triple. Explainability is never a separate page (killing the HypeAuditor copy-paste seam).
4. **Interruption is a last resort.** Modals only for: credit quotes, irreversible confirmations, and legal consents. Everything else is inline, non-blocking (toasts, banners, side panels).
5. **The system remembers so users don't.** Defaults learn: last-used templates, filters, currency, channel per creator. No repeated re-entry of known context (relationship memory as an interaction ethic, not just a feature).

**Part B — Hard-State Interaction Specifications**

**B1. Data-Gap Ladder rendering (Doc 8 A2 → motion behavior)**
- **Progressive skeleton standard:** SCR-02 renders in priority order — header (instant, from minimal data), then sections resolve independently: each section shows a *shaped skeleton* (mimicking final layout, no spinners) that resolves to content, partial-state, or gap-state. Sections never reflow already-rendered content (layout stability rule: reserved heights; no jumping while Alex is reading).
- **Gap-state anatomy:** muted section card = "Not available for this creator" + one-line reason class (insufficient data / not covered yet) + single CTA (*Request Deep Enrichment* with inline credit quote per B2). No red/error styling — gaps are neutral facts, not failures (R-UX-005 tone rule).
- **Staleness:** timestamp chip on every data section ("Data from 12 Jun"); past-TTL chips turn amber with refresh affordance; refresh runs in-place with section-level progress (~30s p95 per NFR-P03a), never a page reload.
- **Live Discovery job transitions (Brain 2 asynchronous pipeline, NFR-P03b):** when triggering Option A (Live Discovery job) on thin/zero search results (SCR-01), the job is explicitly framed as an asynchronous background task (takes 2–10 minutes). The UI displays progressive streaming results as each candidate completes ingestion (ADR-021 polling); a non-blocking progress banner tracks completed vs total candidates discovered by Serper and scraped by Apify. Users remain free to navigate or browse existing Brain-1 results while the job runs; a notification tray alert (FS-07.03) fires upon job completion.
- **Creator refresh / Add-by-URL transitions (known URLs, NFR-P03a):** when refreshing a known creator or adding a specific profile URL (Option B / UF-06), the UI button state sequence is *quoted → confirmed → analyzing (~30s p95) → resolved*; on timeout, section falls to gap-state with retry (never a blank).

**B2. Credit quote confirmation (the metered-action contract)**
- **Anatomy (uniform everywhere):** action label + cost in credits + balance-after preview + scope note (e.g., "applies to 37 creators") for bulk. Single confirm button carries the cost on its face ("Enrich — 37 credits").
- **Placement:** inline popover for single actions (anchored to the trigger, keyboard-dismissible); modal *only* for bulk (>1 creator) or high-cost (> configurable threshold) actions.
- **Session memory:** per Doc 8 A5, first-per-session confirmation for standard profile enrichment; subsequent same-type actions show a passive cost chip (no popover) with an always-visible running session spend in the credit meter. Rule: **suppression never applies to bulk or high-cost actions.**
- **Insufficient balance:** quote transforms in place into shortfall state ("Need 12 more credits") + top-up path; the intended action is preserved and auto-resumes post-top-up (no context loss through the Paddle checkout round-trip).

**B3. Read-only billing states (FS-08.02 → input behavior)**
- Persistent top banner, state-specific copy (past-due: "Payment issue — full access continues until <date>"; paused: "Workspace is read-only"). Banner is the *only* nagging surface — no per-click scolding.
- **Input restriction pattern:** blocked controls render visible-but-disabled with reason tooltip and (Owner/Admin only) a resolve action deep-linking to Billing. Text inputs become read-only (selectable/copyable — users must be able to extract their data frictionlessly; this is a trust covenant, and export remains enabled in read-only per FS-08.02).
- Sequences/automation show "paused by billing state" chips on affected objects — the *consequences* of the state are visible where work lives, not only in the banner.

**B4. Evidence disclosure (A4 triple interaction)**
- Collapsed: verdict band + confidence chip + strongest evidence line. Expand (click/`E` key): full evidence list, each item with direction icon, weight class, and data-basis footnote. Provider-attributed evidence visually distinguished from MUSHIN reasoning (Doc 8 FS-01.02 integrity rule). Confidence chip hover explains *why* confidence is Medium (data gaps enumerated). Diaspora-calibration tone rule (R-PRD-006): audience-geo evidence uses neutral phrasing patterns defined in the copy appendix (Doc 13).

**B5. Notification tray & Activity feed (Doc 11 handoffs, discharged)**
- Tray: grouped by category (FS-07.03 catalog), newest-first, unread markers; every notification deep-links to its context with the relevant object focused/highlighted on arrival. Bulk "mark read" per group. No notification without a destination (assertion).
- Activity feed (workspace, minor surface in Settings/Overview): filtered Timeline projection (member actions only, no system noise), 30-day window, read-only. Deliberately modest — it exists for accountability glances, not monitoring theater.

**Part C — Power-User Standard (PA-01, 8-hour-day grade)**

**C1. Command surface**
- `Cmd/Ctrl+K` opens the omnibar in command mode: fuzzy-matched actions ("new campaign", "go to <list>", "invite"), creator lookup, saved-search recall. Recent + context-aware ordering (on SCR-04a, campaign actions rank first). Every command-mode action also exists as a visible UI path (discoverability parity — commands accelerate, never gatekeep).

**C2. Global shortcut map (v1, binding; full reference sheet in-app via `?`)**
- `Cmd/Ctrl+K` command/omnibar · `G then S/L/C/I` go-to Search/Lists/Campaigns/Inbox (Gmail-style sequential keys) · `/` focus search on SCR-01 · `J/K` move through result/pipeline lists · `X` toggle-select · `Shift+X` range-select · `Enter` open focused creator (peek panel), `Shift+Enter` full page · `E` expand evidence · `N` new note on focused creator · `Esc` dismiss/close layer-by-layer · `Cmd/Ctrl+Z` undo last reversible action. Reserved namespace documented for S2 (channel compose, stage moves). No shortcut conflicts with browser/screen-reader defaults (accessibility co-constraint, Part E).

**C3. Bulk-action grammar (uniform across SCR-01/03a/04a)**
- Selection model: checkbox + `X`/`Shift+X`; persistent selection bar slides in with count + action set (contextual per surface, per FS-04.05 caps); "select all matching (≤500)" with explicit count.
- Execution: bulk actions run async with a progress toast → completion **receipt** (succeeded/failed/skipped + reasons, per Doc 9 FS-04.05) accessible from the tray. Partial failure never silently succeeds.
- Bulk + metered = always modal quote (B2 rule), showing per-unit and total cost.

**C4. Peek panel pattern**
- From any list/pipeline, `Enter` opens the creator as a right-side peek (SCR-02 condensed) preserving list position and selection state; `J/K` navigate *while peeking* (the vetting power loop: Alex reviews 30 creators without ever losing her place). Full page one keystroke away. This pattern is the single largest speed win for UF-A2 and is a **Must** for S1.

**C5. Optimistic UI & undo (ADR-014 — Accepted)**
- Reversible actions (list add/remove, tag, stage move, note save) execute optimistically with instant UI response + 8-second undo affordance (toast + `Cmd/Ctrl+Z`); background failure rolls back with a distinct error toast (rollbacks must be *loud* — silent reversion is data loss to the user's mental model).
- Irreversible or metered actions (sends, enrichments, reveals, deletions, member removal) are **never** optimistic: explicit confirm per B2/state catalog. The boundary list is maintained in Doc 13's component annotations (Qwen review artifact).

**Part D — Perceived-Performance Budgets (binding, testable)**

| Interaction class | Budget |
|---|---|
| Input acknowledgment (any click/key) | ≤100ms visual response |
| Navigation between screens (shell swap) | ≤200ms to skeleton, ≤1s to content (cached contexts) |
| Filtered search results | ≤1s p95 (NFR-P01); progressive rows |
| NL search | ≤3s p95 (NFR-P02); interpretation chips render *first* (≤800ms), results stream after — chips-first ordering makes latency legible |
| Peek panel open | ≤150ms (from cached list data) |
| Optimistic actions | Instant (0ms perceived); rollback ≤8s window |
| Creator refresh / Add-by-URL (known URL, NFR-P03a) | Async, section-progress; ≤30s p95 (NFR-P03a), then queue-and-notify |
| Live Discovery job (new creators, NFR-P03b) | Async pipeline (2–10 min); ADR-021 streaming progressive results; notify on completion |
| Motion standard | Micro-transitions 120–200ms ease-out; no animation >300ms on the critical path; all motion respects `prefers-reduced-motion` (Part E) |

Violation of a budget class in implementation = performance defect, triaged like a functional bug (Doc 26 test hooks; ties to Doc 23 real-user monitoring).

**Part E — Accessibility Standards (WCAG 2.1 AA, NFR-U01 — release-gate criteria)**

- **Keyboard:** 100% operability (Part C is also the a11y path); visible focus indicators everywhere (never suppressed); logical focus order; focus trapped in modals and returned to trigger on close; `Esc` layered dismissal.
- **Screen readers:** semantic landmarks per screen region; all icons labeled; dynamic updates (search streaming, bulk receipts, undo toasts) announced via live regions with polite/assertive discipline (assertive reserved for errors and billing-state changes); evidence expansion states programmatically exposed.
- **Contrast & color:** AA ratios (4.5:1 text, 3:1 UI components — value enforcement in Doc 13 tokens); **color is never the sole carrier** — authenticity bands and staleness states pair color with icon + text label (also protects meaning in exports/screenshots).
- **Bidirectional text (PK-critical, day one):** UI chrome is LTR English (S1), but creator bios, template bodies, notes, and messages will contain Urdu (RTL) and mixed Roman-Urdu/English. Standard: all user-content containers handle bidi isolation correctly (no punctuation scrambling, no layout breakage); RTL text renders right-aligned within its block; template editor and compose surfaces fully support RTL input. Full RTL UI mirroring is **out of scope** until OD-002 (Urdu UI) resolves — bidi *content* correctness is not optional.
- **Motion & vestibular:** `prefers-reduced-motion` collapses all transitions to fades/instant; no parallax/auto-playing motion anywhere.
- **Forms & errors:** labels always visible (no placeholder-as-label); errors inline, associated programmatically, described in text (never color-only); FS-06.02's missing-variable block renders as an accessible inline error.
- **Target sizes:** ≥44px interactive targets on touch layouts (responsive web per ADR-013).
- Conformance verification: automated checks + manual audit per release (process detail → Doc 26); known-issues register public to the team.

**Part F — Progressive Disclosure Rules (Philosophy #1/#4; R-UX-007 discharge)**

- **Rule 1 — Entitlement-dormant:** UI for un-entitled features renders in exactly two sanctioned forms: (a) hidden entirely (default for S3 enterprise: SSO, audit exports, granular RBAC — Starter users never see enterprise furniture), or (b) visible-teaser (sanctioned upsell list, CPO-controlled: WhatsApp S2 channel chip, advanced reports). Nothing else may leak.
- **Rule 2 — Usage-graduated:** advanced affordances appear after demonstrated need: bulk-action bar appears on first multi-select; saved-search prompt after 3 similar queries; keyboard-shortcut hints surface contextually after repeated pointer use of the same action (max 1 hint/session — no nagging).
- **Rule 3 — Creator-page zones (SCR-02 overload control):** fixed zone priority — Zone 1: identity + verdict summaries (always visible); Zone 2: evidence + audience detail (one expand away); Zone 3: relationship/workspace panels (persistent side rail, collapsed on narrow viewports); Zone 4: history/raw metrics (tab). Zone assignments are Doc 13 inventory annotations; moving content between zones requires CPO sign-off (this is the anti-clutter constitution).
- **Rule 4 — Settings austerity:** any setting with a sane universal default ships without UI v1; settings earn their existence via support-ticket evidence (settings sprawl is deferred complexity, not flexibility).
- **Admin panel clause:** internal tool follows Parts C/E (keyboard, a11y) but is exempt from disclosure rules and visual polish standards (Doc 10 gap, closed).

#### Dependency Mapping

- **Depends on:** Doc 11 (state catalog, screens, flows), Docs 8–10 (FS behaviors), ADR-013/014, NFR-U01/U02, NFR-P01–03.
- **Enables:** Doc 13 (tokens/components must implement these behaviors), Doc 26 (budget + a11y + assertion test classes), Mimo frontend implementation, Doc 23 (RUM metrics = Part D budgets).
- **Blocks:** Doc 13 cannot finalize component states without Part B/C patterns (now unblocked on approval).

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-039 | Gmail-style sequential shortcuts (`G then X`) are learnable by PK agency users without training | Med-High | S1 usage telemetry + `?` sheet views | Simplify to single-modifier map |
| A-040 | Peek-panel vetting loop achievable within performance budgets on mid-range hardware/bandwidth (PK connectivity reality) | Medium | S1 field testing on representative devices/networks | Budget relaxation or lighter peek payload |
| A-041 | Session-suppressed quotes (B2) don't reintroduce bill shock | Med-High | Support-ticket + refund telemetry | Re-enable per-action confirms |
| A-042 | Bidi content correctness achievable via standard platform text handling (no custom text engine — ADR-002) | High | Doc 13 implementation check | Scoped bidi fixes; never custom engine |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-UX-009 | UX | Power-user grammar intimidates non-technical brand users (PB-02) | M | M | Rule 2 graduation: shortcuts are invisible until earned; pointer paths always complete |
| R-UX-010 | UX | Optimistic-UI rollbacks erode trust if backend reliability is poor early on | M | H | ADR-014 boundary discipline; rollback loudness; reliability SLO dependency (Doc 23) — if error rate >1%, optimism is narrowed, not patched |
| R-UX-011 | UX | Performance budgets unachievable on PK network conditions (latency to cloud regions) | M | H | Region selection input to Doc 22; aggressive caching; budgets measured at p95 *from PK* — binding measurement locale |
| R-UX-012 | UX | A11y treated as post-launch polish under schedule pressure | M | M | Release-gate framing (Part E) + Doc 26 automation; NFR-U01 is S2-gated but structural choices are day-one |
| R-PRD-009 | Product | Disclosure Rule 4 (settings austerity) frustrates early power customers wanting knobs | L | M | Support-evidence pathway is fast (weekly triage); escape hatch documented |

#### Alternatives Considered & Trade-offs

- **Confirmation-heavy safety model** — rejected: taxes the 8-hour user hundreds of times daily; ADR-014's undo-over-confirm chosen with a strict irreversibility boundary.
- **Spinner-based loading** — rejected: shaped skeletons + progressive sections communicate *what* is coming and preserve layout stability (B1).
- **Full RTL UI mirroring now** — rejected: no S1 demand evidence, large surface cost; bidi content correctness (the actual day-one need) mandated instead.
- **Customizable dashboards/layouts** — rejected v1: personalization is complexity debt before PMF; Rule 3 fixed zones chosen (revisit trigger below).
- **Search architecture note (Living Thread):** chips-first NL rendering (Part D) is architecture-agnostic and actually *widens* ADR-SEARCH-001 options by decoupling interpretation latency from retrieval latency — verified no constraint added.

#### Gap Analysis Report

- Copy/voice appendix (including R-PRD-006 neutral-phrasing patterns and R-UX-005 honesty-banner tone) deferred to Doc 13 — owner assigned (UX + CPO).
- Empty-state full enumeration per SCR deferred to Doc 13 inventory (flagged in Doc 11, unchanged).
- Touch/mobile-web interaction deltas (bulk selection without hover, peek panel on small viewports) named but not fully specified — Doc 13 responsive annotations must close this.
- In-app shortcut reference (`?` sheet) needs content design — Doc 13.
- Measurement methodology for "p95 from PK" (RUM segmentation) → Doc 23 requirement stub created.

#### Cross-References & Decision Traceability

**ADR-014 (undo-over-confirm; optimism boundary) — Accepted.** Discharges Doc 11 handoffs (keyboard nav, tray, Activity feed, R-UX-007 via Rule 3). Operationalizes NFR-U01 (Part E as release gates), NFR-U02 (Part F), NFR-P01–03 (Part D budgets + measurement locale), Doc 8 A4/A5 (B2/B4), Doc 9 FS-04.05 (C3 receipts), Doc 10 A2/FS-08.02 (B3). R-UX-011 hands a region-selection constraint to Doc 22 (infrastructure) — first Phase-7 dependency emitted from UX.

#### Open Questions & External Dependencies

1. Representative PK device/network test matrix (A-040) — Engineering Director to define with S1 partners.
2. High-cost threshold value for B2 modal escalation (needs Catalog v1 / OD-001 pricing).
3. OD-002 (Urdu UI) — unchanged, S1 evidence pending.
4. Cloud region latency data from PK (feeds R-UX-011 → Doc 22).

#### Future Revision Triggers

RUM data breaching any Part D budget at p95-from-PK; a11y audit failures at S2 gate; shortcut adoption <10% among agency users at S1 end (A-039 review); rollback rate >1% (R-UX-010 narrowing); ≥3 customer requests for layout customization (Rule 3/4 revisit).

#### Review Checklist & Validation Criteria

- [ ] Every Doc 11 state class has an interaction spec (B1–B5 coverage). ✅
- [ ] Keyboard parity: no pointer-only action exists. ✅
- [ ] Metered actions can never execute without a visible cost. ✅
- [ ] Optimism boundary enumerated and testable. ✅
- [ ] AA criteria framed as release gates with owners. ✅
- [ ] No visual-design decisions leaked from Doc 13's authority. ✅
- [ ] Zero code. ✅
- [ ] Sign-off: CPO, Principal Architect (UX), Engineering Director; Qwen review against Doc 11 state catalog completeness.

---

[AWAITING APPROVAL]
