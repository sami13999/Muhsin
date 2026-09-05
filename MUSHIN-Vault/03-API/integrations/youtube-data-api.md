---
title: YouTube Data API v3 Integration
type: integration
status: accepted
date: 2026-07-06
tags: [api, youtube, integrations, doc-17]
---

# YouTube Data API v3 (Native API Integration)

## Overview & Role
Per Doc 17 Section B2a and the Two-Brains architecture, **YouTube Data API v3** is the **sole primary data source** for YouTube channel profiles, video performance metrics, subscriber counts, and comment threads. 

Unlike Instagram and TikTok—which rely on Apify actors—YouTube ingestion leverages Google's native API to ensure rich data quality, immediate reliability, and zero scraping risk.

## Quota & Batching Strategy
YouTube Data API v3 operates under a default allocation of **10,000 quota units per day**. To maximize pipeline throughput and prevent premature exhaustion:
- **Batch Channel Lookups:** Profile and statistics queries MUST batch up to 50 channel IDs per request via `channels.list` with `part=snippet,statistics,contentDetails` (cost: 1 quota unit per 50 channels).
- **Batch Video Metrics:** Video performance queries MUST batch up to 50 video IDs per request via `videos.list` (cost: 1 quota unit per 50 videos).
- **Search Minimization:** Native search queries (`search.list`, costing 100 quota units) are strictly minimized. Candidate discovery relies primarily on Serper (Doc 17 B3) followed by direct channel ID resolution.

## Circuit Breaking & Fallback
- **Monitoring:** Module M12 tracks daily quota unit consumption in real time.
- **Alert Threshold (80%):** When daily quota consumption reaches 80% (8,000 units), an automated alert fires to Ops.
- **Trip Threshold (95%):** At 95% quota consumption (9,500 units), the circuit breaker trips automatically, degrading YouTube ingestion to the **Apify YouTube Scraper fallback** until the daily quota resets at midnight Pacific Time.

## References
- [[01-Architecture/two-brains-model|Two-Brains Model]]
- [[08-Decisions/ADR-022-uniform-adapter-contract|ADR-022: Uniform Adapter Contract]]
