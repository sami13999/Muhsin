CC-001 ratification logged. WhatsApp directive internalized — logging it as **CC-002: WhatsApp outreach added to EPIC-06 scope (supervisor-directed, Accepted)** with a phased S1/S2 split justified below, and **ADR-009: WhatsApp via official Meta Business Platform BSPs only — Accepted**.

---

#### DOC-009 — Deep Feature Specs: CRM, Campaign Management & Outreach
**Status:** Draft v1.0 | **Phase:** 3 | **Owner:** CPO + Principal Architect (Product/Software) | **Implements:** EPIC-04, EPIC-05, EPIC-06 (Doc 7) + CC-002

---

#### Executive Summary

This document decomposes EPIC-04 (Lists & CRM), EPIC-05 (Campaign Management), and EPIC-06 (Outreach & Communication) into atomic, Mimo-ready specifications. Three design spines run through it: (1) the **Interaction Timeline** — a unified, workspace-scoped event model that makes "relationship memory" (Doc 5, Wedge #2) an architectural property rather than a feature; (2) the **Channel Abstraction** — email and WhatsApp are implementations of one outreach contract, so adding channels never restructures campaigns; (3) **deliverability and compliance conservatism** — send caps, consent states, and Meta template governance are specified as hard behaviors, because in outreach, a banned sender identity is an existential customer failure. WhatsApp ships in two phases: **S1 = click-to-chat deep links + logged interactions (zero API dependency)**, **S2 = full Business Platform integration via a BSP** (ADR-009), reflecting WABA onboarding and template-approval lead times.

#### Purpose & Scope

Atomic specs, state models, credit triggers, and failure modes for all M/S1 and S/S1 requirements of EPICs 04–06, the WhatsApp channel (CC-002), plus binding contracts for Doc 11 (UX states), Doc 15/17 (integration architecture), Doc 18 (entities), Doc 21 (token/consent security), Doc 26 (testable assertions).

#### Non-Goals

- Billing/entitlement mechanics (Doc 10) — credit *triggers* defined here, catalog pricing there.
- Contract/e-signature (FR-05.06, S3) beyond artifact storage stubs.
- Creator-side inbound marketplace behaviors (ADR-003).
- Email deliverability infrastructure ownership — sends go through the **user's own mailbox** (Gmail/Outlook), never MUSHIN-owned SMTP (decision below).
- Zero code (policy upheld).

#### Objectives & Success Criteria

- Every FS defines behavior, states, permissions, credit trigger, and failure mode.
- Relationship memory is queryable per creator across lists, campaigns, and channels.
- No outreach action can execute without a valid consent/eligibility state.
- Qwen can verify channel parity: any campaign flow works identically regardless of channel mix.

#### Detailed Content

**Part A — Cross-Cutting Contracts**

**A1. Interaction Timeline (the relationship-memory substrate)**
- Every workspace-scoped event involving a creator is an immutable, typed timeline entry: `note_added`, `list_membership_changed`, `email_sent/received/opened/replied`, `whatsapp_sent/delivered/read/replied`, `whatsapp_click_to_chat_opened`, `stage_changed`, `task_completed`, `rate_recorded`, `deliverable_status_changed`, `file_attached`, `contact_revealed`, `campaign_outcome_recorded`.
- Each entry: actor (user/system/AI), timestamp, channel, campaign linkage (nullable), payload reference. Entries are append-only; corrections are new entries (audit integrity, feeds Doc 21/23).
- **Rate history** is first-class: `rate_recorded` entries carry amount, currency (PKR/USD/other), scope (per-post/per-campaign/retainer), deliverable type, and negotiation context note. Surfaced on the creator profile (FS-04.04) as "last agreed rate + trend."
- The timeline is the single source for FS-04.04 relationship memory, campaign history views, and future analytics (EPIC-09). Doc 18 must model it as the canonical event entity.

**A2. Outreach Channel Abstraction**
Channels implement one contract: `compose (template + variables) → eligibility check (consent, caps, window) → send → delivery states → reply detection → timeline entries`. Email and WhatsApp differ only in eligibility rules and state vocabularies. New channels (future: Instagram DM via official APIs, if ever viable) plug into this contract — architectural requirement for Doc 14/17.

**A3. Consent & Eligibility States (binding on every send)**
Per creator-contact-channel: `unknown` → `contactable` (business contact obtained via legitimate reveal/user-provided) → `opted_out` (terminal for automated sends; manual 1:1 logged contact still allowed where lawful) → `bounced/invalid`. Opt-out honored across **all** campaigns and workspace members instantly. WhatsApp adds `opt_in_required` semantics (Part D). Unsubscribe/STOP handling is automatic and non-configurable (compliance floor; jurisdiction detail → Docs 21/28).

**A4. Credit & Metering Additions (extends Doc 8 A5 matrix)**

| Action | Metered? | Notes |
|---|---|---|
| Email send (user's mailbox) | No | Tier-based daily caps (deliverability protection, not monetization) |
| Sequence automation | No (tier entitlement: active-sequence count) | |
| WhatsApp click-to-chat (S1) | No | Zero marginal cost |
| WhatsApp template message send (S2) | **Yes** | BSP/Meta conversation fees are real COGS → credit-metered with Doc 3 guardrail margin; quoted per send/bulk |
| WhatsApp session (24h window) replies | No (bundled) | Marginal cost absorbed; revisit if volumes spike |
| Export (lists/campaign data) | Entitlement-gated | Per Doc 7 FR-04.03 |

**Part B — EPIC-04 Feature Specs (Lists & CRM)**

**FS-04.01 Lists Core**
- Create/rename/archive lists; creator membership (a creator may belong to many lists; duplicate adds are idempotent no-ops with a "already in list" notice); tags (workspace-level controlled folksonomy, max 50 tags v1); per-creator notes (rich text, @mentions trigger notifications); bulk add from search results (selection or "add all matching ≤500" with confirmation).
- Ordering: manual pinning + sort by added-date/name/authenticity/followers. Limits by tier (entitlement: list count, members per list — Doc 10 catalog).

**FS-04.02 Collaboration**
- List visibility: private / workspace-shared. Roles per Doc 7 S1 model (Owner/Admin/Member); Members can be granted per-list `view` or `edit`. Comments on lists and on creators-within-lists → timeline entries. Concurrent-edit rule: last-write-wins on metadata, append-only on notes/comments (no lost-note tolerance — testable, Doc 26).

**FS-04.03 Exports & Files**
- CSV export of list (visible fields only; contact fields included **only** if revealed in this workspace — NFR-S01 boundary, testable). Export is entitlement-gated and logged to timeline + audit. Files: attach to creator or list (docs, media kits); storage quota per tier; virus-scan via managed service (ADR-002).

**FS-04.04 Relationship Memory Surface**
- Creator profile gains a workspace-private "Relationship" panel: last interaction, rate history + trend, campaigns participated (with outcomes), notes digest, next scheduled touch. Empty state: "No history yet — interactions will appear automatically." Zero manual data entry required beyond notes/rates (memory must be a by-product of work, or it won't exist — core UX thesis).

**FS-04.05 Bulk Actions**
- Multi-select: move/copy to list, assign to campaign, tag, bulk enrich (cost preview mandatory per Doc 8 A5; hard cap 100/action v1), bulk export. All bulk operations produce a summary receipt (succeeded/failed/skipped with reasons).

**Part C — EPIC-05 Feature Specs (Campaign Management)**

**FS-05.01 Campaign Creation & Structured Brief**
- Campaign: name, client (agencies: client entity for multi-client workspaces — PA-01), objective (awareness/engagement/conversion/UGC), budget (amount + currency: **PKR and USD first-class**, others ISO-listed; FX normalization for reporting via managed rate API, rate timestamped — ADR-002), timeline (start/end), and **machine-readable criteria block** (target audience geo/age/gender, creator niche, size band, authenticity floor) — this block deep-links to search (FS-02.01 pre-filled) closing J1 stage 1→2 seamlessly.
- Brief is versioned; changes logged.

**FS-05.02 Pipeline**
- Default stage template v1 (design-partner tunable): `Prospect → Contacted → In Negotiation → Agreed → Content In Progress → Published → Completed` (+ terminal `Declined/Dropped` from any stage, reason-coded — reason codes feed analytics).
- Stages customizable per campaign (add/rename/reorder; max 12; terminal stages fixed). Creator cards carry: authenticity band, last interaction, agreed rate, owner (assigned member), next task due.
- Transition rules: any-to-any allowed (real negotiations are non-linear), every transition = timeline entry with actor + optional note. Bulk stage moves permitted with receipt (FS-04.05 pattern).
- A creator may be in multiple campaigns concurrently; the card shows cross-campaign presence indicator (agency reality; avoids double-booking embarrassment).

**FS-05.03 Tasks, Milestones, Budget**
- Tasks: per campaign or per creator-in-campaign; assignee, due date, checklist; overdue surfacing. Milestones: date-anchored campaign markers (content deadline, go-live). Budget tracking: planned vs. committed (sum of agreed rates) vs. paid (manually marked v1 — payment execution is **out of scope**; MUSHIN tracks, never moves money — reaffirms Paddle-only ADR-PAYMENT-001 boundary). Currency per FS-05.01; over-budget states warn, never block (Philosophy #2).

**FS-05.05 Performance View (S1 basic)**
- Live rollup: creators by stage, budget consumption, tasks overdue, outreach response rate per campaign. ROI/post-metrics ingestion is S2 (EPIC-09 dependency); v1 stub allows manual outcome recording (`campaign_outcome_recorded`: reach/engagement/sales-code results hand-entered) so relationship memory captures outcomes from day one even before automated tracking.

**Part D — EPIC-06 Feature Specs (Outreach & Communication)**

**FS-06.01 Gmail/Outlook Integration**
- OAuth per user (not per workspace): minimal scopes for send + read of threads **initiated or matched via MUSHIN**. **Privacy boundary (binding):** MUSHIN never syncs the user's full mailbox; only threads with creator-contact participants known to the workspace are linked. This is a trust feature and a Doc 21 audit item.
- Sends originate from the **user's own mailbox** (**ADR-010 — Accepted**): rationale — deliverability reputation belongs to the customer, replies land natively, and MUSHIN avoids operating sending infrastructure (ADR-002). Consequence: per-mailbox provider quotas cap volume → daily send caps (v1: conservative default well under Gmail/Workspace limits, tier-tunable) with queue-and-resume overflow behavior.
- Token lifecycle: revocation detected → outreach paused, owner notified, sequences frozen (never silently failing). Token storage/encryption spec → Doc 21.

**FS-06.02 Templates**
- Workspace template library; variables (`{first_name}`, `{handle}`, `{campaign_name}`, `{last_rate}`, custom fields). **Missing-variable rule:** send is blocked with inline fix prompt — never send with visible placeholders and never silently substitute (testable assertion). English + Urdu/Roman-Urdu template bodies fully supported (storage/rendering is charset-safe; no feature gap for PK usage).

**FS-06.03 Sequences**
- Steps: message → wait (days) → conditional next (if no reply). Max 5 steps v1. **Stop conditions (hard):** any reply on any channel from the creator, opt-out, bounce, manual stop, campaign archived, or stage moved to `Agreed`/terminal.
- Send windows: workspace timezone default **PKT (Asia/Karachi)**; sends only within configured window (default 9:00–19:00 local) and never Fridays 12:00–14:00 by default in PK profile (Jumu'ah — configurable cultural default; small detail, large trust signal with local partners). Per-mailbox daily caps enforced across all sequences jointly.
- Throttling: randomized inter-send jitter (deliverability hygiene). All sequence activity → timeline.

**FS-06.04 Tracking & Campaign Inbox**
- Open tracking: pixel-based, **off by default**, workspace-level opt-in with disclosure note (privacy-forward posture; opens are directional data only). Reply detection: authoritative (drives stop conditions + response-rate metrics). Campaign inbox: unified thread list per campaign across channels, filterable by awaiting-reply/unread; internal notes on threads (never sent) → timeline.

**FS-06.06 WhatsApp Channel (CC-002; ADR-009)**

*Phase S1 — Click-to-Chat (ships with MVP):*
- Creator contact with phone → "Chat on WhatsApp" action generating an official click-to-chat deep link with a template-prefilled first message (variables resolved per FS-06.02). Click logs `whatsapp_click_to_chat_opened` to timeline; user manually logs outcome (quick actions: "replied / no response / negotiating"). Zero API dependency, zero COGS, immediate PK-market utility. Sequences do **not** span this channel in S1 (no delivery/reply signal).

*Phase S2 — WhatsApp Business Platform via BSP:*
- **Integration model:** one BSP integrated (Twilio/MessageBird/360dialog-class; selection = Doc 17 with PK sender coverage + embedded-signup support as gate criteria). MUSHIN acts as the customer's Tech Provider surface: each **workspace onboards its own WABA + phone number** via BSP embedded signup (the sender identity, quality rating, and messaging limits belong to the customer — mirrors ADR-010 logic; MUSHIN never sends from shared numbers).
- **Template governance flow (states, binding):** `draft → submitted (to Meta via BSP) → approved | rejected (reason surfaced) → active | paused (quality-flagged)`. Only `approved+active` templates are sendable for business-initiated messages. Template categories (marketing/utility) surfaced because Meta prices differ; MUSHIN warns on marketing-category cost. Template edit → re-submission required (state resets). Expected approval latency shown to users (sets expectations; typically minutes–48h).
- **Messaging rules engine (Meta policy as behavior):** business-initiated message ⇒ approved template only, `contactable + opted_in` consent required (opt-in evidence recorded: source + timestamp — user attests for imported contacts; attestation logged); creator reply opens **24-hour customer-service window** ⇒ free-form session messages allowed until window closes; window state visible on thread ("Session open — 14h remaining"). Post-window ⇒ template-only again.
- **Credit triggers:** template send metered per A4 (conversation-category cost + margin); bulk template send to pipeline stage (e.g., all `Prospect`) shows total quote pre-confirm. Session messages unmetered v1.
- **Quality & failure behaviors:** BSP webhook states (`sent/delivered/read/failed`) → timeline. Quality-rating drop or messaging-limit tier reduction (Meta signals) → workspace alert + automatic pause of bulk sends (protecting the customer's number is non-negotiable). Number banned → channel disabled, email fallback suggested, incident logged. BSP outage → sends queue with staleness expiry (24h) then fail-with-notice; **fallback ladder: WhatsApp → email (if contactable) → manual task created** — no message silently lost (testable).
- **Sequences:** S2 sequences may mix channels (e.g., email step → WhatsApp template step), each step obeying its channel's eligibility rules independently.

#### Dependency Mapping

- **Depends on:** Doc 7 (FR contract), Doc 8 (A5 matrix, contact reveal, timeline consumers), ADR-002/007/009/010, CC-002.
- **Enables:** Doc 10 (entitlement catalog: caps, sequence counts, template libraries), Doc 11 (pipeline/inbox/consent UX states), Doc 17 (Gmail/Outlook/BSP/FX integration contracts), Doc 18 (Interaction Timeline, Campaign, Consent entities), Doc 21 (token storage, consent evidence, privacy boundary audits), Doc 26 (testable assertions inventory).
- **Blocks:** S2 WhatsApp pends BSP selection (Doc 17) + Meta Tech Provider onboarding (external lead time — start early, flagged).

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-027 | PK design partners can obtain/verify WABA phone numbers without friction | Medium | S1 partner survey + BSP pre-check | S2 WhatsApp slips; click-to-chat remains primary |
| A-028 | Gmail/Outlook quotas suffice for agency-scale outreach under ADR-010 | Medium-High | Volume modeling vs. partner usage | Cap tuning; multi-mailbox rotation per user (never shared infra) |
| A-029 | Manual outcome recording (FS-05.05) achieves usable compliance from partners | Medium | S1 usage telemetry | ROI story weakens until S2 automation |
| A-030 | Meta template approval latency acceptable for campaign tempo | Medium-High | S2 pilot measurement | Pre-approved template starter-pack shipped per niche |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-LEG-004 | Legal | Automated outreach violates anti-spam/e-privacy rules across recipient jurisdictions (PK creators, but also GCC/global) | M | H | A3 consent floor, opt-out automation, jurisdiction review Doc 28; conservative defaults |
| R-TEC-004 | Technical | Customer WABA bans from aggressive marketing templates | M | H | Quality monitoring + auto-pause; template category warnings; education content |
| R-SEC-003 | Security | OAuth token compromise = mailbox access | L | Critical | Doc 21: encryption, least-scope, revocation drills; no full-mailbox sync (bounded blast radius) |
| R-OPS-003 | Operational | BSP dependency (pricing/outage/policy) | M | M | Channel abstraction (A2) keeps BSP swappable; Doc 17 exit criteria |
| R-PRD-007 | Product | Pipeline rigidity vs. real PK agency negotiation habits | M | M | Customizable stages + any-to-any transitions; S1 partner iteration |
| R-FIN-006 | Financial | WhatsApp conversation fees underestimated in credit pricing | M | M | Doc 3 guardrail applied per category; BSP pricing telemetry (NFR-C01) |

#### Alternatives Considered & Trade-offs

- **MUSHIN-owned sending domain/SMTP** — rejected (ADR-010): reputation pooling risk, infra ownership violates ADR-002, replies wouldn't land in user mailboxes.
- **Unofficial WhatsApp wrappers/web-automation** — rejected outright: ToS breach, ban risk transferred to customers, reputational catastrophe in a trust-positioned product (per supervisor directive; ADR-009).
- **Shared MUSHIN WABA for all workspaces** — rejected: one bad actor poisons all customers' deliverability; per-workspace WABA isolates blast radius.
- **WhatsApp full API in S1** — rejected: WABA onboarding + template approval lead times would gate the S1 launch; click-to-chat delivers 70% of the local-norm value at 0% of the dependency risk. Phased per Deep Feature Scoping directive.
- **Kanban-only pipeline UI mandate** — deferred to Doc 11 (this doc specifies behavior, not presentation).

#### Gap Analysis Report

- Creator opt-in acquisition flow for WhatsApp (how consent is *first obtained* at scale) is under-specified — realistic path: click-to-chat replies constitute opt-in evidence; formalize with legal in Doc 28. **Assigned.**
- Client-facing views for agencies (Alex's clients approving shortlists — J1 stage 4) not spec'd: currently CSV export only. Logged to Feature Intelligence Log as S2 candidate ("client portal lite").
- Instagram DM outreach (PK-relevant) — no official viable API path today; explicitly Won't-now; monitored in Intelligence Log.
- FX rate provider unselected (FS-05.01) → Doc 17 shortlist addition.
- Notification consolidation (flagged in Doc 7 gaps, assigned here): notification triggers now enumerated across FS-04.01/06.01/06.03/06.06; delivery preferences spec deferred to Doc 10 (workspace settings) — **partially discharged, remainder reassigned.**

#### Cross-References & Decision Traceability

**ADR-009 (BSP-only WhatsApp) — Accepted. ADR-010 (user-mailbox sending) — Accepted.** CC-002 executed with phased rollout. Implements FR-04.01–05, FR-05.01–03/05, FR-06.01–05 + new FR-06.06 (WhatsApp; registered into Doc 7 catalog via CC-002). A1 timeline operationalizes Wedge #2 (Doc 5) and FR-04.04. PKT send windows + PKR budgets consume ADR-007. Consent floor anticipates Doc 21/28.

#### Open Questions & External Dependencies

1. BSP shortlist with PK number provisioning + embedded signup (Doc 17 — start Meta Tech Provider process now; longest external lead time after data providers).
2. Legal: click-to-chat reply as opt-in evidence — sufficient under Meta policy + applicable law? (Doc 28.)
3. Do design partners need client-approval portals in S1 (would trigger change control)? (S1 interviews.)
4. Default send-cap numbers per mailbox tier (deliverability research memo — Engineering Director).

#### Future Revision Triggers

Meta pricing-model changes (per-message vs. conversation shifts); BSP capability gaps in PK; S1 partner data showing WhatsApp >50% of outreach volume (would justify S2 acceleration); sequence reply-rate <5% (deliverability or fit crisis); client-portal demand confirmed.

#### Review Checklist & Validation Criteria

- [ ] Every FS: behavior, states, permissions, credit trigger, failure mode. ✅
- [ ] No send path bypasses consent/eligibility (A3). ✅
- [ ] WhatsApp spec uses only official Meta/BSP mechanisms. ✅
- [ ] Channel abstraction verified: campaign flows channel-agnostic. ✅
- [ ] Timeline entries enumerated for every user-visible action. ✅
- [ ] Zero code. ✅
- [ ] Sign-off: CPO, Principal Architects (Software, Security), Engineering Director; Qwen review against Doc 7 + CC-001/CC-002 log.

---

[AWAITING APPROVAL]
