'use client';

import React, { useState, useEffect } from 'react';
import ExportModal from '@/components/common/ExportModal';
import { api } from '@/lib/api';

interface LogItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'search' | 'event' | 'credit' | 'system';
  time: string;
  duration?: string;
  resultsCount?: number;
  creditsDeducted?: number;
}

const INITIAL_LOGS: LogItem[] = [
  {
    id: 'log-1',
    title: 'Report exported',
    subtitle: 'cohort_q3',
    category: 'event',
    time: 'just now',
    duration: '96ms'
  },
  {
    id: 'log-2',
    title: 'Workflow deduction',
    subtitle: 'workflow_3a1',
    category: 'credit',
    time: 'just now',
    creditsDeducted: 4
  },
  {
    id: 'log-3',
    title: 'Workflow deduction',
    subtitle: 'workflow_3a1',
    category: 'credit',
    time: 'just now',
    creditsDeducted: 4
  },
  {
    id: 'log-4',
    title: 'Search executed',
    subtitle: 'bridal Lahore 30k-80k',
    category: 'search',
    time: 'just now',
    resultsCount: 44,
    creditsDeducted: 2
  },
  {
    id: 'log-5',
    title: 'Report exported',
    subtitle: 'cohort_q3',
    category: 'event',
    time: 'just now',
    duration: '96ms'
  },
  {
    id: 'log-6',
    title: 'Database connection pool re-allocated',
    subtitle: 'success',
    category: 'system',
    time: '1m ago',
    duration: '12ms'
  },
  {
    id: 'log-7',
    title: 'API gateway rate limit sync',
    subtitle: 'success',
    category: 'system',
    time: '2m ago',
    duration: '8ms'
  }
];

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['search', 'event', 'credit', 'system']);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadTelemetry() {
      try {
        const res = await api.getWorkspaceAnalytics('30d');
        if (mounted && res?.data?.analytics) {
          const telemetry = res.data.analytics;
          if (telemetry.outreachMetrics || telemetry.creditUsage) {
            const apiLogs: LogItem[] = [
              {
                id: `log-api-1`,
                title: 'Outreach events logged',
                subtitle: `${telemetry.outreachMetrics.sent} sent · ${telemetry.outreachMetrics.delivered} delivered`,
                category: 'event',
                time: 'Just now',
                duration: '42ms'
              },
              {
                id: `log-api-2`,
                title: 'Credit ledger sync',
                subtitle: `Total usage ${telemetry.creditUsage.total} credits`,
                category: 'credit',
                time: '1m ago',
                creditsDeducted: telemetry.creditUsage.total
              },
              ...INITIAL_LOGS.slice(2)
            ];
            setLogs(apiLogs);
          }
        }
      } catch {
        // Fallback
      }
    }

    loadTelemetry();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredLogs = logs.filter(log => selectedCategories.includes(log.category));

  // category configs
  const CATEGORIES = [
    { 
      id: 'search', 
      label: 'Search', 
      bg: '#eff6ff', 
      color: '#3b82f6', 
      border: '#bfdbfe',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    },
    { 
      id: 'event', 
      label: 'Event', 
      bg: '#f1f5f9', 
      color: '#475569', 
      border: '#cbd5e1',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    },
    { 
      id: 'credit', 
      label: 'Credit', 
      bg: '#fffbeb', 
      color: '#d97706', 
      border: '#fde68a',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
          <circle cx="8" cy="8" r="5" /><circle cx="16" cy="16" r="5" /><path d="M16 8h.01M8 16h.01" />
        </svg>
      )
    },
    { 
      id: 'system', 
      label: 'System', 
      bg: '#f0fdf4', 
      color: '#16a34a', 
      border: '#bbf7d0',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Activity log</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>Real-time stream of searches, workspace events, credit deductions, and system events.</p>
        </div>
        
        {/* Pulsing Live indicator & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
            <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
              <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#22c55e', opacity: 0.75 }}></span>
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', backgroundColor: '#22c55e' }}></span>
            </span>
            Live
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Log
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        {/* Filters & Environment row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
          
          {/* Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: isActive ? cat.bg : '#ffffff',
                    color: isActive ? cat.color : '#94a3b8',
                    border: `1px solid ${isActive ? cat.border : '#e2e8f0'}`,
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: isActive ? cat.color : '#94a3b8' }}>
                    {cat.icon}
                  </span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Environment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
              <path d="M6 18V6l6 6 6-6v12" />
            </svg>
            workspace · production
          </div>
        </div>

        {/* Logs list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No activities to display for selected filters.
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const catConfig = CATEGORIES.find(c => c.id === log.category)!;
              
              // Custom layout logic for log items to match figma exactly
              let displayTitle = '';
              let displaySubtitle = '';
              
              if (log.category === 'event') {
                displayTitle = `${log.title} · ${log.subtitle}`;
                displaySubtitle = `success · ${log.duration}`;
              } else if (log.category === 'credit') {
                displayTitle = log.title;
                displaySubtitle = `-${log.creditsDeducted} credits · ${log.subtitle}`;
              } else if (log.category === 'search') {
                displayTitle = `${log.title} · '${log.subtitle}'`;
                displaySubtitle = `${log.resultsCount} results · -${log.creditsDeducted} credits`;
              } else {
                displayTitle = log.title;
                displaySubtitle = `${log.subtitle} · ${log.duration}`;
              }

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid #f1f5f9',
                    transition: 'background 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Circle icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: catConfig.bg,
                      color: catConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {/* Scale icon slightly up for the list item circle */}
                      <span style={{ display: 'flex', transform: 'scale(1.15)', color: catConfig.color }}>
                        {catConfig.icon}
                      </span>
                    </div>

                    {/* Metadata text */}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {displayTitle}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        {displaySubtitle}
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                    {log.time}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Activity Log"
        entityName="mushin_activity_log"
        defaultData={filteredLogs.map(l => ({
          id: l.id,
          category: l.category.toUpperCase(),
          eventTitle: l.title,
          details: l.subtitle,
          timestamp: l.time,
          creditsDeducted: l.creditsDeducted ? `${l.creditsDeducted} credits` : 'N/A',
          duration: l.duration || 'N/A',
        }))}
      />
    </div>
  );
}
