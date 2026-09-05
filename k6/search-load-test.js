import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Load test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 users
    { duration: '20s', target: 10 },   // Stay at 10 users
    { duration: '10s', target: 50 },   // Ramp up to 50 users
    { duration: '20s', target: 50 },   // Stay at 50 users
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

// Metrics
const searchCounter = new Counter('search_requests');
const searchDuration = new Trend('search_duration');

// Environment
const MEILISEARCH_HOST = __ENV.MEILISEARCH_HOST || 'https://ms-99e619050387-51371.sgp.meilisearch.io';
const MEILISEARCH_KEY = __ENV.MEILISEARCH_API_KEY || '';

export function setup() {
  console.log('Setting up load test...');

  // Create test index
  const createRes = http.post(
    `${MEILISEARCH_HOST}/indexes`,
    JSON.stringify({ uid: 'k6_load_test', primaryKey: 'id' }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  // Configure settings
  http.patch(
    `${MEILISEARCH_HOST}/indexes/k6_load_test/settings`,
    JSON.stringify({
      filterableAttributes: ['platform', 'followerCount', 'primaryNiche'],
      sortableAttributes: ['followerCount', 'qualityScore'],
      searchableAttributes: ['displayName', 'primaryNiche']
    }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  // Insert 100 test documents
  const docs = [];
  for (let i = 1; i <= 100; i++) {
    docs.push({
      id: i,
      displayName: `Creator ${i}`,
      platform: ['instagram', 'youtube', 'tiktok'][i % 3],
      followerCount: Math.floor(Math.random() * 1000000) + 1000,
      primaryNiche: ['fashion', 'technology', 'food', 'travel'][i % 4],
      qualityScore: Math.floor(Math.random() * 100),
    });
  }

  http.put(
    `${MEILISEARCH_HOST}/indexes/k6_load_test/documents`,
    JSON.stringify(docs),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  sleep(3); // Wait for indexing

  return { indexCreated: true };
}

export default function () {
  // Random search type
  const searchTypes = [
    { q: '', filter: 'platform = "instagram"', name: 'filtered' },
    { q: 'Creator', name: 'text' },
    { q: '', sort: ['followerCount:desc'], name: 'sorted' },
    { q: 'fashion', filter: 'primaryNiche = "fashion"', name: 'combined' },
  ];

  const searchType = searchTypes[Math.floor(Math.random() * searchTypes.length)];

  const startTime = Date.now();
  const res = http.post(
    `${MEILISEARCH_HOST}/indexes/k6_load_test/search`,
    JSON.stringify({ q: searchType.q, filter: searchType.filter, sort: searchType.sort, limit: 20 }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );
  const duration = Date.now() - startTime;

  searchCounter.add(1);
  searchDuration.add(duration);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has hits': (r) => {
      const body = JSON.parse(r.body);
      return body.hits && body.hits.length > 0;
    },
  });

  sleep(0.1); // 100ms think time
}

export function teardown(data) {
  console.log('Cleaning up...');
  http.del(
    `${MEILISEARCH_HOST}/indexes/k6_load_test`,
    null,
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}` } }
  );
  console.log('Load test complete.');
}
