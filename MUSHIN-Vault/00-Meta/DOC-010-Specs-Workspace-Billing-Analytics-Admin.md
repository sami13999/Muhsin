#### DOC-010 — Deep Feature Specs: Workspace, Billing, Analytics & Administration
**Status:** Draft v1.0 | **Phase:** 3 | **Owner:** CPO + Principal Architects (Software, Data, Security) | **Implements:** EPIC-07, EPIC-08, EPIC-09, EPIC-10 (Doc 7)

---

#### Executive Summary

This document specifies the platform's operational chassis: workspace tenancy and collaboration (EPIC-07), the **Paddle-webhook-driven entitlement state machine and append-only credit ledger** (EPIC-08), analytics surfaces derived exclusively from the Interaction Timeline (EPIC-09), and the internal Administration plane with **audited impersonation and the real-time COGS/margin dashboard** (EPIC-10). Two principles govern the billing design: **Paddle is the source of truth for money; MUSHIN is the source of truth for entitlements derived from it** — reconciled continuously, never assumed; and **the credit ledger is append-only and double-entry-inspired**, so every credit ever granted or burned is auditable to a cause. The admin cost dashboard operationalizes the Doc 3 margin guardrail (3× COGS) as a live operational control rather than a spreadsheet aspiration — existential for a Pakistan-based company collecting global USD with USD-denominated API costs.

#### Purpose & Scope

Atomic specs, state machines, event-handling contracts, and failure modes for EPICs 07–10 (M/S1 + S/S1, with S2 items marked), binding on Docs 11 (UX), 14/16 (architecture/events), 17 (Paddle integration detail), 18–19 (entities/ledger persistence), 21 (security controls), 23 (observability), 26 (testable assertions).

#### Non-Goals

- Paddle API transport mechanics, retry wire-formats, endpoint design (Doc 17/20).
- SSO/SAML, granular RBAC, audit-log export (S3 per ADR-006) — anticipated structurally, not spec'd.
- Revenue accounting/bookkeeping exports (S2 stub only); tax logic (Paddle MoR, permanently out of scope).
- Advanced analytics/ROI automation (S2, EPIC-09 partial).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Entitlement state is a pure function of (Paddle events + catalog version) — replayable from event history.
- No credit consumption path bypasses the ledger; balance is always derivable, never stored as mutable truth.
- Impersonation is impossible without an audit artifact existing first.
- Cost dashboard can answer "what is our margin on action X today?" within 1 hour of reality (NFR-C02).

#### Detailed Content

**Part A — Cross-Cutting Contracts**

**A1. Tenancy & Identity Model**
- **User** (global identity, via managed auth per NFR-S02) ↔ **Membership** (user × workspace × role) ↔ **Workspace** (tenancy/billing boundary, Doc 7 glossary). All CRM/campaign/outreach/ledger data hangs off workspace; index-level creator data is global (ADR-008); reveals/notes/timeline are workspace-scoped (NFR-S01).
- **Staff identity plane is fully separate** from customer identity (distinct auth realm, mandatory MFA; **ADR-011 — Accepted**). Rationale: a customer-auth compromise can never escalate to admin plane. Consequence: no "staff flag" on user accounts, ever (testable).

**A2. Entitlement Resolution (single evaluation contract)**
Every gated action resolves: `entitlement = f(workspace.subscription_state, plan.limits[catalog_version], ledger.balance, feature_flags)` — evaluated **server-side only** (FR-08.03). Client hints are cosmetic. Limits are typed: **hard-block** (seats, workspace count, WhatsApp channel access), **soft-warn** (approaching credit floor, list counts at 90%), **consume-or-deny** (credit-metered actions: sufficient balance or quoted top-up prompt). Every denial returns a machine-readable reason (upgrade path surfaced in UX — Doc 11).

**Part B — EPIC-07 Feature Specs (Workspace & Collaboration)**

