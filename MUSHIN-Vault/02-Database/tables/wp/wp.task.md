---
title: wp.task
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, task]
---

# 🗄 `wp.task`

> [!abstract] Purpose
> Actionable work items within a campaign. Tasks track deliverables, approvals, and deadlines for campaign-creator assignments.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| campaign_id | uuid | NOT NULL, FK → wp.campaign.id | Parent campaign |
| campaign_creator_id | uuid | FK → wp.campaign_creator.id | Assigned creator (nullable for internal tasks) |
| title | text | NOT NULL | Task title |
| description | text | | Task details/requirements |
| status | text | NOT NULL, DEFAULT 'todo' | Enum: todo, in_progress, review, approved, done, blocked |
| priority | text | NOT NULL, DEFAULT 'medium' | Enum: low, medium, high, urgent |
| due_date | date | | Task deadline |
| assigned_to | uuid | FK → wp.app_user.id | User responsible for review/approval |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_task_campaign | campaign_id | Btree | All tasks in a campaign |
| idx_task_creator | campaign_creator_id | Btree | Tasks for a specific creator assignment |
| idx_task_status | status | Btree | Filter by status |
| idx_task_due | due_date | Btree | Upcoming deadlines |

## Relationships

- **[[wp.campaign]]** → `campaign_id` FK (many-to-one): Parent campaign
- **[[wp.campaign-creator]]** → `campaign_creator_id` FK (many-to-one): Creator assignment
- **[[wp.app-user]]** → `assigned_to` FK (many-to-one): Reviewer/approver

## Lifecycle & Retention

- Status flow: todo → in_progress → review → approved → done
- Blocked status is terminal (requires re-open)
- Retained with campaign for historical reporting
- Part of [[02-Database/tables/wp/wp.campaign|wp.campaign]]
