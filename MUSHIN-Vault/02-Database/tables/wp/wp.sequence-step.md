---
title: wp.sequence_step
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, sequence_step]
---

# 🗄 `wp.sequence_step`

> [!abstract] Purpose
> Individual steps within a sequence template. Each step defines an action (email, wait, task) with ordering and delay parameters.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| template_id | uuid | NOT NULL, FK → wp.sequence_template.id | Parent template |
| step_order | integer | NOT NULL | Execution order (1, 2, 3...) |
| step_type | text | NOT NULL | Enum: email, wait, task, condition |
| subject | text | | Email subject line (for email steps) |
| body | text | | Email body template (markdown with merge tags) |
| delay_hours | integer | DEFAULT 0 | Hours to wait before executing this step |
| condition | jsonb | | Conditional logic for branching (for condition steps) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_ss_template_order | template_id, step_order | UNIQUE | Ordered steps per template |
| idx_ss_template | template_id | Btree | All steps for a template |

## Relationships

- **[[wp.sequence-template]]** → `template_id` FK (many-to-one): Parent template

## Lifecycle & Retention

- Cascade delete when parent template is deleted
- Step order must be contiguous (enforced at application layer)
- Immutable once template status = 'active'
