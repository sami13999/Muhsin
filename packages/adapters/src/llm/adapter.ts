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
    model: 'claude-3-5-sonnet-20241022',
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
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      const err = new Error('LLM operation aborted');
      err.name = 'AbortError';
      throw err;
    }
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted || (err as any)?.name === 'AbortError') {
        throw err;
      }
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, delay);
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timeout);
                const abortErr = new Error('LLM operation aborted');
                abortErr.name = 'AbortError';
                reject(abortErr);
              },
              { once: true },
            );
          }
        });
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
      signal?: AbortSignal;
    },
  ): Promise<{ success: true; data: T; response: LLMResponse } | { success: false; error: string }> {
    if (options?.signal?.aborted) {
      return { success: false, error: 'LLM operation aborted' };
    }
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
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<{ success: true; response: LLMResponse } | { success: false; error: string }> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          error: `API key for provider "${modelConfig.provider}" is missing or unconfigured`,
        };
      }

      if (options?.signal?.aborted) {
        return {
          success: false,
          error: 'LLM operation aborted',
        };
      }

      const response = await withRetry(async () => {
        const timeoutSignal = AbortSignal.timeout(30_000);
        let requestSignal: AbortSignal = timeoutSignal;
        if (options?.signal) {
          if (typeof (AbortSignal as any).any === 'function') {
            requestSignal = (AbortSignal as any).any([timeoutSignal, options.signal]);
          } else {
            const controller = new AbortController();
            timeoutSignal.addEventListener('abort', () => controller.abort(), { once: true });
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
            if (options.signal.aborted || timeoutSignal.aborted) {
              controller.abort();
            }
            requestSignal = controller.signal;
          }
        }

        if (modelConfig.provider === 'anthropic') {
          const res = await fetch(modelConfig.apiUrl, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelConfig.model,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }],
              temperature: options?.temperature ?? 0,
              max_tokens: options?.maxTokens ?? modelConfig.maxTokens,
            }),
            signal: requestSignal,
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`Anthropic API error: ${res.status} ${res.statusText} ${errText}`.trim());
          }

          const data = (await res.json()) as {
            content?: Array<{ type: string; text?: string }>;
            usage?: { input_tokens?: number; output_tokens?: number };
          };

          const textBlock = data.content?.find((c) => c.type === 'text')?.text ?? data.content?.[0]?.text;
          if (!textBlock) throw new Error('Empty Anthropic LLM response');

          return {
            content: textBlock,
            inputTokens: data.usage?.input_tokens ?? 0,
            outputTokens: data.usage?.output_tokens ?? 0,
          };
        }

        // Groq / OpenAI-compatible endpoint
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
          signal: requestSignal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`LLM API error (${modelConfig.provider}): ${res.status} ${res.statusText} ${errText}`.trim());
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty LLM response');

        return {
          content,
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        };
      });

      const costUsd =
        response.inputTokens * modelConfig.costPerInputToken +
        response.outputTokens * modelConfig.costPerOutputToken;

      const tier: LLMTier =
        modelConfig.provider === 'anthropic'
          ? 'T-C'
          : modelConfig.model.includes('8b')
            ? 'T-A'
            : 'T-B';

      return {
        success: true,
        response: {
          content: response.content,
          model: modelConfig.model,
          provider: modelConfig.provider,
          tier,
          usage: { input: response.inputTokens, output: response.outputTokens },
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
