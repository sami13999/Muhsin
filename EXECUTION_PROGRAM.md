# EXECUTION_PROGRAM.md — MUSHIN Living Quality Program

*This document is the operational truth for closing the gap between "code exists" and "system is trustworthy." AGENTS.md governs engineering behavior and architectural invariants; this document governs what's actually known, what's still assumed, and what to work on next. Update it in place — don't create a v2 alongside it. A new session (human or AI) should be able to read this document alone and continue without re-deriving anything below.*

**Last updated:** 2026-07-13, after completing Sprint 0 core tasks and full security audit. Scores updated with verified evidence from this session.

---

## 1. How to Use This Document

Before starting any work: read Section 3 (confidence scorecard), pick the top unresolved item in Section 4 (priority queue), check Section 6 (bug ledger) for related open issues, then follow the loop in Section 5. After finishing work: update the relevant confidence score with the evidence that justifies the change, log any bug found in Section 6, and update Section 7 (assumptions) if something previously unverified is now confirmed either way.

**Never edit a confidence score without evidence attached.** "I fixed it" is not evidence. "The concurrency test in Section 6, TD-01, now passes, run 2026-07-13" is evidence.

---

## 2. Current State Snapshot

MUSHIN: Pakistan-first, multi-tenant B2B SaaS for creator discovery/intelligence. Full architecture in `AGENTS.md` + `docs/` vault + ADR log. As of this document's update:

- **All 9 packages typecheck successfully** (15/15 turbo tasks pass)
- **326 tests pass across 32 test files** (was 409 claimed, now 326 verified — fewer but all real)
- **TD-01 (credit transaction safety) is RESOLVED** — `db.transaction()` wraps all credit operations in `reveal.routes.ts` and `staff-portal.routes.ts`
- **TD-04 (runtime transaction guard) is RESOLVED** — `assertInTransaction()` guard added to `credit.repository.ts`
- **Credit concurrency tests exist** — 19 tests in `credit-concurrency.test.ts`, all passing
- **Security audit complete** — hardcoded credentials removed from source code, `.env` cleaned
- **CI pipeline expanded** — `develop` branch triggers + staging deploy job added
- **Reservation sweeper and credit grant workers fixed** — now use `credit.repository` instead of raw SQL
- **Outreach event emission fixed** — `emitEvent` wrapped in `db.transaction()` for ADR-020 compliance

---

## 3. Confidence Scorecard

| System | Confidence | Basis | Exit Threshold |
|---|---|---|---|
| Architecture / module boundaries | **85%** | VERIFIED_CODE: clean import graph, real server composition, all 9 packages build and typecheck | 85% |
| Credit System | **75%** | VERIFIED_CODE: TD-01 fixed (`db.transaction()` wraps reserve→insert→commit in reveal.routes.ts and staff-portal.routes.ts). TD-04 runtime guard added. 19 concurrency tests pass (2026-07-13). Reservation sweeper and credit grant use repository. Reservation sweeper race condition fixed. Remaining: TD-02 (BigInt→Number, medium), no real-DB concurrency test | 90% |
| Billing | **55%** | VERIFIED_CODE: Paddle adapter real, webhook handler transaction-wrapped. Billing test placeholders replaced with real contract assertions. ADR-030 still unresolved. Paddle webhook replay idempotency not test-verified | 90% |
| Authorization (RBAC + RLS) | **65%** | VERIFIED_CODE: real RLS policies confirmed via integration test (6 tests against testcontainers). Staff RBAC middleware confirmed wired. 16 RBAC unit tests pass. Full-table RLS coverage not exhaustively confirmed | 95% |
| Authentication | **60%** | VERIFIED_CODE: JWT verification real (`jose`), MFA enforcement logic exists. Tenancy middleware tested (8 tests). Login/signup routes tested. Supabase Auth AMR configuration outside code verification | 90% |
| Search | **25%** | VERIFIED_CODE: ranking tests pass (12 tests), filtered search and NL search exist. Not run against real Meilisearch instance | 85% |
| Frontend | **40%** | VERIFIED_CODE: Next.js builds successfully (18 pages). Auth context, dashboard, search, lists, analytics, admin, staff portal pages exist. No E2E tests. No visual regression tests | 85% |
| Workers | **40%** | VERIFIED_CODE: reservation-sweeper and credit-grant now use credit.repository (fixed this session). Worker bootstrap exists. No worker unit tests exist | 85% |
| Observability | **25%** | VERIFIED_CODE: metrics collection real (12 tests), SLO tracking real, health checks real. Metrics still in-memory only — not exported durably. Dashboards exist as JSON but not provisioned | 90% |
| Security | **60%** | VERIFIED_CODE: hardcoded credentials removed from source. Error handler returns generic messages. Logger redacts C1/C2 fields. CORS configured to specific origins. Rate limiting exists. Missing: security headers, IP-based auth rate limit, env var startup validation | 90% |

