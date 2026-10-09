/**
 * Step 2 Verification Script: Google SERP Live Search Scanner (Serper API Adapter)
 *
 * Takes generated search query formulas from Step 1 (Groq AI) and executes live
 * Google SERP scans via Serper API to retrieve organic social media profile URLs.
 */
import fs from 'fs';
import path from 'path';
import { createSerperAdapter, createLLMAdapter } from '../packages/adapters/src/index.js';
import { z } from 'zod';

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
  console.log('🚀 STEP 2 VERIFICATION: Serper Google SERP Scanner');
  console.log('====================================================\n');

  const serperApiKey = process.env.SERPER_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!serperApiKey || serperApiKey.includes('your-')) {
    console.error('❌ ERROR: SERPER_API_KEY is missing in .env');
    process.exit(1);
  }

  console.log(`🔑 Using Serper Key: ${serperApiKey.substring(0, 8)}...`);

  const serper = createSerperAdapter({ apiKey: serperApiKey });
  const llm = createLLMAdapter({ groqApiKey: groqApiKey! });

  // 1. Run Step 1 AI Query Expansion
  const testPrompt = 'Pakistani lifestyle fashion vlogs';
  console.log(`\n📥 Input Query: "${testPrompt}"`);
  console.log('⏳ Running Step 1: AI Query Expansion...');

  const systemPrompt = `Convert prompt into 3 Google search formulas for Instagram, TikTok, YouTube: site:instagram.com "location" "niche". Return JSON: { "searchQueries": ["site:..."] }`;
  const step1Result = await llm.call('T-A', systemPrompt, testPrompt, queryExpansionSchema);

  const searchQueries = step1Result.success
    ? step1Result.data.searchQueries
    : [`site:instagram.com ${testPrompt}`, `site:tiktok.com ${testPrompt}`, `site:youtube.com ${testPrompt}`];

  console.log('  -> Generated formulas:', searchQueries);

  // 2. Run Step 2: Live Google SERP Scan via Serper
  console.log('\n⏳ Running Step 2: Scanning Google SERP via Serper API...');
  const startTime = Date.now();
  const rawResults: Array<{ title: string; link: string; snippet: string; query: string }> = [];

  for (const q of searchQueries) {
    try {
      console.log(`  🔍 Executing SERP query: "${q}"`);
      const hits = await serper.search(q, { numResults: 5, country: 'pk' });
      hits.forEach(h => {
        rawResults.push({
          title: h.title,
          link: h.link,
          snippet: h.snippet,
          query: q
        });
      });
    } catch (err: any) {
      console.warn(`  ⚠️ Search warning for "${q}":`, err.message);
    }
  }

  const durationMs = Date.now() - startTime;

  if (rawResults.length === 0) {
    console.error('\n❌ STEP 2 FAILED: No organic profile links retrieved from Serper SERP scan.');
    process.exit(1);
  }

  console.log(`\n✅ STEP 2 SUCCESS (Latency: ${durationMs}ms)`);
  console.log('----------------------------------------------------');
  console.log(`Retrieved ${rawResults.length} organic social profile links from Google:`);
  console.log('----------------------------------------------------');

  rawResults.forEach((res, idx) => {
    console.log(`[${idx + 1}] Title: ${res.title}`);
    console.log(`    Link:  ${res.link}`);
    console.log(`    Snippet: ${res.snippet.substring(0, 80)}...`);
    console.log('');
  });

  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
