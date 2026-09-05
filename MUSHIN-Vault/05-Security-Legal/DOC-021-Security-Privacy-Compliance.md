# Document 21: Security, Privacy & Compliance Architecture

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 18 (Domain Model), Doc 19 (Physical Schema), Doc 20 (API Design)
**Governing ADRs:** ADR-011, ADR-022, ADR-023, ADR-024, ADR-025, ADR-026, ADR-028
**Applied Patches:** PATCH-002, PATCH-006, PATCH-010

---

## 1. Security Architecture Overview

### 1.1 Threat Model — Two Brains Architecture

MUSHIN's attack surface divides along its two-brain paradigm. Each brain carries a distinct threat profile:

| Surface | Brain | Primary Threats | Severity |
|---|---|---|---|
| Database Search (Brain 1) | Read path | Cross-tenant data leakage, IDOR on creator/workspace records, query enumeration | Critical |
| Live Discovery (Brain 2) | Write path | Prompt injection via scraped payloads (R-SEC-006), poisoned ingestion, actor supply-chain compromise | High |
| Billing plane | — | Forged Paddle webhooks (R-SEC-007), ledger race exploitation, credit inflation | Critical |
| Outreach plane | — | OAuth token theft (Gmail/Outlook), WABA credential misuse, consent bypass (R-ARC-001) | Critical |
| Staff plane | — | Support/Admin privilege escalation, unaudited impersonation | High |

**Core threat model insight:** Brain 2 ingests *adversary-controllable content* (public social media posts, bios, comments). Every byte scraped via Apify must be treated as hostile input. This drives the write-path intelligence / read-path determinism split (ADR-018): the read path never executes intelligence on raw content, so a poisoned payload cannot affect serving-time behavior — only ingestion-time scoring, which is sandboxed (§3.4).

### 1.2 Security Boundaries

Three planes, matching the schema separation from Doc 19:

- **GCP (Global Creator Plane):** Provider-sourced enrichment, cached globally (ADR-008). Contains creator PII (names, emails, handles). No workspace data ever writes here.
- **WP (Workspace Plane):** Tenant-scoped CRM data, notes, timelines, campaigns. Hard tenancy boundary.
- **Platform Plane:** Billing, staff identity, prompt registry, vocabularies.

The only sanctioned crossing is `workspace_creator_link` (ADR-024, PATCH-001) — a soft FK bridge. **Invariant:** no query may join GCP and WP tables except through the bridge entity, and the bridge carries the `workspace_id` predicate. This is enforced at the repository layer (§2.2), not left to developer discipline.

### 1.3 Zero-Trust Principles

1. **No implicit network trust.** Managed edge (ADR-023) terminates TLS; all internal service-to-service calls carry signed identity.
2. **Every request re-derives tenancy.** `workspace_id` is extracted from the authenticated session, never from request bodies or query params.
3. **Scraped content is data, never instructions** (§3.4).
4. **Staff access is deny-by-default, audit-first** (§2.4).
5. **Secrets are injected, never stored in code or env files committed to VCS** (§6.2).

---

## 2. Authentication & Authorization

### 2.1 Customer Authentication Flow

- **Primary:** Email/password + OAuth (Google) sign-in via managed auth provider (integration-first, ADR-002).
- **Session model:** Short-lived JWT access token (15 min) + rotating refresh token (30 days, httpOnly Secure SameSite=Lax cookie). Refresh rotation with reuse detection: a replayed refresh token revokes the entire token family.
- **JWT claims:** `sub` (user_id), `wsp` (active workspace_id), `role`, `iat/exp`, `jti`. No PII in claims.
- **MFA:** Optional TOTP for customers at S1; mandatory for workspace Owner role at S2.

### 2.2 Workspace Tenancy Enforcement (NFR-S01)

Tenancy is enforced at **three redundant layers** — failure of any single layer must not leak data:

