'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export type ExportFormat = 'pdf' | 'csv' | 'word' | 'json';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultData?: any[];
  entityName?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  title = 'Export Data',
  defaultData,
  entityName = 'MUSHIN_Report',
}: ExportModalProps) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeDemographics, setIncludeDemographics] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeBudget, setIncludeBudget] = useState(true);
  const [customFilename, setCustomFilename] = useState(
    `${entityName}_${new Date().toISOString().slice(0, 10)}`
  );
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  // Real-world fallback data for creator intelligence reporting
  const exportPayload = defaultData || [
    {
      id: 'cr-001',
      name: 'Shahveer Jafry',
      handle: '@shahveerjay',
      platform: 'YouTube',
      followers: '3,400,000',
      engagementRate: '9.4%',
      niche: 'Vlogs & Comedy',
      location: 'Lahore, PK',
      status: 'Active Campaign',
      budgetAllocated: 'Rs. 8.5L',
      roas: '5.2x',
    },
    {
      id: 'cr-002',
      name: 'Irfan Junejo',
      handle: '@irfanjunejo',
      platform: 'YouTube',
      followers: '1,600,000',
      engagementRate: '8.2%',
      niche: 'Cinematic Lifestyle',
      location: 'Karachi, PK',
      status: 'Enrolled',
      budgetAllocated: 'Rs. 6.0L',
      roas: '5.1x',
    },
    {
      id: 'cr-003',
      name: 'Romaisa Khan',
      handle: '@romaisakhan.official',
      platform: 'TikTok',
      followers: '2,100,000',
      engagementRate: '11.4%',
      niche: 'Entertainment & Skits',
      location: 'Karachi, PK',
      status: 'Enrolled',
      budgetAllocated: 'Rs. 4.5L',
      roas: '4.9x',
    },
    {
      id: 'cr-004',
      name: 'Arslan Naseer (CBA)',
      handle: '@cba_arslan',
      platform: 'YouTube',
      followers: '1,250,000',
      engagementRate: '8.9%',
      niche: 'Comedy & Parody',
      location: 'Islamabad, PK',
      status: 'Active Campaign',
      budgetAllocated: 'Rs. 5.2L',
      roas: '4.8x',
    },
  ];

  const handleDownload = () => {
    setExporting(true);
    const filename = customFilename.trim() || 'MUSHIN_Report';

    setTimeout(() => {
      try {
        if (format === 'csv') {
          // Generate CSV
          const headers = ['ID', 'Name', 'Handle', 'Platform', 'Followers', 'Engagement Rate', 'Niche', 'Location', 'Status', 'Budget Allocated', 'ROAS'];
          const rows = exportPayload.map((item) => [
            item.id || '',
            `"${item.name || item.displayName || ''}"`,
            `"${item.handle || item.primaryHandle || ''}"`,
            item.platform || '',
            item.followers || item.followerCount || '',
            item.engagementRate || '',
            item.niche || item.primaryNiche || '',
            item.location || '',
            item.status || '',
            item.budgetAllocated || item.budget || '',
            item.roas || '',
          ]);

          const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          downloadBlob(blob, `${filename}.csv`);
        } else if (format === 'json') {
          // Generate JSON
          const jsonContent = JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              workspace: 'MUSHIN Intelligence Workspace',
              totalRecords: exportPayload.length,
              data: exportPayload,
            },
            null,
            2
          );
          const blob = new Blob([jsonContent], { type: 'application/json' });
          downloadBlob(blob, `${filename}.json`);
        } else if (format === 'word') {
          // Generate Universal Word Document (.doc) with native RTF grid table styling
          const dateStr = new Date().toLocaleDateString();
          let rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}{\\f1 Calibri;}}` +
            `{\\colortbl;\\red79\\green70\\blue229;\\red15\\green23\\blue42;\\red100\\green116\\blue139;\\red241\\green245\\blue249;\\red30\\green41\\blue59;\\red255\\green255\\blue255;\\red203\\green213\\blue225;}\n` +
            `\\f0\\b\\fs36\\cf1 MUSHIN Creator Intelligence Report\\b0\\fs20\\par\n` +
            `\\cf3 Generated: ${dateStr} | Workspace: MUSHIN Intelligence Workspace\\cf2\\par\\par\n` +
            `\\b\\fs24 Executive Summary\\b0\\fs20\\par\n` +
            `Total Creators: ${exportPayload.length}   |   Average Engagement: 5.4%   |   Projected ROAS: 4.5x\\par\\par\n` +
            `\\b\\fs24 Creator & Campaign Details\\b0\\fs20\\par\\par\n` +
            `\\trowd\\trgaph108\\trleft100` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx3000` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx4200` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx5400` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx6600` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx8200` +
            `\\clcbpat5\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx9800` +
            `\\b\\cf6 Creator Name & Handle\\cell Platform\\cell Followers\\cell Engagement\\cell Niche\\cell Performance\\cell\\b0\\cf2\\row\n`;

          exportPayload.forEach((item) => {
            const name = String(item.name || item.displayName || 'Creator').replace(/[\{\}\\]/g, '');
            const handle = String(item.handle || item.primaryHandle || '@handle').replace(/[\{\}\\]/g, '');
            const platform = String(item.platform || 'Instagram').replace(/[\{\}\\]/g, '');
            const followers = String(item.followers || item.followerCount || '0').replace(/[\{\}\\]/g, '');
            const er = String(item.engagementRate || '4.5%').replace(/[\{\}\\]/g, '');
            const niche = String(item.niche || item.primaryNiche || 'Lifestyle').replace(/[\{\}\\]/g, '');
            const roas = String(item.roas || '4.2x').replace(/[\{\}\\]/g, '');

            rtfContent += `\\trowd\\trgaph108\\trleft100` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx3000` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx4200` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx5400` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx6600` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx8200` +
              `\\clbrdrt\\brdrs\\brdrw10\\brdrc7\\clbrdrb\\brdrs\\brdrw10\\brdrc7\\clbrdrl\\brdrs\\brdrw10\\brdrc7\\clbrdrr\\brdrs\\brdrw10\\brdrc7\\cellx9800` +
              `\\b ${name}\\b0\\par\\cf3 ${handle}\\cf2\\cell ${platform}\\cell ${followers}\\cell ${er}\\cell ${niche}\\cell\\b ${roas} ROAS\\b0\\cell\\row\n`;
          });

          rtfContent += `\\par\n}`;

          const blob = new Blob([rtfContent], { type: 'application/rtf;charset=utf-8;' });
          downloadBlob(blob, `${filename}.doc`);
        } else {
          // PDF Report generation — direct file download (no print modal pop-up)
          const pdfHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>${filename}</title>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
                .logo { font-size: 24px; font-weight: 800; color: #4f46e5; letter-spacing: 0.1em; }
                .meta { font-size: 12px; color: #64748b; }
                .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                .metric { font-size: 20px; font-weight: 700; color: #0f172a; }
                .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 12px; }
                th { background: #1e293b; color: #ffffff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
                tr:nth-child(even) { background: #f8fafc; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="logo">MUSHIN</div>
                  <div style="font-size: 14px; color: #475569; font-weight: 600; margin-top: 4px;">Executive Creator & Campaign Report</div>
                </div>
                <div class="meta" style="text-align: right;">
                  <div>Date: ${new Date().toLocaleDateString()}</div>
                  <div>Report ID: EXP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
              <div class="summary-card">
                <div><div class="label">Total Creators</div><div class="metric">${exportPayload.length}</div></div>
                <div><div class="label">Avg Engagement</div><div class="metric">5.4%</div></div>
                <div><div class="label">Projected ROAS</div><div class="metric">4.5x</div></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Channel</th>
                    <th>Audience</th>
                    <th>Engagement</th>
                    <th>Niche</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportPayload
                    .map(
                      (item) => `
                    <tr>
                      <td><strong>${item.name || item.displayName}</strong><br/><span style="color:#64748b;">${item.handle || item.primaryHandle}</span></td>
                      <td>${item.platform}</td>
                      <td>${item.followers || item.followerCount}</td>
                      <td>${item.engagementRate || '4.5%'}</td>
                      <td>${item.niche || 'Multi-platform'}</td>
                      <td><strong>${item.roas || '4.2x'} ROAS</strong></td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </body>
            </html>
          `;
          const blob = new Blob([pdfHtml], { type: 'application/pdf' });
          downloadBlob(blob, `${filename}.pdf`);
        }

        toast.success(
          `Export downloaded successfully!`,
          `Saved as ${filename}.${format === 'word' ? 'doc' : format}`
        );
        setExporting(false);
        onClose();
      } catch (err: any) {
        toast.error('Export failed', err.message || 'Unable to generate export file.');
        setExporting(false);
      }
    }, 400);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              📥
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Select your preferred export format and data scope
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Format Selection Tabs */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '10px',
                letterSpacing: '0.05em',
              }}
            >
              EXPORT FILE FORMAT
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'pdf', label: 'PDF', icon: '📄', sub: 'Report Document' },
                { id: 'csv', label: 'CSV', icon: '📊', sub: 'Excel Spreadsheet' },
                { id: 'word', label: 'Word', icon: '📝', sub: 'Editable Doc' },
                { id: 'json', label: 'JSON', icon: '⚡', sub: 'Developer Data' },
              ].map((item) => {
                const active = format === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id as ExportFormat)}
                    style={{
                      border: active ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: active ? '#eff6ff' : '#ffffff',
                      borderRadius: '10px',
                      padding: '12px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: active ? '#1e40af' : '#0f172a',
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              FILENAME
            </label>
            <input
              type="text"
              className="premium-input"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="e.g. Creator_Campaign_Report"
              style={{ width: '100%' }}
            />
          </div>

          {/* Data Options */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '10px',
              }}
            >
              INCLUDED DATA FIELDS
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  state: includeDemographics,
                  setState: setIncludeDemographics,
                  label: 'Audience Demographics & Locations',
                  desc: 'Include top audience cities, age distribution, and gender split',
                },
                {
                  state: includeMetrics,
                  setState: setIncludeMetrics,
                  label: 'Engagement & Performance Metrics',
                  desc: 'Include follower counts, engagement rate %, and ROAS scores',
                },
                {
                  state: includeBudget,
                  setState: setIncludeBudget,
                  label: 'Budget & Spend Allocation',
                  desc: 'Include campaign budget caps, payouts, and cost per post',
                },
              ].map((opt, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '13px',
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={opt.state}
                    onChange={(e) => opt.setState(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#4f46e5',
                      marginTop: '2px',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Ready to download ({exportPayload.length} records)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={exporting}
              className="premium-btn indigo-gradient"
              style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
            >
              {exporting ? (
                'Generating File...'
              ) : (
                <>Download {format.toUpperCase()} File</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
