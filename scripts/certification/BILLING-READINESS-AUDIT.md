# MUSHIN 2.0 — Billing Readiness Audit

**Date:** 2026-07-11
**Status:** Technical audit of billing operations

---

## 1. Paddle Integration Readiness

### Current State

| Component | Status | Evidence |
|-----------|--------|----------|
| Paddle adapter | **VERIFIED_CODE** | 467 lines, full BillingProvider interface |
| Webhook handler | **VERIFIED_CODE** | 168 lines, HMAC-SHA256 verification |
| Signature validation | **VERIFIED_CODE** | Constant-time comparison via `timingSafeEqual` |
| Idempotency | **VERIFIED_CODE** | `onConflictDoNothing()` on paddleEventId |
| Circuit breaker | **VERIFIED_CODE** | 5 failures/5min, 30s recovery |
| Retry policy | **VERIFIED_CODE** | 3 attempts, 200ms base with jitter |
| Sandbox support | **VERIFIED_CODE** | `PADDLE_ENVIRONMENT` switching |

### What's Missing

| Item | Status | Impact |
|------|--------|--------|
| Live Paddle account | **MISSING** | Cannot process payments |
| Paddle API key | **MISSING** | Adapter cannot connect |
| Webhook secret | **MISSING** | Signature verification fails |
| Pakistan entity (A-032) | **UNRESOLVED** | Existential blocker for PK customers |

### Classification: **MVP BLOCKER** (for paid plans)

---

## 2. Subscription Lifecycle

### Implemented

| State | Transition | Evidence |
|-------|------------|----------|
| `trialing` | → `active` | Via Paddle subscription_created webhook |
| `active` | → `past_due` | Via Paddle payment_failed webhook |
| `active` | → `canceled_pending` | Via Paddle subscription_canceled webhook |
| `past_due` | → `active` | Via Paddle payment_succeeded webhook |
| `canceled_pending` | → `expired` | Via TTL sweeper |
| `expired` | → terminal | No further transitions |

### State Machine Location
- `apps/workers/src/handlers/billing-state.ts`
- Validated against allowed transitions per state

### Classification: **VERIFIED_CODE**

---

## 3. Credit System Integration

### Current State

| Component | Status | Evidence |
|-----------|--------|----------|
| Entitlement service | **VERIFIED_CODE** | 5 plan tiers, feature gates |
| Credit repository | **VERIFIED_CODE** | Reserve/Commit/Release pattern |
| Balance management | **VERIFIED_CODE** | Optimistic concurrency via version field |
| Grant worker | **VERIFIED_CODE** | Monthly grants, idempotent |
| Reservation sweeper | **VERIFIED_CODE** | 30-min TTL, runs every 5 min |

### Plan Tiers

| Plan | Credits/Month | Seats | Price |
|------|---------------|-------|-------|
| Free | 100 | 1 | $0 |
| Starter | 500 | 3 | ~$99-149 |
| Growth | 2,000 | 10 | ~$299-499 |
| Agency | 10,000 | 50 | ~$799-1200 |
| Enterprise | 50,000 | Unlimited | Custom |

### Classification: **VERIFIED_CODE**

---

## 4. Failed Payment Handling

### Implemented

| Component | Status | Evidence |
|-----------|--------|----------|
| Webhook event storage | **VERIFIED_CODE** | `paddle_webhook_raw` table |
| Payment failed event | **VERIFIED_CODE** | `NormalizedBillingEvent` union includes `payment_failed` |
| State transition | **VERIFIED_CODE** | `active` → `past_due` on payment failure |
| Retry logic | **DEFERRED** | Paddle handles dunning automatically |

### What's Missing

| Item | Status | Impact |
|------|--------|--------|
| Dunning emails | **MISSING** | Users not notified of failed payments |
| Grace period handling | **MISSING** | No custom grace period logic |
| Account suspension | **MISSING** | No automatic suspension on extended non-payment |

### Classification: **LAUNCH RISK** (Paddle handles basic dunning)

---

## 5. Refund Workflow

### Implemented

| Component | Status | Evidence |
|-----------|--------|----------|
| Refund webhook event | **VERIFIED_CODE** | `payment_succeeded` can handle refund adjustments |
| Credit reversal | **VERIFIED_CODE** | `refund_adjustment` ledger entry type exists |
| Balance update | **VERIFIED_CODE** | Credit repository supports reversals |

### What's Missing

| Item | Status | Impact |
|------|--------|--------|
| Refund request UI | **MISSING** | No customer-facing refund flow |
| Refund approval workflow | **MISSING** | No admin approval process |
| Refund policy enforcement | **MISSING** | No automated policy checks |

### Classification: **POST-MVP IMPROVEMENT**

