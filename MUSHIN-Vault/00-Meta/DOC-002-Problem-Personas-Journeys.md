#### DOC-002 — Problem Statement, Target Audience, User Personas & Customer Journeys
**Status:** Draft v1.1 — Geography Revalidation Review (ADR-007) | **Phase:** 1 | **Owner:** CPO

---

#### Executive Summary

Influencer marketing is a ~$24B+ industry operating on fragmented, low-trust tooling. Buyers face three compounding problems: **discovery noise** (millions of creators, no reliable fit signal), **trust deficit** (fake followers and engagement fraud silently consume budget), and **workflow fragmentation** (discovery, vetting, outreach, negotiation, tracking, and reporting live in 4–6 disconnected tools plus spreadsheets). This document defines the canonical problem statement, five primary personas, and their end-to-end journeys, mapped to MUSHIN's ten pillars. It establishes the "who" and "why" that Docs 3–10 monetize and specify.

#### Purpose & Scope

Define the problems MUSHIN solves, for whom, with journey-level detail sufficient for PRD derivation (Doc 7) and GTM targeting (Doc 6). Includes persona-to-pillar mapping.

#### Non-Goals

- Market sizing (Doc 4), competitor analysis (Doc 5), pricing (Doc 3).
- Feature specifications (Docs 7–10); journeys reference capabilities, not requirements.
- Creator-facing (supply-side) personas — see Open Questions; deferred by decision below.

#### Objectives & Success Criteria

