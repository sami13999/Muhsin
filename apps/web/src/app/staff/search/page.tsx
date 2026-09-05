'use client';

import { useState } from 'react';

interface SearchResult {
  creatorId: string;
  displayName: string;
  primaryHandle: string;
  platform: string;
  followerCount: number | null;
  engagementRate: number | null;
}

export default function SearchDiagnosticsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/creators/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mushin_token') ?? ''}`,
            'X-Workspace-ID': localStorage.getItem('workspaceId') ?? '',
          },
          body: JSON.stringify({ query, filters: {} }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.data ?? []);
        setSearchTime(Date.now() - startTime);
      } else {
        setError('Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Search Diagnostics</h1>

      {/* Search Form */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Test search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            maxWidth: '500px',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Search Stats */}
      {searchTime !== null && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '6px' }}>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Search completed in {searchTime}ms — {results.length} result(s) found
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Handle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Platform</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Followers</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.creatorId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{result.displayName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{result.primaryHandle}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: '#f1f5f9',
                    }}>
                      {result.platform}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    {result.followerCount?.toLocaleString() ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    {result.engagementRate ? `${(result.engagementRate * 100).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !loading && query.trim() && (
        <p style={{ color: '#64748b' }}>No results found for &quot;{query}&quot;</p>
      )}
    </div>
  );
}
