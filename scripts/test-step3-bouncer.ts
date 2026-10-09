/**
 * Step 3 Verification Script: The Bouncer (4-Tier URL Filter & DB Dedup Engine)
 *
 * Takes raw Google SERP links from Step 2 and passes them through:
 * 1. Store & Brand Keyword Relevance Filter
 * 2. Direct Profile URL Structural Filter (Rejects /p/, /reel/, /explore/)
 * 3. Intra-batch Handle Deduplication
 * 4. Local Supabase Database Check (Avoids re-scraping existing DB creators)
 */
import fs from 'fs';
import path from 'path';
import { createSerperAdapter, createLLMAdapter } from '../packages/adapters/src/index.js';
import { getDb, creatorRepository } from '../packages/database/src/index.js';
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

const STORE_BRAND_KEYWORDS = [
  'shop', 'store', 'buy', 'price', 'brand', 'e-commerce', 'cart', 'checkout',
  'shipping', 'order', 'product', 'sale', 'clothing', 'apparel', 'discount'
];

const NON_PROFILE_PATHS = [
  '/explore/', '/p/', '/reel/', '/reels/', '/stories/', '/watch', '/about',
  '/privacy', '/terms', '/help', '/search', '/legal', '/login', '/signup', '/contact'
];

function isNonProfileUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return NON_PROFILE_PATHS.some(p => lower.includes(p));
}

function extractHandle(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (!pathParts[0]) return undefined;
    const cleanPart = pathParts[0].replace(/^@+/, '');
    return `@${cleanPart}`;
  } catch {
    return undefined;
  }
}

function extractPlatform(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (domain.includes('instagram')) return 'instagram';
    if (domain.includes('tiktok')) return 'tiktok';
    if (domain.includes('youtube')) return 'youtube';
    if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

const queryExpansionSchema = z.object({
  searchQueries: z.array(z.string()).min(1).max(5),
});

async function main() {
  console.log('====================================================');
  console.log('🚀 STEP 3 VERIFICATION: The Bouncer Filter & DB Check');
  console.log('====================================================\n');

  const serperApiKey = process.env.SERPER_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!serperApiKey || !groqApiKey) {
    console.error('❌ ERROR: Missing API keys in .env');
    process.exit(1);
  }

  const serper = createSerperAdapter({ apiKey: serperApiKey });
  const llm = createLLMAdapter({ groqApiKey });
  let db: any = null;
  if (dbUrl && !dbUrl.includes('host:5432')) {
    try {
      db = getDb(dbUrl);
    } catch {
      console.log('ℹ️ Local Supabase DB connection uninitialized for standalone script.');
    }
  }

  // 1 & 2: Fetch live SERP results
  const testPrompt = 'Pakistani lifestyle fashion vlogs';
  console.log(`📥 Input Query: "${testPrompt}"`);
  console.log('⏳ Running Step 1 AI Expansion & Step 2 Google SERP Scan...');

  const systemPrompt = `Convert prompt into 3 Google search formulas for Instagram, TikTok, YouTube. Return JSON: { "searchQueries": ["site:..."] }`;
  const step1 = await llm.call('T-A', systemPrompt, testPrompt, queryExpansionSchema);
  const searchQueries = step1.success ? step1.data.searchQueries : [`site:instagram.com ${testPrompt}`];

  const rawResults: Array<{ title: string; link: string }> = [];
  for (const q of searchQueries) {
    try {
      const hits = await serper.search(q, { numResults: 5, country: 'pk' });
      hits.forEach(h => rawResults.push({ title: h.title, link: h.link }));
    } catch {}
  }

  console.log(`\n📊 Raw Google SERP Links Fetched: ${rawResults.length}`);
  console.log('----------------------------------------------------');

  // 3. STEP 3 EXECUTOR: THE BOUNCER
  console.log('⏳ Running Step 3: The Bouncer (Relevance + Profile URL + Intra-batch + DB Check)...');

  let relevanceRejectedCount = 0;
  let invalidPageTypesCount = 0;
  let duplicatesFilteredCount = 0;
  let dbDuplicatesFilteredCount = 0;

  const seenHandles = new Set<string>();
  const cleanCandidates: Array<{ handle: string; platform: string; url: string; title: string }> = [];

  for (const r of rawResults) {
    const platform = extractPlatform(r.link);
    if (platform === 'unknown') continue;

    // 1. Relevance Filter
    const titleSnippetLower = `${r.title} ${r.link}`.toLowerCase();
    const isStoreBrand = STORE_BRAND_KEYWORDS.some(kw => titleSnippetLower.includes(kw));
    if (isStoreBrand) {
      relevanceRejectedCount++;
      continue;
    }

    // 2. URL Filter
    if (isNonProfileUrl(r.link)) {
      invalidPageTypesCount++;
      continue;
    }

    const handle = extractHandle(r.link);
    if (!handle) {
      invalidPageTypesCount++;
      continue;
    }

    // 3. Intra-batch Deduplication
    const key = `${platform}:${handle.toLowerCase()}`;
    if (seenHandles.has(key)) {
      duplicatesFilteredCount++;
      continue;
    }
    seenHandles.add(key);

    // 4. Supabase DB Cross-Check
    if (db) {
      try {
        const existing = await creatorRepository.findByHandle(db, handle, platform);
        if (existing) {
          dbDuplicatesFilteredCount++;
          continue;
        }
      } catch {}
    }

    cleanCandidates.push({ handle, platform, url: r.link, title: r.title });
  }

  console.log(`\n✅ STEP 3 SUCCESS: The Bouncer Filtering Complete`);
  console.log('----------------------------------------------------');
  console.log(`📊 Filtering Breakdown:`);
  console.log(`  - Raw Links Evaluated:       ${rawResults.length}`);
  console.log(`  - Store/Brand Pages Filtered: ${relevanceRejectedCount}`);
  console.log(`  - Non-Profile URLs Filtered:  ${invalidPageTypesCount}`);
  console.log(`  - Intra-batch Duplicates:    ${duplicatesFilteredCount}`);
  console.log(`  - Supabase DB Duplicates:    ${dbDuplicatesFilteredCount}`);
  console.log(`  - Clean Candidates Passed:   ${cleanCandidates.length}`);
  console.log('----------------------------------------------------');
  console.log('Clean Discovered Creator Candidates Ready for Apify Scraping:');
  cleanCandidates.forEach((c, idx) => {
    console.log(`  [${idx + 1}] Platform: ${c.platform.toUpperCase().padEnd(10)} Handle: ${c.handle.padEnd(25)} URL: ${c.url}`);
  });
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
