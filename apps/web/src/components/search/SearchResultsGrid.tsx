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
  locationNiche?: string;
  tags?: string[];
  authScore?: number;
  verified?: boolean;
}

interface SearchResultsGridProps {
  results: Creator[];
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectCreatorId: (id: string) => void;
}

export default function SearchResultsGrid({
  results,
  selectedIds,
  onSelectRow,
  onSelectCreatorId
}: SearchResultsGridProps) {
  // Map creators to mock design data if matching specific names
  const enrichCreator = (creator: Creator) => {
    if (creator.displayName === 'Sana Riaz') {
      return {
        ...creator,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        locationNiche: 'Karachi . Lifestyle . Bridal',
        tags: ['#bridal', '#karachi'],
        authScore: 92,
        iqScore: 89
      };
    }
    if (creator.displayName === 'Bilal Hussain') {
      return {
        ...creator,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        locationNiche: 'Karachi . Food . Travel',
        tags: ['#food', '#karachi'],
        authScore: 91,
        iqScore: 88
      };
    }
    return {
      ...creator,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      locationNiche: `${creator.city} . ${creator.niche}`,
      tags: ['#creator', `#${creator.city.toLowerCase()}`],
      authScore: creator.iqScore,
      iqScore: creator.iqScore - 3
    };
  };

  return (
    <div className="search-results-grid" style={{ gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {results.map((c) => {
        const creator = enrichCreator(c);
        const isSelected = selectedIds.includes(creator.creatorId);
        
        return (
          <div
            key={creator.creatorId}
            style={{
              padding: '24px',
              background: '#ffffff',
              border: `1px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}
          >
            {/* Selection Checkbox */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 5 }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectRow(creator.creatorId)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#6366f1' }}
              />
            </div>

            {/* Profile Info Header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <img 
                  src={creator.avatarUrl} 
                  alt={creator.displayName}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                />
                {/* Platform Badge Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: creator.platform === 'instagram' 
                    ? 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
                    : creator.platform === 'youtube' 
                      ? '#ff0000' 
                      : '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {creator.platform === 'instagram' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" />
                    </svg>
                  )}
                  {creator.platform === 'youtube' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ffffff" />
                    </svg>
                  )}
                  {creator.platform === 'tiktok' && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12a4 4 0 1 0 4 4V4h4a4 4 0 0 0 4-4h-4a4 4 0 0 1-4 4v8a2 2 0 1 1-2-2z" />
                    </svg>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{creator.displayName}</h4>
                  {creator.verified && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="7" fill="#3b82f6"/>
                      <path d="M4.5 7L6 8.5L9.5 5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{creator.primaryHandle}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {creator.locationNiche}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '12px', 
              borderTop: '1px solid #f1f5f9', 
              borderBottom: '1px solid #f1f5f9',
              padding: '12px 0',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>FOLLOWERS</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {creator.followerCount >= 1000000 
                    ? `${(creator.followerCount / 1000000).toFixed(1)}M` 
                    : `${(creator.followerCount / 1000).toFixed(0)}K`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>ER</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>{creator.engagementRate}%</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>AUTH.</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>{creator.authScore}</div>
              </div>
            </div>

            {/* Tags Row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {creator.tags?.map((tag) => (
                <span key={tag} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                  {tag}
                </span>
              ))}
              
              {/* IQ Badge with star */}
              <span style={{ 
                fontSize: '11px', 
                background: '#f5f3ff', 
                color: '#6366f1', 
                padding: '2px 8px', 
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#6366f1' }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                IQ {creator.iqScore}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                onClick={() => onSelectCreatorId(creator.creatorId)}
                style={{ 
                  flex: 1, 
                  background: '#0f172a', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '10px 16px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>View profile</span>
                <span>↗</span>
              </button>
              
              <button style={{
                width: '38px',
                height: '38px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}
