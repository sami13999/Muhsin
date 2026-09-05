---
title: platform.niche_vocab
type: schema
plane: platform
date: 2026-07-05
status: draft
tags: [database, niche_vocab]
---

# 🗄 `platform.niche_vocab`

> [!abstract] Purpose
> Controlled vocabulary of 48 niche categories used for creator classification and discovery filtering. Seeded at deployment; managed by platform admins.

## Columns

| Column | Type | Constraints | Notes |
|---|---|---|---|
| code | text | PK, NOT NULL | Machine-readable niche code (e.g., "tech_reviews", "beauty") |
| name | text | NOT NULL | Human-readable display name |
| parent_code | text | FK → platform.niche_vocab.code | Parent category for hierarchy (NULL = top-level) |
| description | text | | Niche definition and scope |
| is_active | boolean | NOT NULL, DEFAULT true | Available for classification |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Row creation timestamp |

## Indexes

| Name | Columns | Type | Rationale |
|---|---|---|---|
| idx_nv_code | code | PK | Primary lookup |
| idx_nv_parent | parent_code | Btree | Hierarchy traversal |
| idx_nv_active | is_active | Btree | Filter active niches |

## Relationships

- **[[gcp.niche-classification]]** → niche_code (soft reference): Creator niche assignments
- **[[gcp.creator]]** → niche_primary (soft reference): Creator primary niche
- **[[platform.niche-vocab]]** → parent_code (self-referential): Category hierarchy

## Lifecycle & Retention

- **Seed data:** 48 categories deployed via migration script
- Hierarchical: top-level (e.g., "tech") → sub-categories (e.g., "tech_reviews", "tech_tutorials")
- Niches are never deleted; deactivated via is_active = false
- Managed by platform admins only; not workspace-scoped
- Used by [[02-Database/tables/gcp/gcp.niche-classification|gcp.niche_classification]] for creator classification
- Referenced by [[02-Database/tables/gcp/gcp.creator|gcp.creator]].niche_primary

## Seed Data (48 Categories)

| Code | Name | Parent |
|------|------|--------|
| tech | Technology | NULL |
| tech_reviews | Tech Reviews | tech |
| tech_tutorials | Tech Tutorials | tech |
| tech_news | Tech News | tech |
| gaming | Gaming | NULL |
| gaming_gameplay | Gameplay | gaming |
| gaming_esports | Esports | gaming |
| gaming_reviews | Game Reviews | gaming |
| beauty | Beauty & Fashion | NULL |
| beauty_makeup | Makeup | beauty |
| beauty_skincare | Skincare | beauty |
| beauty_fashion | Fashion | beauty |
| fitness | Fitness & Health | NULL |
| fitness_workout | Workout | fitness |
| fitness_nutrition | Nutrition | fitness |
| fitness_wellness | Wellness | fitness |
| food | Food & Cooking | NULL |
| food_recipes | Recipes | food |
| food_restaurants | Restaurant Reviews | food |
| food_cooking | Cooking Tutorials | food |
| travel | Travel | NULL |
| travel_adventure | Adventure | travel |
| travel_luxury | Luxury Travel | travel |
| travel_budget | Budget Travel | travel |
| education | Education | NULL |
| education_science | Science | education |
| education_language | Language Learning | education |
| education_history | History | education |
| entertainment | Entertainment | NULL |
| entertainment_comedy | Comedy | entertainment |
| entertainment_music | Music | entertainment |
| entertainment_dance | Dance | entertainment |
| lifestyle | Lifestyle | NULL |
| lifestyle_vlogs | Daily Vlogs | lifestyle |
| lifestyle_home | Home & Garden | lifestyle |
| lifestyle_pets | Pets | lifestyle |
| business | Business & Finance | NULL |
| business_entrepreneurship | Entrepreneurship | business |
| business_finance | Personal Finance | business |
| business_marketing | Marketing | business |
| art | Art & Design | NULL |
| art_digital | Digital Art | art |
| art_traditional | Traditional Art | art |
| art_photography | Photography | art |
| automotive | Automotive | NULL |
| auto_reviews | Car Reviews | automotive |
| auto_mods | Car Modifications | automotive |
| parenting | Parenting & Family | NULL |
