'use client';

import React from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface CampaignOverviewTabProps {
  campaign: Campaign;
}

export default function CampaignOverviewTab({ campaign }: CampaignOverviewTabProps) {
  const isEid = campaign.name.toLowerCase().includes('eid');
  const isNew = campaign.name.toLowerCase().includes('new');

  const goalText = campaign.goal || (isNew 
    ? 'Add a goal to align creators and stakeholders.' 
    : 'Increase brand awareness and capture 2.5K landing page email sign-ups in Lahore and Karachi.');
  
  const responseRate = isEid ? '68%' : isNew ? '0%' : '68%';

  const kpiItems = [
    { label: 'ROAS', target: 'target: 3.5x', value: isNew ? '0x' : (isEid ? '4.2x' : '3.4x'), positive: !isNew },
    { label: 'Reach', target: 'target: 2M', value: '1.42M', positive: false },
    { label: 'Engagements', target: 'target: 250K', value: '284K', positive: true },
    { label: 'Response rate', target: 'target: 60%', value: responseRate, positive: isEid || (!isNew) }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start', fontFamily: "'Inter', sans-serif" }}>
      {/* Left Column: Campaign Goal & Metrics */}
      <div style={{ padding: '20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Campaign goal</h3>
          <p style={{ fontSize: '13px', lineHeight: '19.5px', color: '#0f172a', margin: '8px 0 0' }}>
            {goalText}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'BUDGET', value: campaign.budget },
            { label: 'SPENT', value: campaign.spent },
            { label: 'CREATORS', value: campaign.creatorsCount },
            { label: 'RESPONSE', value: responseRate }
          ].map((item) => (
            <div key={item.label} style={{ padding: '16px 12px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>{item.label}</span>
              <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginTop: '6px' }}>{item.value}</strong>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
            <span>Overall progress</span>
            <span style={{ color: '#1e293b' }}>{campaign.progress}%</span>
          </div>
          <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${campaign.progress}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', height: '100%', borderRadius: '3px' }} />
          </div>
        </div>
      </div>

      {/* Right Column: KPIs Targets list */}
      <div style={{ padding: '20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>KPIs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {kpiItems.map((kpi) => (
            <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#1e293b', fontWeight: 700, fontSize: '13px', display: 'block' }}>{kpi.label}</span>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block', marginTop: '2px' }}>{kpi.target}</span>
              </div>
              <strong style={{ fontSize: '16px', color: kpi.positive ? '#10b981' : '#0f172a' }}>
                {kpi.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
