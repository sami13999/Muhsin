'use client';

import React, { useState } from 'react';
import LandingForm from './LandingForm';

export default function LandingPreFooter() {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'trial' | 'demo'>('trial');

  const openForm = (type: 'trial' | 'demo') => {
    setModalType(type);
    setShowModal(true);
  };

  return (
    <section style={{ padding: '80px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Pre-footer Heading */}
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#0f172a',
            margin: '0 0 16px',
          }}
        >
          Ready to operate on
          <span style={{ display: 'block' }}>intelligence?</span>
        </h2>
        
        <p
          style={{
            fontSize: '1.0625rem',
            color: '#64748b',
            margin: '0 auto 32px',
            lineHeight: 1.6,
            maxWidth: '500px',
          }}
        >
          Discover, verify, and orchestrate creator campaigns on a single intelligence layer.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={() => openForm('trial')}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Start free trial <span>→</span>
          </button>
          <button
            onClick={() => openForm('demo')}
            style={{
              background: 'transparent',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '12px 28px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Request a demo
          </button>
        </div>

        {/* Dynamic Modal popup matching Hero CTAs */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: '16px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}
              >
                ✕
              </button>
              <LandingForm initialType={modalType} />
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