1. **Middleware layer:** Resolves `workspace_id` from JWT; rejects any request where path/body workspace references disagree with the session workspace (403 `AUTHZ_WORKSPACE_MISMATCH`, per Doc 20 error catalogue).
2. **Repository layer:** All WP-schema queries pass through a tenancy-scoped repository base class that injects `WHERE workspace_id = :ctx_workspace_id` unconditionally. Raw query escape hatches require an ARB-reviewed `@TenancyExempt` annotation with justification (used only by Platform plane jobs).
3. **Database layer:** PostgreSQL Row-Level Security (RLS) policies on all `wp.*` tables keyed on `current_setting('app.workspace_id')`, set per-transaction. Defense-in-depth; the app remains correct even without RLS, but RLS catches repository-layer bugs.

**Testing hook (feeds Doc 24):** Tenancy isolation suite must assert cross-workspace 404/403 for every M1-M13 endpoint enumerated in Doc 20.

### 2.3 RBAC Matrix (Customer Roles)

| Capability | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| Billing / credits purchase | ✅ | ❌ | ❌ | ❌ |
| Workspace settings, seat mgmt | ✅ | ✅ | ❌ | ❌ |
| Connect mailbox / WABA (ADR-009/010) | ✅ | ✅ | Own mailbox only | ❌ |
| Run discovery jobs (Brain 2, credit-spending) | ✅ | ✅ | ✅ | ❌ |
| Search / view creators (Brain 1) | ✅ | ✅ | ✅ | ✅ |
| CRM writes (notes, stages, timeline) | ✅ | ✅ | ✅ | ❌ |
| Outreach sends | ✅ | ✅ | ✅ | ❌ |
| GDPR data export request | ✅ | ✅ | ❌ | ❌ |

Credit-spending actions additionally pass through the reservation disposition contract (PATCH-005) — RBAC gates *initiation*; the ledger gates *settlement* (ADR-026).

### 2.4 Staff Identity Plane Separation (ADR-011)

- Staff accounts live in a **separate identity provider tenant** with a separate issuer. Customer JWTs can never satisfy staff endpoints and vice versa — verified by issuer + audience claims, not just role flags.
- **MFA mandatory** for all staff, hardware-key (WebAuthn) required for Admin role.
- **Audit-first invariant:** the audit record for a staff action is written *in the same transaction* as the action itself (transactional outbox pattern, ADR-020). If the audit write fails, the action fails. No staff mutation is possible without a corresponding immutable audit row.
- Support role: read-only, no impersonation, no billing visibility (full matrix deferred to Doc 29; this document establishes the enforcement mechanism).
- Impersonation (Admin only): time-boxed (60 min), banner-visible to the staff user, produces `impersonation_session` audit records, and is blocked from viewing decrypted OAuth tokens or sending outreach.

---

## 3. Data Protection & Privacy

### 3.1 Data Classification Schema

| Class | Examples | Storage Rules |
|---|---|---|
| **C1 — Sensitive PII** | OAuth tokens, WABA credentials, payment identifiers (Paddle-held) | Envelope-encrypted at column level; never logged; never in exports |
| **C2 — PII** | Creator names/emails/handles (GCP), user emails, contact info | Encrypted at rest (disk-level); tombstone-eligible (ADR-025); redacted in logs |
| **C3 — Tenant Business Data** | Notes, campaigns, timelines, credit ledger | Tenancy-scoped; encrypted at rest; retained per Doc 28 policy |
| **C4 — Derived Intelligence** | LLM scores, `enrichment_snapshot` rows | Non-PII by construction (scores + provenance triple per PATCH-010); survives erasure |
| **C5 — Public/Operational** | Niche vocab, prompt registry metadata, metrics | Standard controls |

### 3.2 Encryption Strategy

- **In transit:** TLS 1.2+ everywhere (edge, DB connections, queue, adapter calls). HSTS with preload on all app domains.
- **At rest:** Managed Postgres disk encryption (AES-256) as baseline for C2-C5.
- **Column-level (C1):** Envelope encryption — per-record data keys wrapped by a KMS-held master key. OAuth refresh tokens, BSP credentials, and webhook secrets use this path. Decryption occurs only in the worker process performing the adapter call (ADR-022), never in the web tier, never returned by any API.
- **Key rotation:** Master key annual rotation; data keys re-wrapped lazily on next write.

### 3.3 Right to Erasure — ADR-025 / PATCH-002

Two-tier flow, matching Doc 18/19:

