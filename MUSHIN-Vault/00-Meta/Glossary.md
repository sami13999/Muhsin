---
title: MUSHIN Glossary
type: meta
tags: [meta, glossary]
---

# Glossary

| Term | Definition | Related |
|------|------------|---------|
| MUSHIN | Multi-User System for Healthcare Information Networking | [[01-Architecture/DOC-014-Software-Architecture-Modules|System Architecture]] |
| MOC | Map of Content | [[Home]] |
| ADR | Architecture Decision Record | [[08-Decisions/_ADR-Index|ADR Index]] |
| WP | Workspace Plane (schema prefix) | [[02-Database/tables/wp/wp.workspace|wp.workspace]] |
| GCP | Global Creator Plane (schema prefix) | [[02-Database/tables/gcp/gcp.creator|gcp.creator]] |
| Platform | Platform infrastructure schema | [[02-Database/tables/platform/platform.outbox|platform.outbox]] |
| Outbox | Transactional outbox pattern (ADR-020) | [[02-Database/tables/platform/platform.outbox|platform.outbox]] |
| Reveal | Credit-gated contact information access | [[02-Database/tables/wp/wp.reveal|wp.reveal]] |
| Discovery | Creator search and enrichment | [[04-Functions/workers/discovery-worker|Discovery Worker]] |
| Identity Resolution | Weighted-evidence scoring for creator matching (ADR-029) | [[08-Decisions/ADR-029-identity-resolution|ADR-029]] |
| minor_signal | ADR-029: gates contact-reveal, campaign-add, outreach for potential minors | [[08-Decisions/ADR-029-identity-resolution|ADR-029]] |
