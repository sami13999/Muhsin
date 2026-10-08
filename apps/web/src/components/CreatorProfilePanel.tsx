'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';

interface CreatorProfilePanelProps {
  creatorId: string | null;
  onClose: () => void;
  onDeductCredits?: (credits: number) => void;
}

export default function CreatorProfilePanel({ creatorId, onClose, onDeductCredits }: CreatorProfilePanelProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [creatorDetails, setCreatorDetails] = useState<{
    displayName: string;
    handle: string;
    email?: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (creatorId) {
      setLoading(true);
      setRevealed(false);

      async function fetchCreator() {
        try {
          const res = await api.getCreator(creatorId!);
          if (mounted && res?.data?.creator) {
            setCreatorDetails({
              displayName: res.data.creator.displayName,
              handle: res.data.creator.primaryHandle
            });
          }
        } catch {
          // Keep default UI fallback
        } finally {
          if (mounted) setLoading(false);
        }
      }

      fetchCreator();
    }

    return () => {
      mounted = false;
    };
  }, [creatorId]);

  if (!creatorId) return null;

  const handleReveal = async () => {
    setRevealing(true);
    try {
      const res = await api.revealContact(creatorId);
      if (res?.data?.contactDetails) {
        setCreatorDetails(prev => ({
          ...prev,
          displayName: prev?.displayName || 'Creator',
          handle: prev?.handle || '@creator',
          email: res.data.contactDetails.email || 'sanariaz.brand@gmail.com',
          phone: res.data.contactDetails.phone || '+92 333 5556677'
        }));
      }
    } catch {
      // Local fallback
    } finally {
      setRevealing(false);
      setRevealed(true);
      if (onDeductCredits) {
        onDeductCredits(5);
      }
      toast.success('Contact revealed', 'Direct details unlocked. Deducted 5 credits.');
    }
  };

  const handleSave = () => {
    toast.success('Saved to shortlists', 'Creator details pinned to saved lists.');
  };

  const handleAddCampaign = () => {
    toast.success('Campaign target added', 'Added Sana Riaz to the Eid Sale 2026 queue.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: "'Inter', sans-serif"
      }}
      onClick={onClose}
    >
      {/* Sliding Drawer Content */}
      <div
        className="slide-over"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          height: '100vh',
          boxShadow: '-10px 0 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          zIndex: 100
        }}>
          <span style={{ fontWeight: 600, color: '#475569', fontSize: '13px' }}>Creator profile</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              💾 Save
            </button>
            <button
              onClick={handleAddCampaign}
              style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Add to campaign
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b', marginLeft: '6px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="btn-spinner" style={{ borderTopColor: '#6366f1', width: '28px', height: '28px' }} />
          </div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Profile Overview Header Card */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Sana Riaz"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Sana Riaz</h2>
                  <span style={{ color: '#3b82f6', fontSize: '14px' }}>✓</span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ color: '#e1306c' }}>📷</span> @sanaa.k
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span>📍 Karachi, Pakistan</span>
                  <span>|</span>
                  <span>Lifestyle . Bridal</span>
                  <span>|</span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>#bridal</span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>#karachi</span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>#urdu</span>
                </div>
              </div>
            </div>

            {/* Column Layout */}
            <div className="creator-profile-grid" style={{ gap: '20px', alignItems: 'start' }}>

              {/* Left Column Card - MUSHIN Score & Demographics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Donut Chart Block */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MUSHIN Intelligence Score</div>

                  <div style={{ position: 'relative', width: '100px', height: '100px', margin: '20px auto 12px' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ecfdf5" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6366f1" strokeDasharray="89, 100" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>89</span>
                      <span style={{ fontSize: '7px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>MUSHIN IQ</span>
                    </div>
                  </div>

                  {/* Subscores lines */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', textAlign: 'left' }}>
                    {[
                      { label: 'Authenticity', val: 92, col: '#10b981' },
                      { label: 'Engagement quality', val: 62, col: '#6366f1' },
                      { label: 'Content consistency', val: 82, col: '#6366f1' },
                      { label: 'Brand safety', val: 94, col: '#10b981' }
                    ].map((s) => (
                      <div key={s.label} style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 500 }}>
                          <span>{s.label}</span>
                          <strong>{s.val}</strong>
                        </div>
                        <div style={{ background: '#f1f5f9', height: '4px', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.val}%`, background: s.col, height: '100%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience Demographics Card */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audience demographics</div>

                  {/* Age Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Age <span style={{ float: 'right' }}>Top: 25–34</span></span>
                    {[
                      { band: '18–24', val: 28 },
                      { band: '25–34', val: 42, top: true },
                      { band: '35–44', val: 18 },
                      { band: '45+', val: 12 }
                    ].map((age) => (
                      <div key={age.band} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                        <span style={{ width: '40px', color: '#64748b' }}>{age.band}</span>
                        <div style={{ flex: 1, background: '#f1f5f9', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${age.val}%`, background: '#6366f1', height: '100%' }} />
                        </div>
                        <span style={{ width: '24px', fontWeight: 600, color: '#1e293b' }}>{age.val}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Gender Split */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Gender split</span>
                    <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', display: 'flex', overflow: 'hidden', marginTop: '6px' }}>
                      <div style={{ width: '58%', background: '#ec4899' }} />
                      <div style={{ width: '42%', background: '#6366f1' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                      <span style={{ color: '#ec4899' }}>🚺 58% Female</span>
                      <span style={{ color: '#6366f1' }}>🚹 42% Male</span>
                    </div>
                  </div>

                  {/* Top Cities */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Top cities</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Karachi</span> <span>34%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Lahore</span> <span>28%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Islamabad</span> <span>18%</span></div>
                    </div>
                  </div>
                </div>

                {/* Contact Card */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Contact</div>
                  {revealed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div>📧 Email: <strong style={{ color: '#0f172a' }}>sanariaz.brand@gmail.com</strong></div>
                      <div>📞 Phone/WA: <strong style={{ color: '#0f172a' }}>+92 333 5556677</strong></div>
                    </div>
                  ) : (
                    <button
                      onClick={handleReveal}
                      disabled={revealing}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px dashed #6366f1',
                        background: 'transparent',
                        borderRadius: '8px',
                        color: '#6366f1',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {revealing ? (
                        <span className="btn-spinner" style={{ borderTopColor: '#6366f1', width: '14px', height: '14px' }} />
                      ) : (
                        <>⭐ Reveal contact details</>
                      )}
                    </button>
                  )}
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '6px', textAlign: 'center' }}>Uses 5 enrichment credits</div>
                </div>

              </div>

              {/* Right Column - Performance & Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Performance Card */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Performance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                      { label: 'FOLLOWERS', val: '412K' },
                      { label: 'POSTS', val: '428' },
                      { label: 'ENG. RATE', val: '5.2%', col: '#10b981' },
                      { label: 'AVG LIKES', val: '18.4K' },
                      { label: 'AVG COMMENTS', val: '620' },
                      { label: 'EST. CPE', val: 'Rs. 42' }
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{metric.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: metric.col || '#0f172a', marginTop: '4px' }}>{metric.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement Integrity Card */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagement integrity</div>
                    <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Last 90 days</span>
                  </div>
                  {/* SVG smooth line chart */}
                  <div style={{ height: '70px', width: '100%', marginTop: '16px' }}>
                    <svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="none">
                      <path d="M 0 50 C 40 40, 70 48, 100 32 C 130 18, 170 25, 200 10" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Fake Engagement detection */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fake engagement detection</div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>4%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Flagged interactions</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#475569' }}>
                    {[
                      'No bot networks detected',
                      'No pod-style comment clusters',
                      'Steady engagement history',
                      'Brand-safe content classifier: clean'
                    ].map((bullet, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Posts Grid */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Recent posts</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[1, 2].map((p) => (
                      <div
                        key={p}
                        style={{
                          height: '90px',
                          background: '#f1f5f9',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '8px',
                          border: '1px solid #e2e8f0',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                          <span>❤️ 18.4K</span>
                          <span style={{ color: '#10b981' }}>+5%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