---

## 6. Cancellation Workflow

### Implemented

| Component | Status | Evidence |
|-----------|--------|----------|
| Cancel subscription | **VERIFIED_CODE** | `cancelSubscription()` in adapter |
| Immediate vs end-of-period | **VERIFIED_CODE** | `cancelAt` parameter supported |
| State transition | **VERIFIED_CODE** | `active` → `canceled_pending` |
| Credit handling | **VERIFIED_CODE** | Reservation sweeper releases unused credits |

### What's Missing

| Item | Status | Impact |
|------|--------|--------|
| Cancellation survey | **MISSING** | No churn feedback collection |
| Win-back offers | **MISSING** | No retention logic |
| Data export before cancel | **MISSING** | No data portability feature |

### Classification: **LAUNCH RISK**

---

## 7. Invoice Handling

### Implemented

| Component | Status | Evidence |
|-----------|--------|----------|
| Paddle invoices | **VERIFIED_CODE** | Paddle generates invoices as Merchant of Record |
| Webhook storage | **VERIFIED_CODE** | Raw payloads stored for audit |

### What's Missing

| Item | Status | Impact |
|------|--------|--------|
| Invoice display UI | **MISSING** | No customer-facing invoice view |
| Invoice download | **MISSING** | No PDF export |
| Custom invoice fields | **MISSING** | No tax ID, PO number support |

### Classification: **POST-MVP IMPROVEMENT**

---

## 8. Pakistan Entity Compatibility

### A-032 Status

| Aspect | Status | Impact |
|--------|--------|--------|
| Entity onboarding | **UNRESOLVED** | Existential for PK customers |
| PKR pricing | **NOT IMPLEMENTED** | USD only currently |
| Local payment methods | **NOT IMPLEMENTED** | No JazzCash, EasyPaisa |
| Tax compliance | **NOT IMPLEMENTED** | No WHT, GST handling |

### Risks

1. **Paddle may not support PK entity** — Requires verification
2. **PKR conversion** — Paddle handles FX but rates may not be competitive
3. **Local payment methods** — Paddle may not support PK-specific methods
4. **Tax obligations** — WHT, GST require local entity or代理

### Mitigation

- BillingProvider interface is provider-agnostic
- Fallback: Use international entity for PK customers initially
- Long-term: Evaluate local payment gateway (Stripe, JazzCash)

### Classification: **MVP BLOCKER** (for PK market)

---

## 9. Currency Handling

### Current State

| Currency | Status | Evidence |
|----------|--------|----------|
| USD | **DEFAULT** | All pricing in USD |
| PKR | **NOT IMPLEMENTED** | No PKR pricing |
| Multi-currency | **DEFERRED** | Paddle supports but not configured |

### Classification: **LAUNCH RISK** (USD-only acceptable for MVP)

---

## 10. Tax Responsibilities

### Current State

| Tax Type | Status | Responsibility |
|----------|--------|----------------|
| VAT (EU) | **PADDLE HANDLES** | Paddle as MoR collects and remits |
| GST (AU, NZ, SG) | **PADDLE HANDLES** | Paddle as MoR collects and remits |
| Sales Tax (US) | **PADDLE HANDLES** | Paddle as MoR collects and remits |
| WHT (PK) | **NOT HANDLED** | Requires local entity or代理 |
| GST (PK) | **NOT HANDLED** | Requires local entity or代理 |

### Classification: **MVP BLOCKER** (for PK market)

---

## Summary

| Category | Classification |
|----------|---------------|
| Paddle integration (code) | **VERIFIED_CODE** |
| Paddle integration (live) | **MVP BLOCKER** |
| Subscription lifecycle | **VERIFIED_CODE** |
| Credit system | **VERIFIED_CODE** |
| Failed payment handling | **LAUNCH RISK** |
| Refund workflow | **POST-MVP** |
| Cancellation workflow | **LAUNCH RISK** |
| Invoice handling | **POST-MVP** |
| Pakistan entity | **MVP BLOCKER** |
| Currency handling | **LAUNCH RISK** |
| Tax handling (international) | **PADDLE HANDLES** |
| Tax handling (PK) | **MVP BLOCKER** |

---

## Recommendations

### For MVP Launch (Free-tier only)
1. Ship with free-tier billing (100 credits/month)
2. Defer Paddle integration until A-032 resolved
3. Manual subscription management for early adopters

### For Paid Launch
1. Resolve A-032 (Pakistan entity)
2. Configure Paddle sandbox
3. Test webhook flow end-to-end
4. Implement cancellation survey
5. Add invoice display UI

### For Enterprise
1. Implement DPA signing flow
2. Add custom invoicing (tax ID, PO number)
3. Implement refund approval workflow
