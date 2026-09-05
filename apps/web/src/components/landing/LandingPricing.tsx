'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';
import PricingCard from './PricingCard';

export default function LandingPricing() {
  const toast = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    {
      title: 'EXPLORER',
      tier: 'TIER 01',
      monthlyPrice: '3,900',
      yearlyPrice: '2,900',
      yearlyTotal: '34,800',
      saving: 'save Rs. 12,000',
      desc: 'For freelancers and solo brands',
      creditsLabel: '2,500 credits / month',
      subtext: 'Learn what MUSHIN can do without commitment.',
      features: [
        '2,500 monthly credits',
        'Multi-platform creator search',
        'Basic MUSHIN IQ score',
        '1 workspace • 1 seat',
        '3 saved lists',
        'Standard enrichment',
        'Email support'
      ],
      btnText: 'Start free trial ➔',
      icon: '🧭',
    },
    {
      title: 'GROWTH',
      tier: 'TIER 02',
      monthlyPrice: '10,900',
      yearlyPrice: '8,900',
      yearlyTotal: '106,800',
      saving: 'save Rs. 24,000',
      desc: 'For active brands & agencies',
      creditsLabel: '12,000 credits / month',
      subtext: 'The full operational stack.',
      features: [
        '12,000 monthly credits',
        'Full IQ scoring & fake-audience detection',
        'Lookalike & semantic search',
        '3 workspaces • 5 seats',
        'Unlimited saved lists',
        'Campaign Kanban + outreach',
        'JazzCash / EasyPaisa billing',
        'Priority support (< 12h)'
      ],
      isHighlighted: true,
      badgeText: 'MOST POPULAR',
      btnText: 'Upgrade to Growth ➔',
      icon: '📈',
    },
    {
      title: 'SCALE',
      tier: 'TIER 03',
      monthlyPrice: '20,900',
      yearlyPrice: '16,900',
      yearlyTotal: '202,800',
      saving: 'save Rs. 48,000',
      desc: 'For agencies operating at volume',
      creditsLabel: '35,000 credits / month',
      subtext: 'Advanced intelligence + team controls.',
      features: [
        '35,000 monthly credits',
        'Priority enrichment queue',
        'Advanced campaign analytics',
        '10 workspaces • 15 seats',
        'Team roles & audit trail',
        'CSV / Excel exports',
        'Shared brand safety flags',
        'Dedicated success manager'
      ],
      btnText: 'Scale operations ➔',
      icon: '⚙️',
    }
  ];

  return (
    <section id="pricing" style={{ padding: '112px 0', background: '#0A0E1A', color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '90%', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9999px', marginBottom: '16px' }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', marginRight: '6px' }}></span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>Transparent PKR pricing</span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            margin: '0 0 16px 0',
          }}
        >
          Pay for decision accuracy —
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(to right, #c7d2fe, #ffffff, #a7f3d0)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              marginTop: '4px',
            }}
          >
            not for another dashboard.
          </span>
        </h2>
        <p
          style={{
            fontSize: '1.0625rem',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 0 32px 0',
          }}
        >
          Every plan pays for itself the first time you avoid a bad creator. Cancel any time.
        </p>

        {/* Billing cycle switcher */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '9999px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button style={{ background: billingCycle === 'monthly' ? '#ffffff' : 'transparent', color: billingCycle === 'monthly' ? '#0f172a' : '#94a3b8', border: 'none', borderRadius: '9999px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setBillingCycle('monthly')}>Monthly</button>
          <button style={{ background: billingCycle === 'yearly' ? '#ffffff' : 'transparent', color: billingCycle === 'yearly' ? '#0f172a' : '#94a3b8', border: 'none', borderRadius: '9999px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setBillingCycle('yearly')}>Yearly · Save 20%</button>
        </div>

        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '48px' }}>Prices in Pakistani Rupees · JazzCash · EasyPaisa · card</span>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', width: '100%', alignItems: 'stretch', marginBottom: '24px' }}>
          {plans.map((plan, idx) => (
            <PricingCard key={idx} {...plan} billingCycle={billingCycle} />
          ))}
        </div>

        {/* Enterprise wide card block */}
        <div style={{ width: '100%', padding: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', textAlign: 'left', backdropFilter: 'blur(8px)' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ENTERPRISE CUSTOM</span>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: '8px 0 16px' }}>
              For agency networks and enterprise brands. Unlimited seats, custom credit pooling, private data residency, dedicated infrastructure, SSO/SAML, and 24/7 founder support.
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: '#0d9488', fontWeight: 600 }}>
              <span>✓ SOC 2 & ISO 27001 compliant</span>
              <span>✓ Volume discounts</span>
              <span>✓ Custom SLA</span>
            </div>
          </div>
          <button style={{ background: '#ffffff', color: '#0f172a', border: 'none', padding: '12px 28px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => toast.success('Enterprise Inquiry Received', 'Our executive team will email you shortly.')}>
            Talk to sales
          </button>
        </div>

        {/* Bottom Trust factors row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', fontSize: '11px', color: '#64748b', marginTop: '32px' }}>
          <span>✓ 30-day free trial · no cost</span>
          <span>✓ Cancel anytime</span>
          <span>✓ Rollover unused credits</span>
          <span>✓ Founder support on WhatsApp</span>
        </div>

      </div>
    </section>
  );
}
