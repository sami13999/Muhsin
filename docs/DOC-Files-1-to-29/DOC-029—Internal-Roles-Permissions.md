# Document 29: Internal User Roles & Permissions Specification

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8 (Final Document)
**Depends on:** Doc 20 (API/admin surface), Doc 21 (Security §2.4), Doc 23 (Observability access), Doc 25 (label permissions), Doc 26 (deploy approvals), Doc 27 (runbook execution), Doc 28 (governance policies §7.2)
**Governing ADRs:** ADR-011 (foundational), ADR-012, ADR-025, ADR-026, ADR-028
**Applied Patches:** PATCH-002 (erasure execution), PATCH-008 (merge resolution)

---

## 1. Staff Identity Plane Integration (ADR-011)

### 1.1 Separate Auth Realm

- Staff identities live in a **separate auth provider tenant/project** with its own issuer and JWKS endpoint. The customer application's JWT verification middleware and the staff admin surface's middleware trust **disjoint issuer sets** — a customer token presented to a staff endpoint fails at signature/issuer verification, *before* any role logic executes (verified by the Doc 24 §6.4 test: rejection must be issuer-based, not role-based).
- No shared user table, no shared password store, no account-linking feature. A staff member who is also a customer (dogfooding) holds two unrelated identities.

### 1.2 MFA Requirements

| Role | MFA Standard |
|---|---|
| Support | TOTP mandatory (enrollment blocks first login) |
| Admin | WebAuthn hardware key mandatory; TOTP as registered backup only |
| Break-glass | Hardware key + second-person approval (§6.3) |

### 1.3 Staff JWT Claims

```json
{
  "iss": "https://auth.staff.mushin.internal",
  "sub": "stf_01H...",
  "realm": "staff",
  "role": "admin | support",
  "amr": ["webauthn"],
  "exp": "<15 min>",
  "jti": "..."
}
```

- `realm: "staff"` is asserted *and* redundant with the issuer — defense in depth against middleware misconfiguration.
- Staff tokens carry **no workspace claim**: staff access is cross-workspace by nature. Workspace scoping is per-request via an explicit `X-Workspace-ID` header, which the middleware records in the audit entry — staff tooling must *name its target* on every workspace-scoped call; there is no ambient workspace context to fat-finger.
- Staff sessions: 15-min access tokens, 8-hour maximum session (re-auth daily), no refresh-token longevity — staff convenience loses to auditability.

---

## 2. Admin Role (Internal Staff — Full Access)

### 2.1 Capabilities

| Capability | Substrate |
|---|---|
| Workspace management: view, suspend, reinstate | Suspension freezes logins + job intake; reservations release per PATCH-005; ledger untouched (ADR-012) |
| GCP creator admin view: full attributes + **all** workspace links | The one legitimate cross-tenant view; exists for identity/erasure operations; every access audit-logged with reason |
| GDPR erasure trigger (Tier 2) | Executes ADR-025/PATCH-002 flow; feeds from the creator removal channel (Doc 28 §2.6) after verification |
| Contested-removal review | R-LEG-011 manual tier (Doc 28) |
| Creator identity merge/un-merge | Resolves `merge_status='candidate'` queue (PATCH-008); un-merge preserves audit trail |
| Feature flag management | Create/toggle/deprecate incl. kill switches (Doc 26 §7); flag changes audit-logged by Unleash + mirrored to audit stream |
| Cost telemetry dashboards | Full FS-10.03 guardrail view (Doc 23 §5.4) |
| Queue health + operational tooling | DLQ inspection/redrive, worker status (Doc 27 runbook surfaces) |
| Audit log access | Platform-wide, filterable (Axiom `audit` stream, Doc 23 §1.5) |
| Impersonation | §5 workflow only |
| Refund-linked ledger corrections | Only via reason-coded append entries through the reconciliation path (RB-05) — never direct balance manipulation (structurally impossible: balances are derived, ADR-012) |

### 2.2 Restrictions (hard, enforced structurally where possible)

