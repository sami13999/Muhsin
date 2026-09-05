#### DOC-018 — Domain Model, Entity Relationships & Data Lifecycle
**Status:** 🟢 FINALIZED (v1.0) — reconstructed from DOC-019, with the two originally-open gaps now resolved by ADR-029 and ADR-030 (see `New-ADRs-029-030-031.md`; ADR-030 is pending your sign-off, noted below)
**Reconstructed by:** cross-referencing DOC-019 (Physical Schema), and every "Doc 18 §X" citation found in DOC-014, DOC-015, DOC-016, DOC-019, DOC-020

---

## Why This Document Exists

The DOC-018 file actually present in the project archive is 43 lines: a summary, an ARB Audit #1 gap table, and a list of 5 new ADRs (024–028). It is **not** a domain model — despite its own summary claiming it "defines the full entity catalogue... Timeline/Ledger substrates... identity resolution state machine... 48-category niche vocabulary." None of that is in the file.

Five other documents cite specific DOC-018 sub-sections that don't exist in the delivered file:

| Citation | Cited by | Subject |
|---|---|---|
| Doc 18 B1 | DOC-019 | Creator identity resolution lifecycle |
| Doc 18 B3 | DOC-019 | Enrichment snapshot model |
| Doc 18 B4 | DOC-019 | Niche classification entity |
| Doc 18 B5 | DOC-019 | Contact types |
| Doc 18 D1 | DOC-019 | Timeline actor types |
| Doc 18 D3 | DOC-019 | Timeline entry-type taxonomy |
| Doc 18 E4 | DOC-019, DOC-020 | Credit reservation ↔ subscription-state interaction |
| Doc 18 Part H | DOC-019 | Controlled niche vocabulary |
| Doc 18 (general) | DOC-014 | Identity-resolution matching rules |
| Doc 18 (general) | DOC-020 | Entity definitions, PATCH-006 consent TOCTOU |

This document reconstructs as many of those sections as the schema and cross-references allow. **Every section below states its source.** Two sections could not be reconstructed at all — they are real, un-authored decisions, not filing errors — and are flagged as **OPEN GAPS**, not filled in.

---

## Part A — Entity Catalogue (reconstructed from DOC-019 Parts C–K)

**Global Creator Plane (GCP)** — shared, zero workspace data (ADR-008):
- `creator` — canonical person/entity record; identity resolution + GDPR tombstone fields
- `profile` — one social-platform account per creator; enrichment metadata, YouTube-specific metrics, platform_metrics JSONB, archive reference
- `enrichment_snapshot` — versioned intelligence output (authenticity/quality/audience/summary/niche), immutable
- `niche_classification` — active niche assignment, validated against the vocabulary
- `contact_record` — email/WhatsApp/website/other, sourced + confidence-tagged
- `inflight_url_lock` — ephemeral dedup lock during Live Discovery (PATCH-007/009)

**Workspace Plane (WP)** — tenant-scoped, every row carries `workspace_id`:
- `app_user`, `workspace`, `membership` — identity/tenancy kernel
- `workspace_creator_link` — the **sole** GCP↔WP bridge (ADR-024); no DB-level FK crosses the plane boundary
- `list`, `list_membership`, `tag`, `creator_tag` — CRM organization
- `campaign`, `campaign_brief_version`, `campaign_creator`, `task` — campaign/pipeline
- `consent_state`, `reveal` — outreach eligibility and contact-reveal tracking
- `sequence_template`, `sequence_step`, `sequence_enrollment` — outreach automation
- `file_attachment` — uploads
- `entitlement_catalog`, `paddle_subscription` — billing state
- `interaction_timeline` (partitioned, append-only) — the relationship-memory substrate
- `credit_ledger_entry` (partitioned, append-only), `workspace_credit_balance`, `credit_reservation` — the money substrate
- `discovery_job` — Live Discovery / enrichment job records

**Platform Plane:**
- `outbox`, `processed_event_ledger` — transactional outbox + idempotency (ADR-020)
- `paddle_webhook_raw` — raw signed webhook store
- `admin_audit_log` — immutable staff-action log
- `niche_vocab` — controlled vocabulary reference table (see Part H)
- `fx_rate_snapshot` — daily FX rates

---

## Part B — Global Creator Plane: Entity Detail

