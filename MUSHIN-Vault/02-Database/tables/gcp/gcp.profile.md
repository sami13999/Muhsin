---
title: gcp.profile
type: schema
plane: gcp
date: 2026-07-05
status: draft
tags: [database, profile]
---

# 🗄 `gcp.profile`

> [!abstract] Purpose
> Extended profile data for creators, supplementing the core gcp.creator record. Stores platform-specific metrics, audience demographics, and detailed channel analytics.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary identifier |
| creator_id | uuid | NOT NULL, FK → gcp.creator.id, UNIQUE | One profile per creator |
| platform_data | jsonb | NOT NULL, DEFAULT '{}' | Raw platform-specific data (channel stats, video counts) |
| audience_demographics | jsonb | DEFAULT '{}' | Age, gender, geo distribution of audience |
| content_categories | text[] | | Content topic categories |
| avg_video_views | integer | | Average views per video (YouTube) |
| avg_engagement_rate | numeric(6,4) | | Platform-calculated engagement rate |
| posting_frequency | text | | Posting cadence (e.g., "3/week") |
| brand_safety_score | numeric(4,2) | | Brand safety rating (0-100) |
| collaboration_history | jsonb | DEFAULT '[]' | Past brand collaborations |
| last_analytics_sync | timestamptz | | When analytics were last pulled |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_profile_creator | creator_id | UNIQUE | One profile per creator |
| idx_profile_brand_safety | brand_safety_score | Btree | Filter by brand safety |
| idx_profile_demographics_gin | audience_demographics | GIN | JSONB demographic queries |

## Relationships

- **[[gcp.creator]]** → `creator_id` FK (one-to-one): Parent creator

## Lifecycle & Retention

- Synced by [[04-Functions/workers/discovery-worker|discovery-worker]] alongside creator enrichment
- Analytics data retained indefinitely for trend analysis
- Large JSONB fields (platform_data, audience_demographics) compressed at storage layer
- Creator details in [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
