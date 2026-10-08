'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface ListItem {
  name: string;
  creators: number;
  updated: string;
  avatars: string[];
}

const DEFAULT_FALLBACK_LISTS: ListItem[] = [
  { 
    name: 'Bridal Lahore Q3', 
    creators: 24, 
    updated: 'updated 2h ago',
    avatars: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80'
    ]
  },
  { 
    name: 'Karachi tech reviewers', 
    creators: 12, 
    updated: 'updated Yesterday',
    avatars: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
    ]
  },
  { 
    name: 'Ramadan food creators', 
    creators: 38, 
    updated: 'updated 3d ago',
    avatars: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    ]
  }
];

export default function SavedLists() {
  const router = useRouter();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLists() {
      try {
        const res = await api.listLists();
        if (mounted && res?.data && res.data.length > 0) {
          const mapped: ListItem[] = res.data.slice(0, 3).map((l) => ({
            name: l.name,
            creators: l.memberCount ?? 0,
            updated: `updated ${new Date(l.createdAt).toLocaleDateString()}`,
            avatars: [
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
            ]
          }));
          setLists(mapped);
          setLoading(false);
          return;
        }
      } catch {
        // use fallback if backend isn't returning lists yet
      }

      if (mounted) {
        setLists(DEFAULT_FALLBACK_LISTS);
        setLoading(false);
      }
    }

    loadLists();

    return () => {
      mounted = false;
    };
  }, []);

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
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Saved lists</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Recently updated shortlists</p>
        </div>
        <span 
          onClick={() => router.push('/dashboard/lists')}
          style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
        >
          Open Lists ↗
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {loading ? (
          <div style={{ height: '80px', background: '#f1f5f9', borderRadius: '10px' }} className="shimmer" />
        ) : lists.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', gridColumn: '1 / -1', padding: '16px', textAlign: 'center' }}>
            No saved lists found. Create your first list!
          </div>
        ) : (
          lists.map((list, idx) => (
            <div 
              key={idx} 
              style={{ 
                padding: '16px', 
                border: '1px solid #f1f5f9', 
                borderRadius: '10px', 
                background: '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => router.push('/dashboard/lists')}
            >
              {/* Avatar Overlap Stack */}
              <div style={{ display: 'flex', marginBottom: '12px', paddingLeft: '4px' }}>
                {list.avatars.map((av, avIdx) => (
                  <img
                    key={avIdx}
                    src={av}
                    alt={`avatar-${avIdx}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      marginLeft: avIdx === 0 ? 0 : '-10px',
                      zIndex: 10 - avIdx,
                      objectFit: 'cover'
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {list.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {list.creators} creators . {list.updated}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