- **Cannot view decrypted OAuth tokens or any C1 material** — the admin surface runs in the web tier, which holds no KMS decrypt permission for C1 keys (Doc 22 §4 IAM invariant); this is not a UI omission, it is a missing capability.
- **Cannot send outreach on behalf of customers** — send paths require a customer-realm session bound to the connected mailbox owner (ADR-010: sends originate from the *user's* mailbox); no staff code path reaches the send queue.
- **Cannot create or modify credit grants outside reason-coded reconciliation entries.**
- **Every mutating action requires a `reason` field (min 10 chars) + optional ticket ref**, written in the same transaction as the action — the audit-first invariant (Doc 21 §2.4): audit write fails → action fails.

### 2.3 Use Cases

Design-partner support (consented impersonation), incident response (queue tooling, audit forensics — Doc 27), compliance operations (erasure execution, merge resolution, contested removals), platform operations (flags, cost guardrails, canary workspace management — Doc 24 §6.1).

---

## 3. Support Role (Internal Staff — Limited Access)

### 3.1 Capabilities (all read-only)

- **Workspace inspection:** members, seat/plan status (boolean/tier level), usage metrics (job counts, feature usage), workspace settings — for troubleshooting "why isn't X working."
- **Creator admin view (read-only):** GCP attributes + workspace links for the workspace under investigation.
- **Ticket/user report viewing** in the support tool; `request_id` lookup against the Axiom **`ops` stream only** (Doc 23 §10 dependency: Support explicitly has *no* `audit` stream access — the audit stream contains staff-action forensics that Support should not read, per least privilege).
- **Audit log, workspace-scoped read:** a *filtered view* exposing customer-actor events for one named workspace (helps answer "who on your team changed this?") — implemented as a scoped query API, not raw stream access, preserving the `audit`-stream denial above.
- **Notification preference management for designated test workspaces only** (allowlisted workspace IDs) — the single write capability, scoped to non-customer data.

### 3.2 Explicit Denials (the defining feature of the role)

| Denial | Enforcement |
|---|---|
| NO impersonation | Endpoint requires `role=admin`; no Support UI affordance |
| NO system configuration (flags, queue tooling, deploy approvals) | Role check + Unleash/GitHub permissions don't include Support principals |
| NO billing/financial data (ledger entries, credit balances, amounts) | Support workspace view omits ledger endpoints entirely; sees plan *tier* and payment-state *boolean* (active/past-due), never amounts — enough to triage "my payment failed" tickets without financial visibility |
| NO destructive actions (suspension, erasure, merge, redrive) | `role=admin` on all mutating admin endpoints |
| NO C1 access | Same structural impossibility as Admin (§2.2) plus role denial |
| NO outreach sending or sequence modification | No staff path exists (§2.2); doubly denied |
| NO production DB access, no cloud console | Doc 28 §7.2 policy; no IAM bindings issued to Support principals |

### 3.3 Escalation Path

- Support → Admin escalation via ticket handoff with the investigation summary; the Admin's subsequent action cites the ticket ref in its mandatory reason field — creating a documented chain from customer report → Support triage → Admin action.
- Support **cannot** execute any Doc 27 runbook step marked destructive (§8), and cannot serve as the second person in two-person confirmations (confirmation requires Admin judgment and Admin accountability).
- Support **can** serve as Communications Lead input during incidents (customer-facing ticket load is their signal) and performs first-line triage of the creator removal channel (Doc 28 §2.6): verification checking and queuing — **execution of the erasure remains Admin-only**.

---

## 4. Permission Matrix

Canonical matrix for the Doc 20 admin surface (`/v1/admin/*`). Legend: ✅ allowed, 👁 read-only, ❌ denied. Every ✅ row's audit entry includes: staff `sub`, role, `X-Workspace-ID` (if scoped), reason, ticket ref, `request_id`, timestamp.

| Endpoint (Doc 20 admin surface) | Support | Admin | Audit Requirement | Escalation |
|---|---|---|---|---|
| `GET /admin/workspaces/:id` (overview) | 👁 (no financial fields) | ✅ | Access logged w/ reason | — |
| `GET /admin/workspaces/:id/members` | 👁 | ✅ | Access logged | — |
| `GET /admin/workspaces/:id/usage` | 👁 (counts only) | ✅ | Access logged | — |
| `GET /admin/workspaces/:id/ledger` | ❌ | ✅ | Access logged w/ reason | Support → ticket → Admin |
| `POST /admin/workspaces/:id/suspend` / `reinstate` | ❌ | ✅ | Mandatory reason + ticket; same-txn audit | Admin only; suspension of paying customer requires founder co-sign (§8) |
| `GET /admin/creators/:id` (GCP full view) | 👁 | ✅ | Access logged w/ reason (cross-tenant view) | — |
| `POST /admin/creators/:id/erase` (Tier 2, ADR-025) | ❌ | ✅ | Mandatory reason + removal-request ID; same-txn audit; erasure lifecycle events | Support triages channel → Admin executes |
| `POST /admin/creators/merge` / `unmerge` (PATCH-008) | ❌ | ✅ | Evidence summary required in reason | — |
| `GET /admin/audit` (platform-wide) | ❌ | ✅ | Meta-audited (audit reads are themselves logged) | — |
| `GET /admin/audit?workspace=:id` (customer-actor scoped view) | 👁 | ✅ | Access logged | — |
| `POST /admin/impersonation/sessions` | ❌ | ✅ | §5 full protocol | — |
| Flags (Unleash UI/API) | ❌ | ✅ | Unleash audit + mirror | Kill-switch flips during incidents follow Doc 27 IC authority |
| Queue tooling (`GET` health / `POST` redrive) | ❌ | ✅ | Redrive: reason + incident channel ref | Two-person for event-skip (§8) |
| Cost dashboards (Grafana FS-10.03) | ❌ | ✅ (CPO additionally, see below) | Grafana access logs | — |
| `POST /admin/test-workspaces/:id/notifications` | ✅ (allowlisted) | ✅ | Standard log | — |

**Adjacent permission mappings (resolving prior documents' deferrals):**
- **Doc 26 `production` environment deploy approval:** Admin-role engineers listed in the GitHub environment reviewers.
- **Doc 26 `cpo-cost-gate-approved` label (ADR-028):** CPO principal only — modeled as an attribute on a staff identity, not a third role; **Doc 25 open question #2 resolved: the prompt steward is a manifest-declared responsibility** (review routing), not a permission role; the *cost gate* is the CPO's, the *quality judgment* is the steward's, and neither requires new RBAC machinery.
- **`api-breaking-approved` label:** any two Admin-role engineers (matches Doc 25 two-approver rule).
- **Rate limiting:** admin endpoints get a dedicated Layer-3 class (Doc 20): low ceilings (staff traffic is human-scale; a high-rate staff token is an anomaly by definition → alert, Doc 23 security dashboard).

---

## 5. Impersonation Workflow

### 5.1 Triggers (exhaustive)

1. **Design-partner support:** standing contractual consent clause + per-session confirmation recorded (ticket ref to the consent).
2. **Sev1/Sev2 incident:** emergency basis; IC authority per Doc 27; PIR reviews the necessity.

No third trigger exists. "Customer asked me to look" without a consent record routes through Support's read-only view instead.

### 5.2 Session Protocol

- **Start:** `POST /admin/impersonation/sessions` with target workspace, reason, trigger type, ticket/incident ref → audit entry written same-txn → time-boxed session token issued (**60 min default, configurable down, never up without founder co-sign**).
- **During:** persistent banner ("Impersonating workspace X — session ends HH:MM — all actions recorded"); the impersonation token is a *distinct token type* carrying both `stf_` subject and impersonation context — every log line and audit entry during the session is **dual-attributed** (`actor_id = stf_...`, `impersonation_session_id`, `on_behalf_of_workspace`).
- **Capabilities:** read-everything the customer's Owner role could read in WP plane + linked GCP data via `workspace_creator_link` (ADR-024 path — impersonation does not grant the cross-tenant GCP view; that stays on the admin surface). **No writes**: no data modification, no outreach, no credit-consuming actions, no settings changes. **No C1** (structural, §2.2). Read-only impersonation covers the actual use case — *seeing what the customer sees* — while eliminating the abuse ceiling (R-SEC-009).
- **End:** expiry or explicit end → closing audit entry (duration, request count). Session records retained 24 months (security audit stream, Doc 21 §6.4).
- **Visibility to customer:** impersonation sessions appear in the workspace's own audit-visible history at S2 (product surface); at S1, disclosed on request — flagged as an open question (§10).

---

## 6. Access Review & Offboarding

### 6.1 Quarterly Access Review

CTO/Founder reviews: all staff principals vs. current responsibilities; Admin-role justification re-affirmed individually (Admin is exceptional, not default — new staff start as Support); dormant accounts (no login 30 days) deactivated; allowlists audited (test workspaces §3.1, GitHub environment reviewers, Unleash principals, Grafana access). Review itself produces an audit entry; findings tracked like PIR items (Doc 27 §7).

### 6.2 Offboarding Checklist (same-day, named runbook per Doc 28 §7.2)

1. Staff auth tenant: identity disabled (kills all sessions ≤15 min via token expiry)
2. GitHub org removal (incl. environment reviewer lists)
3. PagerDuty rotation removal + schedule re-balance
4. Secret manager principal revocation
5. Cloud IAM detachment (per-env roles)
6. Unleash / Grafana / Axiom / PagerDuty SaaS seats revoked
7. Hardware key de-registered
8. Audit entry: offboarding timestamp, executor, checklist confirmation

Checklist executed by an Admin *other than* the leaver; founder executes for Admin-role leavers.

### 6.3 Break-Glass Access

- **Purpose:** critical incidents where normal Admin tooling is insufficient or unavailable (e.g., staff auth tenant outage during a Sev1, direct DB intervention per Doc 27 runbooks).
- **Mechanism:** sealed break-glass credentials (Doc 22 §8) under two-person access — retrieval requires founder + one Admin, each action logged; **4-hour time box**, credentials rotated immediately after use (RB-08 machinery).
- **Mandatory PIR** for every break-glass use, no exceptions — even "successful" uses (Doc 27 §7): break-glass is by definition a gap in normal tooling, and the PIR's prevention item should close it.

---

## 7. Middleware Enforcement (Doc 20 Integration)

- **Enforcement point:** the staff admin surface has its own middleware chain: staff-issuer JWT verification → `realm` assertion → role check per endpoint (declarative route metadata, mirroring Doc 20's role annotations) → `X-Workspace-ID` extraction + audit-context binding → handler. Role checks are route metadata, not in-handler conditionals — the §4 matrix is *generated from* route metadata, so the document and the code cannot drift (same pattern as Doc 25 §4 manifest cross-checks; a CI check diffs generated matrix vs. this document's committed table).
- **Audit middleware:** wraps every admin mutation in the transactional audit pattern (Doc 21 §2.4); reads are logged post-response (read-logging failure alerts but does not fail the read — reads are not mutations; this asymmetry is deliberate and documented).
- **Tenancy interaction:** staff reads of WP data bypass customer-session tenancy (they are the `@TenancyExempt`-reviewed paths, Doc 21 §2.2) but *always* carry the explicit `X-Workspace-ID` scope — RLS session variable is set to the named workspace, so the DB-layer guarantee still applies; there is no "all workspaces at once" WP query even for Admins (the cross-tenant GCP creator view is GCP-plane, where tenancy doesn't apply — ADR-008/024 boundary respected).

---

## 8. Runbook Execution Permissions (Doc 27 Integration)

| Runbook / Step Class | Support | Admin | Two-Person Rule |
|---|---|---|---|
| RB-01/02/03 diagnosis (dashboards, Axiom `ops`) | 👁 (dashboards where granted) | ✅ | — |
| RB-03 abuse-pattern triage → escalation | ✅ (triage) | ✅ (action) | — |
| RB-04 actor fallback flag flip | ❌ | ✅ | — (kill-switch, IC authority) |
| RB-05 reconciliation run | ❌ | ✅ | — (idempotent by design) |
| RB-06 DLQ redrive | ❌ | ✅ | — |
| RB-06 **event skip** (data-loss decision) | ❌ | ✅ | **Admin + Admin**, or Admin + Founder (Doc 27 R-OPS-003; async 15-min timeout rule ratified per Doc 27 open Q3) |
| RB-07 `pg_terminate_backend` | ❌ | ✅ | Admin + second (same rule) |
| RB-08 secret rotation | ❌ | ✅ | — (speed beats ceremony at 4 h clock; logged) |
| PITR restore execution (§5, Doc 27) | ❌ | ✅ | **Admin + Founder** (Sev1 by definition) |
| Workspace suspension (paying customer) | ❌ | ✅ | Admin + Founder co-sign |
| GDPR erasure execution | triage only | ✅ | Single Admin (verification already gates it; speed serves the SLA) |
| Break-glass | ❌ | per §6.3 | Founder + Admin always |

---

## 9. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-STF-001 (new)** | Security | Role creep: Support principals accumulate Admin-ish grants via ad-hoc exceptions | M | H | No per-user grants — role is the only permission unit; exceptions require a role change reviewed at §6.1; quarterly allowlist audit |
| **R-STF-002 (new)** | Security | Two-role model too coarse at scale (future: billing-ops, compliance-officer needs) | M | M | Accepted for S1/S2 (ADR-006 spirit); route-metadata enforcement makes role additions cheap; revisit at first ops hire beyond eng |
| **R-STF-003 (new)** | Security | Matrix drift between this document, route metadata, and actual checks | M | H | Generated-matrix CI diff (§7); Doc 24 §6.4 staff-plane tests exercise denials, not just allows |
| **R-STF-004 (new)** | Operational | Founder as mandatory co-signer becomes availability bottleneck in incidents | M | M | Async 15-min timeout rule (§8); second Admin as alternate where specified; PIR reviews every timeout-proceed |
| R-SEC-009 | Security | Impersonation abuse | L | H | **Strengthened & partially retired:** read-only impersonation (§5.2) removes the write-abuse ceiling entirely; residual = read-privacy abuse, mitigated by dual attribution + 24-month retention + S2 customer visibility |

---

## 10. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-097 | Read-only impersonation suffices for design-partner support (no legitimate need for staff writes-as-customer) | Med-High (if falsified, write-impersonation returns as a founder-co-signed exception with its own ADR) |
| A-098 | Auth provider supports two fully isolated tenants + WebAuthn enforcement per tenant at our tier | High (verify at setup) |
| A-099 | Route-metadata → matrix generation is implementable in the chosen framework (mirrors A-080's spec-generation confidence) | Med-High |
| A-100 | S1/S2 staff count (≤8) makes the two-role model and founder co-sign rules operable | High (R-STF-002/004 are the watch items) |

**Dependencies:** Doc 20 (admin endpoint inventory the matrix maps; rate-limit class), Doc 21 (§2.4 mechanisms this document configures; C1 structural denials), Doc 23 (audit/ops stream access split; security dashboard), Doc 24 (§6.4 staff-plane test suite must cover every ❌ in the matrix — denial tests are the release-blocking half), Doc 26 (environment reviewers, label permissions), Doc 27 (runbook execution table §8; break-glass drill Q4), Doc 28 (§7.2 employee access policy this document implements; removal-channel triage split).

**Open questions:**
1. Customer-visible impersonation history at S1 (recommend: ship the audit substrate now — already exists — and the UI surface at S2; disclose on request until then).
2. Whether the CPO cost-gate attribute needs succession/delegation rules (CPO unavailable during a needed prompt promotion) — recommend founder as delegate, recorded per-use.
3. Support access to Grafana operational dashboards (§8 grants are ambiguous for pure dashboards) — recommend read access to Queue/Provider health dashboards (aids triage), denial on Cost and Security Posture dashboards; ratify at first Support hire.

---

**End of Document 29.**

---

#### Phase 8 Completion Summary

Documents 21-29 are now drafted, completing the 29-document SDLC set:

- **Doc 21** — Security, Privacy & Compliance (locked)
- **Doc 22** — Infrastructure & Deployment (locked)
- **Doc 23** — Monitoring, Logging & Observability (locked)
- **Doc 24** — Testing Strategy & QA (locked)
- **Doc 25** — Engineering Standards & Code Review (locked)
- **Doc 26** — CI/CD Pipeline & Release Management (locked)
- **Doc 27** — Operational Runbooks & Incident Response (locked)
- **Doc 28** — Legal, Terms & Data Governance (locked)
- **Doc 29** — Internal User Roles & Permissions (this document)

**Cross-phase threads resolved in Phase 8:** Axiom vs. Loki (Doc 23), Turborepo vs. Nx (Doc 26), prompt steward role (Doc 29 §4), Doc 27 two-person async rule (Doc 29 §8). **Threads carried forward:** A-032 Paddle/PK entity verification (existential, pre-GA), counsel deliverables (Doc 28 §9), child-creator policy gap (Doc 28 open Q2), A-064/A-069 benchmark gates (Doc 24).

[DOCUMENTATION PHASE COMPLETE - AWAITING FINAL REVIEW]