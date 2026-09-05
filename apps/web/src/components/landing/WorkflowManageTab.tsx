'use client';

import React from 'react';
import Link from 'next/link';

export default function WorkflowManageTab() {
  const pipeline = [
    { title: 'Sourced', count: 3, cards: [{ name: 'Ayesha Malik', iq: '84', days: '2d' }, { name: 'Sana Riaz', iq: '85', days: '2d' }, { name: 'Hira Sheikh', iq: '86', days: '2d' }] },
    { title: 'Outreached', count: 2, cards: [{ name: 'Fahad Qureshi', iq: '87', days: '2d' }, { name: 'Bilal Hussain', iq: '88', days: '2d' }] },
    { title: 'Negotiating', count: 1, cards: [{ name: 'Usman Tariq', iq: '90', days: '2d' }] },
    { title: 'Live', count: 2, cards: [{ name: 'Zainab Iqbal', iq: '93', days: '2d' }, { name: 'Ahmed Raza K...', iq: '84', days: '2d' }] }
  ];

  return (
    <div className="workflow-tab-grid">
      
      {/* Left Text */}
      <div style={{ width: '100%' }}>
        <h3 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '16px', margin: 0 }}>
          Keep creators, conversations, and campaigns tidy in one workspace.
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '16px 0 24px' }}>
          Pipelines, approvals, owners, and activity timelines update in real time — replacing spreadsheets, Slack threads, and Notion docs.
        </p>
        <Link href="/signup" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Explore Manage <span style={{ fontSize: '16px' }}>→</span>
        </Link>
      </div>

      {/* Right Mockup */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', width: '100%' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
        </div>

        {/* Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', padding: '16px', background: '#f8fafc', minHeight: '280px', overflowX: 'auto', fontSize: '10px' }}>
          {pipeline.slice(0, 3).map((col, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span>{col.title}</span>
                <span>{col.count}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {col.cards.map((card, cidx) => (
                  <div key={cidx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>{card.name}</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '8px' }}>
                      <span>📈 IQ {card.iq}</span>
                      <span>{card.days}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
