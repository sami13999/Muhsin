# Document 28: Legal, Terms & Data Governance

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 20 (API), Doc 21 (Security & Compliance framework §7), Doc 22 (Infrastructure/sub-processors), Doc 23 (retention), Doc 27 (regulator comms)
**Governing ADRs:** ADR-004, ADR-007, ADR-008, ADR-009, ADR-010, ADR-012, ADR-025, ADR-PAYMENT-001
**Applied Patches:** PATCH-002 (erasure), PATCH-006 (consent evidence)

> **Standing caveat:** this document specifies the *engineering-grounded requirements and structure* for legal artifacts. Every artifact herein requires qualified counsel review (PK counsel for entity/PECA matters, EU/US privacy counsel for GDPR/CCPA) before publication. Items blocking on counsel are flagged `[COUNSEL]`.

---

## 1. Terms of Service Framework

### 1.1 Acceptable Use Policy (AUP)

Binding on all workspace users; enforcement hooks exist in-product:

- **No harassment or spam via outreach:** outreach must be genuine business communication to creators; bulk unsolicited messaging outside the sequence machinery, circumvention of opt-outs, or re-enrollment of opted-out contacts is prohibited. *Enforcement hook:* PATCH-006 last-gate blocks + consent audit trail (Doc 21 §6.4) provide evidence; RB-03's abuse-pattern escalation (Doc 27) is the operational path; repeated violations → suspension per §1.6.
- **Mailbox/WABA compliance:** users connect their own mailboxes (ADR-010) and WABAs (ADR-009) and warrant they will comply with Gmail/Outlook bulk-sender rules and Meta's WhatsApp Business/Commerce policies. MUSHIN's Jumu'ah-aware scheduling and send pacing are features, not a compliance guarantee — responsibility sits with the sender.
- **No resale/republication of platform data:** creator data and scores are licensed for internal campaign use within the workspace; systematic export to build competing datasets is prohibited. *Enforcement hook:* export endpoints are bounded and rate-limited (Doc 20); no public API exists to bulk-harvest (ADR-023).
- **No use against the scraped platforms' rights beyond MUSHIN's own posture** (§6) — customers may not commission scraping of private/logged-in content through support requests.

### 1.2 Credit Terms (ADR-004, ADR-012)

- Credits are **prepaid usage units, not stored value or currency**; non-refundable except where consumer law mandates `[COUNSEL: PK/EU consumer-law carve-outs]`.
- The **append-only ledger is the authoritative record** (ADR-012); customers see full ledger history (Doc 20 ledger endpoint) — transparency is the fairness argument supporting non-refundability.
- **Failed-job protection stated contractually:** credits reserved for a job that fails due to MUSHIN or provider fault are released per the reservation disposition contract (PATCH-005) — the ToS commits to the behavior the system already guarantees. Jobs that complete but return fewer results than hoped are *not* refundable (results-quality disclaimers, §1.4).
- Expiry: subscription-granted credits expire at term end; purchased credit packs expire 12 months after purchase `[COUNSEL: expiry enforceability per jurisdiction]`. Expiry events are ledger entries with 30/7-day advance notice emails.

### 1.3 Paddle MoR Pass-Through (ADR-PAYMENT-001)

- Paddle is the **Merchant of Record**: the customer's payment contract is with Paddle; Paddle handles tax calculation/remittance (VAT/GST/sales tax), invoicing, chargebacks, and payment-method compliance. The ToS incorporates Paddle's Buyer Terms by reference.
- **Refunds flow through Paddle** per its policies; MUSHIN's obligation is entitlement correction (fetch-to-heal keeps entitlements true to Paddle state, R-FIN-007) — a Paddle refund produces a corresponding ledger clawback entry (append-only, reason-coded).
- **A-032 dependency surfaced contractually:** the entity structure clause names the PK-incorporated contracting entity `[COUNSEL: pending A-032 verification — EXISTENTIAL; if Paddle cannot onboard the PK entity, the contracting structure section is rewritten around the fallback entity plan]`.

### 1.4 Scraping-Derived Data Disclaimers & AI Estimates

