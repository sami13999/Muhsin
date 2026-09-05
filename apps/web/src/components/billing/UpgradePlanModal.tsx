'use client';

import React, { useState } from 'react';

interface UpgradePlanModalProps {
  currentPlan: string;
  onClose: () => void;
  onSelectPlan: (plan: string, limit: number) => void;
}

export default function UpgradePlanModal({ currentPlan, onClose, onSelectPlan }: UpgradePlanModalProps) {
  const [selected, setSelected] = useState(currentPlan);

  const plans = [
    { name: 'Starter', price: '$99', limit: 25000, desc: 'For growing teams starting influencer campaigns.' },
    { name: 'Growth', price: '$498', limit: 100000, desc: 'Complete toolkit for active scaling brands.' },
    { name: 'Enterprise', price: '$1,499', limit: 500000, desc: 'Advanced parameters, high volume credits.' }
  ];

  const handleConfirm = () => {
    const target = plans.find(p => p.name === selected);
    if (target) {
      onSelectPlan(target.name, target.limit);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Upgrade your plan</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Select a plan that fits your creator marketing workflow scale.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {plans.map((p) => {
            const isActive = selected === p.name;
            return (
              <div 
                key={p.name} 
                onClick={() => setSelected(p.name)}
                style={{ 
                  border: isActive ? '2px solid #4f46e5' : '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px',
                  background: isActive ? '#f8fafc' : '#ffffff',
                  position: 'relative'
                }}
              >
                {p.name === currentPlan && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>Current</span>
                )}
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{p.price}<span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>/mo</span></span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{p.limit.toLocaleString()} credits</span>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '4px' }}>
          <button onClick={onClose} style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Confirm Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