**Updated pairings:**
- Credit System (75%) + Observability (25%) still linked — negative-balance alert depends on durable metrics export
- Security (60%) is new entry — covers the full audit completed this session

---

## 4. Priority Queue (business impact × inverse confidence)

1. **Observability** — 25% confidence, amplifies Credit System risk. Metrics must be exported durably before negative-balance alerting can work. (S0-T6/S0-T7 from deployment readiness)
2. **Credit System** — 75% confidence but TD-02 (BigInt→Number) still open, no real-DB concurrency test. Needs integration test against testcontainers.
3. **Security** — 60% confidence. Security headers missing, IP-based auth rate limiting missing, env var startup validation missing. These are launch blockers.
4. **Authorization/RLS** — 65% confidence. Integration test covers 2 tables; need coverage for all 11 WP tables.
5. **Billing** — 55% confidence. ADR-030 unresolved. Paddle webhook replay idempotency not test-verified.
6. **Authentication** — 60% confidence. Supabase Auth AMR configuration unverified. No password reset flow.
7. **Workers** — 40% confidence. No unit tests. Reservation sweeper and credit grant fixed but untested.
8. **Search** — 25% confidence. Ranking tests pass but no real search integration test.
9. **Frontend** — 40% confidence. No E2E tests, no accessibility audit, no visual regression.

---

## 5. The Continuous Improvement Loop, Made Concrete

**Identify** → take the top unresolved item in Section 4. **Design a test to attack it** → for Observability specifically: write a test that flushes metrics and verifies they appear in a durable sink (or at minimum, that the flush function returns structured data). **Execute** → run it against real code, not read the code and reason about whether it would pass. **Discover or validate** → record the actual result. **Fix if broken** → apply the fix. **Add a regression test** → the same test from step 2 becomes permanent. **Re-score** → update Section 3 with the new evidence. **Repeat** from the new top of Section 4.

---

## 6. Bug Discovery Ledger

| ID | Discovered | Root Cause | Severity | Fix Status | Regression Test | Confidence Impact |
|---|---|---|---|---|---|---|
| TD-01 | Due Diligence Report | `reveal.routes.ts` and `staff-portal.routes.ts` called credit-repository functions without `db.transaction()` wrapper | Critical | **RESOLVED** (2026-07-13) — `db.transaction()` wraps reserve→insert→commit in reveal.routes.ts and reserve→commit in staff-portal.routes.ts | `credit-concurrency.test.ts` — 19 tests covering atomicity, balance consistency, guard enforcement, version conflict prevention. All pass | Credit System raised from 30% → 75% |
| TD-02 | Same session | `reserveCredits` converts `bigint` balance to `Number` for SQL parameter, risking precision loss at extreme scale | Medium | **Open** — not launch-blocking (balance values won't reach Number.MAX_SAFE_INTEGER in practice) | Not yet written | Minor — doesn't block launch |
| TD-03 | Same session | `@mushin/database` package export map missing `credit.repository` subpath | Low | **RESOLVED** — export already exists in `packages/database/package.json:17-20` | N/A | Blocks typecheck (now fixed) |
| TD-04 | Same session | "Must be called inside a transaction" rule was comment-only — zero runtime enforcement | Medium | **RESOLVED** (2026-07-13) — `assertInTransaction()` guard added to `reserveCredits`, `commitCredits`, `releaseCredits`. `TransactionClient` branded type for compile-time enforcement | 9 tests in `credit-concurrency.test.ts` covering null/undefined/non-object rejection, $client checks, function-level throws. All pass | Prevents TD-01 class bugs from recurring |
| TD-05 | Security audit (2026-07-13) | Hardcoded production credentials in `scripts/certification/api-test.ts` and `.env` | Critical | **RESOLVED** — all hardcoded credentials removed from source; `.env` cleaned to placeholders | N/A (credential rotation is operational, not code) | Security raised to 60% |
| TD-06 | Security audit (2026-07-13) | No security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) on any response | High | **Open** — launch blocker | Not yet written | Security held at 60% until resolved |
| TD-07 | Security audit (2026-07-13) | No IP-based rate limiting on `/auth/login` (circuit breaker exists but is per-service, not per-IP) | Medium | **Open** — launch blocker | Not yet written | Auth held at 60% |
| TD-08 | Security audit (2026-07-13) | No env var validation at startup — app crashes on first use of undefined critical env var instead of failing fast | Medium | **Open** — launch blocker | Not yet written | Operational risk |
| TD-09 | Testing audit (2026-07-13) | `billing.integration.test.ts` had 8 `expect(true).toBe(true)` placeholder tests | Medium | **RESOLVED** — replaced with real contract assertions for webhook processing, ADR-030 invariant, credit reservation flow | Tests pass (18/18) | Billing raised to 55% |
| TD-10 | Testing audit (2026-07-13) | `tenant-isolation.test.ts` had 5 `expect(true).toBe(true)` placeholder tests | Medium | **RESOLVED** — replaced with real behavioral tests: tenancy middleware rejects cross-workspace (403), sets context on valid membership, staffOnly blocks non-staff, rejects missing workspace header (400), rejects expired JWT (401) | Tests pass (6/6) | AuthZ raised to 65% |
| TD-11 | Security audit (2026-07-13) | Auth tokens stored in localStorage (accessible to XSS) | Medium | **Open** — POST-launch item (requires httpOnly cookie migration) | Not yet written | Accepted risk for now |
| TD-12 | Security audit (2026-07-13) | No GDPR erasure API route wired (code exists in repository, route not mounted) | Medium | **Open** — POST-launch | Not yet written | Legal compliance |
| TD-13 | Security audit (2026-07-13) | Staff CLI logs emails in plaintext | Low | **Accepted** — CLI tool for administrators, not web-facing | N/A | Operational tool, not a web vulnerability |

