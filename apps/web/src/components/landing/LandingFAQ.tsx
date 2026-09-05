'use client';

import React, { useState } from 'react';

export default function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    { q: 'What does Mushin actually do?', a: 'Mushin is a creator intelligence platform that lets you search, analyze, and manage influencers in Pakistan across Instagram, TikTok, and YouTube with verified metrics, IQ scoring, and built-in outreach.' },
    { q: 'How is the Creator IQ score calculated?', a: 'The Creator IQ score is a proprietary quality score out of 100 based on audience trust indices, engagement consistency, growth metrics, and community safety flags.' },
    { q: 'Which platforms are supported?', a: 'We natively index and sync public creator nodes across Instagram, TikTok, and YouTube.' },
    { q: 'How does bot and fake-follower detection work?', a: 'Our algorithms scan follower profiles, like ratios, comments sentiment, and historical audience growth spikes to filter out bot accounts and pod engagement patterns.' },
    { q: 'Can multiple teammates collaborate in one workspace?', a: 'Yes! Team owners can invite members, share campaign pipelines, configure roles, and collaborate on outbound pitches in real-time.' },
    { q: 'How is Mushin priced?', a: 'We offer event-based pricing packages starting at Rs. 3,900/month. We support local invoice generation and payments via JazzCash, EasyPaisa, or cards.' },
    { q: 'Is Mushin secure and compliant?', a: 'Yes, Mushin is SOC 2 Type II certified and adheres to ISO 27001 data residency and privacy principles.' }
  ];

  return (
    <section
      id="faq"
      style={{
        padding: '96px 24px', // py-24
        background: '#ffffff',
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
      }}
    >
      <div style={{ maxWidth: '768px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* FAQ subtitle */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#4f46e5',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '12px',
          }}
        >
          FAQ
        </span>

        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#0f172a',
            margin: '0 0 48px 0',
          }}
        >
          Questions, answered.
        </h2>

        {/* Accordion container with top and bottom borders */}
        <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  borderBottom: idx < faqs.length - 1 ? '1px solid #e2e8f0' : 'none',
                  padding: '20px 0',
                }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {faq.q}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen && (
                  <div style={{ marginTop: '12px', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