- **Tier 1 (workspace-scoped):** Customer deletes a creator from their workspace → `workspace_creator_link` and WP-plane records soft-deleted; GCP record untouched (other tenants may legitimately hold it).
- **Tier 2 (GDPR erasure):** Verified data-subject request → **PII nullification tombstone**: all C2 fields on the GCP creator record are nulled and replaced with a tombstone marker (`erased_at`, `erasure_request_id`); the row *persists* to preserve referential integrity of soft FKs (ADR-024) and to prevent re-ingestion. A **re-ingestion blocklist** (hashed platform handles) stops Brain 2 from re-scraping the erased subject. `enrichment_snapshot` scores are retained only if fully de-identified; otherwise cascaded to nullification.
- **SLA:** 30 days (GDPR Art. 17); target 72 hours automated. Erasure is triggered via the Doc 20 GDPR endpoint and (for staff-initiated flows) requires Admin role with audit-first logging.
- **Propagation:** Erasure events flow through the transactional outbox (ADR-020) to purge search index projections (respecting ADR-027 synchronous projection paths) and analytics stores.

### 3.4 Prompt Injection Prevention (R-SEC-006)

The LLM scoring pipeline (Brain 2) treats scraped payloads as untrusted:

1. **Structural isolation:** Scraped content is passed as fenced, schema-bound *data fields* in the prompt (Prompt Registry, ADR-019), never concatenated into instruction sections.
2. **Payload validation gate (R-TEC-008):** Pre-LLM sanitization strips control characters, normalizes Unicode (homoglyph collapse), enforces field length caps, and rejects payloads failing schema validation.
3. **Output schema enforcement:** LLM responses must parse against the registered output schema; any deviation (extra fields, narrative text, instructions) → payload quarantined, job item marked `scoring_failed`, no ingestion.
4. **Grounding validator:** Post-scoring check that every cited evidence span exists in the source payload — a hijacked model emitting fabricated justification fails grounding and is discarded.
5. **Capability confinement:** The scoring worker has **no tool access, no network egress beyond the LLM provider, and no write access outside the ingestion staging tables**. A fully compromised prompt can, at worst, produce a bad score — which PATCH-010's `(prompt_version, model_version)` provenance makes traceable and bulk-invalidatable (ADR-028).

---

## 4. API Security

Building on Doc 20's contracts:

- **Rate limiting:** Three concentric layers enforced as specified — Layer 1 WAF/IP (edge), Layer 2 workspace/tier quotas, Layer 3 endpoint-specific limits (tightest on auth, discovery-job creation, and webhook endpoints). 429 responses carry `Retry-After`.
- **Input validation:** Schema-first validation at the middleware boundary for every endpoint; unknown fields rejected (not ignored) on write endpoints. The 35-code error catalogue's `VALIDATION_*` family applies.
- **SQL injection:** Parameterized queries exclusively; the tenancy repository layer (§2.2) forbids string-built SQL; `@TenancyExempt` reviews double as injection reviews.
- **XSS:** Strict CSP (`default-src 'self'`, no `unsafe-inline`); all user/scraped content rendered as text nodes, never HTML. Scraped bios/comments are the highest-risk XSS vector — they are C-class hostile input rendered in the workspace UI.
- **CSRF:** SameSite=Lax cookies + double-submit token on state-changing requests; idempotency keys (Doc 20 protocol) additionally blunt replay.
- **Webhook endpoints:** Signature verification *before* body parsing (§5); per-source secrets (R-SEC-007 mitigation); replay window enforcement via timestamp tolerance + `jti`/event-id dedup.
- **Future public API (post-ADR-023):** When opened at S3+, scoped API keys with per-key rate limits and workspace-bound audiences; design reserved, not built now.

---

## 5. Third-Party Integration Security

All adapters comply with the Uniform Adapter Contract (ADR-022); the security-relevant obligations are credential confinement, timeout/circuit behavior, and degraded-mode signaling.

