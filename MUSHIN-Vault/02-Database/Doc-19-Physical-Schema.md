---
type: database
doc-id: 19
status: draft
created: "2026-07-05"
---

# Doc-19: Physical Schema

## Overview

Physical database design for MUSHIN platform across three schemas: gcp, wp, and platform.

## Schemas

| Schema | Purpose | MOC |
|--------|---------|-----|
| gcp | Google Cloud Platform integrations | [[02-Database/tables/gcp/gcp.creator\|GCP Tables]] |
| wp | WordPress workspace integrations | [[02-Database/tables/wp/wp.workspace\|WP Tables]] |
| platform | Core MUSHIN platform | [[02-Database/tables/platform/platform.outbox\|Platform Tables]] |

## Naming Conventions

- Tables: `{schema}.{table_name}` (e.g., `wp.workspace`)
- Columns: snake_case
- Indexes: `idx_{table}_{column}`

## Cross-Schema Relationships

- [[02-Database/tables/gcp/gcp.creator|gcp.creator]] ↔ [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] (soft FK, ADR-024)
- [[02-Database/tables/gcp/gcp.niche-classification|gcp.niche_classification]] ↔ [[02-Database/tables/platform/platform.niche-vocab|platform.niche_vocab]] (soft reference)
- [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]] ↔ [[02-Database/tables/platform/platform.paddle-webhook-raw|platform.paddle_webhook_raw]] (indirect)
- [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]] ↔ [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]] (balance derivation)
- [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]] ↔ [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]] (reserved amount)

## References

- [[_Database-MOC|Database MOC]]
- [[01-Architecture/Doc-17-System-Architecture|System Architecture]]
- [[01-Architecture/Doc-18-Domain-Model|Domain Model]]
- [[04-Functions/_Functions-MOC|Functions]]
