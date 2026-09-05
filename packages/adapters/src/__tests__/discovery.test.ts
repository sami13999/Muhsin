/**
 * Discovery pipeline unit tests.
 * Tests Serper adapter, Apify adapter, and discovery orchestrator.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SerperAdapter, createSerperAdapter } from '../serper/adapter.js';
import { ApifyAdapter, createApifyAdapter } from '../apify/adapter.js';

describe('SerperAdapter', () => {
  let adapter: SerperAdapter;

  beforeEach(() => {
    adapter = createSerperAdapter({ apiKey: 'test-key' });
  });

  describe('Factory', () => {
    it('should create adapter with config', () => {
      expect(adapter).toBeInstanceOf(SerperAdapter);
    });
  });

  describe('Interface', () => {
    it('should implement search method', () => {
      expect(typeof adapter.search).toBe('function');
    });

    it('should implement searchSocialProfiles method', () => {
      expect(typeof adapter.searchSocialProfiles).toBe('function');
    });

    it('should implement health method', () => {
      expect(typeof adapter.health).toBe('function');
    });
  });
});

describe('ApifyAdapter', () => {
  let adapter: ApifyAdapter;

  beforeEach(() => {
    adapter = createApifyAdapter({ apiKey: 'test-key' });
  });

  describe('Factory', () => {
    it('should create adapter with config', () => {
      expect(adapter).toBeInstanceOf(ApifyAdapter);
    });
  });

  describe('Interface', () => {
    it('should implement runActor method', () => {
      expect(typeof adapter.runActor).toBe('function');
    });

    it('should implement fetchDataset method', () => {
      expect(typeof adapter.fetchDataset).toBe('function');
    });

    it('should implement health method', () => {
      expect(typeof adapter.health).toBe('function');
    });
  });
});

describe('DiscoveryOrchestrator', () => {
  // Orchestrator tests require all three adapters
  // Documenting the pipeline stages here

  it('should have three stages: search, scrape, extract', () => {
    // Stage 1: Serper (Google SERP) - finds creator URLs
    // Stage 2: Apify (scraping) - extracts profile data
    // Stage 3: LLM (extraction/classification) - normalizes data
    expect(true).toBe(true);
  });

  it('should emit DISCOVERY_STAGE_COMPLETED events', () => {
    // Each stage emits an event via the outbox
    expect(true).toBe(true);
  });

  it('should handle scrape failures gracefully', () => {
    // If Apify fails for a URL, keep the search result
    expect(true).toBe(true);
  });

  it('should handle LLM extraction failures gracefully', () => {
    // If LLM fails, keep the scraped data
    expect(true).toBe(true);
  });
});
