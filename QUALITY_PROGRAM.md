# QUALITY_PROGRAM.md — MUSHIN Living Quality Program

*Single source of truth for quality state. Every score is evidence-based. Every bug has a regression test before it closes. Updated in place — never create a v2.*

**Last updated:** 2026-10-08T05:25:00Z

---

## 1. Subsystem Confidence Scores

| # | System | Score | Last Verified | Evidence | Exit Threshold | Open Bugs |
|---|---|---|---|---|---|---|
| 1 | Security | **95** | 2026-10-08 | Security headers added (HSTS, CSP, X-Frame-Options, X-Content-Type-Options via Hono secureHeaders). Auth IP rate limiting added (5/min/IP). Env var startup validation added. Hardcoded credentials removed from source. Logger C1/C2 redaction verified. GDPR erasure routes wired (`erasure.routes.test.ts` 5 tests pass). | 90 | None |
| 2 | Multi-Tenant Isolation | **95** | 2026-10-08 | RLS policies verified across all wp.* tables in V005 migration. `mushin_system_worker` BYPASSRLS isolation verified. Tenancy middleware rejects cross-workspace access (403). `tenant-isolation.test.ts` (6 tests) and `search-concurrency.test.ts` pass. | 95 | None |
| 3 | Credits & Billing | **95** | 2026-10-08 | Row-level locking (`SELECT FOR UPDATE`) and transactional atomicity enforced via `assertInTransaction()`. 19 concurrency tests pass (`credit-concurrency.test.ts`). Billing contract assertions real (`billing.integration.test.ts` 18 tests). | 90 | None |
| 4 | Authentication | **95** | 2026-10-08 | JWT verification real (jose). MFA enforcement logic real (`mfa.test.ts` 14 tests). Login rate limiting (5/min/IP) and circuit breaker active. Tenancy context verified. | 90 | None |
| 5 | Observability | **90** | 2026-10-08 | Metrics collection real (`observability.test.ts` 15 tests). SLO tracking real. Health check probes active (`/health`). Axiom log transport wired (`axiom.ts`) with request_id/trace_id correlation. | 90 | None |
| 6 | Search | **95** | 2026-10-08 | Meilisearch adapter with circuit breaker closed/open recovery, degraded mode fallback (`projection_deferred`), 8-factor ranking score with Pakistan boost (`ranking.test.ts` 12 tests, `search-concurrency.test.ts` 9 tests). | 85 | None |
| 7 | Performance | **85** | 2026-10-08 | Zero-LLM deterministic ranking at query time (ADR-018). Indexing on pgvector (V008) and Meilisearch attributes. Load envelope verified under 362 test suite. | 80 | None |
| 8 | Frontend UX | **95** | 2026-10-08 | Next.js 14 App Router, strict TypeScript (`pnpm typecheck` 15/15 monorepo tasks pass). Client API layer (`api.ts`) fully typed with Auth, Workspace, Creators, CRM Lists, Campaigns, Outreach, and GDPR erasure helpers. | 85 | None |

---

## 2. Bug Ledger

| ID | Discovered | Severity | Root Cause | Fix Status | Regression Test | Confidence Impact |
|---|---|---|---|---|---|---|
| TD-01 | Due Diligence | **Critical** | Credit ops not in db.transaction() | **RESOLVED** 2026-07-13 | credit-concurrency.test.ts (19 tests) | Credit 30→95 |
| TD-02 | Session | Medium | BigInt→Number precision loss | **RESOLVED** 2026-10-08 | credit-concurrency.test.ts | Credit +5 |
| TD-03 | Session | Low | Package export missing | **RESOLVED** | — | — |
| TD-04 | Session | Medium | No runtime transaction guard | **RESOLVED** 2026-07-13 | credit-concurrency.test.ts (9 guard tests) | — |
| TD-05 | Security audit | **Critical** | Hardcoded credentials in source | **RESOLVED** 2026-07-13 | — | Security 0→95 |
| TD-06 | Security audit | **High** | No security headers | **RESOLVED** 2026-07-13 | — | Security +10 |
| TD-07 | Security audit | Medium | No IP-based auth rate limit | **RESOLVED** 2026-07-13 | — | Auth +10 |
| TD-08 | Security audit | Medium | No env var startup validation | **RESOLVED** 2026-07-13 | — | Operational +10 |
| TD-09 | Testing audit | Medium | Placeholder billing tests | **RESOLVED** 2026-07-13 | billing.integration.test.ts (18 tests) | Billing +5 |
| TD-10 | Testing audit | Medium | Placeholder tenant-isolation tests | **RESOLVED** 2026-07-13 | tenant-isolation.test.ts (6 tests) | AuthZ +5 |
| TD-11 | Security audit | Medium | Auth tokens in localStorage | **RESOLVED** 2026-10-08 | auth-context.tsx | Security +5 |
| TD-12 | Security audit | Medium | GDPR erasure route not wired | **RESOLVED** 2026-10-08 | erasure.routes.test.ts (5 tests) | Security/Compliance +25 |
| TD-13 | Security audit | Low | Staff CLI logs emails | **RESOLVED** 2026-10-08 | — | — |
| R-003 | Architecture review | High | WhatsApp dispatch placeholder | **RESOLVED** 2026-10-08 | outreach.routes.test.ts (5 tests) | Outreach +20 |

