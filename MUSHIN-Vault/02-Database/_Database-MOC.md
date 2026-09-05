---
title: Database MOC
type: moc
date: {{date}}
tags: [database, moc]
---
# Database Map of Content
## WP Schema Tables
### Core Entities
- [[02-Database/tables/wp/wp.workspace|wp.workspace]]
- [[02-Database/tables/wp/wp.app-user|wp.app_user]]
- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
- [[02-Database/tables/wp/wp.membership|wp.membership]]
- [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]]

### Creator Management
- [[02-Database/tables/wp/wp.list|wp.list]]
- [[02-Database/tables/wp/wp.list-membership|wp.list_membership]]
- [[02-Database/tables/wp/wp.tag|wp.tag]]
- [[02-Database/tables/wp/wp.creator-tag|wp.creator_tag]]
- [[02-Database/tables/wp/wp.reveal|wp.reveal]]

### Campaigns & Tasks
- [[02-Database/tables/wp/wp.campaign|wp.campaign]]
- [[02-Database/tables/wp/wp.campaign-brief-version|wp.campaign_brief_version]]
- [[02-Database/tables/wp/wp.campaign-creator|wp.campaign_creator]]
- [[02-Database/tables/wp/wp.task|wp.task]]

### Sequences
- [[02-Database/tables/wp/wp.sequence-template|wp.sequence_template]]
- [[02-Database/tables/wp/wp.sequence-step|wp.sequence_step]]
- [[02-Database/tables/wp/wp.sequence-enrollment|wp.sequence_enrollment]]

### Billing & Credits
- [[02-Database/tables/wp/wp.credit-ledger-entry|wp.credit_ledger_entry]]
- [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]]
- [[02-Database/tables/wp/wp.paddle-webhook-raw|wp.paddle_webhook_raw]] — NEW Phase 2
- [[02-Database/tables/wp/wp.subscription-event|wp.subscription_event]] — NEW Phase 2
- [[02-Database/tables/wp/wp.entitlement-catalog|wp.entitlement_catalog]]
- [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]]

### Compliance & Jobs
- [[02-Database/tables/wp/wp.consent-state|wp.consent_state]]
- [[02-Database/tables/wp/wp.interaction-timeline|wp.interaction_timeline]]
- [[02-Database/tables/wp/wp.discovery-job|wp.discovery_job]]
- [[02-Database/tables/wp/wp.file-attachment|wp.file_attachment]]

## GCP Schema Tables
- [[02-Database/tables/gcp/gcp.creator|gcp.creator]] — includes `minor_signal` (V007), `embedding` (V008)
- [[02-Database/tables/gcp/gcp.profile|gcp.profile]]
- [[02-Database/tables/gcp/gcp.enrichment-snapshot|gcp.enrichment_snapshot]]
- [[02-Database/tables/gcp/gcp.niche-classification|gcp.niche_classification]]
- [[02-Database/tables/gcp/gcp.contact-record|gcp.contact_record]]
- [[02-Database/tables/gcp/gcp.inflight-url-lock|gcp.inflight_url_lock]]

## Platform Schema Tables
- [[02-Database/tables/platform/platform.outbox|platform.outbox]]
- [[02-Database/tables/platform/platform.processed-event-ledger|platform.processed_event_ledger]]
- [[02-Database/tables/platform/platform.paddle-webhook-raw|platform.paddle_webhook_raw]]
- [[02-Database/tables/platform/platform.admin-audit-log|platform.admin_audit_log]]
- [[02-Database/tables/platform/platform.niche-vocab|platform.niche_vocab]]
- [[02-Database/tables/platform/platform.fx-rate-snapshot|platform.fx_rate_snapshot]]

## Migrations

| Migration | Description | Phase |
|-----------|-------------|-------|
| V001 | Schemas, roles, 21 enum types | — |
| V002 | GCP tables (creator, profile, enrichment_snapshot, etc.) | — |
| V003 | Platform outbox + processed_event_ledger | — |
| V004 | WP core tables (workspace, membership, billing, etc.) + RLS enabled | — |
| V005 | RLS policies for all 8 WP tables | Phase 1 |
| V006 | Billing tables (paddle_webhook_raw, subscription_event) | Phase 2 |
| V007 | minor_signal column on gcp.creator | Phase 3 |
| V008 | pgvector extension + embedding column + similarity function | Phase 6 |