- Every persona maps to ≥3 pillars and ≥1 monetizable pain.
- Each journey exposes ≥1 "seam" where incumbent tooling breaks (MUSHIN's wedge).
- Doc 7 can trace every Epic to a persona-journey stage.

#### Detailed Content

**1. Canonical Problem Statement**

> Marketing teams waste budget and time because creator discovery is noisy, creator trustworthiness is opaque, and the creator lifecycle is fragmented across disconnected tools — resulting in poor creator selection, fraud-driven waste, slow campaign execution, and no compounding relationship memory.

Decomposed into four validated pain domains:

| # | Pain Domain | Evidence Basis (validate in Doc 4) | Cost to Buyer |
|---|---|---|---|
| P1 | Discovery noise | Filter-based databases return volume, not fit | Hours per shortlist; poor campaign fit |
| P2 | Trust deficit | Industry-reported fake-engagement waste is a persistent, measurable %+ of spend | Direct budget loss; brand risk |
| P3 | Workflow fragmentation | 4–6 tools + spreadsheets per campaign (A-002) | Context loss, slow cycles, no audit trail |
| P4 | No relationship memory | Past collaborations, rates, performance live in inboxes | Repeated re-negotiation; churned creator knowledge when staff leave |

**2. Target Audience Segments** (priority-ordered)

1. **Influencer/marketing agencies** (5–50 seats) — highest workflow intensity, multi-client workspaces.
2. **E-commerce/DTC brands** (1–10 seats) — ROI-obsessed, credit-friendly usage patterns.
3. **Mid-market consumer brands** (in-house teams) — trust and reporting-driven.
4. **Startup growth teams / performance marketers** — speed and cost-efficiency-driven.
5. **Creator managers** — inverse use case; monitor and position rosters. (Secondary; served, not targeted, at launch — **ADR-003: Demand-side first — Accepted.**)

**3. Personas**

**PA-01 "Agency Alex" — Account Director, influencer agency (12 seats)**
- *Goals:* Run 10+ concurrent client campaigns; defend creator choices to clients with data.
- *Pains:* P1, P3, P4 acute. Client reporting eats 20% of team time. Spreadsheet CRM.
- *Pillars:* 2, 4, 5, 7, 9. *Buying trigger:* client asks "why this creator?" and Alex has no defensible answer.
- *Success metric:* time-to-shortlist ↓, client retention ↑.

**PB-02 "Brand Bianca" — Influencer Marketing Manager, DTC brand ($20M rev)**
- *Goals:* Hit CAC/ROAS targets with creator channel; scale from 10 to 100 creator partnerships.
- *Pains:* P2 acute (burned by fraud), P4 (rate history in Gmail).
- *Pillars:* 1, 3, 5, 6, 9. *Buying trigger:* a campaign underperforms and post-mortem reveals inflated audience.

**PC-03 "Growth Gabe" — Startup Growth Lead**
- *Goals:* Test creator channel fast with tiny budget; prove signal before scaling.
- *Pains:* P1, P3. Cannot afford enterprise tools (CreatorIQ-class pricing) or wasted sends.
- *Pillars:* 2, 3, 6, 8 (credits fit bursty usage). *Buying trigger:* founder mandates "try influencers this quarter."

**PD-04 "Enterprise Elena" — Head of Influencer, consumer brand (global)**
- *Goals:* Governance, brand safety, consolidated reporting across regions/teams.
- *Pains:* P2 (brand risk), P3 (no audit trail), compliance exposure.
- *Pillars:* 1, 5, 7, 9, 10 (RBAC, audit). *Buying trigger:* procurement/security review kills current vendor, or a brand-safety incident.

**PE-05 "Manager Mia" — Talent/Creator Manager (roster of 25)**
- *Goals:* Surface roster to brands; track inbound; manage deals.
- *Pains:* P3, P4. *Pillars:* 4, 5, 6. Served via same tooling; no bespoke features at launch (ADR-003).

**4. Customer Journeys** (stage → activity → incumbent seam → MUSHIN answer)

**Journey J1 — Campaign Lifecycle (Bianca/Alex, primary journey)**
1. *Brief & criteria* → spreadsheet templates → criteria never machine-readable → structured campaign brief (Pillar 5).
2. *Discovery* → database filters + manual Instagram browsing → volume without fit; hours lost → intelligent ranked search, NL + semantic (Pillar 2).
3. *Vetting* → separate audit tool (e.g., HypeAuditor check), copy-paste → **seam: data re-entry, opaque scores** → in-profile explainable authenticity (Pillars 1, 3).
4. *Shortlist & approval* → export to Sheets, email client → **seam: version chaos** → shared Lists with comments/permissions (Pillars 4, 7).
5. *Outreach & negotiation* → Gmail + templates tool → **seam: no thread↔creator linkage** → integrated outreach, tracked sequences (Pillar 6).
6. *Contract & execution* → Docs/DocuSign + Asana → status opacity → pipeline stages, tasks, milestones (Pillar 5).
7. *Tracking & reporting* → manual screenshot reports → **seam: ROI unattributable** → campaign analytics & ROI (Pillar 9).
8. *Retention* → knowledge evaporates → relationship memory: rates, history, notes (Pillars 1, 4).

**Journey J2 — Trial-to-Value (Gabe, PLG-critical)**
Sign-up → first NL search → "aha" ranked results → vet one creator (credit consumption) → save List → invite teammate → hit credit/tier gate → convert. Target: first "aha" < 5 minutes (feeds Doc 3 activation metric).

**Journey J3 — Enterprise Procurement (Elena)**
Security questionnaire → SSO/RBAC/audit review → pilot workspace → legal (DPA, data provenance) → rollout. Exposes hard dependencies on Docs 21, 28.

#### Dependency Mapping

- **Depends on:** Doc 1 (pillars, ADR-001).
- **Enables:** Doc 3 (pricing per persona), Doc 6 (GTM beachhead), Doc 7 (epics per journey stage), Doc 11 (flows from J1–J3).
- **Blocks:** Doc 6 beachhead selection until persona priority approved.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-005 | Agencies + DTC are the fastest-converting segments | Medium-High | Doc 4/5 research; design-partner interviews | GTM re-targeting (Doc 6) |
| A-006 | "Aha < 5 min" is achievable with live search + enrichment latency | Medium | Doc 15 provider latency analysis | J2 redesign; PLG motion weakens |
| A-007 | Demand-side-only focus doesn't cap growth in years 1–2 | Medium | Market feedback log | Creator-side roadmap pull-forward (Doc 27) |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-PRD-002 | Product | Personas too broad → unfocused MVP | M | H | Doc 7 scopes MVP to PA-01 + PB-02 journeys only |
| R-UX-002 | UX | J3 enterprise needs (SSO/audit) leak into MVP, slowing launch | M | M | Tier-gated architecture readiness, deferred delivery (Doc 27) |
| R-FIN-002 | Financial | J2 free-trial enrichment costs (paid APIs per profile) unbounded | H | H | Hard credit caps on trial; cached enrichment (Docs 3, 16) |

#### Alternatives Considered & Trade-offs

- **Two-sided marketplace from day one** — rejected: cold-start on both sides; ADR-003 keeps demand-side focus.
- **Enterprise-first (Elena as beachhead)** — rejected for launch: long sales cycles conflict with iteration speed; revisit at Doc 6.
- **Single-persona hyperfocus (only Gabe/PLG)** — rejected: low ACV ceiling contradicts "premium" positioning (Doc 1).

#### Gap Analysis Report

- Journeys assume Gmail/Outlook coverage suffices — Slack/WhatsApp negotiation channels unaddressed (log to Feature Intelligence Log).
- No persona for finance/procurement approver despite influencing purchase — add as buying-committee note in Doc 6.
- P2 quantification needs a defensible citation set — Doc 4 must source fraud-cost data.
- **[ADR-007 geography revalidation — full-read review complete, no explicit NA/UK claims found]** This document was reviewed in full as part of the Doc 6 geography-revalidation cycle required by ADR-007. No explicit NA/UK geography claims are present. Persona definitions, pain domains, and journey stages are described in role/company-type/pain terms that apply regardless of geography.
- **[Implicit assumption to validate in Pakistan context]** Journey J1 step 3 references HypeAuditor as the named incumbent audit tool at the vetting seam. HypeAuditor is a global/Western-market product. Pakistani agencies may not use HypeAuditor — they may use no dedicated audit tool at all, or use informal alternatives. This does not change the *journey structure* (the vetting seam exists regardless of which tool is used), but the objection playbook and competitive framing in Doc 6 should confirm what incumbent tooling Pakistani design partners actually use. Low priority relative to the Doc 4/5/6 gaps, but flag for first-ten design-partner interviews.

#### Cross-References & Decision Traceability

ADR-001 (Doc 1) → P1–P4 framing. **ADR-003 (demand-side first) — Accepted here.** Personas PA-01…PE-05 become canonical IDs for all future docs.

#### Open Questions & External Dependencies

1. Do agencies require white-label client portals at MVP? (Doc 7)
2. Which regions at launch? — **Resolved by ADR-007: Pakistan-first (Doc 7). Data-provider implications forwarded to Doc 17; tax handled by Paddle MoR (Doc 3).**
3. Creator-side product: year 2 or year 3? (Doc 27)

#### Future Revision Triggers

Design-partner interviews contradict persona priority; PLG activation data invalidates J2; enterprise inbound exceeds 25% of pipeline.

#### Review Checklist & Validation Criteria

- [ ] Every journey stage names an incumbent seam. ✅
- [ ] Persona → pillar mapping complete. ✅
- [ ] Zero feature commitments made. ✅
- [ ] Sign-off: CPO, Lead Market Strategist.

