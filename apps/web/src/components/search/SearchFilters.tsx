'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

interface SearchFiltersProps {
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  onApplyFilters: (filters: any) => void;
}

export default function SearchFilters({
  isFilterOpen,
  setIsFilterOpen,
  onApplyFilters
}: SearchFiltersProps) {
  const toast = useToast();

  // Interactive state variables
  const [selectedCity, setSelectedCity] = useState<string>('Karachi');
  const [selectedFollower, setSelectedFollower] = useState<string>('100K-1M');
  const [selectedEngagement, setSelectedEngagement] = useState<string>('5%+');
  const [selectedIQ, setSelectedIQ] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  if (!isFilterOpen) return null;

  const handleReset = () => {
    setSelectedCity('');
    setSelectedFollower('');
    setSelectedEngagement('');
    setSelectedIQ('');
    setVerifiedOnly(false);
    toast.info('Filters cleared');
  };

  const handleApply = () => {
    onApplyFilters({
      city: selectedCity,
      follower: selectedFollower,
      engagement: selectedEngagement,
      iq: selectedIQ,
      verified: verifiedOnly
    });
    setIsFilterOpen(false);
    toast.success('Filters applied successfully');
  };

  const cities = ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Peshawar'];
  const followerBands = ['10K-100K', '100K-1M', '1M+'];
  const engagementRates = ['2%+', '5%+', '8%+'];
  const iqScores = ['IQ 70+', 'IQ 85+', 'IQ 90+'];

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
      onClick={() => setIsFilterOpen(false)}
    >
      <div
        className="slide-over"
        style={{ 
          width: '380px', 
          height: '100vh', 
          background: '#ffffff', 
          padding: '32px 24px', 
          boxShadow: '-10px 0 25px -5px rgba(0,0,0,0.1)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Advanced filters</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Refine your search</p>
          </div>
          <button 
            onClick={() => setIsFilterOpen(false)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* 1. City Section */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            📍 City
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cities.map((city) => {
              const active = selectedCity === city;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: active ? 'none' : '1px solid #cbd5e1',
                    background: active ? '#6366f1' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Follower Band */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            👥 Follower Band
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {followerBands.map((band) => {
              const active = selectedFollower === band;
              return (
                <button
                  key={band}
                  onClick={() => setSelectedFollower(band)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: active ? 'none' : '1px solid #cbd5e1',
                    background: active ? '#6366f1' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {band}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Engagement Rate */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            🧩 Engagement Rate
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {engagementRates.map((rate) => {
              const active = selectedEngagement === rate;
              return (
                <button
                  key={rate}
                  onClick={() => setSelectedEngagement(rate)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: active ? 'none' : '1px solid #cbd5e1',
                    background: active ? '#6366f1' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {rate}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Mushin Score */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            ⭐ Mushin Score
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {iqScores.map((score) => {
              const active = selectedIQ === score;
              return (
                <button
                  key={score}
                  onClick={() => setSelectedIQ(score)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    border: active ? 'none' : '1px solid #cbd5e1',
                    background: active ? '#6366f1' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Verified Only Checkbox */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginTop: '8px'
        }}>
          <input 
            type="checkbox" 
            id="verified" 
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <label htmlFor="verified" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Verified only</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Show only platform-verified accounts</span>
          </label>
        </div>

        {/* Sticky footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <span 
            onClick={() => toast.success('Preset Saved')}
            style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
          >
            Save preset
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleReset}
              style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Reset
            </button>
            <button 
              onClick={handleApply}
              style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
