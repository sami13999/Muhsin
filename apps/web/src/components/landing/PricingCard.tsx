'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface PricingCardProps {
  title: string;
  tier: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyTotal: string;
  saving: string;
  billingCycle: 'monthly' | 'yearly';
  desc: string;
  creditsLabel: string;
  subtext: string;
  features: string[];
  isHighlighted?: boolean;
  badgeText?: string;
  btnText: string;
  icon: string;
}

export default function PricingCard({
  title,
  tier,
  monthlyPrice,
  yearlyPrice,
  yearlyTotal,
  saving,
  billingCycle,
  desc,
  creditsLabel,
  subtext,
  features,
  isHighlighted = false,
  badgeText,
  btnText,
  icon
}: PricingCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '28px',
        border: `1.5px solid ${isHighlighted ? '#6366f1' : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(8px)',
        textAlign: 'left',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHighlighted ? '0 15px 35px -10px rgba(99, 102, 241, 0.15)' : 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {isHighlighted && badgeText && (
        <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#ffffff', padding: '4px 14px', borderRadius: '9999px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>✦</span> {badgeText}
        </div>
      )}

      {/* Top Icon Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#cbd5e1' }}>
          {icon}
        </div>
        <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>{tier}</span>
      </div>

      <strong style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>{title}</strong>
      <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 16px', minHeight: '16px' }}>{desc}</p>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8' }}>Rs.</span>
        <span style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff' }}>
          {billingCycle === 'monthly' ? monthlyPrice : yearlyPrice}
        </span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>/ mo</span>
      </div>

      {/* Yearly detailed billing */}
      <div style={{ minHeight: '16px', marginBottom: '16px' }}>
        {billingCycle === 'yearly' && (
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            Billed yearly at Rs. {yearlyTotal} · <span style={{ color: '#10b981', fontWeight: 600 }}>{saving}</span>
          </span>
        )}
      </div>

      {/* Credits badge */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '9999px', fontSize: '9px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>✦</span> {creditsLabel}
        </span>
      </div>

      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '16px', fontWeight: 500 }}>
        {subtext}
      </span>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', margin: '0 0 16px' }} />

      {/* Features checklist */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#cbd5e1', marginBottom: '28px', padding: 0, margin: '0 0 28px' }}>
        {features.map((feat, idx) => (
          <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link
        href="/signup"
        style={{
          width: '100%',
          marginTop: 'auto',
          textAlign: 'center',
          display: 'block',
          textDecoration: 'none',
          padding: '12px 20px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: isHighlighted ? '#6366f1' : 'transparent',
          color: '#ffffff',
          border: isHighlighted ? 'none' : '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (isHighlighted) {
            e.currentTarget.style.background = '#4f46e5';
          } else {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = '#ffffff';
          }
        }}
        onMouseLeave={(e) => {
          if (isHighlighted) {
            e.currentTarget.style.background = '#6366f1';
          } else {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
      >
        {btnText}
      </Link>
    </div>
  );
}
