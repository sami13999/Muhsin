/**
 * Similarity Search Service — pgvector-based semantic search.
 *
 * ADR-033: pgvector alongside Meilisearch for similarity features.
 * - Meilisearch: keyword/filter/facet search (Brain 1)
 * - pgvector: semantic similarity ("find creators like this one")
 *
 * This service handles embedding generation and similarity queries.
 */
import type { Database } from '@mushin/database';
import { creator } from '@mushin/database';
import { sql } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────

export interface SimilarCreator {
  creatorId: string;
  displayName: string | null;
  primaryHandle: string | null;
  similarity: number;
}

export interface EmbeddingResult {
  success: boolean;
  creatorId: string;
  dimensions?: number;
  error?: string;
}

// ── Service ──────────────────────────────────────────────────

export class SimilaritySearchService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Find creators similar to a target creator.
   * Uses cosine similarity on pgvector embeddings.
   */
  async findSimilar(
    creatorId: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
    },
  ): Promise<SimilarCreator[]> {
    const limit = options?.limit ?? 10;
    const minSimilarity = options?.minSimilarity ?? 0.5;

    const results = await this.db.execute(sql`
      SELECT * FROM gcp.find_similar_crears(
        ${creatorId},
        ${limit},
        ${minSimilarity}
      )
    `);

    return results.map((row) => ({
      creatorId: row['creator_id'] as string,
      displayName: row['display_name'] as string | null,
      primaryHandle: row['primary_handle'] as string | null,
      similarity: row['similarity'] as number,
    }));
  }

  /**
   * Generate and store embedding for a creator.
   * Uses LLM adapter to generate embedding from creator data.
   */
  async generateEmbedding(
    creatorId: string,
    embedding: number[],
  ): Promise<EmbeddingResult> {
    try {
      const embeddingJson = JSON.stringify(embedding);

      await this.db.execute(sql`
        UPDATE gcp.creator
        SET embedding = ${embeddingJson}::vector
        WHERE creator_id = ${creatorId}
      `);

      return {
        success: true,
        creatorId,
        dimensions: embedding.length,
      };
    } catch (err) {
      return {
        success: false,
        creatorId,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch generate embeddings for multiple creators.
   */
  async batchGenerateEmbeddings(
    embeddings: Array<{ creatorId: string; embedding: number[] }>,
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (const { creatorId, embedding } of embeddings) {
      const result = await this.generateEmbedding(creatorId, embedding);
      results.push(result);
    }

    return results;
  }

  /**
   * Get creators without embeddings (for batch processing).
   */
  async getCreatorsWithoutEmbeddings(limit: number = 100): Promise<string[]> {
    const results = await this.db.execute(sql`
      SELECT creator_id
      FROM gcp.creator
      WHERE embedding IS NULL
        AND pii_erased_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    return results.map((row) => row['creator_id'] as string);
  }

  /**
   * Check if a creator has an embedding.
   */
  async hasEmbedding(creatorId: string): Promise<boolean> {
    const results = await this.db.execute(sql`
      SELECT embedding IS NOT NULL AS has_embedding
      FROM gcp.creator
      WHERE creator_id = ${creatorId}
    `);

    return results.length > 0 && (results[0]!['has_embedding'] as boolean);
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createSimilaritySearchService(db: Database): SimilaritySearchService {
  return new SimilaritySearchService(db);
}