### B1. Identity Resolution State Machine *(reconstructed — partially)*
**Source:** `gcp.creator.merge_status` enum + column comments (DOC-019 Part C); PATCH-008 references in DOC-014, DOC-024.

- States: `active` (normal, queryable) → `candidate` (60–89% match confidence, pending admin review) → `merged_into` (permanent redirect stub, never deleted).
- `merge_confidence NUMERIC(5,4)` stored at candidate creation.
- A dedicated cross-plane "merge fan-out" job (PATCH-008, the one authorized exception to the plane-write-isolation rule) repoints `workspace_creator_link.creator_id` from loser to winner across every workspace, under audit.
- Un-merge is supported and must preserve the audit trail (DOC-024 §3.1).

**✅ RESOLVED by ADR-029:** the matching algorithm (weighted-evidence scoring, signal weights, auto-merge/candidate/independent thresholds) is now defined. See `New-ADRs-029-030-031.md`. This section previously flagged the algorithm as un-reconstructable — that remains true of *this* document alone; it's the ADR, not this file, that supplies the missing decision. Also folded into ADR-029: any age-signal evidence sets `minor_signal = true` on the creator record independent of merge outcome, gating commercial-contact features closed by default pending the still-open child-creator policy (DOC-028).

### B3. Enrichment Snapshot Model *(reconstructed — complete)*
**Source:** `gcp.enrichment_snapshot` DDL, DOC-015 Parts B–C, ADR-028.

- `snapshot_type`: `authenticity | quality | audience_estimate | summary | niche_classification`.
- Each snapshot carries `verdict` (JSONB), `evidence_breakdown` (JSONB, per-item direction/weight/payload-field-path), `confidence_level`, and a provenance triple: `prompt_version`, `model_version`, `content_hash`.
- Immutable and append-only; "updating" a score means writing a new snapshot and flipping `is_current`. Exactly one current snapshot per `(creator_id, snapshot_type)`.
- Re-scoring campaigns (PATCH-010) reprocess from the archived payload via `content_hash`, never by re-scraping.

### B4. Niche Classification *(reconstructed — complete)*
**Source:** `gcp.niche_classification` DDL, DOC-015 C1.

- `primary_niche` + up to 3 `secondary_niches`, both validated against `platform.niche_vocab.slug`.
- One current classification per creator (enforced by partial unique index).
- Reclassification triggers only on content change (semantic dedup, PATCH-010), not on a schedule.

### B5. Contact Types *(reconstructed — complete)*
**Source:** `gcp.contact_record` DDL and enums.

- `contact_type`: `email | whatsapp_number | website | other`.
- `source`: `scraped | provider_verified | user_submitted`.
- GDPR-erasable independently of the parent creator record (`pii_erased_at`).
- A workspace's `wp.reveal` action records *permission to use* a contact; the contact value itself always stays GCP-side.

---

## Part C — The GCP/WP Bridge *(reconstructed — complete)*

**Source:** `wp.workspace_creator_link` DDL, ADR-024, DOC-021 §1.2.

- Every WP entity that relates to a creator does so through this single bridge table — never a direct reference.
- **No database-level foreign key exists from this table to `gcp.creator`.** This is deliberate (ADR-024): plane separation is enforced at the schema level, not left to query discipline. The application layer verifies `creator_id` existence at link-creation time.
- One row per `(workspace_id, creator_id)`. Tracks `first_linked_at`, `last_active_at` (drives over-capacity downgrade ordering), `workspace_removed_at` (Tier-1 delete), `pii_deleted_at` (GDPR Tier-2 propagation).
- This is also the legal boundary (DOC-028 §3.1): MUSHIN is *processor* on the WP side of the link, *independent controller* on the GCP side.

---

## Part D — Interaction Timeline

### D1. Actor Types *(reconstructed — complete)*
**Source:** `timeline_actor_type_enum`, DOC-019 Part B.

`user | system | ai | staff_impersonated` — the last enabling dual-attribution for impersonation sessions (DOC-029 §5.2).

### D3. Entry-Type Taxonomy *(reconstructed — partial, flagged provisional)*
**Source:** DOC-020 §I6 timeline filter parameters (the only place a concrete list appears).

