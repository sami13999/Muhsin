---
title: "Event Taxonomy"
status: Active
last_updated: 2026-07-07
tags: [architecture, events, taxonomy, doc-16]
---

# Event Taxonomy (Doc 16 Part B)

All event type strings as typed constants, organized by family. Source: `packages/events/src/taxonomy.ts`

## Scope Class Mapping

| Family | Scope Class | Description |
|---|---|---|
| `creator.*` | GCP | Global Creator Plane events |
| `discovery.*` | GCP | Discovery pipeline events |
| `workspace.*` | WP | Workspace management events |
| `list.*` | WP | List/CRM events |
| `campaign.*` | WP | Campaign events |
| `outreach.*` | WP | Outreach/sequence events |
| `billing.*` | WP | Billing/subscription events |
| `credit.*` | WP | Credit ledger events |
| `reveal.*` | WP | Contact reveal events |
| `admin.*` | WP | Admin/staff events |
| `cost.*` | Platform | Cost telemetry events |

## Creator Family (GCP scope)

| Event | Description |
|---|---|
| `creator.discovered` | New creator found via discovery pipeline |
| `creator.enriched` | Creator profile enriched (scraping complete) |
| `creator.scored` | Creator scored by M6 (authenticity, quality, audience) |
| `creator.refresh_completed` | Creator data refreshed |
| `creator.merge_resolved` | Identity merge resolved (PATCH-008) |

## Discovery Family (GCP + WP scope)

| Event | Description |
|---|---|
| `discovery.job_queued` | Live discovery job queued |
| `discovery.stage_completed` | Pipeline stage completed (per candidate batch) |
| `discovery.job_completed` | Discovery job finished |
| `discovery.job_failed` | Discovery job failed |

## Workspace Family (WP scope)

| Event | Description |
|---|---|
| `workspace.created` | New workspace created |
| `workspace.member_invited` | Member invited to workspace |
| `workspace.member_joined` | Member joined workspace |
| `workspace.member_removed` | Member removed from workspace |
| `workspace.settings_changed` | Workspace settings updated |

## List Family (WP scope)

| Event | Description |
|---|---|
| `list.created` | New list created |
| `list.archived` | List archived |
| `list.membership_changed` | Creator added/removed from list |
| `list.note_added` | Note added to list member |
| `list.exported` | List exported |

## Campaign Family (WP scope)

| Event | Description |
|---|---|
| `campaign.created` | New campaign created |
| `campaign.archived` | Campaign archived |
| `campaign.stage_changed` | Creator moved to different pipeline stage |
| `campaign.task_completed` | Campaign task completed |
| `campaign.rate_recorded` | Rate/agreed price recorded |
| `campaign.outcome_recorded` | Campaign outcome recorded |
| `campaign.budget_threshold_crossed` | Budget threshold crossed (80%/95%) |

## Outreach Family (WP scope)

| Event | Description |
|---|---|
| `outreach.message_sent` | Message sent to creator |
| `outreach.message_delivered` | Message delivered confirmation |
| `outreach.message_failed` | Message delivery failed |
| `outreach.reply_received` | Reply received from creator |
| `outreach.opened` | Message opened (if tracking enabled) |
| `outreach.optout_recorded` | Creator opted out |
| `outreach.sequence_enrolled` | Creator enrolled in sequence |
| `outreach.sequence_step_executed` | Sequence step executed |
| `outreach.sequence_stopped` | Sequence stopped (reply/opt-out/manual) |
| `outreach.mailbox_revoked` | Mailbox access revoked |
| `outreach.whatsapp_quality_changed` | WhatsApp quality tier changed (S2) |

## Billing Family (WP scope)

| Event | Description |
|---|---|
| `billing.webhook_received` | Raw Paddle webhook received |
| `billing.subscription_state_changed` | Subscription state transition |
| `billing.plan_changed` | Plan changed |
| `billing.reconciliation_healed` | Billing reconciliation healed drift |

## Credit Family (WP scope)

| Event | Description |
|---|---|
| `credit.granted` | Credits granted (allowance/topup/promo) |
| `credit.reserved` | Credits reserved for metered action |
| `credit.committed` | Reserved credits committed (action succeeded) |
| `credit.released` | Reserved credits released (action failed/cancelled) |
| `credit.reversed` | Credit reversal (refund) |
| `credit.balance_threshold_crossed` | Balance threshold crossed (80%/95% warnings) |

## Reveal Family (WP scope)

| Event | Description |
|---|---|
| `reveal.contact_revealed` | Contact info revealed to workspace |

## Admin Family (WP + staff scope)

| Event | Description |
|---|---|
| `admin.impersonation_started` | Staff impersonation started |
| `admin.impersonation_ended` | Staff impersonation ended |
| `admin.flag_changed` | Feature flag changed |
| `admin.workspace_suspended` | Workspace suspended by admin |

## Cost Family (Platform scope)

| Event | Description |
|---|---|
| `cost.recorded` | Cost telemetry recorded (provider, model, tokens, unit cost) |

## Implementation File

- `packages/events/src/taxonomy.ts`
