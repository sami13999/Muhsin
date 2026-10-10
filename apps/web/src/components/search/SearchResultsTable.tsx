'use client';

import React from 'react';

interface Creator {
  creatorId: string;
  displayName: string;
  primaryHandle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  _rankingScore: number;
  city: string;
  niche: string;
  iqScore: number;
  avatarUrl?: string;
  bio?: string;
}

interface SearchResultsTableProps {
  results: Creator[];
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCreatorId: (id: string) => void;
}

export default function SearchResultsTable({
  results,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onSelectCreatorId
}: SearchResultsTableProps) {

  const getCreatorDetails = (creator: Creator) => {
    return {
      avatar: creator.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      auth: creator.iqScore,
      iq: creator.iqScore,
      followers: creator.followerCount >= 1000000 
        ? `${(creator.followerCount / 1000000).toFixed(1)}M` 
        : `${(creator.followerCount / 1000).toFixed(0)}K`
    };
  };

  return (
    <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
            <th style={{ padding: '16px 20px', width: '48px' }}>
              <input 
                type="checkbox" 
                onChange={onSelectAll} 
                checked={results.length > 0 && selectedIds.length === results.length} 
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#6366f1' }} 
              />
            </th>
            <th style={{ padding: '16px 20px', textAlign: 'left' }}>CREATOR</th>
            <th style={{ padding: '16px 20px', textAlign: 'left' }}>PLATFORM</th>
            <th style={{ padding: '16px 20px', textAlign: 'right' }}>FOLLOWERS</th>
            <th style={{ padding: '16px 20px', textAlign: 'right' }}>ER</th>
            <th style={{ padding: '16px 20px', textAlign: 'right' }}>AUTH.</th>
            <th style={{ padding: '16px 20px', textAlign: 'right' }}>IQ</th>
          </tr>
        </thead>
        <tbody>
          {results.map((c) => {
            const creator = getCreatorDetails(c);
            const isSelected = selectedIds.includes(c.creatorId);
            
            return (
              <tr
                key={c.creatorId}
                onClick={() => onSelectCreatorId(c.creatorId)}
                style={{ 
                  borderBottom: '1px solid #f1f5f9', 
                  cursor: 'pointer', 
                  background: isSelected ? '#f8fafc' : '#ffffff',
                  transition: 'background-color 0.15s' 
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <td style={{ padding: '16px 20px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectRow(c.creatorId)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#6366f1' }}
                  />
                </td>
                
                {/* Creator Details: Avatar + Name + Handle . City */}
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src={creator.avatar} 
                      alt={c.displayName} 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{c.displayName}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <a
                          href={c.platform === 'youtube' ? `https://www.youtube.com/@${c.primaryHandle.replace(/^@/, '')}` : c.platform === 'tiktok' ? `https://www.tiktok.com/@${c.primaryHandle.replace(/^@/, '')}` : `https://www.instagram.com/${c.primaryHandle.replace(/^@/, '')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
                          title="Open real profile on social media"
                        >
                          {c.primaryHandle} ↗
                        </a>
                        <span>• {c.city}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Platform Name and Icon */}
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: c.platform === 'instagram' ? '#e1306c' : c.platform === 'youtube' ? '#ff0000' : '#000000',
                      color: '#ffffff',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {c.platform === 'instagram' && '📷'}
                      {c.platform === 'tiktok' && '🎵'}
                      {c.platform === 'youtube' && '▶'}
                    </div>
                    <span style={{ textTransform: 'capitalize' }}>{c.platform}</span>
                  </div>
                </td>

                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                  {creator.followers}
                </td>

                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                  {c.engagementRate}%
                </td>

                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                  {creator.auth}
                </td>

                {/* IQ Badge with round circular background */}
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <span style={{
                    background: '#f5f3ff',
                    color: '#6366f1',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    {creator.iq}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