**FS-07.01 Workspace Lifecycle & Membership**
- Creation: first workspace auto-created at signup (trial state, Part C). Fields: name, logo, default timezone (default **Asia/Karachi** per ADR-007), default currency (PKR/USD choice at creation).
- Invites: email-based; pending invites consume a seat **only on acceptance** (agency-friendly); expire in 14 days; resend/revoke. Roles v1: **Owner** (billing + all), **Admin** (all except billing/deletion), **Member** (work surfaces; no member management, no exports unless granted per FS-04.03). Exactly one Owner v1; transfer flow with email confirmation.
- Removal/offboarding: departing member's artifacts (notes, threads, tasks) **remain with the workspace**, reassigned to "former member" attribution; their OAuth mailbox connection is severed and their active sequences pause with owner alert (Doc 9 FS-06.01 dependency). This is relationship-memory protection (Doc 2, P4: knowledge leaves when staff leave — MUSHIN must be the antidote, testable).
- Multi-workspace: users may belong to many workspaces (agency reality); switcher UX in Doc 11; no data bleed across switch (NFR-S01 assertion).

**FS-07.02 Tenancy Isolation Behaviors**
- Authorization enforced at the data-access layer per request: every query carries workspace context; absence = deny (fail-closed). Cross-tenant test suite is a **release gate** (Doc 26: zero-leak tolerance per NFR-S01).

**FS-07.03 Notifications (discharges Doc 9 reassignment)**
- Trigger catalog (consolidated): @mentions, invite events, sequence stopped (reply/opt-out/token-revoked/quality-pause), task due/overdue, stage changes on owned creators, enrichment-complete (A2 ladder step 4/5), credit low-balance (80%/95%), billing state changes (past-due, renewal), WhatsApp session-window opening (S2).
- Channels: in-app (always) + email digest (per-user preference: instant/daily/off per category). Quiet hours follow workspace timezone. Delivery infra = managed service (ADR-002).

**Part C — EPIC-08 Feature Specs (Billing & Credits — Paddle)**

**FS-08.01 Catalog Mapping**
- MUSHIN maintains a **versioned Entitlement Catalog**: internal plan IDs (Starter/Growth/Agency + credit-pack SKUs) ↔ Paddle product/price IDs, plus per-plan limit sets (seats, workspaces, monthly credit allowance, sequence slots, feature gates). Paddle IDs appear **only** in this mapping layer (R-FIN-004 abstraction — Paddle is swappable in principle). Catalog changes create a new version; existing subscriptions keep their version until plan change (no silent re-terming).

**FS-08.02 Webhook-Driven Entitlement State Machine (canonical)**

*Subscription states:* `trialing → active → past_due → paused(grace) → canceled(pending_expiry) → expired`, plus `active ↔ active` (plan changes).

*Event handling contract (behavioral; transport in Doc 17):*

| Paddle event | MUSHIN behavior |
|---|---|
| `subscription_created` (incl. trial conversion) | Bind subscription to workspace (via checkout passthrough metadata: workspace ID); resolve plan via Catalog; provision entitlements; **grant monthly credit allowance** (ledger `allowance_grant`, period-stamped); state → `active` (or `trialing` if trial-configured). Idempotent on event ID. |
| `subscription_updated` — upgrade | Apply new plan limits **immediately** (Paddle handles proration money-side); grant allowance **delta** for current period (upgrade should feel instant); ledger entry `allowance_grant(delta)`. |
| `subscription_updated` — downgrade | Schedule limit reduction at **period end** (recorded as pending change); at effect: over-capacity handling per FS-08.05. No allowance clawback mid-period. |
| `subscription_updated` — payment method/billing meta | Entitlement no-op; sync record. |
| `transaction_completed` — subscription renewal | New billing period: expire unused **allowance** credits (ledger `expiry`), grant new allowance (`allowance_grant`). Top-up credits **never** expire this way (Doc 3 policy). |
| `transaction_completed` — credit-pack purchase | Ledger `topup_purchase` for pack size; available immediately. Fulfillment races (webhook before/after user returns from checkout) handled via pending-purchase record keyed on transaction metadata. |
| `subscription_payment_failed` / past-due signals | State → `past_due`: full functionality retained for **7-day grace** (Paddle dunning runs); persistent banner + Owner notifications (FS-07.03). |
| Dunning exhausted / `subscription_canceled` | State → `paused(grace)`: **read-only mode** — all data visible/exportable, no metered actions, no sends, sequences paused. 30 days → `expired`. |
| User-initiated cancel (effective period end) | `canceled(pending_expiry)` until period end with full function, then read-only grace path. |
| Refund/chargeback events | Entitlement revocation per refunded object (pack refund → ledger `refund_adjustment`, balance may **not** go below zero: clamp + flag for support review); subscription refund → immediate `paused(grace)`; chargeback → same + fraud flag to Admin. |

