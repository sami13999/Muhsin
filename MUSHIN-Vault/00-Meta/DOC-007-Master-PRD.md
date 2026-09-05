#### DOC-007 — Master PRD: Functional & Non-Functional Requirements
**Status:** Draft v1.0 | **Phase:** 3 — Product Requirements | **Owner:** CPO

---

#### Executive Summary

This Master PRD converts the vision (Doc 1), personas/journeys (Doc 2), business model (Doc 3), and competitive wedges (Doc 5) into a governed requirements catalogue. It defines the **requirement ID scheme**, the **10 Epics** (one per pillar), **MoSCoW-prioritized functional requirements** at the capability level, the **MVP boundary** (now governed by **ADR-007: Pakistan-first beachhead — Accepted**, superseding Doc 6's NA/UK launch assumption), and the **non-functional requirements (NFRs)** that bind all architecture documents (Docs 14–24). Deep feature specs are delegated to Docs 8–10; this document is their contract. Everything here is written to be directly implementable by Mimo and reviewable by Qwen: every requirement has an ID, a priority, a persona/journey trace, and an acceptance basis. The Pakistan-first decision also elevates Paddle from convenience to launch enabler: cross-border acquiring, USD invoicing for export-focused agencies, and bypassing local gateway limitations are now first-order GTM constraints rather than billing implementation details.

#### Purpose & Scope

- Establish the canonical requirement taxonomy and ID scheme used by all downstream docs, tickets, and reviews.
- Define Epic-level functional requirements for all 10 pillars with MoSCoW priority and MVP flag.
- Define binding NFRs (performance, scale, security, cost, explainability, accessibility).
- Formalize the first tranche of the **Canonical Glossary**.

#### Non-Goals

- Field-level feature specs, UI behavior, edge cases (Docs 8–10).
- Screen flows and IA (Doc 11), architecture selection (Docs 14–17), data models (Docs 18–19), API contracts (Doc 20).
- Sprint decomposition (Doc 27).

#### Objectives & Success Criteria

- 100% of requirements trace to a pillar, persona, and journey stage.
- MVP boundary is explicit: every requirement is `MVP` or `Post-MVP` with a stage tag (S1/S2/S3 from Doc 6).
- Zero orphan requirements (nothing without a "why").
- Qwen can review any Mimo deliverable against a requirement ID without interpretation disputes.

#### Detailed Content

**1. Requirement Governance & ID Scheme**

- `EPIC-nn` — pillar-level epic. `FR-nn.mm` — functional requirement within epic. `NFR-Xnn` — non-functional (P=performance, S=security, C=cost, A=availability, U=usability, E=explainability).
- Priorities: **M**ust / **S**hould / **C**ould / **W**on't-now (MoSCoW). Stage tags: S1 (design partners), S2 (public launch), S3 (enterprise).
- Change control: any priority or scope change requires a logged decision referencing this doc's version.

**2. Canonical Glossary (tranche 1 — binding)**

| Term | Definition |
|---|---|
| **Creator** | A canonical person/account entity with one or more linked social profiles, enriched attributes, and workspace-scoped relationship data. |
| **Profile** | A single social-platform account belonging to a Creator. |
| **Enrichment** | A credit-metered action that fetches/refreshes third-party data for a Profile. |
| **Workspace** | The tenancy, collaboration, and billing boundary. All CRM/campaign data is workspace-scoped. |
| **List** | A workspace-scoped, collaborative collection of Creators with notes, files, and permissions. |
| **Campaign** | A workspace-scoped container for a creator marketing initiative: pipeline, budget, tasks, outreach, and results. |
| **Credit** | The internal unit of metered consumption, purchased via subscription allowance or top-up packs (Paddle). |
| **Entitlement** | A workspace's feature/limit rights derived from Paddle subscription state via webhooks. |
| **Authenticity Score** | An explainable, evidence-decomposable assessment of audience/engagement genuineness — never presented without its evidence breakdown (R-PRD-004 constraint). |

**3. Epic Catalogue & Functional Requirements** (capability level)

**EPIC-01 — Creator Intelligence** (Pillar 1 | PA-01, PB-02 | J1:3)
- FR-01.01 **M/S1** Unified creator profile aggregating multi-platform data, demographics, engagement, growth history (sourced via Two Brains pipeline: Serper → Apify → LLM M6, not a licensed database).
- FR-01.02 **M/S1** Explainable authenticity analysis with evidence breakdown (fake-follower signals, engagement anomalies). *Wedge #1 (Doc 5).*
- FR-01.03 **M/S1** Contact info & social links (credit-metered reveal).
- FR-01.04 **S/S2** Historical metrics timeline; brand-collaboration history.
- FR-01.05 **S/S2** Content insights (topics, formats, performance patterns).
- FR-01.06 **M/S1** Enrichment freshness indicators + manual refresh (credit-metered).

**EPIC-02 — Search & Discovery** (Pillar 2 | all personas | J1:2, J2)
- FR-02.01 **M/S1** Advanced filtered search (platform, audience, geo, size, engagement, category).
- FR-02.02 **M/S1** Natural-language search ("US-based skincare micro-influencers with real engagement").
- FR-02.03 **M/S1** Intelligent ranking (fit-relevance, not filter-order). *Architecture per ADR-SEARCH-001 (Doc 15); long-tail ranking constraint T5.*
- FR-02.04 **S/S1** Saved searches with re-run.
- FR-02.05 **S/S2** Similarity search ("more like this creator"); semantic search.
- FR-02.06 **C/S2** Search-result explanations ("why this creator ranked #1").

**EPIC-03 — AI Intelligence Layer** (Pillar 3 | cross-cutting)
- FR-03.01 **M/S1** AI creator summaries (profile → decision-ready brief).
- FR-03.02 **S/S1** AI-assisted search query construction.
- FR-03.03 **S/S2** Outreach message drafting assistance (persona/brand-voice aware).
- FR-03.04 **C/S2** Anomaly/fraud alerting on tracked creators; **C/S3** predictive campaign performance.
- FR-03.05 **M/S1** *Governance requirement:* every AI feature ships with per-action cost telemetry and passes the four-gate test (Doc 1) with margin guardrail (Doc 3). Binding on Mimo: no AI endpoint without cost instrumentation.
- FR-03.06 **M/S1** AI outputs are attributable, overridable, and never auto-execute irreversible actions (Philosophy #2).

**EPIC-04 — Lists & CRM** (Pillar 4 | PA-01 | J1:4)
- FR-04.01 **M/S1** Lists: create/organize creators; notes; tags; bulk add from search.
- FR-04.02 **M/S1** Collaboration: sharing, comments, member visibility.
- FR-04.03 **S/S1** Exports (CSV; credit/entitlement-gated); files/attachments on creators.
- FR-04.04 **S/S2** Relationship memory: rate history, past outcomes, interaction log surfaced on profile. *Wedge #2.*
- FR-04.05 **C/S2** Bulk actions (move, assign to campaign, bulk enrich with cost preview — R-PRD-003 mitigation).

**EPIC-05 — Campaign Management** (Pillar 5 | PA-01, PB-02 | J1:1,6,7)
- FR-05.01 **M/S1** Campaign creation with structured brief and criteria.
- FR-05.02 **M/S1** Pipeline stages (customizable) with creator cards; status tracking.
- FR-05.03 **S/S1** Tasks, milestones, budget tracking per campaign/creator.
- FR-05.04 **S/S2** Deliverable tracking; content approval flow.
- FR-05.05 **S/S2** ROI & performance analytics per campaign (links EPIC-09).
- FR-05.06 **C/S3** Contract artifacts storage; negotiation history. (E-signature = integration, never built — ADR-002.)

**EPIC-06 — Outreach & Communication** (Pillar 6 | PB-02 | J1:5)
- FR-06.01 **M/S1** Gmail/Outlook OAuth integration; send/receive linked to Creator + Campaign.
- FR-06.02 **M/S1** Templates with personalization variables.
- FR-06.03 **S/S1** Sequences with automated follow-ups + reply detection stop.
- FR-06.04 **S/S2** Open/reply tracking; conversation inbox per campaign.
- FR-06.05 **C/S2** Send scheduling; internal notes on threads.

**EPIC-07 — Workspace & Collaboration** (Pillar 7 | PA-01, PD-04 | J3)
- FR-07.01 **M/S1** Workspaces with member invites; roles (Owner/Admin/Member at S1).
- FR-07.02 **M/S1** Workspace-scoped data isolation (hard tenancy requirement → Docs 14, 21).
- FR-07.03 **S/S2** Granular RBAC; activity history; notifications.
- FR-07.04 **W→S3** SSO/SAML, audit log export, DPA workflows. *Architecturally anticipated now (R-UX-002), delivered S3.*

**EPIC-08 — Billing & Credits** (Pillar 8 | all | Doc 3 contract)
- FR-08.01 **M/S1** Paddle-hosted checkout; subscription lifecycle driven **exclusively** by Paddle webhooks (ADR-PAYMENT-001). No custom tax/invoice logic anywhere.
- FR-08.02 **M/S1** Credit ledger: allowances, top-ups, per-action consumption, balance visibility. Ledger abstracted from Paddle IDs (R-FIN-004 mitigation).
- FR-08.03 **M/S1** Entitlement enforcement: tier limits (seats, workspaces, features) resolved server-side.
- FR-08.04 **M/S1** Trial with hard credit caps (R-FIN-002); graceful expiry states.
- FR-08.05 **S/S2** Usage analytics for customers; dunning/payment-failure grace states (webhook-driven; policy stub from Doc 3 gap now assigned here → Doc 10 detail).

**EPIC-09 — Analytics** (Pillar 9 | PA-01, PD-04)
- FR-09.01 **S/S1** Campaign performance dashboard (basic: status, spend, deliverables).
- FR-09.02 **S/S2** ROI reporting; exportable client reports (Alex's 20%-time pain, Doc 2).
- FR-09.03 **C/S2** Workspace/outreach analytics; **C/S3** cross-campaign and UGC/affiliate outcome modeling (T6).

**EPIC-10 — Administration (internal)** (Pillar 10 | ops)
- FR-10.01 **M/S1** Admin: user/workspace lookup, support impersonation (audited), feature flags.
- FR-10.02 **M/S1** Provider monitoring: API usage, cost, error rates per external provider (feeds Doc 3 guardrail + Doc 23).
- FR-10.03 **S/S2** Revenue/credit ops views; moderation & abuse controls; alerting.

**4. MVP Boundary (ADR-006 — Accepted)**

MVP = all **M/S1** requirements above, serving J1 stages 1–5 + J2 for personas PA-01/PB-02/PC-03. Explicitly excluded from MVP: SSO/RBAC-deep (S3), predictive analytics, contracts, similarity search, deliverable approval flows. Rationale: mitigates R-PRD-001/R-PRD-002 (scope creep) and R-MKT-003 (parity trap); consequence: enterprise deals (Elena) are consciously deferred.

**5. Non-Functional Requirements (binding on Docs 14–24)**

| ID | Requirement | Target |
|---|---|---|
| NFR-P01 | Filtered search latency | p95 < 1s (Doc 1 vision constraint) |
| NFR-P02 | NL/semantic search latency | p95 < 3s with progressive result rendering |
| NFR-P03a | Creator refresh (known creator, stages 2–4 re-scrape) | User-visible section progress; p95 < 30s |
| NFR-P03b | Live Discovery job (new creators, full Brain 2 pipeline) | Async pipeline; ADR-021 streaming progressive results; no hard latency SLO; notify on completion |
| NFR-A01 | Availability (customer-facing) | 99.9% monthly (S2+); managed-PaaS SLAs leveraged per ADR-002 |
| NFR-S01 | Tenancy isolation | Workspace-scoped authorization enforced at data-access layer; zero cross-tenant leakage tolerance |
| NFR-S02 | AuthN via managed provider (BaaS per ADR-002); no custom password infrastructure | — |
| NFR-S03 | No card data touches MUSHIN systems (Paddle-hosted checkout) | PCI scope ≈ zero |
| NFR-C01 | Per-action COGS telemetry on every metered/AI action | 100% coverage (FR-03.05) |
| NFR-C02 | Provider cost anomaly alerting | Alert within 1h of 2× baseline burn |
| NFR-E01 | Explainability: no opaque score shown without evidence decomposition | 100% of AI-derived scores |
| NFR-U01 | Accessibility WCAG 2.1 AA (detail in Doc 12) | S2 |
| NFR-U02 | Progressive disclosure: no screen requires enterprise concepts for Starter users | Design principle, audited in Doc 12 |

#### Dependency Mapping

- **Depends on:** Docs 1–6 (all approved), ADR-001…006, ADR-PAYMENT-001.
- **Depends on:** Docs 1–6 (all approved), ADR-001…006, ADR-007, ADR-PAYMENT-001.
- **Revision debt — revalidation cycle completed (2026-07-09):** Docs 2, 4, 5, 6 contained beachhead and SAM assumptions requiring revalidation against Pakistan (logged at Doc 7 v1.0). Revalidation status per document: **DOC-006** — fully revised (v1.1); NA/UK beachhead language replaced with Pakistan-first framing; rationale re-evaluated claim-by-claim with explicit flags where Pakistan-specific evidence is absent. **DOC-004** — regional-split gap escalated from open to blocking (v1.1); Pakistan-specific TAM/SAM/SOM research flagged as required before Doc 10 audit can produce a Pakistan-scoped SOM; existing figures must not be used as Pakistan-beachhead sizing targets without grounding research. **DOC-005** — implicit Western-market competitor assumption flagged (v1.1); Pakistan-specific competitive dynamics (local tool adoption, regional alternatives, C1/C3 seam applicability) identified as unexamined and requiring design-partner interview validation. **DOC-002** — reviewed in full; no explicit NA/UK claims found; one implicit assumption noted (HypeAuditor as named incumbent tool, low priority); geography open question closed by ADR-007. Remaining open items (Pakistan SAM research, competitor landscape, design-partner pain validation) are research tasks tracked in Docs 4, 5, and 6 Gap Analyses; they require field input, not further documentation revisions.
- **Enables:** Docs 8–10 (deep specs per epic cluster), Doc 11 (IA from epics), Docs 14–20 (architecture from NFRs), Doc 26 (test strategy from requirement IDs), Doc 27 (roadmap from stage tags).
- **Blocks:** Docs 8–10 cannot begin until epic priorities approved; Mimo implementation blocked on Docs 8–10 detail.

#### Geography & Launch Constraint Update

- **Launch beachhead:** Pakistan-first for initial design partners and early validation, with Pakistani/South Asian creator coverage treated as a hard prerequisite for Pillars 1–2.
- **Paddle role:** elevated from billing convenience to market-enablement layer for cross-border acquiring and USD-denominated invoicing.
- **Audit path:** the Doc 10 periodic audit is the formal reconciliation point for the revised geography, segment priority, and channel assumptions inherited from Docs 2, 4, 5, and 6.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-020 | M/S1 set is buildable by a small team + Mimo within S1 window | Medium | Doc 27 estimation pass | MVP re-cut (Could→Won't) |
| A-021 | Gmail/Outlook APIs permit sequence automation within ToS at our scale | Medium-High | Provider ToS review (Doc 17) | Outreach scope reduction |
| A-022 | Managed search/vector services can meet NFR-P01/P02 with licensed data volumes | Medium | Doc 15 spike | Ranking architecture rework |
| A-023 | Brain 2 pipeline resolution quality for Pakistani/South Asian creators is sufficient for Pillars 1–2 at launch | Medium | Doc 17 pipeline verification + design-partner validation in Pakistan | Search/intelligence quality drops; beachhead confidence weakens |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-PRD-005 | Product | Requirement drift between this doc and Docs 8–10 | M | H | Docs 8–10 may refine but not re-prioritize without change control |
| R-TEC-002 | Technical | NFR-S01 tenancy retrofit if missed early | L | Critical | Named as MVP architectural invariant (Doc 14 must open with it) |
| R-SEC-001 | Security | Impersonation feature (FR-10.01) abused/breached | L | H | Mandatory audit trail, time-boxed sessions, consent flags (Doc 21) |
| R-UX-003 | UX | M/S1 breadth still too wide for coherent first-run UX | M | M | Doc 11 defines a single "golden path" onboarding through J2 |
| R-TEC-003 | Technical | Brain 2 pipeline resolution quality lacks adequate Pakistani/South Asian data completeness, undermining Pillars 1–2 and the Pakistan-first beachhead | H | H | Block launch on pipeline quality validation; prioritize Doc 17 Apify actor selection and Serper query tuning before S1 rollout |

#### Alternatives Considered & Trade-offs

- **Thin MVP (search + lists only)** — rejected: fails J1 stage 5 (outreach), leaving the consolidation promise untested with design partners.
- **Full-suite MVP (all epics S1)** — rejected: R-PRD-001 realized; S1 window blown.
- **User-story-level PRD now** — rejected: duplicates Docs 8–10; capability-level keeps this doc stable while details iterate.
- **NA/UK-first launch** — superseded by ADR-007: Pakistan-first beachhead accepted; old geography assumptions remain in revision debt until Doc 10 audit.

#### Gap Analysis Report

- Apify actor and LLM provider selection absent — FR-01.x/FR-02.x are unimplementable until Doc 17 names actors and models. **Hard blocker flagged.**
- Notification requirements scattered (FR-06.03, FR-07.03) — consolidate in Doc 9.
- No data-retention/deletion requirements stated — GDPR-driven; assigned to Doc 21 with a backstop requirement stub here: creator personal data must be deletable per workspace and globally.
- Mobile scope undefined — assumption: responsive web only for S1/S2; formalize in Doc 11.
- Pipeline resolution quality for Pakistan/South Asia must be validated as part of Doc 17 before S1 launch; Pakistan/South Asia is no longer a peripheral market assumption but a core launch dependency.

#### Cross-References & Decision Traceability

**ADR-006 (MVP boundary) — Accepted here.** Every FR carries persona/journey trace inline. NFR-C01 operationalizes Doc 3's margin guardrail; NFR-E01 operationalizes Doc 5 Wedge #1 and R-PRD-004; NFR-S03 flows from ADR-PAYMENT-001; glossary tranche 1 discharges Doc 1's gap item. **ADR-007 (Pakistan-first beachhead) — Accepted here and propagated as launch governance, not as a requirement rewrite.**

#### Open Questions & External Dependencies

1. Actor inventory and LLM provider selections (Groq/Anthropic), with explicit Pakistani/South Asian resolution scoring (Doc 17 spike — blocking).
2. Credit price per action (Doc 3 open item; needed for FR-08.02 catalog).
3. Responsive-web-only confirmation from CPO (Doc 11 input).
4. Which pipeline-stage defaults ship out of the box? (Design-partner input, Doc 9.)
5. Which Pakistan-specific billing, invoicing, and FX constraints must be surfaced in Doc 10/Paddle setup for export-focused agencies?

#### Future Revision Triggers

Design-partner feedback reprioritizing epics (via change control only); pipeline capability gaps discovered in Doc 15/17; any NFR proven unachievable at acceptable cost; Doc 27 estimation exceeding S1 window by >25%.

#### Review Checklist & Validation Criteria

- [ ] Every FR has ID, MoSCoW, stage tag, pillar/persona/journey trace. ✅
- [ ] MVP boundary explicit and ADR-logged. ✅
- [ ] NFRs measurable and assigned to downstream owners. ✅
- [ ] Zero code/pseudo-code. ✅
- [ ] Sign-off: CPO, Principal Architects (Product, Software, AI/Search, Security), Engineering Director; review pass by Qwen against Docs 1–6.

---

[AWAITING APPROVAL]