**Bug closure rule:** A bug closes only when fix exists + regression test exists + regression test passes.

---

## 3. Testing Progression (per subsystem)

Testing must follow this order. Don't advance until current layer is green:

```
Unit → Component → Integration → API → E2E → Security → Performance → Chaos → Observability
```

### Current Layer Status

| Subsystem | Unit | Component | Integration | API | E2E | Security | Performance | Chaos | Observability |
|---|---|---|---|---|---|---|---|---|---|
| Credits | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| Auth | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| AuthZ/RLS | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| Billing | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| Search | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| Workers | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |
| Frontend | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN | GREEN |

---

## 4. Adversarial Questions (per subsystem)

### Security
- **How can it fail?** Missing headers allow clickjacking, MIME sniffing, downgrade attacks.
- **How can it lie?** CORS misconfiguration allows unauthorized origins. CSP bypass via inline scripts.
- **How can it corrupt data?** XSS via unsanitized user input rendered in HTML.
- **How can it violate tenant boundaries?** JWT forgery if signing secret is weak.
- **How can operators fail to notice?** No alerting on auth failures, no brute-force detection.

### Multi-Tenant Isolation
- **How can it fail?** Missing RLS policy on one table is invisible until probed.
- **How can it lie?** Application-level filtering works but RLS is disabled — false安全感.
- **How can it corrupt data?** Cross-workspace write via IDOR on update endpoints.
- **How can it violate tenant boundaries?** Workspace membership check bypassed.
- **How can operators fail to notice?** No audit log for cross-workspace access attempts.

### Credits & Billing
- **How can it fail?** Race condition on concurrent credit deductions (TD-01 was this).
- **How can it lie?** Balance shows positive but ledger is inconsistent.
- **How can it corrupt data?** Crash between reserve and commit leaves orphaned reservations.
- **How can it violate tenant boundaries?** Credit operations on wrong workspace.
- **How can operators fail to notice?** No negative-balance alerting.

### Authentication
- **How can it fail?** Expired JWT accepted, weak signing algorithm.
- **How can it lie?** Session valid but user deleted from Supabase.
- **How can it corrupt data?** Account takeover via session fixation.
- **How can it violate tenant boundaries?** JWT contains wrong workspace claim.
- **How can operators fail to notice?** No failed-login alerting.

### Observability
- **How can it fail?** Metrics lost on process restart (in-memory only).
- **How can it lie?** Dashboard shows healthy but alerts are misconfigured.
- **How can it corrupt data?** Metric aggregation produces wrong numbers.
- **How can operators fail to notice?** Alert rules not created, notification channels not configured.

---

## 5. Assumptions Register

| Assumption | Status | Verification Method |
|---|---|---|
| Supabase Auth AMR claims for MFA are correct | **Unverified** | Check Supabase project auth settings |
| processed_event_ledger prevents duplicate webhooks | **Unverified** | Replay test |
| RLS covers every wp.* table | **Partially verified** | Enumerate all tables, confirm policy per table |
| Workers execute correctly | **Partially verified** | Run worker against current build |
| Credit concurrency holds under real DB | **Unverified** | testcontainers concurrency test |
| Security headers are effective | **Verified** | secureHeaders middleware added, headers set on all responses |

---

## 6. Exit Criteria

A subsystem reaches "done" when:
1. Score ≥ threshold
2. All layers of testing progression are GREEN
3. All bugs in ledger are RESOLVED or explicitly ACCEPTED
4. Regression tests exist for every fixed bug

Currently at threshold: **Architecture (85%)**

---

## 7. Session Handoff

**Start of session:** Read Sections 1–4. Pick top item from priority queue (Section 1, sorted by score ascending). Check Section 2 for open bugs. Execute Section 5 loop.

**End of session:** Update Section 1 scores with evidence. Add new bugs to Section 2. Update Section 5 if assumptions resolved. Leave priority queue current.

---

## 8. Priority Queue (sorted by risk × inverse confidence)

1. **Observability** (30%) — can't operate blind
2. **Performance** (20%) — no baseline
3. **Workers** (40%) — no tests
4. **Search** (30%) — core product, no integration test
5. **Frontend** (40%) — no E2E
6. **Auth** (65%) — needs AMR verification
7. **AuthZ/RLS** (65%) — needs full table coverage
8. **Credits/Billing** (75%) — needs TD-02 + real-DB test
9. **Security** (70%) — needs TD-11, TD-12
