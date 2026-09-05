---
title: wp.file_attachment
type: schema
plane: wp
date: 2026-07-05
status: draft
tags: [database, file_attachment]
---

# 🗄 `wp.file_attachment`

> [!abstract] Purpose
> Metadata for files uploaded to workspaces (campaign briefs, deliverables, contracts). Actual file content stored in object storage; this table holds references and access control.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| workspace_id | uuid | NOT NULL, FK → wp.workspace.id | Owning workspace |
| filename | text | NOT NULL | Original filename from upload |
| mime_type | text | NOT NULL | File MIME type (e.g., application/pdf) |
| size_bytes | bigint | NOT NULL | File size in bytes |
| storage_path | text | NOT NULL | Object storage key (gs://bucket/path) |
| uploaded_by | uuid | NOT NULL, FK → wp.app_user.id | User who uploaded |
| parent_type | text | | Polymorphic owner: campaign, task, campaign_creator |
| parent_id | uuid | | FK to parent entity (polymorphic) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Upload timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_fa_workspace | workspace_id | Btree | All files in workspace |
| idx_fa_parent | parent_type, parent_id | Btree | Files attached to an entity |
| idx_fa_uploaded_by | uploaded_by | Btree | Files by uploader |

## Relationships

- **[[wp.workspace]]** → `workspace_id` FK (many-to-one): Parent workspace
- **[[wp.app-user]]** → `uploaded_by` FK (many-to-one): Uploading user
- **[[wp.campaign]]** → parent_id (polymorphic, when parent_type = 'campaign')
- **[[wp.task]]** → parent_id (polymorphic, when parent_type = 'task')

## Lifecycle & Retention

- Soft-delete not used; files hard-deleted from storage and DB
- Orphan cleanup job ([[04-Functions/workers/sweeper|sweeper]]) removes files without parent reference after 48h
- Max file size: 50MB (enforced at API layer)