Confirmed types: `enrichment_triggered`, `enrichment_completed`, `outreach_sent`, `reply_received`, `campaign_added`, `campaign_stage_changed`, `status_changed`, `note`, `call_log`, `consent_granted`, `consent_revoked`.

**⚠️ Flag:** DOC-019 says `entry_type` is "validated against the Doc 18 D3 taxonomy at application layer" — but the 11 types above come from DOC-020's API examples, not from an authoritative Doc 18 source. Treat this list as a reasonable starting point, not a ratified taxonomy. `entry_type` is stored as `TEXT` rather than a Postgres enum specifically so this list can grow without a schema migration (DOC-019 Part N3) — so there's no urgency to lock it down before more entries are needed, but it should be formally owned somewhere before Mimo's frontend/backend both start hard-coding assumptions about it independently.

---

## Part E — Billing/Credit Domain Interaction

### E4. Credit Reservation × Subscription-State Interaction — **🟡 PROPOSED via ADR-030, pending sign-off**
**Cited by:** DOC-019 ("Subscription state change behaviour: see Doc 18 E4 / PATCH-005 contract"), DOC-020 (Doc 18 dependency: "PATCH-006 consent TOCTOU" — related but distinct citation).

The schema anticipates this scenario — `reservation_status_enum` includes `expired`, and `credit_reservation.resolution_reason` includes `subscription_expired` as a valid value. ADR-030 (`New-ADRs-029-030-031.md`) now proposes the actual rule: cancellation doesn't force-release in-flight reservations; the existing TTL sweeper remains the only release mechanism; in-flight jobs complete normally and results are delivered; only *new* reservations are blocked post-cancellation. This is flagged as a subscription-behavior change requiring your sign-off per the Decision Authority Matrix — treat this section as proposed, not final, until that approval lands.

---

## Part H — Controlled Niche Vocabulary *(reconstructed — complete, verbatim)*
**Source:** `platform.niche_vocab` seed data, DOC-019 Part K. Confirmed at exactly 48 rows, matching DOC-018's own summary claim.

| Cluster | Categories |
|---|---|
| Lifestyle & Wellness (8) | Lifestyle (General), Health & Fitness, Beauty & Skincare, Fashion & Style, Food & Cooking, Travel & Adventure, Home & Interior, Parenting & Family |
| Entertainment & Culture (8) | Comedy & Humor, Music & Performance, Gaming & Esports, Film & TV Reviews, Books & Literature, Art & Illustration, Dance & Choreography, Podcasting |
| Knowledge & Education (8) | Education & Tutoring, Tech & Gadgets, Finance & Investing, Personal Development, Science & Nature, History & Culture, Language Learning, Career & Professional |
| Business & Entrepreneurship (6) | Startups & Entrepreneurship, Marketing & Advertising, E-commerce & Retail, Freelancing & Creator Economy, Real Estate, HR & Management |
| Social Impact & Community (4) | Activism & Social Causes, Religion & Spirituality (Islamic), Environment & Sustainability, Community & Local |
| Sports & Outdoors (4) | Cricket & Sports, Football/Soccer, Outdoor & Extreme Sports, Motorsport |
| Pakistan-Specific High-Value (7) | PK Fashion & Textile, PK Food & Street Culture, PK Politics & Commentary, PK Drama & Entertainment, PK Tech & Startups, PK Agriculture & Rural, PK Diaspora Content |
| Commerce & Brands (3) | Brand Collab Showcase, UGC Creator, Affiliate & Review |

Growth mechanism: additive `INSERT` only (never enum-based), governed by DOC-019 N6 (≥500 matching creators + classifier re-eval before adoption).

---

## Recommended Next Steps

1. **Get ADR-030 signed off.** Everything else in this document is settled; E4 is the one section still marked proposed pending your approval (subscription-behavior change).
2. **Ratify or replace the D3 timeline taxonomy** (Part D3) as an owned artifact rather than an incidental byproduct of API examples — the lowest-priority remaining item, since `entry_type` is `TEXT` specifically so this can evolve without a migration.
3. If the true original DOC-018 content exists somewhere outside this export (a prior session, a different file), reconcile against it — this document should be superseded by that, not treated as permanently canonical, if it turns up.
4. Once ADR-030 is approved, re-verify against the citation table at the top of this document — confirm DOC-014/015/016/019/020's section references (B1, B3, B4, B5, D1, D3, E4, Part H) still line up.
