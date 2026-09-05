'use client';

import React, { useState } from 'react';
import WorkflowDiscoverTab from './WorkflowDiscoverTab';
import WorkflowAnalyzeTab from './WorkflowAnalyzeTab';
import WorkflowManageTab from './WorkflowManageTab';
import WorkflowEmailTab from './WorkflowEmailTab';
import { tabsConfig } from './LandingWorkflowTabsData';

export default function LandingWorkflowTabs() {
  const [activeTab, setActiveTab] = useState<'discover' | 'analyze' | 'manage' | 'email'>('discover');

  return (
    <section className="landing-workflow-section" style={{ padding: '80px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Section badge & title */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '9999px', marginBottom: '16px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4f46e5' }}></span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>The Mushin platform</span>
        </div>

        <h2 style={{
          fontSize: 'clamp(1.75rem, 4.5vw, 3.25rem)',
          fontWeight: 600,
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          color: '#0f172a',
          margin: '0 0 32px 0',
        }}>
          Your whole influencer program,
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(to right, #4f46e5, #0f172a, #10b981)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              marginTop: '8px',
              paddingBottom: '4px',
            }}
          >
            finally connected in one
          </span>
          workflow.
        </h2>

        {/* Tab switcher buttons container - Touch Scrollable on Mobile */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
          <div
            className="landing-tab-pills"
            style={{
              display: 'flex',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '6px',
              borderRadius: '9999px',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
            }}
          >
            {tabsConfig.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isActive ? '#0f172a' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic mockup content wrapper */}
        <div
          className="landing-tab-content-card"
          style={{
            background: '#ffffff',
            padding: '32px 24px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            minHeight: '380px',
            textAlign: 'left',
          }}
        >
          <div key={activeTab} className="fade-in" style={{ height: '100%' }}>
            {activeTab === 'discover' && <WorkflowDiscoverTab />}
            {activeTab === 'analyze' && <WorkflowAnalyzeTab />}
            {activeTab === 'manage' && <WorkflowManageTab />}
            {activeTab === 'email' && <WorkflowEmailTab />}
          </div>
        </div>

      </div>
    </section>
  );
}
