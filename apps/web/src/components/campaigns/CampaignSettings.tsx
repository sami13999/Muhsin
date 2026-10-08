'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface CampaignSettingsProps {
  campaign: Campaign;
  onUpdate?: (updated: Campaign) => void;
  onDelete?: () => void;
}

const COVER_PRESETS = [
  { id: 'festive', label: 'Festive / Eid', url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&auto=format&fit=crop&q=80' },
  { id: 'beauty', label: 'Beauty & Cosmetics', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80' },
  { id: 'bridal', label: 'Bridal Couture', url: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&auto=format&fit=crop&q=80' },
  { id: 'fitness', label: 'Fitness & Sports', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80' },
  { id: 'tech', label: 'Consumer Tech', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80' }
];

export default function CampaignSettings({ campaign, onUpdate, onDelete }: CampaignSettingsProps) {
  const toast = useToast();
  const [name, setName] = useState(campaign.name);
  const [budget, setBudget] = useState(campaign.budget);
  const [goal, setGoal] = useState(campaign.goal || '');
  const [status, setStatus] = useState<Campaign['status']>(campaign.status);
  const [owner, setOwner] = useState(campaign.owner || 'You');
  const [dates, setDates] = useState(campaign.dates || '');
  const [coverUrl, setCoverUrl] = useState(campaign.coverUrl || COVER_PRESETS[0].url);
  const [customCover, setCustomCover] = useState('');

  const handleSave = () => {
    const finalCover = customCover.trim() || coverUrl;
    if (onUpdate) {
      onUpdate({ ...campaign, name, budget, goal, status, owner, dates, coverUrl: finalCover });
    }
    toast.success('Settings Saved', 'Campaign parameters and profile image updated.');
  };

  return (
    <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* General Settings Card */}
      <div style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>General Settings</h3>
        
        {/* Cover / Profile Picture Section */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>CAMPAIGN PROFILE & COVER PICTURE</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <img
              src={customCover.trim() || coverUrl}
              alt="Campaign cover preview"
              style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 0 0 1px #cbd5e1' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Campaign Cover Preview</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Select a preset or paste a custom image URL below</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
            {COVER_PRESETS.map((p) => {
              const isSelected = !customCover && coverUrl === p.url;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setCoverUrl(p.url);
                    setCustomCover('');
                  }}
                  style={{
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    width: '80px',
                    flexShrink: 0,
                    boxShadow: isSelected ? '0 0 0 2px rgba(79,70,229,0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img src={p.url} alt={p.label} style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }} />
                  <div style={{ fontSize: '9px', fontWeight: 600, textAlign: 'center', padding: '3px 2px', background: isSelected ? '#4f46e5' : '#f8fafc', color: isSelected ? '#ffffff' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.label}
                  </div>
                </div>
              );
            })}
          </div>
          <input
            type="url"
            placeholder="Or paste custom image URL..."
            value={customCover}
            onChange={(e) => setCustomCover(e.target.value)}
            style={{ width: '100%', marginTop: '8px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>CAMPAIGN NAME</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>GOAL / OBJECTIVES</label>
          <textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} placeholder="Add a goal to align creators and stakeholders." />
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>CAMPAIGN OWNER</label>
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.05em' }}>SCHEDULE DATES</label>
            <input type="text" value={dates} onChange={(e) => setDates(e.target.value)} placeholder="e.g. Jun 20 – Jul 20" style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
          </div>
        </div>

        <button onClick={handleSave} style={{ alignSelf: 'flex-start', background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
