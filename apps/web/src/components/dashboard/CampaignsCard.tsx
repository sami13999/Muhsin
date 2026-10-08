'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface CampaignCardItem {
  name: string;
  creators: number;
  progress: number;
  status: string;
  statusColor: string;
}

const DEFAULT_FALLBACK_CAMPAIGNS: CampaignCardItem[] = [
  { name: 'Eid Sale 2026', creators: 7, progress: 62, status: 'Live', statusColor: '#10b981' },
  { name: 'Ramadan Beauty Drop', creators: 3, progress: 48, status: 'Live', statusColor: '#10b981' },
  { name: 'Festive Bridal \'26', creators: 0, progress: 12, status: 'Draft', statusColor: '#f97316' }
];

export default function CampaignsCard() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadCampaigns() {
      try {
        const res = await api.listCampaigns();
        if (mounted && res?.data && res.data.length > 0) {
          const mapped: CampaignCardItem[] = res.data.slice(0, 3).map((c) => {
            const isLive = c.status === 'active';
            return {
              name: c.name,
              creators: c.creatorsCount ?? 0,
              progress: c.progress ?? 0,
              status: isLive ? 'Live' : c.status === 'draft' ? 'Draft' : c.status,
              statusColor: isLive ? '#10b981' : '#f97316'
            };
          });
          setCampaigns(mapped);
          setLoading(false);
          return;
        }
      } catch {
        // Fall back to default campaigns list
      }

      if (mounted) {
        setCampaigns(DEFAULT_FALLBACK_CAMPAIGNS);
        setLoading(false);
      }
    }

    loadCampaigns();

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
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Campaigns</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Active pipelines</p>
        </div>
        <span 
          onClick={() => router.push('/dashboard/campaigns')}
          style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
        >
          All ↗
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        {loading ? (
          <div style={{ height: '60px', background: '#f1f5f9', borderRadius: '8px' }} className="shimmer" />
        ) : campaigns.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '12px' }}>
            No active campaigns found.
          </div>
        ) : (
          campaigns.map((camp, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }} onClick={() => router.push('/dashboard/campaigns')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{camp.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{camp.creators} creators</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: camp.statusColor }} />
                  <span>{camp.status}</span>
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: `${camp.progress}%`, background: '#6366f1', height: '100%', borderRadius: '9999px' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
