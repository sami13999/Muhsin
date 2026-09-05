---
title: wp.sequence_enrollment
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, sequence_enrollment]
---

# 🗄 `wp.sequence_enrollment`

> [!abstract] Purpose
> Tracks a creator's enrollment in a sequence template. Each enrollment progresses through steps independently, with its own state and timing.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| template_id | uuid | NOT NULL, FK → wp.sequence_template.id | Enrolled template |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Target creator |
| enrolled_by | uuid | NOT NULL, FK → wp.app_user.id | User who initiated enrollment |
| status | text | NOT NULL, DEFAULT 'active' | Enum: active, paused, completed, cancelled |
| current_step_id | uuid | FK → wp.sequence_step.id | Currently executing step |
| next_action_at | timestamptz | | When next step should execute |
| completed_at | timestamptz | | When all steps completed |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Enrollment start timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_se_template_creator | template_id, creator_id | UNIQUE | One enrollment per creator per template |
| idx_se_next_action | status, next_action_at | Btree | Scheduler polling for due actions |
| idx_se_creator | creator_id | Btree | All enrollments for a creator |
| idx_se_workspace | workspace_id | Btree | All enrollments in workspace |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.sequence-template]]** → `template_id` FK (many-to-one): Enrolled template
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Target creator
- **[[wp.app-user]]** → `enrolled_by` FK (many-to-one): Initiating user
- **[[wp.sequence-step]]** → `current_step_id` FK (many-to-one): Current step

## Lifecycle & Retention

- Scheduler polls `next_action_at` WHERE status = 'active'
- Paused enrollments skip scheduling until resumed
- Completed/cancelled enrollments retained for 12 months
- Template steps defined in [[02-Database/tables/wp/wp.sequence-step|wp.sequence_step]]
