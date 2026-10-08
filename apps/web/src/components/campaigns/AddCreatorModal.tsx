'use client';

import React, { useState } from 'react';
import { CampaignCreatorItem } from '@/app/dashboard/campaigns/page';

interface AddCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCreator: (creator: CampaignCreatorItem) => void;
}

const PRESET_CREATORS = [
  { name: 'Sana Riaz', handle: '@sanaa.k', platform: 'instagram' as const, followers: '412K', authScore: 92, fee: 'Rs. 85,000', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Ayesha Malik', handle: '@ayeshamalik', platform: 'instagram' as const, followers: '684K', authScore: 88, fee: 'Rs. 120,000', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { name: 'Hira Sheikh', handle: '@hira.sheikh', platform: 'instagram' as const, followers: '228K', authScore: 90, fee: 'Rs. 45,000', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { name: 'Zain Ahmed', handle: '@zaintech', platform: 'youtube' as const, followers: '320K', authScore: 94, fee: 'Rs. 150,000', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { name: 'Fatima Ali', handle: '@fatimabeauty', platform: 'instagram' as const, followers: '280K', authScore: 89, fee: 'Rs. 60,000', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { name: 'Hamza Sheikh', handle: '@hamzafitness', platform: 'tiktok' as const, followers: '450K', authScore: 86, fee: 'Rs. 75,000', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
];

export default function AddCreatorModal({ isOpen, onClose, onAddCreator }: AddCreatorModalProps) {
  const [tab, setTab] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_CREATORS[0] | null>(PRESET_CREATORS[0]);
  
  // Custom creator form fields
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'youtube'>('instagram');
  const [followers, setFollowers] = useState('250K');
  const [authScore, setAuthScore] = useState(90);
  const [fee, setFee] = useState('Rs. 50,000');
  const [stage, setStage] = useState<CampaignCreatorItem['stage']>('shortlisted');
  const [priority, setPriority] = useState<CampaignCreatorItem['priority']>('medium');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'preset') {
      if (!selectedPreset) {
        setError('Please select a creator from the list');
        return;
      }
      onAddCreator({
        id: `cc-${Date.now()}`,
        name: selectedPreset.name,
        handle: selectedPreset.handle,
        platform: selectedPreset.platform,
        followers: selectedPreset.followers,
        authScore: selectedPreset.authScore,
        fee: selectedPreset.fee,
        stage,
        priority,
        avatarUrl: selectedPreset.avatarUrl,
        addedDate: 'Just now'
      });
    } else {
      if (!name.trim()) {
        setError('Creator name is required');
        return;
      }
      onAddCreator({
        id: `cc-${Date.now()}`,
        name: name.trim(),
        handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim() || name.toLowerCase().replace(/\s+/g, '')}`,
        platform,
        followers: followers.trim() || '100K',
        authScore: Number(authScore) || 88,
        fee: fee.trim() || 'Rs. 50,000',
        stage,
        priority,
        avatarUrl: avatarUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        addedDate: 'Just now'
      });
    }

    // Reset & close
    setError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '560px',
          width: '100%',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: "'Inter', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Creator to Campaign</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Select from workspace creators or enter custom details.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setTab('preset')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: tab === 'preset' ? '#ffffff' : 'transparent',
              color: tab === 'preset' ? '#0f172a' : '#64748b',
              boxShadow: tab === 'preset' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Select from Workspace
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: tab === 'custom' ? '#ffffff' : 'transparent',
              color: tab === 'custom' ? '#0f172a' : '#64748b',
              boxShadow: tab === 'custom' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            + Add New Custom Creator
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {tab === 'preset' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {PRESET_CREATORS.map((p) => {
                const isSelected = selectedPreset?.handle === p.handle;
                return (
                  <div
                    key={p.handle}
                    onClick={() => setSelectedPreset(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={p.avatarUrl} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{p.handle} • {p.followers} followers</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{p.fee}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{p.authScore}/100 Auth</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Creator Name *</label>
                  <input type="text" placeholder="e.g. Sana Riaz" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Handle</label>
                  <input type="text" placeholder="@sanaa.k" value={handle} onChange={(e) => setHandle(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Platform</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Followers</label>
                  <input type="text" placeholder="412K" value={followers} onChange={(e) => setFollowers(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Agreed Fee</label>
                  <input type="text" placeholder="Rs. 85,000" value={fee} onChange={(e) => setFee(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Avatar Image URL (Optional)</label>
                <input type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>
          )}

          {/* Pipeline Stage & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Initial Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
                <option value="shortlisted">Shortlisted</option>
                <option value="contacted">Contacted</option>
                <option value="negotiating">Negotiating</option>
                <option value="contracted">Contracted</option>
                <option value="deliverable_submitted">Deliverable Submitted</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ background: '#0f172a', border: 'none', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add Creator to Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
