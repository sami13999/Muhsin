---
type: adr
status: Proposed — requires human sign-off
date: 2026-07-09
module: Billing
related_docs: ["DOC-018", "DOC-010"]
tags: [adr, billing, subscription, reservation]
---

# ADR-030: Credit Reservation ↔ Subscription-State Interaction

## Context

[[DOC-018-Reconstructed-Domain-Model|DOC-018]] E4 (gap). Schema already anticipates this (`reservation_status_enum` includes `expired`; `credit_reservation.resolution_reason` includes `subscription_expired`) but no document specifies the actual rule.

## Recommended Decision

1. **Subscription cancellation/expiry does not force-release in-flight reservations.** The existing TTL sweeper (30-minute default) remains the *only* release mechanism, for both the normal case and the post-cancellation case. Rationale: a second, webhook-triggered release path racing against normal job completion is exactly the kind of special-case complexity that causes bugs.

2. **Jobs already holding a reservation at cancellation time run to completion or natural TTL expiry**, and results are delivered normally. The backend cost (Apify/LLM calls) is already sunk; withholding results after the fact helps no one.

3. **What does change at cancellation:** no *new* reservations may be created once the workspace's Paddle subscription leaves an active state — enforced at the existing API eligibility check ([[03-API/_API-MOC|DOC-020]]), not in the reservation/ledger layer itself.

4. Ledger accounting is unaffected: reservations still resolve via `completed` or `expired` exactly as they do today.

## Why This Needs Sign-Off

An alternative, equally defensible design (immediately force-release all reservations on cancellation, refuse to deliver results from jobs that outlive the cancellation) has real revenue and customer-experience trade-offs that are a product decision, not an engineering one.

## Implementation

- **Module:** `packages/database/src/repositories/credit.repository.ts`
- **Functions:** `expireStaleReservations()`, `getReservationStatus()`, `isReservationActive()`
- **Entitlement check:** `packages/api/src/services/entitlement.service.ts` — `canCreateReservations()`
- **ADR-026 pattern:** SELECT FOR UPDATE on balance row, optimistic locking with version field

## Consequences

- Simplest possible release mechanism (one sweeper, not two competing paths)
- Customer fairness: jobs that started before cancellation still deliver results
- Revenue protection: no credits leaked after cancellation

## Related

- [[08-Decisions/ADR-026-select-for-update-credit|ADR-026]] (SELECT FOR UPDATE)
- [[03-API/_API-MOC|API]]
- [[02-Database/_Database-MOC|Database]]
