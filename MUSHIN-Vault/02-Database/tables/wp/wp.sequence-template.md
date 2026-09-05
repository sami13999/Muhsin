---
title: wp.sequence_template
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, sequence_template]
---

# 🗄 `wp.sequence_template`

> [!abstract] Purpose
> Reusable outreach sequence templates. A template defines a series of steps (emails, follow-ups) that can be enrolled against multiple creators.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| name | text | NOT NULL | Template display name |
| description | text | | Template purpose/notes |
| status | text | NOT NULL, DEFAULT 'draft' | Enum: draft, active, archived |
| created_by | uuid | NOT NULL, FK → wp.app_user.id | User who created the template |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_st_workspace | workspace_id | Btree | All templates in workspace |
| idx_st_status | status | Btree | Filter active templates |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `created_by` FK (many-to-one): Template creator
- **[[wp.sequence-step]]** → template_id FK (one-to-many): Template steps
- **[[wp.sequence-enrollment]]** → template_id FK (one-to-many): Enrollments

## Lifecycle & Retention

- Templates with active enrollments cannot be archived
- Cascade delete removes steps when template is deleted
- Enrollments managed via [[02-Database/tables/wp/wp.sequence-enrollment|wp.sequence_enrollment]]
