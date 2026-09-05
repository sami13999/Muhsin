---
title: gcp.contact_record
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, contact_record]
---

# 🗄 `gcp.contact_record`

> [!abstract] Purpose
> Stores creator contact information (email, phone, social handles). PII-sensitive data subject to GDPR erasure. Reveals are tracked in wp.reveal.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Target creator |
| contact_type | text | NOT NULL | Enum: email, phone, instagram_dm, twitter_dm, website_form |
| contact_value | text | NOT NULL | Contact info (encrypted at rest) |
| is_primary | boolean | NOT NULL, DEFAULT false | Primary contact method |
| source | text | NOT NULL | Enum: self_reported, scraped, inferred, manual |
| verified | boolean | NOT NULL, DEFAULT false | Whether contact has been verified |
| pii_erased_at | timestamptz | | GDPR erasure marker (NULL = data present) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_cr_creator_type | creator_id, contact_type | UNIQUE | One contact per type per creator |
| idx_cr_creator | creator_id | Btree | All contacts for a creator |
| idx_cr_pii_erased | pii_erased_at | Btree | GDPR erasure queries |
| idx_cr_verified | verified | Btree | Filter verified contacts |

## Relationships

- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Target creator
- **[[wp.reveal]]** → creator_id (indirect): Reveals unlock contact visibility

## Lifecycle & Retention

- **Encryption:** contact_value encrypted at rest via GCP KMS
- **GDPR:** Set `pii_erased_at` and null out `contact_value` on erasure request
- **Access control:** Contact values only visible after [[02-Database/tables/wp/wp.reveal|wp.reveal]] (credit-gated)
- Retained until GDPR erasure or creator deletion
