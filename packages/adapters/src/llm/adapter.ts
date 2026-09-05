/**
 * LLM Adapter — ADR-022 compliant (7 obligations).
 * Supports the T-A/T-B/T-C routing ladder (Doc 15 Part C1).
 * Groq as primary for T-A/T-B; Anthropic/OpenAI as fallback for T-C.
 */
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────

export type LLMTier = 'T-A' | 'T-B' | 'T-C';

export interface LLMConfig {
  groqApiKey: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tier: LLMTier;
  usage: { input: number; output: number };
  costUsd: number;
  promptRegistryId?: string;
}

export interface LLMCostEvent {
  provider: string;
  model: string;
  tier: LLMTier;
  operation: string;
  tokensInput: number;
  tokensOutput: number;
  unitCostUsd: number;
  promptRegistryId?: string;
  timestamp: string;
}

// ── Model Routing (Doc 15 Part C1) ──────────────────────────

interface ModelConfig {
  provider: string;
  model: string;
  apiUrl: string;
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

const MODEL_REGISTRY: Record<LLMTier, ModelConfig> = {
  'T-A': {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    maxTokens: 1024,
    costPerInputToken: 0.00000005,
    costPerOutputToken: 0.00000008,
  },
  'T-B': {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    maxTokens: 4096,
    costPerInputToken: 0.00000059,
    costPerOutputToken: 0.00000079,
  },
  'T-C': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    maxTokens: 4096,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
  },
};

// ── Circuit Breaker ──────────────────────────────────────────

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt: number;
  openedAt: number;
}

const circuits: Record<LLMTier, CircuitState> = {
  'T-A': { status: 'closed', failureCount: 0, lastFailureAt: 0, openedAt: 0 },
  'T-B': { status: 'closed', failureCount: 0, lastFailureAt: 0, openedAt: 0 },
  'T-C': { status: 'closed', failureCount: 0, lastFailureAt: 0, openedAt: 0 },
};

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_RECOVERY_MS = 30 * 1000;

function recordFailure(tier: LLMTier) {
  const circuit = circuits[tier];
  const now = Date.now();
  if (now - circuit.lastFailureAt > CIRCUIT_WINDOW_MS) {
    circuit.failureCount = 0;
  }
  circuit.failureCount++;
  circuit.lastFailureAt = now;
  if (circuit.failureCount >= CIRCUIT_THRESHOLD) {
    circuit.status = 'open';
    circuit.openedAt = now;
  }
}

function recordSuccess(tier: LLMTier) {
  const circuit = circuits[tier];
  circuit.failureCount = 0;
  circuit.status = 'closed';
}

function isCircuitOpen(tier: LLMTier): boolean {
  const circuit = circuits[tier];
  if (circuit.status === 'closed') return false;
  if (circuit.status === 'open') {
    if (Date.now() - circuit.openedAt > CIRCUIT_RECOVERY_MS) {
      circuit.status = 'half-open';
      return false;
    }
    return true;
  }
  return false;
}

// ── Retry with Exponential Backoff ───────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Adapter ──────────────────────────────────────────────────

export class LLMAdapter {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Call an LLM with schema-constrained output.
   * Validates output against the provided Zod schema before returning.
   * On validation failure: retry once with error feedback → honest failure.
   */
  async call<T>(
    tier: LLMTier,
    systemPrompt: string,
    userMessage: string,
    outputSchema: z.ZodType<T>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      promptRegistryId?: string;
    },
  ): Promise<{ success: true; data: T; response: LLMResponse } | { success: false; error: string }> {
    if (isCircuitOpen(tier)) {
      return { success: false, error: `Circuit breaker open for ${tier}` };
    }

    const modelConfig = MODEL_REGISTRY[tier];
    const apiKey = this.getApiKey(modelConfig.provider);

    // First attempt
    const result = await this.makeRequest(modelConfig, apiKey, systemPrompt, userMessage, options);
    if (!result.success) {
      recordFailure(tier);
      return result;
    }

    // Validate output against schema
    const parsed = outputSchema.safeParse(JSON.parse(result.response.content));
    if (parsed.success) {
      recordSuccess(tier);
      return {
        success: true,
        data: parsed.data,
        response: {
          ...result.response,
          promptRegistryId: options?.promptRegistryId,
        },
      };
    }

    // Retry once with error feedback
    const retryMessage = `${userMessage}\n\nYour previous output was invalid: ${parsed.error.message}\nPlease fix and return valid JSON matching the schema.`;
    const retryResult = await this.makeRequest(modelConfig, apiKey, systemPrompt, retryMessage, options);
    if (!retryResult.success) {
      recordFailure(tier);
      return retryResult;
    }

    const retryParsed = outputSchema.safeParse(JSON.parse(retryResult.response.content));
    if (retryParsed.success) {
      recordSuccess(tier);
      return {
        success: true,
        data: retryParsed.data,
        response: {
          ...retryResult.response,
          promptRegistryId: options?.promptRegistryId,
        },
      };
    }

    recordFailure(tier);
    return { success: false, error: `LLM output failed validation after retry: ${retryParsed.error.message}` };
  }

  private getApiKey(provider: string): string {
    switch (provider) {
      case 'groq':
        return this.config.groqApiKey;
      case 'anthropic':
        return this.config.anthropicApiKey ?? '';
      case 'openai':
        return this.config.openaiApiKey ?? '';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async makeRequest(
    modelConfig: ModelConfig,
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{ success: true; response: LLMResponse } | { success: false; error: string }> {
    try {
      const response = await withRetry(async () => {
        const res = await fetch(modelConfig.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature: options?.temperature ?? 0,
            max_tokens: options?.maxTokens ?? modelConfig.maxTokens,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(30_000), // 30s timeout
        });

        if (!res.ok) {
          throw new Error(`LLM API error: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<{
          choices: Array<{ message: { content: string } }>;
          usage: { prompt_tokens: number; completion_tokens: number };
        }>;
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty LLM response');

      const usage = response.usage;
      const costUsd =
        usage.prompt_tokens * modelConfig.costPerInputToken +
        usage.completion_tokens * modelConfig.costPerOutputToken;

      return {
        success: true,
        response: {
          content,
          model: modelConfig.model,
          provider: modelConfig.provider,
          tier: modelConfig.provider === 'groq' && modelConfig.model.includes('8b') ? 'T-A' : modelConfig.provider === 'groq' ? 'T-B' : 'T-C',
          usage: { input: usage.prompt_tokens, output: usage.completion_tokens },
          costUsd,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown LLM error',
      };
    }
  }

  /**
   * Get circuit status for all tiers.
   */
  getCircuitStatus(): Record<LLMTier, CircuitState['status']> {
    return {
      'T-A': circuits['T-A'].status,
      'T-B': circuits['T-B'].status,
      'T-C': circuits['T-C'].status,
    };
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  return new LLMAdapter(config);
}
