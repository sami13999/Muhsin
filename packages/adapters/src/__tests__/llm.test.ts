import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { createLLMAdapter, LLMAdapter } from '../llm/adapter.js';

describe('LLMAdapter Contracts and Protocols', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const testSchema = z.object({
    queries: z.array(z.string()),
  });

  it('correctly formats and executes Groq T-A requests (llama-3.1-8b-instant)', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ queries: ['site:instagram.com travel'] }),
              },
            },
          ],
          usage: { prompt_tokens: 42, completion_tokens: 18 },
        }),
      } as Response;
    });

    const adapter = createLLMAdapter({ groqApiKey: 'gsk-test-key-12345' });
    const res = await adapter.call('T-A', 'System instructions', 'User prompt', testSchema);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.queries).toEqual(['site:instagram.com travel']);
    expect(res.response.provider).toBe('groq');
    expect(res.response.tier).toBe('T-A');
    expect(res.response.model).toBe('llama-3.1-8b-instant');
    expect(capturedUrl).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer gsk-test-key-12345');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.model).toBe('llama-3.1-8b-instant');
    expect(capturedBody.response_format).toEqual({ type: 'json_object' });
    expect(capturedBody.messages).toEqual([
      { role: 'system', content: 'System instructions' },
      { role: 'user', content: 'User prompt' },
    ]);
  });

  it('correctly formats and executes Groq T-B requests (llama-3.3-70b-versatile)', async () => {
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ queries: ['deep scan'] }) } }],
          usage: { prompt_tokens: 80, completion_tokens: 20 },
        }),
      } as Response;
    });

    const adapter = createLLMAdapter({ groqApiKey: 'gsk-tb-key' });
    const res = await adapter.call('T-B', 'Sys', 'User', testSchema);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.response.tier).toBe('T-B');
    expect(res.response.model).toBe('llama-3.3-70b-versatile');
    expect(capturedBody.model).toBe('llama-3.3-70b-versatile');
  });

  it('correctly formats Anthropic Messages API requests with x-api-key and top-level system', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          id: 'msg_123',
          type: 'message',
          content: [
            {
              type: 'text',
              text: JSON.stringify({ queries: ['site:youtube.com tech'] }),
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          usage: { input_tokens: 65, output_tokens: 25 },
        }),
      } as Response;
    });

    const adapter = createLLMAdapter({
      groqApiKey: 'gsk-dummy',
      anthropicApiKey: 'sk-ant-test-key-54321',
    });

    const res = await adapter.call('T-C', 'You are Claude.', 'Extract creators', testSchema);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.queries).toEqual(['site:youtube.com tech']);
    expect(res.response.provider).toBe('anthropic');
    expect(res.response.tier).toBe('T-C');
    expect(res.response.model).toBe('claude-3-5-sonnet-20241022');
    expect(capturedUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(capturedHeaders['x-api-key']).toBe('sk-ant-test-key-54321');
    expect(capturedHeaders['anthropic-version']).toBe('2023-06-01');
    expect(capturedHeaders['Authorization']).toBeUndefined();

    // Verify Anthropic payload structure
    expect(capturedBody.system).toBe('You are Claude.');
    expect(capturedBody.model).toBe('claude-3-5-sonnet-20241022');
    expect(capturedBody.messages).toEqual([{ role: 'user', content: 'Extract creators' }]);
    expect(capturedBody.response_format).toBeUndefined(); // Anthropic does not support OpenAI response_format
  });

  it('returns explicit error when provider API key is missing', async () => {
    const adapter = createLLMAdapter({ groqApiKey: '' });
    const res = await adapter.call('T-A', 'Sys', 'User', testSchema);

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toContain('missing or unconfigured');
  });

  it('retries once on schema mismatch before returning honest failure', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ invalidField: 123 }) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      } as Response;
    });

    const adapter = createLLMAdapter({ groqApiKey: 'gsk-valid' });
    const res = await adapter.call('T-A', 'Sys', 'User', testSchema);

    expect(res.success).toBe(false);
    expect(callCount).toBe(2); // Initial attempt + 1 retry
    if (res.success) return;
    expect(res.error).toContain('failed validation after retry');
  });

  it('honors AbortSignal and aborts immediately', async () => {
    const controller = new AbortController();
    controller.abort();

    const adapter = createLLMAdapter({ groqApiKey: 'gsk-valid' });
    const res = await adapter.call('T-A', 'Sys', 'User', testSchema, { signal: controller.signal });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe('LLM operation aborted');
  });
});