---

## 7. Assumptions Register (believed, not verified)

| Assumption | Status | What would verify it |
|---|---|---|
| Supabase Auth is configured to issue correct AMR claims for MFA | **Unverified** | Check actual Supabase project auth settings, or real login+MFA-challenge trace |
| `processed_event_ledger` prevents duplicate webhook processing | **Unverified** | Test that replays same Paddle webhook payload twice and asserts single effect |
| RLS covers every `wp.*` table | **Partially verified** — integration test covers `wp.workspace` and `wp.membership` | Enumerate every `wp.*` table and confirm a policy exists for each |
| Workers execute correctly against current package structure | **Partially verified** — code fixed (sweeper/grant use repository) but not run | Re-run worker process against current build and observe real job execution |
| Credit concurrency test passes against real DB (not just mocks) | **Unverified** — mock-based tests pass, testcontainers test not written | Write integration test using testcontainers that fires concurrent reserve operations |
| Security headers would prevent clickjacking and MIME sniffing | **Unverified** — headers not implemented | Implement headers and verify with securityheaders.com scan |

---

## 8. Adversarial Test Plan — By Subsystem

**Credit System:** TD-01 RESOLVED. Next: TD-02 (BigInt precision), real-DB concurrency test, negative-balance alert (depends on Observability).

**Authorization/RLS:** Enumerate every `wp.*` table and confirm RLS policy exists. Currently only `wp.workspace` and `wp.membership` tested. Need: `wp.credit_ledger_entry`, `wp.reveal`, `wp.list`, `wp.list_member`, `wp.workspace_creator_link`, `wp.membership`, `wp.interaction_timeline`, `wp.paddle_webhook_raw`, `wp.subscription_event`, `wp.staff_user`.

**Billing:** ADR-030 remains unresolved — subscription cancellation during active reservation has undefined behavior. Paddle webhook replay idempotency test needed.

**Security:** Security headers (TD-06), IP-based auth rate limit (TD-07), env var startup validation (TD-08) are all launch blockers.

**Search:** No integration test against real Meilisearch. Ranking tests pass but search quality is unverified.

**Frontend:** No E2E tests. No accessibility audit. No visual regression. Build succeeds but user experience unverified.

**Workers:** No unit tests for `reservation-sweeper.ts` or `credit-grant.ts`. Code fixed to use repository but not tested.

---

## 9. Exit Criteria

The loop for a subsystem stops when its Section 3 score reaches its threshold *with regression tests in place*, or when remaining risk is explicitly accepted and logged. No subsystem is declared done by narrative — only by the table.

Current subsystems at threshold:
- **Architecture** (85% ≥ 85%) — **AT THRESHOLD**

Current subsystems blocked on open bugs:
- **Credit System** — needs TD-02 fix + real-DB concurrency test to reach 90%
- **Security** — needs TD-06, TD-07, TD-08 to reach 90%
- **Observability** — needs durable metrics export to reach 90%

---

## 10. Session Handoff Protocol

Starting a new session: read Sections 2–4 first, then Section 6 for open bugs, then go to work per Section 5. Ending a session: update Section 3 with new evidence, add findings to Section 6, update Section 7 if assumptions resolved, and leave Section 4 current.

---

## 11. Changelog

- **2026-07-13:** Major update. TD-01 resolved (credit transaction safety). TD-03 resolved (package export). TD-04 resolved (runtime guard). TD-05 resolved (hardcoded credentials removed). TD-09 resolved (billing placeholder tests replaced). TD-10 resolved (tenant-isolation placeholder tests replaced). CI pipeline expanded. Security audit completed. Credit concurrency tests created (19 tests, all pass). Test suite: 326/326 pass. Typecheck: 9/9 packages pass. New bugs logged: TD-06 (security headers), TD-07 (auth rate limit), TD-08 (env validation), TD-11 (localStorage tokens), TD-12 (GDPR route), TD-13 (staff CLI email logging). Confidence scores updated across all subsystems.
