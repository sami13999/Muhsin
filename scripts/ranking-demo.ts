import { readFileSync } from 'fs';

const env: Record<string, string> = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
});

const HOST = env.MEILISEARCH_HOST;
const KEY = env.MEILISEARCH_API_KEY;
const IDX = 'ranking_test_' + Date.now();

// Ranking weights (from ranking.ts)
const WEIGHTS = {
  relevance: 0.25,
  criteriaMatch: 0.20,
  authenticityWeight: 0.20,
  qualityScore: 0.15,
  freshnessDecay: 0.10,
  longTailFairness: 0.10,
};

function getAuthenticityWeight(band: string | null): number {
  switch (band) {
    case 'strong': return 1.0;
    case 'moderate': return 0.7;
    case 'weak': return 0.4;
    default: return 0.2;
  }
}

function computeFreshnessDecay(lastEnrichedAt: string | null): number {
  if (!lastEnrichedAt) return 0;
  const daysSince = (Date.now() - new Date(lastEnrichedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSince / 30);
}

function getFollowerBand(count: number): string {
  if (count < 10000) return 'nano';
  if (count < 100000) return 'micro';
  if (count < 500000) return 'mid';
  if (count < 1000000) return 'macro';
  return 'mega';
}

function computeLongTailFairness(count: number): number {
  const bands = [
    { name: 'nano', min: 0, max: 10000 },
    { name: 'micro', min: 10000, max: 100000 },
    { name: 'mid', min: 100000, max: 500000 },
    { name: 'macro', min: 500000, max: 1000000 },
    { name: 'mega', min: 1000000, max: Infinity },
  ];
  const band = bands.find(b => count >= b.min && count < b.max) || bands[4];
  const range = band.max - band.min;
  const normalized = range === Infinity ? 1.0 : (count - band.min) / range;
  return 0.5 + normalized * 0.5;
}

function computeCriteriaMatch(hit: Record<string, unknown>, filters: Record<string, unknown>): number {
  const filterKeys = Object.keys(filters).filter(k => filters[k] !== undefined && filters[k] !== null && !['sort_by', 'sort_order', 'page', 'limit'].includes(k));
  if (filterKeys.length === 0) return 1.0;
  let matchCount = 0;
  for (const key of filterKeys) {
    const filterVal = filters[key];
    const hitVal = hit[key];
    if (hitVal === undefined || hitVal === null) continue;
    if (typeof filterVal === 'string' && typeof hitVal === 'string') {
      if (hitVal.toLowerCase() === filterVal.toLowerCase()) matchCount++;
    } else if (typeof filterVal === 'number' && typeof hitVal === 'number') {
      if (key.endsWith('_min') && hitVal >= filterVal) matchCount++;
      else if (key.endsWith('_max') && hitVal <= filterVal) matchCount++;
      else if (hitVal === filterVal) matchCount++;
    }
  }
  return matchCount / filterKeys.length;
}

function rankHit(hit: Record<string, unknown>, filters: Record<string, unknown>) {
  const relevanceScore = (hit['_rankingScore'] as number) ?? 1.0;
  const criteriaScore = computeCriteriaMatch(hit, filters);
  const authenticityScore = getAuthenticityWeight(hit['authenticityBand'] as string | null);
  const qualityScore = ((hit['qualityScore'] as number) ?? 0) / 100;
  const freshnessScore = computeFreshnessDecay(hit['lastEnrichedAt'] as string | null);
  const fairnessScore = computeLongTailFairness((hit['followerCount'] as number) ?? 0);

  const totalScore =
    relevanceScore * WEIGHTS.relevance +
    criteriaScore * WEIGHTS.criteriaMatch +
    authenticityScore * WEIGHTS.authenticityWeight +
    qualityScore * WEIGHTS.qualityScore +
    freshnessScore * WEIGHTS.freshnessDecay +
    fairnessScore * WEIGHTS.longTailFairness;

  return {
    displayName: hit['displayName'],
    platform: hit['platform'],
    followerCount: hit['followerCount'],
    primaryNiche: hit['primaryNiche'],
    authenticityBand: hit['authenticityBand'],
    qualityScore: hit['qualityScore'],
    lastEnrichedAt: hit['lastEnrichedAt'],
    band: getFollowerBand((hit['followerCount'] as number) ?? 0),
    breakdown: {
      relevance: relevanceScore * WEIGHTS.relevance,
      criteriaMatch: criteriaScore * WEIGHTS.criteriaMatch,
      authenticity: authenticityScore * WEIGHTS.authenticityWeight,
      quality: qualityScore * WEIGHTS.qualityScore,
      freshness: freshnessScore * WEIGHTS.freshnessDecay,
      fairness: fairnessScore * WEIGHTS.longTailFairness,
    },
    totalScore: totalScore,
  };
}

async function testRanking() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CREATOR RANKING SCORING DEMONSTRATION                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const IDX2 = 'ranking_demo_' + Date.now();

  // Create index
  await fetch(HOST + '/indexes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: IDX2, primaryKey: 'id' })
  });

  // Configure
  await fetch(HOST + '/indexes/' + IDX2 + '/settings', {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche', 'authenticityBand'],
      sortableAttributes: ['followerCount', 'qualityScore'],
      searchableAttributes: ['displayName', 'primaryHandle', 'primaryNiche']
    })
  });

  // Insert diverse creators
  const creators = [
    { id: 'c1', displayName: 'Fashion Queen', platform: 'instagram', followerCount: 150000, primaryNiche: 'fashion', authenticityBand: 'strong', qualityScore: 85, lastEnrichedAt: new Date().toISOString() },
    { id: 'c2', displayName: 'Tech Reviewer', platform: 'youtube', followerCount: 500000, primaryNiche: 'technology', authenticityBand: 'strong', qualityScore: 92, lastEnrichedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'c3', displayName: 'Food Blogger', platform: 'instagram', followerCount: 25000, primaryNiche: 'food', authenticityBand: 'moderate', qualityScore: 71, lastEnrichedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'c4', displayName: 'Travel Vlogger', platform: 'youtube', followerCount: 89000, primaryNiche: 'travel', authenticityBand: 'strong', qualityScore: 88, lastEnrichedAt: new Date().toISOString() },
    { id: 'c5', displayName: 'Gaming Streamer', platform: 'tiktok', followerCount: 320000, primaryNiche: 'gaming', authenticityBand: 'moderate', qualityScore: 76, lastEnrichedAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'c6', displayName: 'Nano Beauty Creator', platform: 'instagram', followerCount: 5000, primaryNiche: 'beauty', authenticityBand: 'strong', qualityScore: 90, lastEnrichedAt: new Date().toISOString() },
    { id: 'c7', displayName: 'Mega Lifestyle', platform: 'youtube', followerCount: 2000000, primaryNiche: 'lifestyle', authenticityBand: 'weak', qualityScore: 45, lastEnrichedAt: new Date(Date.now() - 604800000).toISOString() },
  ];

  await fetch(HOST + '/indexes/' + IDX2 + '/documents', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(creators)
  });
  await new Promise(r => setTimeout(r, 3000));

  // Scenario: Search for Instagram fashion creators
  console.log('═══ SCENARIO: Search "Instagram fashion creators" ═══\n');
  const filters = { platform: 'instagram', primaryNiche: 'fashion' };

  const res = await fetch(HOST + '/indexes/' + IDX2 + '/search', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: '', filter: 'platform = "instagram" AND primaryNiche = "fashion"', limit: 10 })
  });
  const data = await res.json();
  const hits = data.hits || [];

  if (hits.length === 0) {
    // Try without filter to see what's available
    console.log('No results with filter. Trying empty search...\n');
    const res2 = await fetch(HOST + '/indexes/' + IDX2 + '/search', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '', limit: 10 })
    });
    const data2 = await res2.json();
    hits.push(...(data2.hits || []));
  }

  // Apply ranking
  const ranked = hits.map((h: Record<string, unknown>) => rankHit(h, filters));

  // Sort by total score
  ranked.sort((a: any, b: any) => b.totalScore - a.totalScore);

  // Display results
  console.log('Rank | Creator | Platform | Followers | Niche | Authenticity | Quality | Score');
  console.log('─'.repeat(95));

  ranked.forEach((r: any, i: number) => {
    const rank = String(i + 1).padStart(2);
    const name = (r.displayName || 'Unknown').substring(0, 20).padEnd(20);
    const platform = (r.platform || '').substring(0, 8).padEnd(8);
    const followers = String(r.followerCount || 0).padStart(10);
    const niche = (r.primaryNiche || '').substring(0, 10).padEnd(10);
    const auth = (r.authenticityBand || 'none').substring(0, 12).padEnd(12);
    const quality = String(r.qualityScore || 0).padStart(3);
    const score = r.totalScore.toFixed(4);
    console.log(`  ${rank} | ${name} | ${platform} | ${followers} | ${niche} | ${auth} | ${quality} | ${score}`);
  });

  // Show breakdown for top creator
  if (ranked.length > 0) {
    console.log('\n═══ TOP CREATOR SCORING BREAKDOWN ═══\n');
    const top = ranked[0] as any;
    console.log(`Creator: ${top.displayName}`);
    console.log(`Platform: ${top.platform} | Followers: ${top.followerCount} | Band: ${top.band}`);
    console.log(`Niche: ${top.primaryNiche} | Authenticity: ${top.authenticityBand} | Quality: ${top.qualityScore}`);
    console.log(`Last enriched: ${top.lastEnrichedAt ? new Date(top.lastEnrichedAt).toLocaleDateString() : 'never'}`);
    console.log('');
    console.log('Factor Breakdown:');
    console.log(`  Relevance:      ${top.breakdown.relevance.toFixed(4)} (weight: ${WEIGHTS.relevance})`);
    console.log(`  Criteria Match: ${top.breakdown.criteriaMatch.toFixed(4)} (weight: ${WEIGHTS.criteriaMatch})`);
    console.log(`  Authenticity:   ${top.breakdown.authenticity.toFixed(4)} (weight: ${WEIGHTS.authenticityWeight})`);
    console.log(`  Quality:        ${top.breakdown.quality.toFixed(4)} (weight: ${WEIGHTS.qualityScore})`);
    console.log(`  Freshness:      ${top.breakdown.freshness.toFixed(4)} (weight: ${WEIGHTS.freshnessDecay})`);
    console.log(`  Fairness:       ${top.breakdown.fairness.toFixed(4)} (weight: ${WEIGHTS.longTailFairness})`);
    console.log(`  ──────────────────────────────────────`);
    console.log(`  TOTAL SCORE:    ${top.totalScore.toFixed(4)}`);
  }

  // Cleanup
  await fetch(HOST + '/indexes/' + IDX2, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + KEY } });
  console.log('\n✅ Ranking validation complete');
}

testRanking();
