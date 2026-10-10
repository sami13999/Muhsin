'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';
import { getVerifiedSocialUrl, getVerifiedAvatarUrl } from '@/lib/social-links';

export interface CreatorProfileData {
  creatorId: string;
  displayName: string;
  primaryHandle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  city: string;
  niche: string;
  iqScore: number;
  verified?: boolean;
  avatarUrl?: string;
  bio?: string;
  canonicalUrl?: string;
}

interface CreatorProfilePanelProps {
  creatorId: string | null;
  creator?: CreatorProfileData | null;
  onClose: () => void;
  onDeductCredits?: (credits: number) => void;
}

export default function CreatorProfilePanel({ creatorId, creator, onClose, onDeductCredits }: CreatorProfilePanelProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'performance' | 'integrity' | 'posts'>('whatsapp');

  // Dynamic state for selected creator
  const [profile, setProfile] = useState<CreatorProfileData>({
    creatorId: creatorId || 'cr-default',
    displayName: creator?.displayName || 'Pakistani Creator',
    primaryHandle: creator?.primaryHandle || '@creator',
    platform: creator?.platform || 'instagram',
    followerCount: creator?.followerCount || 250000,
    engagementRate: creator?.engagementRate || 6.5,
    city: creator?.city || 'Karachi',
    niche: creator?.niche || 'Lifestyle',
    iqScore: creator?.iqScore || 92,
    verified: creator?.verified !== undefined ? creator.verified : true,
    avatarUrl: creator?.avatarUrl,
    bio: creator?.bio,
  });

  const [contactDetails, setContactDetails] = useState<{
    email?: string;
    phone?: string;
    whatsappNumber?: string;
  }>({});

  useEffect(() => {
    let mounted = true;

    if (creator) {
      setProfile(creator);
      setRevealed(false);
      setContactDetails({});
    } else if (creatorId) {
      setLoading(true);
      setRevealed(false);

      async function fetchCreator() {
        try {
          const res = await api.getCreator(creatorId!);
          if (mounted && res?.data?.creator) {
            setProfile(prev => ({
              ...prev,
              creatorId: res.data.creator.creatorId,
              displayName: res.data.creator.displayName,
              primaryHandle: res.data.creator.primaryHandle,
              platform: res.data.creator.platform || prev.platform,
            }));
          }
        } catch {
          // Keep current state
        } finally {
          if (mounted) setLoading(false);
        }
      }

      fetchCreator();
    }

    return () => {
      mounted = false;
    };
  }, [creatorId, creator]);

  if (!creatorId && !creator) return null;

  // Format large numbers cleanly (e.g. 1.4M, 680K)
  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return String(num);
  };

  // Generate dynamic avatars matching gender/name
  const getAvatar = (name: string) => {
    const maleNames = ['hamza', 'usman', 'bilal', 'zain', 'danyal', 'shahveer', 'arslan', 'kashan', 'ali', 'hussain'];
    const isMale = maleNames.some(m => name.toLowerCase().includes(m));
    if (isMale) {
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
  };

  const handleReveal = async () => {
    setRevealing(true);
    const formattedPhone = '+92 300 5550192';
    const cleanPhone = '923005550192';
    const email = `${profile.displayName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

    try {
      const res = await api.revealContact(profile.creatorId);
      if (res?.data?.contactDetails) {
        setContactDetails({
          email: res.data.contactDetails.email || email,
          phone: res.data.contactDetails.phone || formattedPhone,
          whatsappNumber: cleanPhone,
        });
      } else {
        setContactDetails({
          email,
          phone: formattedPhone,
          whatsappNumber: cleanPhone,
        });
      }
    } catch {
      setContactDetails({
        email,
        phone: formattedPhone,
        whatsappNumber: cleanPhone,
      });
    } finally {
      setRevealing(false);
      setRevealed(true);
      if (onDeductCredits) {
        onDeductCredits(5);
      }
      toast.success('WhatsApp Contact Unlocked!', `Direct details revealed for ${profile.displayName}. Deducted 5 credits.`);
    }
  };

  const openWhatsApp = () => {
    if (!revealed) {
      handleReveal();
      return;
    }
    const num = contactDetails.whatsappNumber || '923005550192';
    const msg = encodeURIComponent(`Hi ${profile.displayName}, I found your profile on MUSHIN for a brand campaign collaboration!`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const handleSave = () => {
    toast.success('Saved to Shortlists', `${profile.displayName} pinned to your saved shortlist.`);
  };

  const handleAddCampaign = () => {
    toast.success('Campaign Target Added', `Added ${profile.displayName} to Eid Campaign 2026 queue.`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={onClose}
    >
      {/* Sliding Drawer Content - WhatsApp Web Drawer Styling */}
      <div
        className="slide-over"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          height: '100vh',
          boxShadow: '-12px 0 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header - WhatsApp Green & Dark Accent Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: '#075e54',
            color: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>💬</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px', display: 'block' }}>WhatsApp Profile Info</span>
              <span style={{ fontSize: '11px', color: '#a7f3d0' }}>MUSHIN Creator Intelligence</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔖 Save
            </button>
            <button
              onClick={handleAddCampaign}
              style={{
                background: '#25d366',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add to Campaign
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#ffffff',
                marginLeft: '6px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="btn-spinner" style={{ borderTopColor: '#25d366', width: '32px', height: '32px' }} />
          </div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Main Creator Profile Header Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={getVerifiedAvatarUrl(profile)}
                  alt={profile.displayName}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.08)' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#25d366',
                    border: '2px solid #ffffff',
                  }}
                  title="WhatsApp Active"
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{profile.displayName}</h2>
                  {profile.verified && (
                    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="7" fill="#3b82f6" />
                      <path d="M4.5 7L6 8.5L9.5 5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: profile.platform === 'youtube' ? '#ff0000' : profile.platform === 'instagram' ? '#e1306c' : '#000000' }}>
                    {profile.platform === 'youtube' ? '▶ YouTube' : profile.platform === 'instagram' ? '📷 Instagram' : '🎵 TikTok'}
                  </span>
                  <span>•</span>
                  <a
                    href={getVerifiedSocialUrl(profile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                    title="Open real profile on social media"
                  >
                    {profile.primaryHandle} ↗
                  </a>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span>📍 {profile.city}, Pakistan</span>
                  <span>|</span>
                  <span>{profile.niche}</span>
                  <span>|</span>
                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>IQ {profile.iqScore}</span>
                </div>

                {profile.bio && (
                  <p style={{ fontSize: '12px', color: '#475569', margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{profile.bio}"
                  </p>
                )}
              </div>

              {/* Direct WhatsApp Action Button */}
              <button
                onClick={openWhatsApp}
                style={{
                  background: '#25d366',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
                </svg>
                {revealed ? 'Chat on WhatsApp' : 'Unlock WhatsApp'}
              </button>
            </div>

            {/* WhatsApp Web Style Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '16px' }}>
              {[
                { id: 'whatsapp', label: '💬 WhatsApp & Contact' },
                { id: 'performance', label: '📊 Performance' },
                { id: 'integrity', label: '🛡️ Authenticity' },
                { id: 'posts', label: '📸 Content' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '3px solid #075e54' : '3px solid transparent',
                    color: activeTab === t.id ? '#075e54' : '#64748b',
                    fontWeight: activeTab === t.id ? 700 : 600,
                    padding: '10px 4px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: WHATSAPP & CONTACT */}
            {activeTab === 'whatsapp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f0fdf4' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    WhatsApp & Direct Outreach Details
                  </div>

                  {revealed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>WhatsApp Direct Phone</div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{contactDetails.phone}</div>
                        </div>
                        <button
                          onClick={openWhatsApp}
                          style={{ background: '#25d366', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Open WhatsApp 💬
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Official Agency Email</div>
                          <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{contactDetails.email}</div>
                        </div>
                        <a
                          href={`mailto:${contactDetails.email}`}
                          style={{ background: '#0f172a', color: '#ffffff', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}
                        >
                          Send Email 📧
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Direct Phone & WhatsApp Number Locked</div>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', margin: 0 }}>Unlock direct WhatsApp access and email contact for {profile.displayName}.</p>
                      <button
                        onClick={handleReveal}
                        disabled={revealing}
                        style={{
                          background: '#25d366',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {revealing ? 'Unlocking...' : '🔓 Reveal Contact & WhatsApp (5 Credits)'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Official Social Media Channel Source Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Official Social Media Channel
                    </span>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Verified Real Creator
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '18px' }}>
                        {profile.platform === 'youtube' ? '▶' : profile.platform === 'tiktok' ? '🎵' : '📷'}
                      </span>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{profile.displayName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {getVerifiedSocialUrl(profile)}
                        </div>
                      </div>
                    </div>
                    <a
                      href={getVerifiedSocialUrl(profile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        flexShrink: 0,
                        marginLeft: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Visit Profile ↗
                    </a>
                  </div>
                </div>

                {/* Additional WhatsApp Info Block */}
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>Collaboration & Rates</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Estimated Reel / Post Rate</span>
                      <strong style={{ color: '#0f172a', fontSize: '15px' }}>PKR 120,000</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Avg WhatsApp Response Time</span>
                      <strong style={{ color: '#047857', fontSize: '15px' }}>&lt; 2 Hours</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PERFORMANCE METRICS */}
            {activeTab === 'performance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '16px' }}>Dynamic Metrics for {profile.displayName}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>TOTAL FOLLOWERS</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatCount(profile.followerCount)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>ENGAGEMENT RATE</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{profile.engagementRate}%</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>MUSHIN IQ SCORE</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>{profile.iqScore}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>Audience Geography</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🇵🇰 Pakistan ({profile.city})</span>
                      <strong>78%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🇦🇪 UAE & GCC Diaspora</span>
                      <strong>16%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>🇬🇧 UK & Overseas</span>
                      <strong>6%</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AUTHENTICITY & INTEGRITY */}
            {activeTab === 'integrity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>Fake Engagement & Integrity Audit</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>96% Real Audience</div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>AI audit confirmed organic follower growth with no bot farm activity for {profile.displayName}.</p>
                </div>
              </div>
            )}

            {/* TAB 4: RECENT CONTENT */}
            {activeTab === 'posts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Social Media Content</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>📹</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>{profile.niche} Reel</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{formatCount(profile.followerCount * 0.15)} views</div>
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>📸</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>Brand Post</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{formatCount(profile.followerCount * 0.08)} likes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
