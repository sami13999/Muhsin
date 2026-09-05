

#### DOC-003 — Business Model, Pricing Strategy & Success Metrics (KPIs/OKRs)
**Status:** Draft v1.0 | **Phase:** 1 | **Owner:** CEO / CFO-function

---

#### Executive Summary

MUSHIN monetizes via a **hybrid model: seat-based subscription tiers + usage-based credits**, sold through **Paddle as Merchant of Record** (ADR-PAYMENT-001). Subscriptions monetize workflow gravity (Pillars 4–7); credits monetize variable-cost intelligence actions (enrichment, AI analysis, exports, live search) whose COGS are dominated by third-party AI and data-provider APIs. This structure protects gross margin against the two largest cost drivers while keeping entry pricing accessible for PC-03 and expansion pricing scalable for PA-01/PD-04. Target blended gross margin: **≥70% by month 18** after Paddle fees and API COGS.

#### Purpose & Scope

Define revenue architecture, tier structure, credit economics, Paddle-constrained billing design principles, unit economics guardrails, and the KPI/OKR framework. Numeric price points are directional and flagged for validation.

#### Non-Goals

- Billing system feature specs (Doc 10) or webhook-level integration design (Doc 17).
- Financial projections/fundraising models.
- Tax logic design — **explicitly excluded**: Paddle MoR owns global tax, VAT, invoicing, checkout compliance (ADR-PAYMENT-001).

#### Objectives & Success Criteria

- Every monetizable action maps to either a tier entitlement or a credit cost.
- Unit economics formula defined such that any new AI feature (four-gate test, Doc 1) can compute margin impact pre-launch.
- OKRs cover acquisition, activation, retention, revenue, and margin.

#### Detailed Content

**1. Revenue Architecture (ADR-004 — Accepted: Hybrid Subscription + Credits)**

- **Subscription (predictable revenue):** gates seats, workspaces, CRM/campaign capacity, integrations, RBAC/SSO, support level.
- **Credits (variable revenue, margin-protected):** meters actions with real marginal cost — profile enrichment, authenticity analysis, AI summaries/recommendations, live search queries, contact reveals, exports.
- **Rationale:** Pure seats under-monetize heavy data users (agencies); pure usage deters adoption (unpredictable bills). Hybrid is the category-validated norm (validate against competitors in Doc 5).

**2. Tier Structure (directional, validate via Doc 5 price benchmarking)**

| Tier | Persona Anchor | Monthly (directional) | Includes |
|---|---|---|---|
| **Starter** | PC-03 Gabe | ~$99–149 | 1–2 seats, 1 workspace, base monthly credits, core search + lists |
| **Growth** | PB-02 Bianca | ~$299–499 | 5 seats, campaigns + outreach, larger credit pool, integrations |
| **Agency/Pro** | PA-01 Alex | ~$799–1,200 | 10–15 seats, multi-client workspaces, reporting, priority support |
| **Enterprise** | PD-04 Elena | Custom (annual, sales-assisted) | SSO, RBAC depth, audit, DPA, SLAs, dedicated credits |
| **Credit top-ups** | All | Metered packs | Volume-discounted; never expire within subscription term (validate legally, Doc 28) |

Free trial: 7–14 days, **hard credit cap** (mitigates R-FIN-002), card-optional decision deferred to Doc 6 experiments.

**3. Cost Structure & Unit Economics Guardrails**

COGS stack per revenue dollar:
1. **Paddle MoR fee:** ~5% + fixed fee per transaction (design constant PADDLE_TAKE; treat as 5–7% blended for small transactions — favors annual billing and larger packs).
2. **Data provider APIs** (licensed, per ADR-002): per-profile enrichment, per-query live search — the dominant variable cost.
3. **Frontier LLM APIs:** per-token; bounded via caching, tiered model routing (cheap model default, frontier on demand — architectural requirement handed to Doc 15).
4. **Managed infra/search/vector APIs:** semi-fixed, scales with index size.

**Guardrail (binding on all future feature specs):** every credit-priced action must satisfy `credit_price ≥ 3× marginal_COGS` at list price, and `blended gross margin ≥ 70%` post-Paddle. Mimo-facing implication: per-action cost telemetry is a **first-class requirement** (Docs 10, 23), not an afterthought.

**Paddle-driven design constraints (canonical, for Docs 10 & 17):**
- Entitlement state derives from **Paddle webhooks** (subscription created/updated/canceled, transaction completed) — MUSHIN never computes tax, never stores card data, never generates invoices.
- Checkout = Paddle-hosted/overlay; MUSHIN owns only plan/credit catalog mapping and entitlement enforcement.
- Refunds/chargebacks/dunning flow through Paddle; MUSHIN reacts via webhook-driven entitlement revocation.

**4. Pricing Psychology & Expansion Levers**

