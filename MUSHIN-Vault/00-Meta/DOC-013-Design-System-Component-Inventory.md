Generating the Phase 4 finale.

---

#### DOC-013 — Design System Specification & Component Inventory
**Status:** Draft v1.0 | **Phase:** 4 | **Owner:** Principal Architect (UX) | **Consumes:** Doc 11 (SCR inventory, state catalog), Doc 12 (interaction standards, budgets, a11y gates)

---

#### Executive Summary

This document specifies MUSHIN's design system: a **three-tier token architecture** (primitive → semantic → component), the foundational scales (color semantics with AA-enforced contrast, typography with Urdu-capable fallbacks, a 4px spacing grid, motion tokens bound to Doc 12's budgets), the **anatomy of the twelve keystone components** that carry the product's hardest behaviors (Creator Card, Evidence Panel, Credit Quote, Pipeline Card, Peek Panel, and others), and the **Component-to-Screen coverage matrix** — the Qwen review artifact promised in Doc 11 — guaranteeing every screen can render its empty, loading, degraded, denied, and error states from inventoried parts. One material constraint is surfaced honestly: **brand visual identity does not yet exist** (Doc 6 flagged gap). The system is therefore specified **brand-forward**: all semantic and component tokens are final; primitive brand values (accent hues, display typeface) are single-point-swappable placeholders. Mimo can build the entire system now; branding lands later as a token update, not a refactor (**ADR-015**).

#### Purpose & Scope