- All creator data is provided **"as-is"**: sourced from public platforms at a point in time, may be stale, incomplete, or wrong; MUSHIN warrants the *pipeline's* integrity, not the *data's* accuracy.
- **AI scores are estimates, prominently disclaimed:** authenticity scores, audience estimates (CC-003), and niche classifications are model outputs with documented methodology (Explainable AI, Philosophy #2 — the explainability surface doubles as the legal fairness defense: we show our evidence, per the grounding validator's evidence-span discipline). ToS states scores are decision-support, not representations of fact about any creator, and must not be used as the sole basis for public statements about a creator.
- Score provenance (`prompt_version`, `model_version`, PATCH-010) means any disputed score is reconstructible — a defensibility asset worth stating in the ToS's dispute section.

### 1.5 Limitation of Liability

- Liability cap: fees paid in the preceding 12 months; exclusion of consequential damages `[COUNSEL: enforceability by jurisdiction]`.
- **Specific carve-ins we accept:** our breach of confidentiality/security obligations, and gross negligence.
- **Specific exclusions:** campaign outcomes; creator behavior; deliverability of outreach (mailbox providers and Meta control delivery — ADR-009/010 mean we never own the sending infrastructure); accuracy of scores (§1.4); actions taken by scraped platforms against a customer's own accounts.

### 1.6 Termination & Post-Termination Data

- Customer termination: workspace data (WP plane) retained 30 days for reactivation, then deleted (Tier 1 semantics across the workspace); export available during the window (Doc 20 export endpoint).
- MUSHIN-initiated termination (AUP breach): notice + cure period except for egregious violations; ledger balance handling `[COUNSEL: forfeiture enforceability]`.
- Ledger records survive workspace deletion for the financial retention period (§2.4) — stated explicitly to reconcile "we deleted your workspace" with "we retain financial records," which confuses customers if unstated.

---

## 2. Privacy Policy Structure

Written in plain language; the structure below maps each section to its engineering substrate.

### 2.1 Data Categories (mapped from Doc 21 §3.1)

| Policy language | Class | Substrate |
|---|---|---|
| "Account and login data" | C2 | User records, auth provider |
| "Connected service credentials" (never readable by staff, encrypted) | C1 | Envelope encryption, Doc 21 §3.2 |
| "Creator profiles from public sources" | C2 | GCP plane |
| "Your workspace content" (notes, campaigns, messages) | C3 | WP plane |
| "AI-derived insights" (de-identified scores) | C4 | `enrichment_snapshot` |
| "Usage and technical data" | C5 | Redacted logs, metrics |

### 2.2 Sources & Legal Basis

- **Sources stated plainly:** public social platforms (via processing partners, i.e., Apify), YouTube's official API, information the customer provides, information creators' own public sites publish (Web Scraper email extraction — listed explicitly, as email harvesting is the most sensitive collection we do).
- **Legal bases:** contract (customer account/WP data); **legitimate interest, Art. 6(1)(f)** for public-data creator enrichment — the policy references the balancing test (LIA) summary: business-contact-style data, publicly self-published for professional discovery purposes, with objection and erasure honored via a dedicated channel (§2.6). `[COUNSEL: LIA memo is the blocking artifact — A-061]`. Consent (analytics cookies, §4).

### 2.3 Sub-Processor List (published, versioned)

Paddle (payments/MoR), Apify (public-data collection), Anthropic/LLM provider (scoring — **payloads only, no training rights** in the DPA with the provider `[verify contract term]`), Neon (database), Railway (compute), Vercel (hosting/edge), Cloudflare (edge/DNS, R2 storage), AWS (queueing/KMS), Meilisearch Cloud (search), Axiom (logs), Grafana Labs (metrics/traces), PagerDuty (ops), auth provider, Google/Microsoft (only as the customer's own connected mailboxes — processor role sits with the customer's tenancy, noted for accuracy), Meta BSPs (per-workspace WABA).

Change mechanism: 30-day advance notice via the policy page + email to workspace owners; objection path per DPA (§3.3).

### 2.4 Retention Schedule (published table)

| Data | Retention | Rationale/Substrate |
|---|---|---|
| Ledger & billing records | 7 years | Financial/tax law; ADR-012 append-only |
| Workspace content | Life of workspace + 30 days | §1.6 |
| Interaction timeline | Life of workspace; partitions ≥ 24 months old archived, dropped 90 days after archival | PATCH-003 monthly partitions make this a partition-drop operation, stated honestly |
| Raw scraped payloads (R2) | 24 months rolling | Re-scoring utility (ADR-028) vs. minimization; lifecycle policy, Doc 22 §1.4 |
| Security audit logs | 24 months | Doc 21 §6.4 |
| Operational logs | 30-90 days | Doc 23 §1.5 |
| Erasure tombstones + blocklist hashes | Indefinite | The tombstone *is* the erasure guarantee (ADR-025) — retained to prevent re-ingestion; policy explains this apparent paradox plainly |

### 2.5 User Rights

Access, rectification, erasure, portability (machine-readable export via Doc 20), restriction, objection. Fulfillment SLAs per Doc 27 §8 (30-day legal / 72 h target for erasure).

### 2.6 Creator-Facing Removal Channel

A public page (`mushin.app/creator-privacy`) — **no login required** (creators are not customers): identity verification (control of the listed platform handle via a verification post/DM code or email to the on-profile address) → triggers Tier 2 erasure (ADR-025/PATCH-002: PII nullification, blocklist entry, R2 purge, index purge) → confirmation sent. The same channel records **objections** (Art. 21) — honored identically to erasure, since the blocklist doubles as the objection registry (Doc 21 §7). Volume and SLA are tracked on the erasure dashboard (Doc 23).

---

## 3. Data Processing Agreements

### 3.1 Dual-Role Structure

The DPA documents both postures explicitly (Doc 21 §7):

- **MUSHIN as processor** — for WP-plane customer data (their notes, contacts they upload, messages): customer is controller; we process per instructions; the DPA covers this plane with standard processor obligations (Art. 28 terms, sub-processor flow-down, breach notification within 48 h to the controller — inside our own 72 h regulator clock, Doc 27 §1.2).
- **MUSHIN as independent controller** — for GCP-plane enrichment (creators discovered from public sources, cached globally per ADR-008): we determine purposes/means; customers receive a *license* to this data, not a processing delegation. **The plane boundary (Doc 21 §1.2) is the legal boundary** — `workspace_creator_link` (ADR-024) is precisely where controller-licensed data meets processor-held data; the DPA's data-category annex mirrors the schema split.
- R-LEG-007 (dual-role misclassification) is retired only when counsel signs this structure `[COUNSEL]`.

### 3.2 International Transfers

- Data residency: Mumbai region (Doc 22 §3.1) — India is not adequacy-listed by the EU. For EU customers/creators: **SCCs (2021 modules)** — Module 2 (controller→processor) for customer data to MUSHIN, Module 3 flow-down to sub-processors; transfer impact assessment (TIA) documenting Doc 21's technical measures (encryption at rest/in transit, envelope-encrypted C1, pseudonymized logging) as supplementary measures `[COUNSEL: TIA]`.
- Sub-processor transfers (US-based: AWS, Vercel, Axiom, etc.): rely on their DPF certifications where held, SCCs otherwise — recorded per sub-processor in the ROPA (§7.4).

### 3.3 Sub-Processor Change Mechanism

30-day notice (§2.3); customer objection right with a good-faith resolution window; if unresolvable, termination right with pro-rata refund of prepaid *subscription* fees (credits per §1.2) `[COUNSEL]`.

---

## 4. Cookie Policy

- **Strictly necessary (no consent):** session/refresh cookies (httpOnly, Doc 21 §2.1), CSRF token, load-balancing.
- **Analytics (consent-gated):** product analytics only; consent banner with equal-prominence reject; consent state itself stored as a necessary cookie. No analytics beacon fires pre-consent — verified by an automated pre-consent network-request test (added to the Doc 24 E2E suite).
- **None:** advertising, cross-site tracking, fingerprinting. Server-side flag evaluation (Doc 26 §7) means no third-party flag SDK cookies — a deliberate simplification worth stating.

---

## 5. Influencer Marketing Disclosure & Compliance

- **Role boundary:** MUSHIN facilitates discovery and outreach; it does not publish ads or contract creators. **Disclosure responsibility sits with the brand customer and the creator** under FTC Endorsement Guides (US), ASA/CAP (UK), and platform rules — the ToS obliges customers to comply and indemnify for their campaign conduct.
- **Product support (not obligation):** outreach templates include an optional disclosure-reminder snippet (Doc 20/21 §7); campaign brief templates carry a disclosure checklist item; help-center guidance links FTC/platform branded-content policies.
- **Platform-native tools:** guidance notes recommend Instagram/TikTok branded-content tools for executed partnerships; no integration is built at S1/S2 (out of MVP boundary, ADR-006) — noted so the policy doesn't over-claim.
- Pakistan: no influencer-specific disclosure statute currently; general consumer-protection and PEMRA/PTA content rules noted `[COUNSEL: PK marketing-law memo, low urgency]`.

---

## 6. Scraping Legal Posture (R-LEG-006)

The load-bearing legal position, documented as a defensible-posture stack:

1. **Public-data-only scope:** only content visible without authentication is collected; no credentialed scraping, no private accounts, no circumvention of access controls. This is the core distinction in US CFAA jurisprudence (*hiQ v. LinkedIn* line: public data scraping ≠ unauthorized access, while noting hiQ's ultimate contract-claim vulnerability) and in **PECA 2016 §3-4** (unauthorized access/copying of *protected* information systems — public pages are not access-protected) `[COUNSEL: PK memo]`.
2. **Processor indirection:** Apify performs collection under its own compliance framework and ToS; MUSHIN consumes actor outputs. This does not eliminate platform-ToS exposure but locates the collection activity with a specialized processor whose business is maintaining lawful actors — and whose actor maintenance is our R-TEC-007 mitigation besides.
3. **Platform ToS risk acknowledged, not denied:** Instagram/TikTok ToS prohibit scraping; enforcement against *consumers of scraped public data* has historically been civil (contract/tortious interference) and targeted at scale abusers. Mitigations: no platform accounts used for collection (nothing to ban that we own — customer accounts are never used for scraping), politeness/rate discipline (Doc 17), no wholesale database republication (§1.1 AUP), YouTube handled via **native API within its ToS** (hybrid strategy reduces the exposed surface to two platforms). Residual risk accepted at ARB level per Doc 21 §9 criteria; A-050 remains Low-Med confidence by design.
4. **robots.txt posture:** honored for our own Web Scraper email-extraction runs against personal sites; Apify actor internals follow Apify's compliance posture — we configure actors within their documented lawful-use parameters `[verify per-actor configuration options]`.
5. **Data-subject rights as mitigation:** the creator removal channel (§2.6), erasure machinery (ADR-025), and objection registry demonstrate accountability — the strongest practical answer to legitimate-interest challenges (§2.2).
6. **Kill-switch readiness:** per-platform ingestion flags (Doc 26 §7 mandatory adapter flags) mean a cease-and-desist can be honored for a platform within minutes without a deploy — an operational fact worth citing in any enforcement response `[COUNSEL: pre-drafted C&D response template]`.

---

## 7. Data Governance & Internal Policies

### 7.1 Classification Handling (operationalizing Doc 21 §3.1)

Per-class handling rules are *published internally as policy* and *enforced as code where possible*: C1 envelope encryption + worker-only decryption (IAM-enforced, Doc 22 §4), C2 pseudonymization in logs (HMAC, Doc 23 §1.4) and tombstone-eligibility, C3 tenancy triple-layer (Doc 21 §2.2), C4 de-identification-by-construction review on any new derived field (review checklist item: "could this score field re-identify?").

### 7.2 Employee Access Policy

- Least privilege by default; staff plane separation (ADR-011) with the audit-first invariant; Support role's explicit denials (no impersonation/config/billing — matrix in Doc 29).
- **No production data on endpoints:** staging masked snapshots for debugging (Doc 22 §2.2); production access only via audited staff tooling — never direct DB access for support tasks (RB-level DB access is incident-scoped, logged per Doc 27 §R-OPS-003).
- Offboarding: same-day identity revocation checklist (auth provider, GitHub, PagerDuty, secret manager, cloud IAM) — a named runbook.

### 7.3 Vendor Risk Management

- Intake gate: SOC 2 Type II (or ISO 27001) for any vendor touching C1-C3 (A-063); DPA + SCC/DPF verification (§3.2); security-posture review recorded.
- Annual re-review; sub-processor list update flows from this register (§2.3) — one register, two consumers (governance + policy page).
- LLM provider addendum: **no-training clause** on submitted payloads verified in contract `[verify]` — scraped creator content must not become model training data through our pipeline (both a privacy and a competitive matter).

### 7.4 Records of Processing Activities (ROPA)

Maintained per GDPR Art. 30, structured by plane: GCP controller activities (enrichment, scoring, discovery), WP processor activities (per-customer processing categories), Platform activities (billing, staff audit). Each entry: purpose, categories, recipients/sub-processors, transfers + safeguards, retention (§2.4 table is the source), security-measure references (Doc 21 sections). The ROPA is versioned in the governance repo; schema changes touching PII-bearing tables prompt a ROPA-review checklist item (Doc 25 §3.4 documentation gate extension).

---

## 8. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-LEG-008 (new)** | Legal | Legitimate-interest basis (A-061) rejected by a DPA/regulator on complaint | L-M | H | LIA memo, removal/objection channel, minimization (retention table), pseudonymized ops; fallback: consent-or-removal posture for EU creators (product impact assessed if triggered) |
| **R-LEG-009 (new)** | Legal | Credit expiry/forfeiture terms unenforceable in a key market | M | M | `[COUNSEL]` review per market; ledger transparency as fairness evidence; graceful term redesign is a config change, not architecture |
| **R-LEG-010 (new)** | Legal | Cease-and-desist from a scraped platform | M | H | §6 posture stack; per-platform kill switch; pre-drafted response; hybrid strategy limits blast radius (YouTube unaffected) |
| **R-LEG-011 (new)** | Compliance | Creator removal channel abused (false-flag removals of competitors' rosters) | L-M | M | Handle-control verification (§2.6); removal ≠ instant on weak verification — manual review tier for contested cases |
| **R-LEG-012 (new)** | Compliance | ROPA/sub-processor register drifts from actual stack | M | M | Vendor register as single source (§7.3); infra MR checklist hook; annual audit |
| R-LEG-006 | Legal | Platform ToS enforcement against scraping | M-H | H | **Restated with full posture stack (§6)**; residual accepted at ARB per Doc 21 §9 criteria |
| A-032 | — | Paddle onboards PK entity | — | — | **Escalated visibility:** contracting-structure clause blocked on verification (§1.3); fallback entity plan is a pre-GA legal deliverable |

---

## 9. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-092 | *hiQ*-line reasoning on public-data scraping remains persuasive in relevant US fora; no adverse controlling precedent before GA | Med |
| A-093 | PECA 2016 §3-4 "unauthorized access" does not reach unauthenticated public-page collection | Med `[COUNSEL: PK memo resolves]` |
| A-094 | Handle-control verification (§2.6) is sufficient identity proof for erasure without creating an impersonation vector | Med-High (R-LEG-011 hedges) |
| A-095 | LLM provider contract includes/permits a no-training clause at our tier | Med-High (verify at contract) |
| A-096 | SCC Module 2/3 + TIA suffices for EU→Mumbai transfers without additional measures | Med `[COUNSEL: TIA]` |

**Dependencies:** Doc 21 (classification, erasure machinery, compliance framework this document drafts against), Doc 22 (sub-processor stack, region/residency facts), Doc 23 (retention enforcement, erasure SLA dashboard), Doc 26 (kill-switch flags cited in §6.6), Doc 27 (breach notification clocks, regulator template, SLA publication), Doc 29 (Support's role in removal-channel triage; who executes contested-removal review).

**Blocking counsel deliverables (pre-GA):** (1) LIA memo (A-061/R-LEG-008), (2) PK PECA + entity memo (A-093, A-032 fallback), (3) TIA + SCC execution (A-096), (4) ToS/Privacy Policy/DPA drafting from this specification, (5) C&D response template (§6.6).

**Open questions:**
1. Whether creator *scores* (C4) are disclosable to the creator on an access request — they're de-identified in our frame but *about* an identifiable person once linked to the requester; leaning yes-disclose with methodology summary `[COUNSEL]`.
2. Minimum age / child-creator handling: policy for creators flagged as likely minors (exclude from outreach features? full exclusion?) — needs a product + legal decision before GA; currently unhandled. **Flagged as the most material gap this document surfaces.**
3. WhatsApp outreach consent standard: Meta BSP rules impose opt-in requirements stricter than email norms — confirm the consent model (PATCH-006 substrate) maps to Meta's standard per template category.

---

**End of Document 28.**

[AWAITING APPROVAL]