---
title: wp.creator_tag
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, creator_tag]
---

# 🗄 `wp.creator_tag`

> [!abstract] Purpose
> Junction table applying tags to creators. Enables flexible labeling and filtering of creators within a workspace.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id | Tagged creator |
| tag_id | uuid | NOT NULL, FK → wp.tag.id | Applied tag |
| created_at | timestamptz | NOT NULL, DEFAULT now() | When tag was applied |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_ct_creator_tag | creator_id, tag_id | UNIQUE | No duplicate tag applications |
| idx_ct_tag | tag_id | Btree | All creators with a given tag |
| idx_ct_workspace | workspace_id | Btree | All tag applications in workspace |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[gcp.creator]]** → `creator_id` FK (many-to-one): Tagged creator
- **[[wp.tag]]** → `tag_id` FK (many-to-one): Applied tag

## Lifecycle & Retention

- Cascade delete when tag or creator is deleted
- No soft-delete; hard removal on untag
- Tag details in [[02-Database/tables/wp/wp.tag|wp.tag]]