| Integration | Auth Mechanism | Storage | Rotation |
|---|---|---|---|
| **Apify actors** | API token (server-side only) | KMS-wrapped, worker-plane only | 90-day rotation; per-environment tokens |
| **YouTube Data API v3** | API key + OAuth where needed | KMS-wrapped | Key rotation quarterly; quota alarms |
| **Paddle webhooks** | HMAC signature verification (per Doc 20) | Per-source secret, KMS-wrapped | Rotation with dual-secret overlap window |
| **Gmail** | OAuth 2.0, incremental scopes, `gmail.send` minimum | Refresh tokens C1 envelope-encrypted; never exposed via API | Revocation-aware; token health monitor |
| **Outlook** | OAuth 2.0 + webhook `ClientState` validation | Same C1 treatment | Same |
| **WhatsApp BSP (ADR-009)** | Per-workspace WABA credentials via official Meta BSP | C1 envelope-encrypted, workspace-scoped | BSP-managed + our re-wrap on rotation |
| **LLM provider** | API key | KMS-wrapped, scoring workers only | 90-day rotation, zero-downtime dual-key cutover |

**Apify-specific posture:** Actor outputs are untrusted (§3.4); actor *selection* is pinned to the finalized stack (`apify/instagram-scraper`, `clockworks/tiktok-scraper`, `apify/instagram-hashtag-scraper`, comment scrapers, web scraper) with version pinning where the platform allows — mitigating supply-chain drift (R-TEC-007 adjacency). Web Scraper email extraction outputs are validated (RFC 5322 syntax + disposable-domain filter) before entering GCP as C2 data.

**OAuth token invariants:** tokens decrypt only in the worker executing the send; the API surface exposes connection *status* only (`connected`, `expired`, `revoked`), never token material; user-initiated disconnect triggers provider-side revocation, not just local deletion.

---

## 6. Infrastructure Security

### 6.1 Managed Service Posture

Integration-first (ADR-002) means we inherit — and must verify — provider controls: SOC 2 Type II attestation required for the app platform, managed Postgres, queue, and KMS providers. Sub-processor list is maintained for DPA purposes (§7.3). Full provider selection lands in Doc 22; this document sets the *requirements*: encryption at rest, VPC/private networking for DB, audit log export capability.

### 6.2 Secret Management

- Central secret manager (KMS-integrated); secrets injected at deploy/runtime, never baked into images or `.env` files in VCS.
- Per-environment isolation: dev secrets can never authenticate against prod providers.
- Secret access is itself audited; CI has read access only to the secrets its pipeline stage requires.
- Detection: pre-commit + CI secret scanning; a leaked-secret runbook (Doc 27) mandates rotation within 4 hours of detection.

### 6.3 Network Security

