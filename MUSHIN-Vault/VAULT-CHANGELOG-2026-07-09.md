# Vault Changelog — 2026-07-09

## Summary

Synchronized MUSHIN-Vault with the current implementation state (Phases 0-13). Fixed 89 broken wikilinks, added 4 new ADRs, created 2 migration docs, updated 5 MOC/index files, and added new service documentation.

---

## Added

| Item | Location | Description |
|------|----------|-------------|
| ADR-029 | `08-Decisions/ADR-029-identity-resolution.md` | Identity resolution weighted-evidence scoring, minor_signal default |
| ADR-030 | `08-Decisions/ADR-030-credit-reservation-subscription.md` | Reservation lifecycle (proposed, awaiting sign-off) |
| ADR-031 | `08-Decisions/ADR-031-queue-class-mapping.md` | Abstract queue → SQS infrastructure mapping |
| ADR-033 | `08-Decisions/ADR-033-stack-pivot.md` | Stack pivot: Supabase, pgvector, Upstash Redis |
| V007 migration | `02-Database/migrations/V007-minor-signal.md` | minor_signal column documentation |
| V008 migration | `02-Database/migrations/V008-pgvector-embeddings.md` | pgvector extension + embedding docs |
| Glossary entries | `00-Meta/Glossary.md` | Added Identity Resolution, minor_signal, WP/GCP/Platform reworded |
| Service docs | `03-API/_API-MOC.md` | Added all 8 new services (entitlement, enrichment, CRM, outreach, analytics, similarity, discovery, cross-platform) |

## Updated

| Item | What changed |
|------|-------------|
| `_ADR-Index.md` | Added 4 new ADRs (029-033); removed trailing slashes from all 15 ADR links |
| `Home.md` | Fixed all 24 wikilinks (old Doc-XX naming → DOC-0XX naming); added links to Phase Summary, Launch Hardening, Architecture State, new ADRs |
| `Glossary.md` | Fixed broken link to DOC-014; removed trailing slash; added new terms |
| `03-API/_API-MOC.md` | Replaced broken integration links with service documentation; added M3 search endpoints; updated LLM provider names per ADR-033 |
| `02-Database/_Database-MOC.md` | Added paddle_webhook_raw + subscription_event to Billing section; added migration table (V001-V008); noted minor_signal + embedding on gcp.creator |
| `00-Meta/repository-structure.md` | Updated last_updated to 2026-07-09; added new packages (paddle, serper, apify, identity, relay); added new migrations (V005-V008); added new services; added new test files; added architecture-state.json, PHASE-SUMMARY.md, LAUNCH-HARDENING-CHECKLIST.md |
| `08-Decisions/ADR-029-identity-resolution.md` | Fixed em-dash → hyphen in wikilinks |
| `08-Decisions/ADR-031-queue-class-mapping.md` | Fixed em-dash → hyphen in wikilinks |
| `08-Decisions/ADR-033-stack-pivot.md` | Fixed em-dash → hyphen in wikilinks |
| `02-Database/tables/wp/wp.paddle-webhook-raw.md` | Created — new billing table spec |
| `02-Database/tables/wp/wp.subscription-event.md` | Created — new billing table spec |

## Deprecated

| Item | Reason |
|------|--------|
| `Doc-17-System-Architecture.md` (old naming) | Superseded by `DOC-014-Software-Architecture-Modules.md` |
| `Doc-18-Domain-Model.md` (old naming) | Superseded by `DOC-018-Reconstructed-Domain-Model.md` |
| `Doc-19-Physical-Schema.md` (old naming) | Superseded by `DOC-019-Addendum-Security-Migration.md` |
| `Doc-20-API-Design.md` (old naming) | Superseded by `DOC-020-API-Contracts.md` |
| `Doc-21-Security-Privacy-Compliance.md` (old naming) | Superseded by `DOC-021-Security-Privacy-Compliance.md` |
| `Doc-22-*.md` (old naming) | Superseded by `DOC-022-Infrastructure-Deployment.md` |
| `Doc-23-*.md` (old naming) | Superseded by `DOC-023-Monitoring-Logging-Observability.md` |
| `Doc-24-*.md` (old naming) | Superseded by `DOC-024-Testing-Strategy-QA.md` |
| `Doc-25-*.md` (old naming) | Superseded by `DOC-025-Engineering-Standards.md` |
| `Doc-26-*.md` (old naming) | Superseded by `DOC-026-CICD-Pipeline-Release.md` |
| `Doc-27-*.md` (old naming) | Superseded by `DOC-027-Operational-Runbooks.md` |
| `Doc-28-*.md` (old naming) | Superseded by `DOC-028-Legal-Terms-Data-Governance.md` |

## Known Remaining Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| ~64 orphaned files (DOC-0xx never linked) | Medium | Product docs need a Product MOC or cross-links from Home.md |
| 2 broken integration links (apify-actors, llm-providers) | Low | Files never created; links now removed from API-MOC |
| DOC-003 pricing (free tier vs trial) | Medium | Spec/code divergence: doc says 14-day trial, code has permanent free tier |
| DOC-010 admin/analytics specs | Low | Entirely unimplemented; specs are accurate but code doesn't exist |
| Welcome.md still Obsidian boilerplate | Low | Cosmetic |
| Duplicate old/new naming files exist in parallel | Low | Old files deprecated but not deleted per user instruction |
