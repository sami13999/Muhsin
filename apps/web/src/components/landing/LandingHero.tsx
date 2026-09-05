'use client';

import React, { useState } from 'react';
import LandingForm from './LandingForm';

export default function LandingHero() {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [initialFormType, setInitialFormType] = useState<'trial' | 'demo'>('trial');

  const openForm = (type: 'trial' | 'demo') => {
    setInitialFormType(type);
    setShowModal(true);
  };

  return (
    <section className="landing-hero-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '120px 16px 40px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* SOC 2 certified badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '9999px',
          marginBottom: '24px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>New • SOC 2 Type II certified</span>
      </div>

      {/* Main Headline */}
      <h1
        style={{
          fontSize: 'clamp(2rem, 5.5vw, 4.25rem)',
          fontWeight: 600,
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          color: '#0f172a',
          margin: '0 0 20px 0',
          maxWidth: '800px',
        }}
      >
        The intelligence layer for
        <span
          style={{
            display: 'block',
            background: 'linear-gradient(to right, #4f46e5, #0f172a, #10b981)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            marginTop: '8px',
          }}
        >
          modern creator campaigns
        </span>
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
          color: '#64748b',
          lineHeight: 1.6,
          maxWidth: '680px',
          margin: '0 0 32px 0',
        }}
      >
        Mushin discovers creators across Instagram, TikTok, and YouTube — verifies their audience, scores their influence, and runs your outreach. All in one place.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap', width: '100%' }}>
        <button
          onClick={() => openForm('trial')}
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
          }}
        >
          Start free trial <span style={{ fontSize: '16px' }}>→</span>
        </button>
        <button
          onClick={() => openForm('demo')}
          style={{
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            padding: '12px 28px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          Request a demo
        </button>
      </div>

      {/* Trust factors checklists */}
      <div style={{ display: 'flex', gap: '16px 24px', color: '#64748b', fontSize: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span>✓ No credit card required</span>
        <span>✓ 14-day free trial</span>
        <span>✓ Cancel anytime</span>
      </div>

      {/* Modal Popup Form overlay */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                }}
              >
                ✕
              </button>
            </div>
            <LandingForm initialType={initialFormType} />
          </div>
        </div>
      )}

    </section>
  );
}
