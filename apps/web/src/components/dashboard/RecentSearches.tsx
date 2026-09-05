'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RecentSearches() {
  const router = useRouter();

  const recent = [
    { 
      query: 'Pakistani lifestyle creators 50k+ Karachi', 
      results: 128, 
      time: '2m', 
      platform: 'instagram',
      iconColor: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
    },
    { 
      query: 'Urdu comedy creators >5% engagement', 
      results: 74, 
      time: '18m', 
      platform: 'tiktok',
      iconColor: '#000000' 
    },
    { 
      query: 'Tech reviewers Lahore 100k+', 
      results: 32, 
      time: '1h', 
      platform: 'youtube',
      iconColor: '#ff0000' 
    },
    { 
      query: 'Bridal & fashion 30k-80k Pakistan', 
      results: 96, 
      time: '3h', 
      platform: 'instagram',
      iconColor: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
    }
  ];

  return (
    <div style={{ 
      padding: '24px', 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent searches</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Last 5 queries</p>
        </div>
        <span 
          onClick={() => router.push('/dashboard/search')}
          style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
        >
          View all ↗
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        {recent.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
            onClick={() => router.push(`/dashboard/search?q=${encodeURIComponent(s.query)}`)}
          >
            {/* Circular Platform Icon */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: s.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {s.platform === 'instagram' && '📷'}
              {s.platform === 'tiktok' && '🎵'}
              {s.platform === 'youtube' && '▶'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#1e293b', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}>
                {s.query}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {s.results} results . {s.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