*Webhook robustness requirements (binding on Doc 17/20):* signature verification mandatory; **idempotency** on Paddle event ID (duplicate delivery = no-op); **out-of-order tolerance**: handlers compare event `occurred_at` against last-applied and, on conflict or gap suspicion, resolve by **fetching current subscription state from Paddle API** (fetch-to-heal beats event-order archaeology); all raw events stored append-only (replay capability); **daily reconciliation job** diffs every workspace's local state vs. Paddle API truth, auto-heals divergence, and alerts Admin on any heal (drift should be rare; frequent drift = defect). Checkout-success-but-no-webhook-yet: workspace shows "activating…" optimistic pending state with short-interval Paddle polling fallback (max 15 min before support escalation surfaced).

**FS-08.03 Credit Ledger (ADR-012 — Accepted: append-only ledger, derived balances)**
- Entry types: `allowance_grant`, `topup_purchase`, `consumption` (references the metered action + Doc 8/9 A5/A4 catalog row + provider-cost snapshot for margin analytics), `expiry`, `refund_adjustment`, `promo_grant` (admin-issued, reason-required), `reversal` (failed-action refund, references original entry).
- Balance = sum over entries (materialized for performance, but ledger is truth; nightly integrity check: materialized vs. derived — mismatch is a P1 incident).
- **Consumption ordering:** burn expiring allowance credits before non-expiring top-ups (customer-favorable, testable).
- **Concurrency contract:** metered actions follow reserve → execute → commit (or release on failure) semantics so parallel actions cannot overdraw; a failed provider call **must** release its reservation and, if partially charged upstream, emit `reversal` + telemetry (no silent credit loss — R-FIN-005 kin; testable in Doc 26).
- Negative balance is unrepresentable except refund-clamp flag path (FS-08.02).

**FS-08.04 Trial**
- 14-day, card-free (Doc 6 experiment), one trial per user-identity heuristic set (abuse limits: verified email + device/IP heuristics via managed fraud tooling, ADR-002); hard trial credit cap (`promo_grant(trial)`, non-renewing); trial state exposes full Growth-tier features **except**: exports capped, WhatsApp S2 channel excluded, seat cap 3. Expiry → read-only grace (14 days) → data retained per retention policy (Doc 21 dependency). Conversion at any point via Paddle checkout (FS-08.02 `subscription_created` path).

**FS-08.05 Enforcement & Downgrade Over-Capacity**
- Enforcement points enumerated per limit in the Catalog (Qwen review artifact). Over-capacity after downgrade: **data is never deleted** — excess lists/campaigns/seats become read-only (most-recently-active stay active; deterministic selection rule, user-adjustable within new limits). Seat over-capacity: Owner chooses active members; others auto-suspended (memberships intact).

**Part D — EPIC-09 Feature Specs (Analytics, S1 scope)**

**FS-09.01 Metric Definitions Catalog (binding)**
All metrics derive **exclusively from the Interaction Timeline and ledger** (single-source rule; no side-channel counters — prevents dashboard/reality divergence). V1 definitions: outreach response rate = replied-threads ÷ first-sends per campaign/channel; time-to-first-reply; pipeline conversion per stage-pair; budget utilization = committed ÷ planned (FX-normalized per FS-05.01); credit consumption by action family; campaign outcome rollups (manual entries v1 per FS-05.05). Each metric ships with definition text visible in-UI ("what counts as a reply?") — trust through transparency, consistent with A4/NFR-E01 culture.

