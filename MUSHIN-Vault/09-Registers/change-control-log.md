---
title: "Change Control Log"
status: Active
last_updated: 2026-07-07
tags: [registers, change-control, cc-001, cc-002, cc-003]
---

# Change Control Log

## CC-001: Ranking Explanations Pulled to S/S1

**Status:** Ratified
**Date:** 2026-07-05
**Impact:** Product, Engineering

**Decision:** Ranking explanations (CC-001) are computational, not LLM-generated. Each ranking factor is a stored value from GCP. The explanation is a rendering of the computation, never a post-hoc LLM narrative. This is anti-fabrication by construction.

**Implementation:** `packages/api/src/routes/m3-search/ranking.ts` — each hit includes `_explanation` with factor scores and weights.

---

## CC-002: WhatsApp Added to EPIC-06

**Status:** Ratified (phased S1/S2)
**Date:** 2026-07-05
**Impact:** Product, Operations

**Decision:** WhatsApp outreach is added to the outreach epic (EPIC-06) but phased: S1 = email only, S2 = WhatsApp added. WhatsApp requires BSP integration (Doc 17 B6) and opt-in consent (PATCH-006).

**Implementation:** `channel_enum` includes `'whatsapp'`. Outreach module (M9) will support WhatsApp in S2.

---

## CC-003: Audience Demographics as Estimates

**Status:** Ratified
**Date:** 2026-07-05
**Impact:** Product, Data

**Decision:** Audience demographics (PK share, GCC share, diaspora share) are **estimates, not measurements**. They are derived from public signals (language, location, engagement patterns) via LLM reasoning. The UI must label them as estimates and never present them as ground truth.

**Implementation:** `audienceEstimates` field in Meilisearch document schema. Search filters include `audience_pk_share_min` and `audience_gcc_share_min` with the understanding that these filter on estimates.

---

## How to Add a Change Control Entry

1. Number sequentially: CC-NNN
2. Include: Status, Date, Impact, Decision, Implementation
3. Update this file
4. Reference in relevant ADRs and docs