- Anchor on **Agency tier** (premium positioning per Doc 1); Starter exists for land-and-expand, not profit.
- Expansion vectors: seats (Pillar 7), credits (Pillars 1–3), workspaces (agencies), annual prepay (margin + cash flow, reduces Paddle fixed-fee drag).
- Net Revenue Retention is the model's core health signal: target **NRR ≥ 110%** by month 18.

**5. KPIs & OKR Framework**

| Layer | Metric | Target (mo. 12 directional) |
|---|---|---|
| Acquisition | Trial signups/mo; CAC payback | Payback < 12 mo |
| Activation | % trials reaching "aha" (first ranked search + 1 enrichment + 1 list) < 5 min (J2) | ≥ 40% |
| Retention | Logo churn (monthly, SMB) | < 3% |
| Revenue | MRR; NRR; credit-revenue share | NRR ≥ 105% yr1; credits 20–35% of revenue |
| Margin | Blended gross margin post-Paddle & API COGS | ≥ 65% yr1 → ≥ 70% mo18 |
| Trust | % enrichments flagged fraudulent that users act on | Baseline then ↑ (proves Pillar 1/3 value) |

Sample OKR (illustrative): **O:** Prove hybrid monetization. **KR1:** 100 paying workspaces. **KR2:** Credit revenue ≥ 20% of MRR. **KR3:** Gross margin ≥ 65%.

#### Dependency Mapping

- **Depends on:** Docs 1–2 (personas, pillars), ADR-PAYMENT-001, ADR-002.
- **Enables:** Doc 6 (GTM motion), Doc 10 (billing spec), Doc 17 (Paddle webhook integration), Doc 15 (cost-constrained architecture).
- **Blocks:** Doc 10 cannot start without tier/credit catalog approval.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-008 | Paddle blended take ≈5–7% acceptable vs. Stripe+tax-stack TCO | High | TCO comparison memo | Revisit ADR-PAYMENT-001 |
| A-009 | Buyers accept credit-metering for AI/data actions | Medium-High | Doc 5 competitor norms; design partners | Shift to higher flat tiers |
| A-010 | 3× COGS multiple sustains competitive pricing | Medium | Doc 5 price benchmarking | Margin target rework |
| A-011 | Paddle supports required credit-pack + hybrid catalog mechanics | Medium-High | Paddle capability review (Doc 17 spike) | Custom credit ledger complexity ↑ |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-FIN-003 | Financial | Data-provider price hikes crush credit margins | M | H | Multi-provider abstraction (Doc 17); repricing rights in ToS (Doc 28) |
| R-FIN-004 | Financial | Paddle MoR lock-in; migration cost if terms change | L | M | Entitlement layer abstracted from Paddle IDs (Doc 10 requirement) |
| R-PRD-003 | Product | Credit anxiety suppresses feature usage | M | M | Transparent per-action costs, generous tier-included credits, usage previews |
| R-LEG-002 | Legal | Credit expiry/refund rules vary by jurisdiction | M | M | Paddle policy alignment + legal review (Doc 28) |

#### Alternatives Considered & Trade-offs

- **Stripe + Stripe Tax + custom invoicing** — rejected: rebuilds MoR liability (tax registration burden) violating ADR-002; Paddle's higher take is the fee for compliance outsourcing.
- **Pure seat pricing** — rejected: heavy enrichment users destroy margin (R-FIN-002).
- **Pure usage pricing** — rejected: bill unpredictability blocks Bianca/Alex budget approval.
- **Freemium** — deferred to Doc 6 experiment; conflicts with premium positioning and trial-COGS risk.

#### Gap Analysis Report

- Credit catalog lacks concrete per-action pricing — requires provider cost sheets (external dependency).
- Annual-contract enterprise invoicing via Paddle needs capability confirmation (A-011).
- No defined policy for failed-payment grace periods → Doc 10 requirement stub created.

#### Cross-References & Decision Traceability

**ADR-004 (Hybrid model) — Accepted.** ADR-PAYMENT-001 consumed. Guardrail formula binds Docs 7–10, 15. Philosophy #3 (measurable business problem) satisfied via metric table.

#### Open Questions & External Dependencies

1. Paddle catalog mechanics for credit packs & proration (Doc 17 spike).
2. Provider pricing sheets (Modash-API-class, LLM vendors) for credit calibration.
3. Card-required vs. card-free trial (Doc 6 experiment).

#### Future Revision Triggers

Paddle fee/term changes; provider repricing >15%; NRR < 100% for 2 consecutive quarters; credit revenue share < 10% (signals metering failure).

#### Review Checklist & Validation Criteria

- [ ] No custom tax logic anywhere. ✅
- [ ] Every pillar has a monetization pathway. ✅
- [ ] Margin guardrail formula stated and binding. ✅
- [ ] Sign-off: CEO, CPO, Principal Architect (Data/Cloud for cost telemetry feasibility).

