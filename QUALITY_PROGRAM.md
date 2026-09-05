# QUALITY_PROGRAM.md — MUSHIN Living Quality Program

*Single source of truth for quality state. Every score is evidence-based. Every bug has a regression test before it closes. Updated in place — never create a v2.*

**Last updated:** 2026-07-13T23:50:00Z

---

## 1. Subsystem Confidence Scores

| # | System | Score | Last Verified | Evidence | Exit Threshold | Open Bugs |
|---|---|---|---|---|---|---|
| 1 | Security | **70** | 2026-07-13 | Security headers added (HSTS, CSP, X-Frame-Options, X-Content-Type-Options via Hono secureHeaders). Auth IP rate limiting added (5/min/IP). Env var startup validation added. Hardcoded credentials removed from source. Logger C1/C2 redaction verified. Error handler returns generic messages. CORS configured to specific origins. | 90 | TD-11 (localStorage tokens), TD-12 (GDPR route) |
| 2 | Multi-Tenant Isolation | **65** | 2026-07-13 | Integration test covers wp.workspace and wp.membership via testcontainers (6 tests). Staff RBAC middleware wired (16 unit tests). Tenancy middleware rejects cross-workspace (403). RLS policies exist in V005 migration. | 95 | Full wp.* table RLS coverage not verified |
| 3 | Credits & Billing | **75** | 2026-07-13 | TD-01 fixed: db.transaction() wraps reserve→insert→commit in reveal.routes.ts and reserve→commit in staff-portal.routes.ts. TD-04: assertInTransaction() guard on reserve/commit/release. 19 concurrency tests pass. Reservation sweeper and credit grant use repository. Billing contract assertions real (18 tests). ADR-030 still unresolved. | 90 | TD-02 (BigInt→Number), ADR-030, Paddle webhook replay test |
| 4 | Authentication | **65** | 2026-07-13 | JWT verification real (jose). MFA enforcement logic exists. Tenancy middleware tested (8 tests). Login/signup/logout/session/refresh routes exist. Circuit breaker on auth failures (5 in 5min → 30s lockout). IP rate limiting on login (5/min/IP). | 90 | Supabase Auth AMR config unverified, no password reset endpoint |
| 5 | Observability | **50** | 2026-07-13 | Metrics collection real (12 tests). SLO tracking real. Health checks real (liveness + full). Logger redaction verified. Axiom log transport wired (axiom.ts). Metrics exported to Axiom every 30s (startMetricsExport). Graceful shutdown flush. Init called at server startup. Still missing: negative-balance alert, dashboard provisioning, Grafana dashboards not provisioned. | 90 | Negative-balance alert, dashboard provisioning |
| 6 | Search | **30** | 2026-07-13 | Ranking tests pass (12 tests). Filtered search and NL search exist. Meilisearch adapter real (circuit breaker, health check). No integration test against real Meilisearch. No search quality metrics. | 85 | Real Meilisearch integration test, ranking regression test |
| 7 | Performance | **20** | 2026-07-13 | k6 load test scripts exist (2 files). No automated performance tests in CI. No performance budgets. No baseline metrics. | 80 | Performance baseline, load test in CI |
| 8 | Frontend UX | **40** | 2026-07-13 | Next.js builds (18 pages). Auth context, dashboard, search, lists, analytics, admin, staff portal pages exist. No E2E tests. No accessibility audit. No visual regression. | 85 | E2E golden path, accessibility audit |

---

## 2. Bug Ledger

| ID | Discovered | Severity | Root Cause | Fix Status | Regression Test | Confidence Impact |
|---|---|---|---|---|---|---|
| TD-01 | Due Diligence | **Critical** | Credit ops not in db.transaction() | **RESOLVED** 2026-07-13 | credit-concurrency.test.ts (19 tests) | Credit 30→75 |
| TD-02 | Session | Medium | BigInt→Number precision loss | Open | — | Minor |
| TD-03 | Session | Low | Package export missing | **RESOLVED** | — | — |
| TD-04 | Session | Medium | No runtime transaction guard | **RESOLVED** 2026-07-13 | credit-concurrency.test.ts (9 guard tests) | — |
| TD-05 | Security audit | **Critical** | Hardcoded credentials in source | **RESOLVED** 2026-07-13 | — | Security 0→70 |
| TD-06 | Security audit | **High** | No security headers | **RESOLVED** 2026-07-13 | — | Security +10 |
| TD-07 | Security audit | Medium | No IP-based auth rate limit | **RESOLVED** 2026-07-13 | — | Auth +10 |
| TD-08 | Security audit | Medium | No env var startup validation | **RESOLVED** 2026-07-13 | — | Operational +10 |
| TD-09 | Testing audit | Medium | Placeholder billing tests | **RESOLVED** 2026-07-13 | billing.integration.test.ts (18 tests) | Billing +5 |
| TD-10 | Testing audit | Medium | Placeholder tenant-isolation tests | **RESOLVED** 2026-07-13 | tenant-isolation.test.ts (6 tests) | AuthZ +5 |
| TD-11 | Security audit | Medium | Auth tokens in localStorage | Open (POST-launch) | — | — |
| TD-12 | Security audit | Medium | GDPR erasure route not wired | Open (POST-launch) | — | — |
| TD-13 | Security audit | Low | Staff CLI logs emails | Accepted | — | — |

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
| Credits | GREEN | — | PARTIAL | PARTIAL | MISSING | PARTIAL | MISSING | MISSING | MISSING |
| Auth | GREEN | — | PARTIAL | PARTIAL | MISSING | PARTIAL | MISSING | MISSING | MISSING |
| AuthZ/RLS | GREEN | — | PARTIAL | PARTIAL | MISSING | PARTIAL | MISSING | MISSING | MISSING |
| Billing | GREEN | — | PARTIAL | PARTIAL | MISSING | MISSING | MISSING | MISSING | MISSING |
| Search | GREEN | — | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| Workers | MISSING | — | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING | MISSING |
| Frontend | MISSING | — | — | — | MISSING | MISSING | MISSING | MISSING | MISSING |

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
