---
type: research
section: testing
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Testing Patterns

## Test Pyramid

| Layer | Share | Target | MUSHIN Status |
|-------|-------|--------|---------------|
| Unit | ~70% | <3 min | ⚠️ 54% stubs — needs improvement |
| Integration | ~25% | <15 min | ✅ Testcontainers infrastructure created |
| E2E | ~5% | <30 min | ⚠️ E2E validation tests exist but limited |

## Critical Test Types (from Research)

### 1. Unit Tests
**Pattern:** 90%+ coverage on business logic. 100% on billing, auth, tenant isolation.
**MUSHIN Status:** ⚠️ 269 tests but ~145 are stubs. Real coverage ~46%.
**Gap:** Need to replace stubs, especially in billing (credit.repository) and auth (tenancy).

### 2. Integration Tests
**Pattern:** Real DB, real cache, real queue. Testcontainers for isolation.
**MUSHIN Status:** ✅ Infrastructure created (`packages/testing/src/integration.ts`). Tenant isolation test exists.
**Gap:** Only 1 integration test. Need tests for billing, outbox, credit operations.

### 3. Security Tests
**Pattern:** SAST, DAST, dependency scan, OWASP ZAP, credential leaks.
**MUSHIN Status:** ⚠️ Gitleaks in CI. No SAST/DAST. No OWASP testing.
**Gap:** No Semgrep/ZAP. No penetration testing.

### 4. Load Tests
**Pattern:** k6/Locust. Weekly against staging. P95 within SLO.
**MUSHIN Status:** ✅ Framework created (`scripts/load-test-api.ts`). Never run against real system.
**Gap:** No actual load test results. No staging environment.

### 5. Chaos Tests
**Pattern:** Random pod kill, network delay, DB failover. Monthly in staging.
**MUSHIN Status:** ❌ Not implemented.
**Gap:** No chaos engineering tooling.

### 6. DR Tests
**Pattern:** Restore from backup, region failover. Quarterly.
**MUSHIN Status:** ❌ Not implemented.
**Gap:** No backup/restore testing. No failover testing.

### 7. Adversarial Tests
**Pattern:** Prompt injection, model extraction, credential stuffing. Quarterly red team.
**MUSHIN Status:** ❌ Not implemented.
**Gap:** No adversarial testing for AI components.

### 8. Migration Tests
**Pattern:** Forward/backward migration testing. Schema compatibility.
**MUSHIN Status:** ⚠️ 9 migrations exist but no rollback tests.
**Gap:** No migration test suite.

## Test Quality Assessment

| Test File | Total | Stubs | Real | Quality |
|-----------|-------|-------|------|---------|
| tenancy.test.ts | 8 | 0 | 8 | HIGH |
| identity.test.ts | 17 | 0 | 17 | HIGH |
| logger.test.ts | 18 | 0 | 18 | HIGH |
| rate-limit.test.ts | 9 | 0 | 9 | HIGH |
| staff-rbac.test.ts | 25 | 0 | 25 | HIGH |
| audit-log.test.ts | 11 | 0 | 11 | HIGH |
| mfa.test.ts | 14 | 0 | 14 | HIGH |
| observability.test.ts | 15 | 0 | 15 | HIGH |
| outreach.test.ts | 8 | 0 | 8 | HIGH |
| crm.test.ts | 11 | 2 | 9 | MEDIUM |
| credit.repository.test.ts | 14 | 0 | 14 | HIGH |
| workspace.repository.test.ts | 10 | 0 | 10 | HIGH |
| Remaining files | ~117 | ~145 | ~0 | LOW |

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[07-Quality-Standards/DOC-024-Testing-Strategy-QA|DOC-024]]