**FS-09.02 Surfaces**
- Campaign dashboard (Doc 9 FS-05.05 rollups + response metrics); workspace overview (active campaigns, credit burn trend, team activity digest — Admin/Owner only). Client-ready exportable reports = S2 (with "client portal lite" question pending from Doc 9 gaps).

**Part E — EPIC-10 Feature Specs (Administration — internal)**

**FS-10.01 Admin Panel Foundation**
- Staff plane per A1/ADR-011: staff roles v1 — `support`, `ops`, `admin` (role-gated capabilities below). Every admin action writes to an **immutable admin audit log** (actor, action, target, reason, timestamp) — logging is synchronous and blocking: if the audit write fails, the action fails (audit-first invariant, testable).
- Lookup: user/workspace search; subscription + entitlement state view (including last webhook events, reconciliation status — first-line support for billing tickets); ledger view per workspace; feature-flag state.

**FS-10.02 Audited Impersonation**
- Purpose-bound for design-partner support. Mechanics: staff selects workspace + **mandatory reason** (ticket reference) → session is **time-boxed 30 min** (re-entry requires new reason) → **read-only by default**; write mode requires explicit elevation with second reason and is `admin`-role-only. **Hard-blocked even in write mode:** billing/checkout actions, credit `promo_grant` above cap, data exports, member removal, outreach sends (support must never send messages as the customer — non-negotiable trust line).
- Visibility: impersonation banner in-session; workspace Owner receives notification of session (suppressible per-workspace only by signed support agreement flag — S1 design partners consent contractually); all in-session actions dual-attributed (staff identity + impersonation context) in workspace timeline and admin audit log. Every session reviewable end-to-end (R-SEC-001 discharge).

**FS-10.03 Cost Telemetry & Margin Dashboard (operationalizes NFR-C01/C02 + Doc 3 guardrail)**
- **Ingest:** every external call emits a structured cost event with provider, operation, unit cost (list-price snapshot), workspace, action reference, and model/stage attribution per ADR-022 obligation 4. Specifically for the Brain 2 pipeline (Serper → Apify → LLM M6), cost events are decomposed by stage:
  - `cost.serper.candidate_query`: per-job candidate discovery query cost.
  - `cost.apify.actor_run`: platform + actor ID + candidate count (e.g., `apify/instagram-profile-scraper`).
  - `cost.llm.inference`: model × tier × prompt_registry_id × token count (e.g., Groq 8B for T-A vs Groq 70B for T-B).
  - `cost.youtube_api.quota_units`: quota unit consumption (zero monetary cost within 10k daily quota; alert on exhaustion).
  - **Per-job Brain 2 cost rollup:** sum of all stage costs for one Live Discovery job = the unit economics basis for live-search credit pricing (OD-001).
- **Views:** live burn by provider and pipeline stage (hourly granularity); unit-economics per metered action: rolling average COGS vs. credit price with **guardrail status (≥3× green / 2–3× amber / <2× red)** — red actions trigger CPO repricing review workflow; trial-cohort COGS (R-FIN-002 watch); per-workspace burn outliers (abuse detection); PK-resolution funnel (Doc 8 A2 Data-Gap Ladder tier distribution telemetry — tracking how often we serve Rich/Standard vs Sparse/Minimal states, and monitoring A1 pipeline quality health post-launch).
- **Controls:** provider **budget circuit breakers** — daily spend caps per provider; on trip: metered actions degrade per Doc 8 A2/AI-fallback ladders (honest unavailability messaging), Admin paged; caps sized so a runaway loop cannot exceed one day's planned burn (**this is the company-survival control** for a bootstrapped USD-cost structure).
- **Alerting:** ≥2× hourly baseline burn → alert within 1h (NFR-C02); provider error-rate and latency SLO monitors (feeds Doc 23).

