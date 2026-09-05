'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface CampaignSettingsProps {
  campaign: Campaign;
  onUpdate?: (updated: Campaign) => void;
  onDelete?: () => void;
}

export default function CampaignSettings({ campaign, onUpdate, onDelete }: CampaignSettingsProps) {
  const toast = useToast();
  const [name, setName] = useState(campaign.name);
  const [budget, setBudget] = useState(campaign.budget);
  const [goal, setGoal] = useState(campaign.goal || '');
  const [status, setStatus] = useState<Campaign['status']>(campaign.status);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...campaign, name, budget, goal, status });
    }
    toast.success('Settings Saved', 'Campaign parameters updated.');
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* General Settings Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>General</h3>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>NAME</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>GOAL</label>
          <textarea rows={4} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} placeholder="Add a goal to align creators and stakeholders." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>BUDGET (PKR)</label>
            <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>STATUS</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} style={{ alignSelf: 'flex-start', background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
          Save changes
        </button>
      </div>

      {/* Danger Zone Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', margin: 0 }}>Danger zone</h4>
        <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>Deletion is permanent and can't be reversed.</span>
        <button onClick={onDelete} style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          Delete campaign
        </button>
      </div>
    </div>
  );
}
