'use client';

import React from 'react';

interface PipelineCard {
  id: string;
  name: string;
  stage: 'prospect' | 'contacted' | 'negotiating' | 'accepted' | 'pending' | 'posted' | 'completed' | 'rejected';
  fee: string;
  dueDate: string;
  avatar: string;
}

interface PipelineKanbanProps {
  pipelineCards: PipelineCard[];
  onMoveCard: (cardId: string, targetStage: PipelineCard['stage']) => void;
}

export default function PipelineKanban({ pipelineCards, onMoveCard }: PipelineKanbanProps) {
  const pipelineStages = [
    { key: 'prospect', name: 'Prospect' },
    { key: 'contacted', name: 'Contacted' },
    { key: 'negotiating', name: 'Negotiating' },
    { key: 'accepted', name: 'Accepted' },
    { key: 'pending', name: 'Content Pending' },
    { key: 'posted', name: 'Posted' },
    { key: 'completed', name: 'Completed' },
    { key: 'rejected', name: 'Rejected' },
  ] as const;

  return (
    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
      {pipelineStages.map((stage) => {
        const stageCards = pipelineCards.filter((c) => c.stage === stage.key);
        return (
          <div
            key={stage.key}
            style={{
              minWidth: '220px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{stage.name}</strong>
              <span style={{ fontSize: '10px', background: '#cbd5e1', color: '#475569', borderRadius: '9999px', padding: '1px 6px', fontWeight: 700 }}>
                {stageCards.length}
              </span>
            </div>

            {stageCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#94a3b8', fontSize: '11px' }}>
                Drag or move here
              </div>
            ) : (
              stageCards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>{card.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <span>{card.fee}</span>
                    <span>Due: {card.dueDate}</span>
                  </div>
                  
                  <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <select
                      value={card.stage}
                      onChange={(e) => onMoveCard(card.id, e.target.value as any)}
                      style={{ fontSize: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', width: '100%', padding: '2px' }}
                    >
                      {pipelineStages.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