**FS-10.04 Feature Flags & Provider Health**
- Flags: global / tier / workspace targeting; kill-switches required for: each AI feature, WhatsApp channel, live-provider search, enrichment (mapping 1:1 to fallback ladders — every flag-off state must land on a spec'd degraded behavior, never a broken screen). Provider health board: status, latency, error rate,今日 spend per provider. Moderation/abuse actions (suspend workspace, block sends) = `admin`-role, audit-first, reason-required.

#### Dependency Mapping

- **Depends on:** Docs 3 (guardrail, credit policy), 7 (FR contract, NFRs), 8 (A5 matrix, fallback ladders), 9 (A4 additions, timeline, notifications reassignment), ADR-PAYMENT-001/002/007/008.
- **Enables:** Doc 11 (billing/denial/read-only UX states), Doc 14/16 (event architecture: webhooks, ledger, telemetry streams), Doc 17 (Paddle + BSP integration detail), Doc 18–19 (ledger/audit persistence design), Doc 21 (impersonation controls, staff plane, retention), Doc 23 (dashboards/alerts land here), Doc 26 (largest testable-assertion inventory so far).
- **Blocks:** Public pricing page (Doc 6 S2) blocks on Catalog v1 price points; Mimo billing implementation blocks on Doc 17 Paddle event-transport detail.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-031 | Paddle webhook payloads + API reads suffice for full state machine (incl. metadata passthrough for workspace binding) | Medium-High | Doc 17 integration spike against Paddle sandbox | State machine rework; heavier polling reliance |
| A-032 | Paddle serves PK-incorporated entity for global USD collection (KYC/onboarding) | Medium-High | **Immediate verification — existential for ADR-PAYMENT-001 under ADR-007** | MoR re-selection (Lemon Squeezy/2Checkout-class review) — high blast radius |
| A-033 | 7-day past-due + 30-day read-only grace matches Paddle dunning defaults acceptably | Medium | Doc 17 config review | Grace-window retuning |
| A-034 | Stage cost events (Serper, Apify, Groq, Anthropic) available synchronously or near-real-time | Medium | Adapter API review (Doc 17) | Estimated-cost mode with daily true-up in FS-10.03 |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-FIN-007 | Financial | Webhook/entitlement drift grants unpaid access or blocks paying customers | M | H | Idempotency + fetch-to-heal + daily reconciliation + drift alerts (FS-08.02) |
| R-FIN-008 | Financial | Runaway pipeline or API spend (bug/abuse in Serper/Apify/LLM) outpaces detection | M | Critical | Circuit breakers + hourly anomaly alerts per stage (FS-10.03); reserve-commit ledger prevents credit-side bleed |
| R-SEC-004 | Security | Impersonation misuse or admin-plane compromise | L | Critical | ADR-011 separate plane + MFA; audit-first invariant; read-only default; hard-blocked actions (FS-10.02) |
| R-TEC-005 | Technical | Ledger/materialized-balance divergence under concurrency | M | H | Reserve-commit contract; nightly integrity check = P1 on mismatch (FS-08.03) |
| R-OPS-004 | Operational | Read-only/downgrade states confuse users → support load | M | M | Deterministic over-capacity rules + explicit UX states (Doc 11); denial reasons machine-readable (A2) |
| R-LEG-005 | Legal | Impersonation + notification suppression conflicts with privacy expectations | L | M | Contractual consent for S1 partners; Doc 21/28 review before S2 default policy |

#### Alternatives Considered & Trade-offs

- **Mutable credit-balance counter** — rejected: unauditable, race-prone; ledger (ADR-012) trades write complexity for auditability and margin analytics for free (consumption entries carry COGS snapshots).
- **Trusting webhook order / event-sourced-only state** — rejected alone: Paddle delivery is at-least-once, order-unguaranteed; chosen hybrid (events + fetch-to-heal + reconciliation) is the resilient pattern.
- **Immediate downgrade on plan change** — rejected: hostile mid-period; period-end effect chosen (industry norm, support-load minimizing).
- **Staff-flag on customer accounts** — rejected (ADR-011): escalation-path risk.
- **Building a metrics warehouse now** — rejected: timeline + ledger derivation suffices for S1/S2 scale; warehouse decision deferred to Doc 16/19 with volume data.
- **Search/Discovery thread:** not applicable to this document beyond FS-10.03's PK-coverage telemetry feeding ADR-SEARCH-001 evidence — noted per protocol.

#### Gap Analysis Report

- **A-032 (Paddle × Pakistan entity onboarding) is the single highest-priority verification in the project right now** — if it fails, ADR-PAYMENT-001 and parts of Docs 3/6/10 re-open. Owner: CEO; immediate.
- Concrete credit price points and allowance sizes still unset (recurring gap from Doc 3) — now **blocking Catalog v1**; requires provider cost sheets (Doc 17) + PPP positioning decision (ADR-007 implication 3, unresolved).
- Retention policy for expired workspaces undefined → Doc 21 (stub: ≥90 days retention before deletion, notice at 60).
- Refund policy text (customer-facing) undefined → Doc 28 with Paddle policy alignment.
- Admin panel UX intentionally unspecified (internal tool, lighter design bar) — Doc 13 to confirm a minimal internal design standard.

#### Cross-References & Decision Traceability

**ADR-011 (separate staff identity plane) — Accepted. ADR-012 (append-only credit ledger, derived balances) — Accepted.** Implements FR-07.01–03, FR-08.01–05, FR-09.01–02 (S1 scope), FR-10.01–03. Discharges: Doc 3 dunning-policy stub, Doc 7 notification-consolidation gap (via Doc 9 handoff), R-SEC-001 (impersonation controls), R-FIN-004 (catalog abstraction). Operationalizes NFR-C01/C02, NFR-S01 enforcement points, Doc 3 guardrail as live control. Consumes ADR-007 (PKT defaults, PKR currency, A-032 verification), ADR-008 (global index vs. workspace scoping in A1).

#### Open Questions & External Dependencies

1. **Paddle onboarding for PK entity (A-032) — verify now.**
2. PPP pricing posture: USD-only global pricing vs. PK-localized tier (Doc 3 amendment after S1 partner signals)?
3. Apify actor and LLM model cost sheets for Catalog v1 calibration (Doc 17).
4. Owner-notification suppression default for impersonation post-S1 (legal input).
5. Does Paddle sandbox support all needed event simulations for Doc 26 test design? (Doc 17 spike.)

#### Future Revision Triggers

A-032 verification result; first reconciliation-drift incident (tighten FS-08.02); guardrail dashboard showing any action red >14 days (repricing protocol); trial-abuse telemetry exceeding threshold (harden FS-08.04); S3 enterprise requirements activating RBAC/SSO expansion of Part B/E.

#### Review Checklist & Validation Criteria

- [ ] Every Paddle event has a defined, idempotent handler behavior. ✅
- [ ] No mutable balance; all credit movements ledger-entried. ✅
- [ ] Impersonation cannot occur without prior audit artifact. ✅
- [ ] Every kill-switch lands on a spec'd degraded state. ✅
- [ ] All metrics derive from timeline/ledger only. ✅
- [ ] Zero code; zero tax logic. ✅
- [ ] Sign-off: CPO, CEO (A-032), Principal Architects (Software, Data, Security, Cloud), Engineering Director; Qwen review against Doc 7 contract + CC log.

---

Phase 3 is complete: Docs 7–10 form the full requirements contract (Epic catalogue → atomic specs) for Mimo. Per the Workflow Protocol, the **10-document Periodic Audit** is now due — including the deferred ADR-007 Pakistan-pivot reconciliation of Docs 2/4/5/6, the CC log (CC-001/002), and cross-document contradiction checks — and should run before Phase 4 (UX & Information Architecture) begins.

[PHASE 3 COMPLETE - AWAITING APPROVAL FOR PHASE 4]