Token architecture and naming, foundational scales, elevation/motion/breakpoint systems, keystone component anatomy with mandatory state coverage, full component inventory mapped to SCR-01…08, copy/voice appendix (discharging Doc 12's deferral), and design-system governance rules.

#### Non-Goals

- Brand identity creation (logo, brand palette, display typeface) — external dependency, tracked below.
- Marketing-site design system (separate, lighter artifact; out of scope).
- Admin panel visual polish (Doc 12 Part F clause: keyboard + a11y compliant, exempt from brand polish).
- Illustration/iconography *content* (icon set = licensed library per ADR-002; usage rules included, drawing icons is not our business).
- Dark mode — deferred (revision trigger below).
- Zero production code: tokens are specified as named design values; implementation format (CSS variables etc.) is Mimo's domain.

#### Objectives & Success Criteria

- Every component ships with all seven mandatory states defined (default / hover-focus / active / disabled-with-reason / loading-skeleton / empty / error).
- Coverage matrix: every SCR × state-catalog cell resolves to inventoried components — zero improvisation during build.
- Brand swap requires changes **only** at the primitive tier (testable: semantic layer references no raw values).
- All color-pair usages meet AA ratios by construction (contrast enforced at the semantic-pairing level, not per-screen audits).

#### Detailed Content

**Part A — Token Architecture (ADR-015 — Accepted: three-tier, brand-forward)**

**A1. Tiers & naming**
- **Primitive:** raw values — `color.blue.600`, `space.4`, `font.size.14`. The *only* tier containing raw values; brand-pending values live here as placeholders.
- **Semantic:** meaning-bound aliases — `color.bg.surface`, `color.text.primary`, `color.accent.action`, `color.feedback.warning`, `space.section-gap`. Components may reference **only** semantic tokens (lint-enforceable rule for Mimo).
- **Component:** scoped overrides where needed — `card.creator.border`, `quote.modal.emphasis`. Used sparingly; each requires a justification note in the inventory.

**A2. Color semantics (contrast-enforced pairs)**
- **Neutrals (9-step):** backgrounds (`bg.canvas`, `bg.surface`, `bg.raised`), borders (subtle/default/strong), text (`text.primary` ≥7:1 on surface, `text.secondary` ≥4.5:1, `text.disabled` — decorative only, never sole information carrier).
- **Accent (brand-pending primitive):** `accent.action` (primary buttons, links, focus rings — placeholder: accessible indigo family), `accent.selected`. AA-tested against both `bg.surface` and `bg.canvas` as a *pairing contract* — any future brand hue must pass the same pairs before adoption (brand-swap gate).
- **Feedback set:** `feedback.success/warning/danger/info` — each defined as a triad (subtle-bg / border / strong-text) so inline states compose correctly. Danger reserved per Doc 12 (errors, destructive, rollback toasts) — **never** for data-gap states (B1 tone rule: gaps use neutrals).
- **Domain semantics (product-specific, the important ones):**
  - `authenticity.strong/moderate/weak` — triads paired with mandatory icon+label (Doc 12: color never sole carrier). Hue guidance: green/amber/red families *avoided* for the weak band's default rendering in evidence contexts — weak-signal is rendered amber, reserved red strictly for confirmed-fraud evidence lines (R-PRD-006 tone protection: "weak data" must not scream "fraudster").
  - `staleness.fresh/aging/stale` — timestamp chips (neutral/amber pairing per Doc 12 B1).
  - `credit.balance.ok/low/critical` — meter states (FS-07.03 thresholds).
  - `dataviz.categorical.1–6` + sequential ramp — colorblind-safe set, AA against surface for labels.
- **Billing-state banners:** `banner.info` (trial), `banner.warning` (past-due), `banner.neutral-locked` (read-only) — deliberately not danger-red (Doc 12 B3: no scolding).

**A3. Typography**
- **Family:** v1 = platform-native system stack (performance on PK mid-range devices per A-040 — zero font-download cost) **plus mandatory Urdu-capable fallback chain** (Noto-class Nastaliq/Naskh fallback for RTL runs) so bidi content (Doc 12 Part E) renders correctly in cards, notes, templates, and compose surfaces from day one. Brand display typeface, if later adopted, slots at the primitive tier for headings only (body remains system for performance) — pre-decided to prevent future rebrand-driven regression.
- **Scale (px):** 12 (meta/chips) · 13 (dense-table) · 14 (body-default, the workhorse — 8-hour readability) · 16 (emphasized body/inputs) · 20 (section titles) · 24 (page titles) · 32 (onboarding/display only). Line-heights: 1.5 body, 1.3 headings, 1.4 dense-table. Weights: 400/500/650 (semantic: `regular/medium/strong`). Minimum UI font size 12px, never below (a11y floor).
- **Numeric rule:** tabular figures for all metrics, credits, currency (columns must align in tables and the ledger view).

**A4. Spacing, radii, elevation, breakpoints**
- **Grid:** 4px base; scale 4·8·12·16·24·32·48·64. Semantic aliases: `inline-gap` 8, `control-pad` 12, `card-pad` 16, `section-gap` 24, `page-gutter` 24/32 (breakpoint-dependent). Density note: MUSHIN is a work tool — default density is **compact-professional** (14px body / 12-pad controls), not marketing-airy.
- **Radii:** 4 (controls/chips) · 8 (cards/panels) · 12 (modals) · full (avatars/pills).
- **Elevation (4 levels):** flat (canvas) · raised (cards: border + subtle shadow) · overlay (peek panel, popovers) · modal (quote modals, dialogs + scrim). Elevation communicates *interruption weight* — aligned to Doc 12 Principle 4 (peek < modal).
- **Breakpoints:** `sm` <640 (single column, touch targets ≥44px, selection via long-press — closing Doc 12's touch-delta gap) · `md` 640–1024 (side rail collapses per Zone 3) · `lg` 1024–1440 (canonical desktop) · `xl` >1440 (max content width 1440, no infinite stretching).

**A5. Motion tokens**
- `motion.instant` 0ms (optimistic actions) · `motion.quick` 120ms (hover/chips) · `motion.standard` 180ms (panels, expansion) · `motion.deliberate` 280ms (modals only — the ceiling; Doc 12: nothing >300ms on critical path). Easing: ease-out for entrances, ease-in for exits. Skeleton shimmer: one subtle 1.2s loop, disabled under `prefers-reduced-motion` (all motion tokens collapse to `instant` under that preference).

**Part B — Keystone Component Anatomy** (the twelve components carrying Docs 8–12's hardest behaviors; each ships with the seven mandatory states)

1. **Creator Card (list/grid variant)** — avatar, name + platform chips, follower/engagement tabular metrics, **authenticity chip (band icon+label+color)**, ranking-explanation badge slot (CC-001, SCR-01 only), selection checkbox (`X` key target), staleness chip, and **Data-Gap Ladder Tier badge** (`Rich` / `Standard` / `Sparse` / `Minimal` per Doc 8 A2) indicating pipeline data resolution completeness. Zone-1-only content (Rule 3): no evidence detail on cards. Skeleton: shaped per A-shape stability rule.
2. **Pipeline Stage Card** — Creator Card condensed + stage-specific strip: owner avatar, last-interaction age, agreed-rate chip (once recorded), next-task due, cross-campaign presence dot (FS-05.02), awaiting-reply indicator. Drag handle + keyboard-move affordance (a11y parity for drag interactions — move via menu/`M` key; drag is enhancement, not requirement).
3. **Evidence Disclosure Panel** (Doc 12 B4) — collapsed verdict band (band chip + confidence chip + strongest-evidence line + expand affordance/`E`); expanded: evidence rows (direction icon, weight-class label, statement, data-basis footnote), **provider-attributed rows visually distinct** (bordered + "via provider" tag), confidence explainer hover, missing-data enumeration. This component is the productized Wedge #1 — its polish bar is the highest in the system.
4. **Credit Quote (popover + modal variants)** (Doc 12 B2) — action label, cost, balance-after, scope note (bulk), confirm-with-cost-on-button, insufficient-balance transform state (shortfall + top-up + preserved-intent). Modal variant adds per-unit/total breakdown table.
5. **Peek Panel** (Doc 12 C4) — right overlay, SCR-02 condensed (Zones 1–2 + Relationship summary), `J/K` pass-through navigation, "open full" affordance, position-preserving close.
6. **Section Gap Card** (Doc 8 A2 / Doc 12 B1) — neutral styling, reason class line, single CTA (deep-enrichment quote inline), never danger-colored.
7. **Selection Action Bar** (Doc 12 C3) — slide-in, count, contextual actions, select-all-matching (≤500) with count, bulk-receipt link post-execution.
8. **Billing State Banner** (Doc 12 B3) — state-specific copy slots, resolve deep-link (role-gated), non-dismissible variants for read-only states, single-instance rule (one banner max; priority order: billing > degraded-provider > informational).
9. **Toast & Undo** (ADR-014) — success/undo variant (8s countdown affordance, `Cmd/Ctrl+Z` binding), loud-rollback variant (danger triad + persistent until acknowledged), progress variant (bulk ops → receipt).
10. **Interpretation Chips** (FS-02.02) — editable chip row (field:value, edit-in-place, remove, add), chips-first render slot above streaming results (Doc 12 Part D ordering), Urdu/bidi-safe chip content.
11. **Timeline Entry** — icon per event type (Doc 9 A1 taxonomy), actor attribution (incl. "former member" and dual-attributed impersonation variants per FS-07.01/10.02), relative+absolute timestamp, payload preview, channel tag. Dense-list rendering (Relationship panel, activity strip contexts).
12. **Credit Meter** — persistent shell component: balance, allowance-vs-topup hover breakdown (FS-08.03 ordering), threshold states, running session-spend line (Doc 12 B2), click-through to usage.

**Supporting inventory (standard components, anatomy abbreviated):** buttons (primary/secondary/tertiary/danger; loading + disabled-with-reason states), inputs & form fields (visible labels, inline errors, RTL-capable), select/combobox, date picker, tag/badge system, avatar & avatar-stack, tabs, side rail (Zone 3 collapsible), data table (tabular figures, sortable, sticky header, row-focus for `J/K`), modal & confirm-dialog (irreversible-action variant with typed confirmation per Doc 11 Part E), popover, tooltip (also keyboard-triggerable), empty-state block (illustration slot + explain + primary action — Principle 2 enforced structurally), skeleton set (card/row/section shapes), notification item, progress (bar + determinate/indeterminate), file attachment chip, comment thread block, stage column (pipeline container), omnibar/command palette (Doc 12 C1), shortcut-hint chip + `?` reference sheet layout (closing Doc 12 gap), FX-annotated currency display (PKR/USD with rate-timestamp tooltip per FS-05.03).

**Part C — Component ↔ Screen Coverage Matrix (Qwen review artifact, S1 scope)**

| SCR | Keystone components | State-catalog coverage confirmed |
|---|---|---|
| SCR-01 Search | Creator Card (+explanation badge & Data-Gap Ladder badge), Interpretation Chips, Selection Bar, Credit Quote (Live Discovery job CTA), empty-state block (zero-results → UF-00-style pivot with Live Discovery vs Add-by-URL options), skeletons | Empty ✅ Loading ✅ Degraded (provider-down → filters-only notice) ✅ Quote ✅ |
| SCR-02 Creator Page | Evidence Panel, Section Gap Card, staleness chips, Timeline Entry (Relationship panel), Credit Quote (reveal/refresh/deep-enrich), Peek variant | Gap ✅ Stale ✅ Loading (zoned skeletons) ✅ Denied (entitlement) ✅ |
| SCR-03/03a Lists | Data table / Creator Cards, Selection Bar, comment blocks, file chips, export quote, empty-state | Empty ✅ Bulk receipt ✅ Denied (export gate) ✅ |
| SCR-04/04a Campaigns | Stage columns + Pipeline Cards, brief form set, budget table (FX display), task rows, campaign-inbox thread list, Toast/Undo (stage moves), rate-capture micro-form | Empty pipeline ✅ Over-budget warn ✅ Loading ✅ |
| SCR-05 Inbox | Thread list rows, channel tags, awaiting-reply filter chips, compose surface (RTL-capable, template variables with missing-variable inline error) | Empty ✅ Send-blocked (consent/eligibility disabled-with-reason) ✅ |
| SCR-06 Analytics | Metric cards (definition tooltips per FS-09.01), dataviz set, empty-state ("complete a campaign to see…") | Empty ✅ Partial-data ✅ |
| SCR-07 Settings | Form sets, member table, integration connect cards (OAuth states: connected/revoked/error per FS-06.01), Billing surfaces (Paddle-hosted checkout handoff state, ledger table, usage view), notification prefs matrix | Revoked-token ✅ Read-only ✅ Pending-activation (webhook race) ✅ |
| SCR-08 Onboarding | Intent search box + example chips, showcase Creator Cards, add-by-URL input (validate states), checklist widget, credit-framing quote variant | Zero-result pivot ✅ Enrichment-timeout substitute ✅ |
| Shell (all) | Workspace switcher, sidebar nav, omnibar, Credit Meter, notification tray, Billing Banner, Toasts | Switch-with-unsaved-edits ✅ Banner priority ✅ |

Matrix rule: any future screen/state addition must extend this table **before** build (governance, Part E).

**Part D — Copy & Voice Appendix (discharges Doc 12 deferral)**

- **Voice:** plain, precise, unafraid of numbers; never cute during work, warmth allowed in onboarding/empty states. No exclamation marks in operational UI.
- **Honesty-banner pattern (R-UX-005):** frame growth, never apology — sanctioned: *"Our Pakistan index grows daily — add any creator and we'll analyze them in minutes."* Prohibited: "Sorry", "unfortunately", "we don't have".
- **Diaspora-neutral evidence phrasing (R-PRD-006):** sanctioned pattern: *"Audience: 48% Pakistan, 22% UAE, 9% UK — consistent with PK creators with Gulf diaspora reach."* Prohibited: any phrasing implying foreign audience share is itself suspicious. Fraud statements only on fraud-family evidence (e.g., *"31% of sampled followers show bot-like patterns"*).
- **Cost phrasing:** always concrete units ("3 credits"), always on the button, never "premium feature" euphemisms.
- **Denial phrasing:** state the limit + the path ("Growth plan includes 5 seats — upgrade to add more"), never bare "permission denied."
- **Error phrasing:** what happened + what we did + what you can do ("Couldn't refresh this profile. Your credits weren't used. Try again or check back later.") — credit-safety reassurance is mandatory in metered-action errors (pairs with FS-08.03 reversal contract).

**Part E — Governance**

- New component or state → inventory PR: anatomy, seven states, semantic-token-only check, matrix row, a11y notes. CPO+UX sign-off for keystone changes; Zone reassignments per Doc 12 Rule 3 constitution.
- **Brand-swap gate (ADR-015):** brand adoption = primitive-tier PR passing the A2 pairing contrast contract + visual regression sweep. Nothing else may change.
- Deprecation: components marked deprecated remain in inventory with replacement pointer for one release cycle minimum.

#### Dependency Mapping

- **Depends on:** Docs 11–12 (screens, states, interaction standards, budgets, a11y gates), Doc 8 A2/A4 (gap/evidence rendering), Doc 9 A1 (timeline taxonomy), Doc 10 (billing states, meter), ADR-013/014/015.
- **Enables:** Mimo frontend build (token set + inventory = build order), Doc 26 (visual regression + state-coverage + a11y test classes), brand-identity onboarding (swap gate), Doc 23 (RUM component-level timing hooks).
- **Blocks:** Nothing in Phase 5 — architecture proceeds in parallel. Brand identity (external) blocks only final visual polish, not build.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-043 | System font stack + Noto-class Urdu fallback renders acceptably across PK-prevalent devices/browsers | Med-High | Device-matrix render test (A-040 matrix reuse) | Bundled webfont for Urdu runs (perf cost accepted) |
| A-044 | Compact-professional density suits both PA-01 power use and PB-02 comfort | Medium | S1 observation | Density toggle (violates Rule 4 — needs evidence) |
| A-045 | Licensed icon library covers domain needs (authenticity, channels, pipeline) without custom drawing | High | Inventory pass | Commission ≤10 custom glyphs |
| A-046 | Brand identity lands before S2 public launch without forcing semantic-tier changes | Medium | Brand-swap gate rehearsal | Launch on placeholder-neutral brand (acceptable, flagged to CEO) |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-UX-013 | UX | Placeholder brand ships to S1 partners and anchors perception ("looks generic") | M | M | S1 framing as early access; evidence-panel polish carries premium signal; brand before S2 (A-046) |
| R-UX-014 | UX | Component sprawl as S2 features land (WhatsApp inbox, reports) | M | M | Governance PR gate + matrix-first rule; quarterly inventory audit |
| R-TEC-006 | Technical | Semantic-token discipline erodes under build pressure (raw values leak into components) | M | M | Lint-enforceable rule handed to Mimo/Doc 25 standards; Qwen review checkpoint |
| R-UX-015 | UX | Nastaliq fallback rendering degrades dense layouts (tall glyphs in 14px rows) | M | L-M | Naskh-style fallback preference in dense contexts; line-height exception token for RTL runs |

#### Alternatives Considered & Trade-offs

- **Adopt a full third-party design system (Material-class) wholesale** — rejected: domain components (Evidence Panel, Quote, Pipeline) don't exist there, and wholesale adoption imports someone else's voice; chosen: minimal proprietary system atop standard primitives (ADR-002-consistent: we don't *build* a component framework, we *specify* one over commodity foundations).
- **Custom brand typeface now** — rejected: brand doesn't exist; system stack wins on PK network/device performance (A-040) and costs nothing.
- **Dark mode at v1** — rejected: doubles the contrast-pairing test surface pre-PMF; trigger logged.
- **Airy consumer density** — rejected: 8-hour professional tool; compact-professional chosen (A-044 watch).
- **Search architecture note (Living Thread):** no component constrains ADR-SEARCH-001; Interpretation Chips and streaming-result patterns are retrieval-agnostic — verified, no impact.

#### Gap Analysis Report

- Brand identity remains the open external dependency (A-046) — owner: CEO; swap-gate makes it non-blocking for build.
- Data-viz specification is v1-minimal (six categorical + one ramp) — sufficient for FS-09.01 S1 metrics; S2 report-building will need an expanded viz spec (logged to Intelligence Log).
- Illustration style for empty states unspecified — acceptable v1: icon-scale glyphs from licensed set; revisit with brand.
- Print/PDF styling for exported client reports (UF-A2 CSV limitation → S2 reports) unaddressed — assigned to the S2 client-portal-lite scoping.
- Touch-delta closure (Part A4 `sm` rules) is minimal-viable; dedicated mobile-web usability pass scheduled post-S1 telemetry.

#### Cross-References & Decision Traceability

**ADR-015 (three-tier brand-forward tokens; system-stack + Urdu fallback typography) — Accepted.** Discharges: Doc 12 gaps (copy appendix → Part D, `?` sheet → supporting inventory, touch deltas → A4, empty-state enumeration → Part C matrix), Doc 11 coverage-matrix obligation (Part C), Doc 10 admin-standard clause (Doc 12 Part F reaffirmed). Enforces: Doc 12 Part D budgets (A5 motion ceiling), Part E a11y (A2 pairing contract, A3 floors, bidi in components), Rule 3 zones (component annotations), ADR-014 boundary (Toast/Undo vs. confirm-dialog variants). R-PRD-006 and R-UX-005 now have concrete sanctioned copy patterns (Part D) — moving both risks from "designed" toward "operationalized."

#### Open Questions & External Dependencies

1. Brand identity commissioning timeline (CEO) — must precede S2 (A-046).
2. Icon library licensing selection (ADR-002 procurement; low risk).
3. A-040/A-043 device matrix definition — Engineering Director, shared validation pass.
4. Expanded viz spec trigger: does S2 reporting land in client-portal-lite? (Doc 27 sequencing.)

#### Future Revision Triggers

Brand identity adoption (swap-gate execution); dark-mode demand ≥3 enterprise prospects or S3 gate; component-sprawl audit failure; A-044 density complaints; S2 WhatsApp/reporting component extensions (matrix-first rule applies).

#### Review Checklist & Validation Criteria

- [ ] Components reference semantic tokens only (lintable rule stated). ✅
- [ ] All keystone components define seven mandatory states. ✅
- [ ] Coverage matrix spans all SCRs × state catalog. ✅
- [ ] Contrast enforced at pairing level; bidi handled at component level. ✅
- [ ] Brand dependency isolated to primitive tier. ✅
- [ ] Zero production code. ✅
- [ ] Sign-off: CPO, Principal Architect (UX), Engineering Director; Qwen review of Part C matrix against Doc 11 state catalog.

---

Phase 4 (UX & Information Architecture) is complete: Docs 11–13 give Mimo a buildable frontend contract — object model and flows (11), behavioral physics (12), and the token/component system (13). Next per blueprint: **Phase 5 — Technical Architecture, opening with Doc 14 (High-Level Software Architecture, Service Boundaries & Module Breakdown)**, which must open with the NFR-S01 tenancy invariant per R-TEC-002.

[PHASE 4 COMPLETE - AWAITING APPROVAL FOR PHASE 5]
