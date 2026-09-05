---
type: adr
status: Accepted
date: 2026-07-09
module: Identity Resolution
related_docs: ["DOC-018", "DOC-021"]
tags: [adr, identity, security, minor-signal]
---

# ADR-029: Identity Resolution Matching Algorithm

## Context

[[01-Architecture/DOC-018-Reconstructed-Domain-Model|DOC-018]] B1 and [[01-Architecture/DOC-014-Software-Architecture-Modules|DOC-014]] named identity resolution as an unspecified hard problem. The schema (`gcp.creator.merge_status`, `merge_confidence`) stores the *output* of identity resolution but no document defined the *method*.

## Decision

A **deterministic, weighted-evidence scoring model** — not a black-box classifier — because the constraint is explainability and auditability, and every merge (especially auto-merges) must be defensible to a human reviewer after the fact.

### Signal Weights

| Signal | Weight | Rationale |
|---|---|---|
| Shared verified email or WhatsApp number | 45 | Near-unfakeable |
| Verified website ownership match | 35 | Hard to fake at both ends |
| Explicit cross-mention claiming ownership | 35 | Self-asserted linkage |
| Shared Linktree / link-in-bio exact URL | 20 | Common but not unique |
| Face similarity score above 0.92 | 20 | Supporting signal only, capped low |
| Username identical/near-identical across platforms | 15 | Common convention, weak alone |
| Cross-mentioned handles | 10 | Weak positive signal |
| Structured metadata match | 10 | Weak positive signal |
| Display name exact match | 10 | Weakest — highly collision-prone |
| Manual reviewer confirmation | Overrides to 100 | Human already did the work |

### Thresholds

- **≥90** → auto-merge (`merge_status = active`, linked)
- **60–89** → `candidate`, `human_review_required = true`
- **<60** → stays `independent`; signals logged for future re-evaluation

### Output Schema

- `merge_confidence` (float 0–100)
- `confidence_reasoning` (string, human-readable)
- `evidence_breakdown` (array of `{signal, weight, detail}`)
- `human_review_required` (boolean)

### Design Rule

No single signal below 35 points may reach the auto-merge threshold on its own.

## Minor-Safety Default

Any evidence source that surfaces an age signal sets `minor_signal = true` on the resulting creator record, independent of `merge_confidence`.

`minor_signal = true` gates (closed by default):
- [[02-Database/tables/wp/wp.reveal|Contact reveal]]
- Campaign-add / outreach sequence enrollment
- Any automated commercial-outreach trigger

Discovery/search results and read-only intelligence are unaffected.

## Implementation

- **Module:** `packages/database/src/identity/resolution.ts`
- **Functions:** `calculateIdentityScore()`, `applyManualConfirmation()`, `detectMinorSignal()`
- **Migration:** [[02-Database/migrations/V007-minor-signal|V007]] adds `minor_signal` column
- **Tests:** `packages/database/src/__tests__/identity.test.ts` (17 tests)

## Consequences

- Identity resolution can ship without waiting on a full child-safety policy
- The commercially-risky surface is closed by default rather than open by default
- Reversing this default requires a real product/legal decision (Decision Authority Matrix: "legal implications")

## Related

- [[01-Architecture/_Architecture-MOC|Architecture]]
- [[08-Decisions/ADR-033-stack-pivot|ADR-033]] (pgvector for similarity)
- [[05-Security-Legal/DOC-021-Security-Privacy-Compliance|DOC-021]]