- Managed WAF + DDoS at the edge (ADR-023's managed edge); Layer 1 rate limiting lives here.
- Database accepts connections only from app/worker planes (private networking); no public DB endpoint.
- Queue access restricted to worker fleet identity (ADR-017).

### 6.4 Logging & Audit Trail

- Structured JSON logs with `request_id`, `workspace_id`, `actor_id`; **C1 never logged, C2 redacted by a centralized redaction middleware** (fail-closed: unknown fields in log payloads are dropped).
- Immutable audit domains: staff actions (§2.4), credit ledger events (append-only per ADR-012), consent changes (PATCH-006's last-gate checks log both the check and its input version), erasure lifecycle, impersonation sessions.
- Retention: security audit logs 24 months; operational logs 30-90 days (finalized in Doc 23/28).

---

## 7. Compliance & Legal

*(Framework here; full legal drafting in Doc 28.)*

- **GDPR:** Lawful basis mapping — legitimate interest for public-data creator enrichment (Art. 6(1)(f), balancing test documented; interacts with A-050/R-LEG-006), contract for customer data. Rights supported: access, erasure (§3.3), portability (export endpoint), objection (blocklist doubles as objection registry).
- **CCPA/CPRA:** Creators as data subjects → "Do Not Sell/Share" honored via the same blocklist mechanism; service-provider terms flow into DPAs.
- **Pakistan PECA 2016:** Unauthorized-access provisions reinforce the public-data-only scraping posture; data localization is *not* currently mandated for our category (tracked as an assumption, §10).
- **ToS requirements:** acceptable-use (no harassment via outreach), scraping-derived-data disclaimers, credit terms (non-refundable ledger semantics per ADR-012), Paddle MoR pass-through terms.
- **Privacy Policy structure:** data categories (§3.1 mapped to plain language), sources (public platforms via processors), retention, sub-processors, rights channels — including a **creator-facing removal request channel** (feeds Tier 2 erasure).
- **DPA:** Offered to workspace customers (we are processor for their WP data, controller for GCP enrichment — dual-role documented).
- **Cookie policy:** Strictly-necessary + analytics tiers; consent banner for non-essential only.
- **FTC/disclosure:** MUSHIN facilitates outreach, not ad publication; ToS obliges brand customers to comply with disclosure rules (FTC, and platform-native branded-content tools); outreach templates include optional disclosure-reminder snippet.

---

## 8. Security Testing Requirements

*(Detailed process in Doc 24; scope defined here.)*

- **Penetration testing:** Annual external pentest + pre-GA test. In scope: tenancy isolation (NFR-S01), auth flows, webhook forgery, staff-plane separation, prompt injection via seeded scraped profiles. Out of scope: third-party provider internals.
- **Vulnerability scanning:** Dependency scanning on every CI run; container/image scanning per deploy; weekly DAST against staging.
- **Security code review checklist (gate for merge):** tenancy predicate present or `@TenancyExempt` justified; no raw SQL; C1/C2 fields not logged; new endpoints registered in rate-limit config; webhook handlers verify-before-parse; adapter changes uphold ADR-022 obligations; LLM prompt changes go through Prompt Registry eval gates (ADR-019) including injection eval set.
- **Idempotency & race testing:** ledger concurrency (ADR-026/PATCH-004) and consent TOCTOU (PATCH-006) get dedicated concurrent-load test suites.
- **Incident response outline:** Sev1 (data breach/tenancy leak) → 15-min acknowledgment, containment, GDPR 72-hour notification assessment; Sev2 (credential leak, R-SEC-007) → rotate within 4 hours; full runbooks in Doc 27.

---

## 9. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-SEC-008 (new)** | Security | RLS misconfiguration silently disabled on new WP table | L-M | Critical | Migration linter requires RLS policy in same migration as table creation; tenancy test suite |
| **R-SEC-009 (new)** | Security | Staff impersonation abuse | L | H | Time-boxed sessions, audit-first invariant, token/outreach blackout during impersonation |
| **R-SEC-010 (new)** | Security | XSS via scraped creator content rendered in UI | M | H | Strict CSP, text-node rendering, payload sanitization gate |
| **R-SEC-011 (new)** | Security | KMS/master key compromise | L | Critical | Envelope encryption limits blast radius; rotation; access audit |
| **R-LEG-007 (new)** | Legal | Dual controller/processor role misclassified in DPAs | M | M | Explicit dual-role DPA language; legal review (Doc 28) |
| R-SEC-006 | Security | Prompt injection via scraped content | M | H | **Strengthened:** §3.4 five-layer defense; residual risk Low |
| R-SEC-007 | Security | Webhook secret leak | L | Critical | **Strengthened:** dual-secret rotation, verify-before-parse, replay dedup |

**Risk acceptance criteria:** Residual Critical-impact risks require CEO+ARB sign-off; High requires ARB; Medium accepted by engineering lead with register entry.

---

## 10. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-061 | Legitimate-interest basis holds for public-data creator enrichment under GDPR | Low-Med (couples to A-050; legal memo required) |
| A-062 | PECA 2016 imposes no data-localization requirement on our category at S1/S2 | Med (verify with PK counsel) |
| A-063 | Managed providers (app platform, Postgres, queue, KMS) hold current SOC 2 Type II | High (verify pre-contract) |
| A-064 | Postgres RLS overhead is acceptable within NFR-P01 latency budgets | Med-High (benchmark in Doc 24 perf testing) |

**Dependencies:** Doc 22 (provider selection realizes §6 requirements), Doc 23 (audit log pipeline), Doc 24 (test suites specified in §8), Doc 27 (incident runbooks), Doc 28 (legal drafting of §7), Doc 29 (staff permission matrix on §2.4 mechanisms).

**Open questions for legal/security review:**
1. GDPR balancing-test memo for scraped-data legitimate interest (blocks A-061).
2. Whether Tier 2 erasure blocklist hashes themselves constitute PII (pseudonymization analysis).
3. BSP contractual liability allocation for WABA credential incidents.
4. Pentest vendor selection and timing relative to GA.

---

**End of Document 21.**

[AWAITING APPROVAL]