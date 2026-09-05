import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 50 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const searchDuration = new Trend('search_duration');
const MEILISEARCH_HOST = __ENV.MEILISEARCH_HOST || 'https://ms-99e619050387-51371.sgp.meilisearch.io';
const MEILISEARCH_KEY = __ENV.MEILISEARCH_API_KEY || '';

export function setup() {
  console.log('Setup: Creating test index...');

  // Create index
  http.post(
    `${MEILISEARCH_HOST}/indexes`,
    JSON.stringify({ uid: 'k6_test', primaryKey: 'id' }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  sleep(1);

  // Configure settings
  http.patch(
    `${MEILISEARCH_HOST}/indexes/k6_test/settings`,
    JSON.stringify({
      filterableAttributes: ['platform', 'followerCount'],
      sortableAttributes: ['followerCount'],
      searchableAttributes: ['displayName']
    }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  // Insert documents
  const docs = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    displayName: `Creator ${i + 1}`,
    platform: ['instagram', 'youtube', 'tiktok'][i % 3],
    followerCount: Math.floor(Math.random() * 1000000) + 1000,
  }));

  http.put(
    `${MEILISEARCH_HOST}/indexes/k6_test/documents`,
    JSON.stringify(docs),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );

  sleep(3);
  console.log('Setup complete: 100 documents indexed.');
}

export default function () {
  const queries = [
    { q: '', filter: 'platform = "instagram"' },
    { q: 'Creator', filter: '' },
    { q: '', filter: 'followerCount >= 100000' },
    { q: 'Creator', filter: 'platform = "youtube"' },
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  const startTime = Date.now();
  const res = http.post(
    `${MEILISEARCH_HOST}/indexes/k6_test/search`,
    JSON.stringify({ q: query.q, filter: query.filter, limit: 20 }),
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}`, 'Content-Type': 'application/json' } }
  );
  const duration = Date.now() - startTime;

  searchDuration.add(duration);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}

export function teardown() {
  http.del(
    `${MEILISEARCH_HOST}/indexes/k6_test`,
    null,
    { headers: { 'Authorization': `Bearer ${MEILISEARCH_KEY}` } }
  );
}
