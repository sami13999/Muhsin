'use client';

import React, { useState } from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (campaignData: Partial<Campaign>) => void;
}

const COVER_PRESETS = [
  { id: 'festive', label: 'Festive / Eid', url: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&auto=format&fit=crop&q=80' },
  { id: 'beauty', label: 'Beauty & Cosmetics', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80' },
  { id: 'bridal', label: 'Bridal Couture', url: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&auto=format&fit=crop&q=80' },
  { id: 'fitness', label: 'Fitness & Sports', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80' },
  { id: 'tech', label: 'Consumer Tech', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80' }
];

export default function CreateCampaignModal({ isOpen, onClose, onCreate }: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [budgetLakhs, setBudgetLakhs] = useState('10.0');
  const [niche, setNiche] = useState('Multi-platform');
  const [owner, setOwner] = useState('You');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [coverUrl, setCoverUrl] = useState(COVER_PRESETS[0].url);
  const [customCover, setCustomCover] = useState('');
  const [error, setError] = useState('');
  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomCover(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }

    const budgetFormatted = `Rs. ${parseFloat(budgetLakhs || '0').toFixed(1)}L`;
    
    // Format date string
    let dateStr = 'TBD';
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateStr = `${s} – ${e}`;
    } else if (startDate) {
      dateStr = `From ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    const finalCover = customCover.trim() || coverUrl;

    onCreate({
      name: name.trim(),
      goal: goal.trim() || 'Drive campaign objectives & creator activation.',
      budget: budgetFormatted,
      spent: 'Rs. 0.0L',
      creatorsCount: 0,
      roas: '0.0x',
      progress: status === 'active' ? 10 : 0,
      niche,
      owner,
      dates: dateStr,
      status,
      coverUrl: finalCover
    });

    // Reset
    setName('');
    setGoal('');
    setBudgetLakhs('10.0');
    setNiche('Multi-platform');
    setOwner('You');
    setStartDate('');
    setEndDate('');
    setStatus('draft');
    setCoverUrl(COVER_PRESETS[0].url);
    setCustomCover('');
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
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-input:focus {
          border-color: #0f172a !important;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1) !important;
        }
      `}</style>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Create New Campaign
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Configure your campaign objectives, budget, target platform, and timeline.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Campaign Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Winter Festive Launch 2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Campaign Objective / Goal
            </label>
            <textarea
              className="modal-input"
              rows={2}
              placeholder="Describe campaign goals, target metrics, or key deliverables..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Campaign Cover / Profile Picture Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Campaign Cover / Profile Picture
            </label>

            {/* Hidden File Input for Camera & Gallery Upload */}
            <input
              type="file"
              ref={coverFileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleCoverFileUpload}
              style={{ display: 'none' }}
            />

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
                      width: '72px',
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 0 0 2px rgba(79,70,229,0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <img src={p.url} alt={p.label} style={{ width: '100%', height: '48px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ fontSize: '9px', fontWeight: 600, textAlign: 'center', padding: '2px 0', background: isSelected ? '#4f46e5' : '#f8fafc', color: isSelected ? '#ffffff' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.label.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Local Device Attachment Options (Camera & Gallery) */}
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (coverFileInputRef.current) {
                      coverFileInputRef.current.setAttribute('capture', 'environment');
                      coverFileInputRef.current.click();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  📷 Camera / Gallery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (coverFileInputRef.current) {
                      coverFileInputRef.current.removeAttribute('capture');
                      coverFileInputRef.current.click();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  📁 Choose File
                </button>
              </div>

              {customCover && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <img src={customCover} alt="Attached preview" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    Custom Image Attached
                  </span>
                  <button type="button" onClick={() => setCustomCover('')} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Total Budget (Rs. Lakhs)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="modal-input"
                placeholder="10.0"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Platform / Niche
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              >
                <option value="Multi-platform">Multi-platform</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="X / Twitter">X / Twitter</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Campaign Owner
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              >
                <option value="You">You</option>
                <option value="Ahmed Raza Khan">Ahmed Raza Khan</option>
                <option value="Ayesha Malik">Ayesha Malik</option>
                <option value="Team Marketing">Team Marketing</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Initial Status
              </label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '38px' }}>
                <label style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    style={{ accentColor: '#0f172a' }}
                  />
                  Draft
                </label>
                <label style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    style={{ accentColor: '#10b981' }}
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: '#0f172a',
                border: 'none',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)'
              }}
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
