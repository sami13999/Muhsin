'use client';

import React from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

const getAvatar = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes('eid')) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';
  if (norm.includes('ramadan')) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  if (norm.includes('festive')) return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80';
  if (norm.includes('freshfit')) return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
};

export default function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const isEid = campaign.name.toLowerCase().includes('eid');
  const isRamadan = campaign.name.toLowerCase().includes('ramadan');
  const platformLabel = isEid ? 'Multi-platform' : isRamadan ? 'Instagram' : campaign.niche;

  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#ecfdf5', text: '#10b981' },
    draft: { bg: '#f1f5f9', text: '#475569' },
    paused: { bg: '#fff7ed', text: '#f97316' },
    completed: { bg: '#faf5ff', text: '#a855f7' }
  };
  const colorSet = colors[campaign.status] || colors.draft;

  return (
    <div onClick={onClick} style={{ padding: '20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'all 0.15s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: "'Inter', sans-serif" }}>{campaign.name}</h3>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px', background: colorSet.bg, color: colorSet.text, fontFamily: "'Inter', sans-serif" }}>
              <span style={{ color: colorSet.text, fontSize: '10px' }}>•</span> {campaign.status}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontFamily: "'Inter', sans-serif" }}>{platformLabel} . {campaign.dates || '— — —'}</div>
        </div>
        <img src={campaign.coverUrl || getAvatar(campaign.name)} alt={campaign.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', fontFamily: "'Inter', sans-serif" }}>
        {['BUDGET', 'SPENT', 'CREATORS', 'ROAS'].map((lbl, i) => (
          <div key={lbl}>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '9px', fontWeight: 600 }}>{lbl}</span>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '13px', display: 'block', marginTop: '4px' }}>{[campaign.budget, campaign.spent, campaign.creatorsCount, campaign.roas][i]}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
          <span>Progress</span><span style={{ color: '#1e293b' }}>{campaign.progress}%</span>
        </div>
        <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${campaign.progress}%`, background: '#10b981', height: '100%', borderRadius: '3px' }} />
        </div>
      </div>
    </div>
  );
}
