'use client';

import React from 'react';

export interface PipelineCard {
  id: string;
  name: string;
  stage: 'prospect' | 'contacted' | 'negotiating' | 'accepted';
  fee: string;
  dueDate: string;
  avatar: string;
  handle: string;
}

interface PipelineTabProps {
  pipelineCards: PipelineCard[];
  onMoveCard?: (cardId: string, stage: PipelineCard['stage']) => void;
}

export default function PipelineTab({ pipelineCards, onMoveCard }: PipelineTabProps) {
  const stages = [
    { key: 'prospect', label: 'Prospect', color: '#2563eb', bg: '#eff6ff' },
    { key: 'contacted', label: 'Contacted', color: '#4f46e5', bg: '#eef2ff' },
    { key: 'negotiating', label: 'Negotiating', color: '#d97706', bg: '#fffbeb' },
    { key: 'accepted', label: 'Accepted', color: '#059669', bg: '#ecfdf5' }
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      {stages.map((stage) => {
        const stageCards = pipelineCards.filter((c) => c.stage === stage.key);
        return (
          <div key={stage.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '350px' }}>
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color, background: stage.bg, padding: '2px 8px', borderRadius: '9999px' }}>{stage.label}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{stageCards.length}</span>
            </div>

            {/* Cards Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {stageCards.length === 0 ? (
                <div style={{ flex: 1, border: '1px dashed #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', background: '#ffffff', minHeight: '100px' }}>
                  Empty
                </div>
              ) : (
                stageCards.map((card) => (
                  <div key={card.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <img src={card.avatar} alt={card.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{card.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{card.handle}</div>
                      </div>
                      <button style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, position: 'absolute', right: '12px', top: '8px' }}>...</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{card.fee}</span>
                      <span style={{ color: '#94a3b8' }}>Due {card.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
