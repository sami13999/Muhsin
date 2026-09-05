---
type: architecture
doc-id: 18
status: draft
created: "2026-07-05"
---

# Doc-18: Domain Model

## Overview

Core domain entities and their relationships in the MUSHIN platform.

## Entities

### User & Workspace
- [[02-Database/tables/wp/wp.workspace|wp.workspace]] — Workspace entity
- [[02-Database/tables/wp/wp.app-user|wp.app_user]] — Application users
- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] — User-workspace access

### Creator
- [[02-Database/tables/gcp/gcp.creator|gcp.creator]] — Global creator registry
- [[02-Database/tables/gcp/gcp.profile|gcp.profile]] — Extended creator profile
- [[02-Database/tables/wp/wp.reveal|wp.reveal]] — Creator contact reveals

### Campaign
- [[02-Database/tables/wp/wp.campaign|wp.campaign]] — Marketing campaigns
- [[02-Database/tables/wp/wp.campaign-creator|wp.campaign_creator]] — Campaign-creator assignments
- [[02-Database/tables/wp/wp.task|wp.task]] — Campaign tasks

### Billing
- [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]] — Credit balance
- [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]] — Ledger entries
- [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]] — Subscriptions

## Bounded Contexts

- **Identity & Tenancy** — Users, workspaces, access control
- **Creator Store** — Creator data, enrichment, discovery
- **Campaign Management** — Campaigns, tasks, sequences
- **Billing & Credits** — Subscriptions, ledger, reservations
- **Platform** — Outbox, webhooks, admin audit

## References

- [[01-Architecture/Doc-17-System-Architecture|System Architecture]]
- [[01-Architecture/two-brains-model|Two Brains Model]]
- [[02-Database/_Database-MOC|Database MOC]]
- [[03-API/_API-MOC|API MOC]]
- [[04-Functions/_Functions-MOC|Functions MOC]]
