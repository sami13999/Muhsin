---
title: "Meilisearch Document Schema"
status: Active
last_updated: 2026-07-07
tags: [database, meilisearch, search, doc-15, adr-027]
---

# Meilisearch Document Schema

## Index Configuration

- **Index name:** `creators`
- **Primary key:** `creatorId`
- **Source:** `packages/database/src/projections/creator-index-projection.ts`

## Document Interface: `CreatorIndexDocument`

```typescript
interface CreatorIndexDocument {
  id: string;
  // Identity
  name: string;
  handle: string;
  platform: string;
  location: string | null;
  languages: string[];
  transliterationVariants: string[];  // A3: name/handle variants for search matching

  // Metrics
  followerCount: number;
  engagementRate: number | null;
  postCount: number | null;

  // LLM-derived attributes (populated by M6 at ingestion, stored in GCP)
  nicheCategories: string[];           // from niche_classification table
  authenticityBand: 'strong' | 'moderate' | 'weak' | 'unknown';
  authenticityScore: number | null;    // 0-100
  qualityScore: number | null;         // 0-1
  audienceEstimates: {
    pkShare: number | null;            // CC-003: these are estimates
    gccShare: number | null;
    diasporaShare: number | null;
  };
  languageMix: string[] | null;

  // Completeness
  completenessTier: 'rich' | 'standard' | 'sparse' | 'minimal';

  // Freshness
  lastEnrichedAt: string | null;       // ISO timestamp
  lastRefreshedAt: string | null;      // ISO timestamp
  createdAt: string;
}
```

## Filterable Attributes

These attributes can be used in Meilisearch filter expressions:

- `platform`
- `followerCount`
- `engagementRate`
- `nicheCategories` (array)
- `authenticityBand`
- `authenticityScore`
- `qualityScore`
- `audienceEstimates.pkShare`
- `audienceEstimates.gccShare`
- `completenessTier`

## Sortable Attributes

These attributes can be used for sorting:

- `followerCount`
- `engagementRate`
- `authenticityScore`
- `qualityScore`
- `lastEnrichedAt`

## Searchable Attributes

These attributes are full-text searchable:

- `name`
- `handle`
- `transliterationVariants` (array)
- `nicheCategories` (array)

## Data Flow

```
GCP Tables (creator + profile + enrichment_snapshot + niche_classification)
  ↓
projectCreatorToIndex(creatorId, db, meilisearch)
  ↓
Meilisearch upsertDocument('creators', document)
```

## Implementation Files

- Projection: `packages/database/src/projections/creator-index-projection.ts`
- Meilisearch adapter: `packages/adapters/src/meilisearch/adapter.ts`
