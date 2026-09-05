'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

interface LiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSearch: (credits: number) => void;
}

export default function LiveSearchModal({ isOpen, onClose, onRunSearch }: LiveSearchModalProps) {
  const toast = useToast();
  const [selectedOption, setSelectedOption] = useState<'fast' | 'live'>('live');

  if (!isOpen) return null;

  const handleRun = () => {
    const cost = selectedOption === 'live' ? 12 : 2;
    toast.success(
      'Live search initiated',
      `Scanning Instagram, TikTok, and YouTube in real time. Deducted ${cost} credits.`
    );
    onRunSearch(cost);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '16px',
      fontFamily: "'Inter', sans-serif"
    }} onClick={onClose}>
      
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block */}
        <div style={{ padding: '24px', display: 'flex', gap: '16px', background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#d97706',
            flexShrink: 0
          }}>
            📡
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400e', margin: 0 }}>Run a live search?</h3>
            <p style={{ fontSize: '12px', color: '#b45309', margin: '6px 0 0 0', lineHeight: 1.4 }}>
              Live search queries Instagram, TikTok, and YouTube in real time for the freshest profile signals. It's slower and costs more credits than Fast search.
            </p>
          </div>
        </div>

        {/* Options Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Fast Card */}
            <div 
              onClick={() => setSelectedOption('fast')}
              style={{
                border: `2px solid ${selectedOption === 'fast' ? '#f59e0b' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                <span>⚡</span> Fast
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>2 credits</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Cached graph . ~1s</div>
            </div>

            {/* Live Card */}
            <div 
              onClick={() => setSelectedOption('live')}
              style={{
                border: `2px solid ${selectedOption === 'live' ? '#f59e0b' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                <span>📡</span> Live
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>12 credits</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Realtime . ~30s</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
            This will deduct <strong style={{ color: '#0f172a' }}>{selectedOption === 'live' ? 12 : 2} credits</strong>.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: '#ffffff', 
              color: '#475569', 
              border: '1px solid #cbd5e1', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={handleRun}
            style={{ 
              background: '#0f172a', 
              color: '#ffffff', 
              border: 'none', 
              padding: '8px 20px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            Run {selectedOption === 'live' ? 'live' : 'fast'} search
          </button>
        </div>

      </div>
    </div>
  );
}
