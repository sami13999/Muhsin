/**
 * Step 1 Verification Script: AI Query Expansion Engine (Groq AI Adapter)
 *
 * Verifies that Groq AI (Llama 3.1 8B Instant) takes a natural language user query
 * and expands it into 3 to 5 targeted platform search formulas (Instagram, TikTok, YouTube).
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { createLLMAdapter } from '../packages/adapters/src/index.js';

// Load root .env manually without external dependency
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const parts = trimmed.split('=');
        const key = parts[0]?.trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const queryExpansionSchema = z.object({
  searchQueries: z.array(z.string()).min(1).max(5),
});

async function main() {
  console.log('====================================================');
  console.log('🚀 STEP 1 VERIFICATION: AI Query Expansion (Groq AI)');
  console.log('====================================================\n');

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey.includes('your-')) {
    console.error('❌ ERROR: GROQ_API_KEY is missing or unconfigured in .env');
    process.exit(1);
  }

  console.log(`🔑 Using Groq API Key: ${groqApiKey.substring(0, 10)}...`);

  const llm = createLLMAdapter({ groqApiKey });
  const testPrompt = 'Pakistani lifestyle 500k+ fashion & vlogs';
  const platform = 'all';
  const niche = 'Lifestyle';

  console.log(`\n📥 Input Query: "${testPrompt}"`);
  console.log(`🎯 Platform Constraint: ${platform}`);
  console.log(`🏷️ Niche Constraint: ${niche}`);

  const systemPrompt = `You are an expert Google Search query engineer for finding social media creators (influencers) on Instagram, TikTok, YouTube.
Convert the user request into 3 to 5 targeted Google search query formulas.
User prompt: "${testPrompt}"
Platform constraint: ${platform}
Niche constraint: ${niche}

Generate specific Google search operators like:
site:instagram.com "location" "niche keyword"
site:tiktok.com "location" "creator keyword"
site:youtube.com "location" "channel keyword"

Return JSON with format: { "searchQueries": ["site:...", "site:..."] }`;

  const startTime = Date.now();
  console.log('\n⏳ Sending request to Groq Llama 3.1 8B Instant...');

  const result = await llm.call(
    'T-A',
    systemPrompt,
    testPrompt,
    queryExpansionSchema,
    { temperature: 0.1, maxTokens: 400 }
  );

  const durationMs = Date.now() - startTime;

  if (!result.success) {
    console.error(`\n❌ STEP 1 FAILED: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ STEP 1 SUCCESS (Latency: ${durationMs}ms)`);
  console.log('----------------------------------------------------');
  console.log('Generated Search Queries Formula Array:');
  result.data.searchQueries.forEach((q, idx) => {
    console.log(`  [${idx + 1}] ${q}`);
  });
  console.log('----------------------------------------------------');
  console.log(`Model: ${result.response.model}`);
  console.log(`Provider: ${result.response.provider}`);
  console.log(`Tokens Used: ${result.response.usage.input} input, ${result.response.usage.output} output`);
  console.log(`Estimated USD Cost: $${result.response.costUsd.toFixed(8)}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
