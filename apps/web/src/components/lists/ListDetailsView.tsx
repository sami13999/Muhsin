'use client';

import React, { useState } from 'react';

interface CreatorItem {
  id: string;
  name: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  followers: string;
  authScore: number;
  er: string;
  campaign: string;
  added: string;
  avatarUrl?: string;
}

interface List {
  id: string;
  name: string;
  desc: string;
  count: number;
  reach: string;
  avgAuth: number;
  updated: string;
  favorite: boolean;
  shared: boolean;
  creators: CreatorItem[];
}

interface ListDetailsViewProps {
  activeList: List;
  onBack: () => void;
  onDeleteList: (id: string, name: string) => void;
  onRemoveCreator: (creatorId: string, name: string, list: List) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicateList: (id: string) => void;
  onExportList: (id: string) => void;
  onShareList: (id: string) => void;
}

// ── Crisp SVGs for Modern Visuals ────────────────────────────
const SVGS = {
  back: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  starOutline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  share: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  export: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  duplicate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  creators: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  followers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  auth: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  er: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  fake: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  reach: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
      <polygon points="12 7 17 12 12 17 12 7" />
      <line x1="2" y1="12" x2="12" y2="12" />
    </svg>
  ),
  cost: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginBottom: '4px' }}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  filter: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: '6px' }}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  sort: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: '6px' }}>
      <line x1="15" y1="5" x2="9" y2="5" />
      <line x1="18" y1="10" x2="6" y2="10" />
      <line x1="21" y1="15" x2="3" y2="15" />
      <line x1="15" y1="20" x2="9" y2="20" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
};

export default function ListDetailsView({
  activeList,
  onBack,
  onDeleteList,
  onRemoveCreator,
  onToggleFavorite,
  onDuplicateList,
  onExportList,
  onShareList
}: ListDetailsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);

  const isStarred = activeList.favorite;
  const tags = activeList.id === 'list-1' ? ['#bridal', '#lahore', '#q3'] : ['#curated', '#marketing'];

  // Match stats layout exactly from Screenshot 1
  const stats = [
    { label: 'CREATORS', val: activeList.creators.length.toString(), icon: SVGS.creators },
    { label: 'TOTAL FOLLOWERS', val: activeList.id === 'list-1' ? '1.32M' : activeList.reach, icon: SVGS.followers },
    { label: 'AVG AUTH', val: activeList.avgAuth > 0 ? activeList.avgAuth.toString() : '—', icon: SVGS.auth },
    { label: 'AVG ER', val: activeList.id === 'list-1' ? '6.1%' : '5.5%', icon: SVGS.er },
    { label: 'FAKE %', val: activeList.id === 'list-1' ? '5.4%' : '4.8%', icon: SVGS.fake },
    { label: 'REACH', val: activeList.reach, icon: SVGS.reach },
    { label: 'EST. COST', val: activeList.id === 'list-1' ? 'Rs. 4.2L' : 'Rs. 1.1L', icon: SVGS.cost }
  ];

  // Filtering based on search query
  const filteredCreators = activeList.creators.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCreators(filteredCreators.map(c => c.id));
    } else {
      setSelectedCreators([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCreators([...selectedCreators, id]);
    } else {
      setSelectedCreators(selectedCreators.filter(item => item !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Dynamic Hover Styles */}
      <style>{`
        .btn-outlined {
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .btn-outlined:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .back-link {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 0;
          transition: color 0.15s ease;
        }
        .back-link:hover {
          color: #0f172a;
        }
        .star-toggle {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #e2e8f0;
          transition: color 0.15s ease, transform 0.1s ease;
          margin-left: 8px;
        }
        .star-toggle.starred {
          color: #eab308;
        }
        .star-toggle:hover {
          transform: scale(1.1);
        }
        .tag-pill {
          font-size: 11px;
          background-color: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 9999px;
          font-weight: 600;
        }
        .kpi-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01);
        }
        .kpi-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .kpi-card-value {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .search-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          position: relative;
        }
        .creator-table-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.15s ease;
        }
        .creator-table-row:hover {
          background-color: #f8fafc;
        }
        .delete-row-btn {
          color: #94a3b8;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
          opacity: 0;
        }
        .creator-table-row:hover .delete-row-btn {
          opacity: 1;
        }
        .delete-row-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }
        .campaign-badge {
          background: #ecfdf5;
          color: #047857;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          display: inline-block;
        }
      `}</style>

      {/* ── Header Area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <button onClick={onBack} className="back-link">
            {SVGS.back} Back to lists
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center' }}>
              {activeList.name}
              <button
                className={`star-toggle ${isStarred ? 'starred' : ''}`}
                onClick={() => onToggleFavorite(activeList.id)}
                title={isStarred ? 'Unfavorite' : 'Favorite'}
              >
                {isStarred ? SVGS.star : SVGS.starOutline}
              </button>
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {activeList.desc}
            </p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {tags.map(t => (
                <span key={t} className="tag-pill">{t}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-outlined" onClick={() => onShareList(activeList.id)}>
              {SVGS.share} Share
            </button>
            <button className="btn-outlined" onClick={() => onExportList(activeList.id)}>
              {SVGS.export} Export
            </button>
            <button className="btn-outlined" onClick={() => onDuplicateList(activeList.id)}>
              {SVGS.duplicate} Duplicate
            </button>
            <button
              style={{
                background: '#fee2e2',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={() => onDeleteList(activeList.id, activeList.name)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics Grid Area ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {stats.map((s, idx) => (
          <div key={idx} className="kpi-card">
            <div className="kpi-card-header">
              {s.icon}
              {s.label}
            </div>
            <div className="kpi-card-value">{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="search-actions-row">
        <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
            <input
              type="text"
              placeholder="Search creators in this list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 42px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
              }}
            />
            <div style={{ position: 'absolute', left: '15px', top: '12px', display: 'flex', alignItems: 'center' }}>
              {SVGS.search}
            </div>
          </div>
          <button className="btn-outlined">
            {SVGS.filter} Filters
          </button>
          <button className="btn-outlined">
            {SVGS.sort} Sort
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {filteredCreators.length} creators
        </div>
      </div>

      {/* ── Creators Table Area ── */}
      {filteredCreators.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '32px' }}>👥</span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginTop: '12px', margin: 0 }}>No creators match search</h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', margin: '4px 0 0' }}>Try adjusting your keywords or filters.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '16px 20px', width: '48px' }}>
                  <input
                    type="checkbox"
                    checked={filteredCreators.length > 0 && selectedCreators.length === filteredCreators.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', transform: 'scale(1.05)' }}
                  />
                </th>
                <th style={{ padding: '16px 20px' }}>CREATOR</th>
                <th style={{ padding: '16px 20px' }}>PLATFORM</th>
                <th style={{ padding: '16px 20px' }}>FOLLOWERS</th>
                <th style={{ padding: '16px 20px' }}>AUTH</th>
                <th style={{ padding: '16px 20px' }}>ER</th>
                <th style={{ padding: '16px 20px' }}>CAMPAIGN</th>
                <th style={{ padding: '16px 20px' }}>ADDED</th>
                <th style={{ padding: '16px 20px', width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredCreators.map((creator) => {
                const isSelected = selectedCreators.includes(creator.id);
                return (
                  <tr key={creator.id} className="creator-table-row">
                    <td style={{ padding: '16px 20px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(creator.id, e.target.checked)}
                        style={{ cursor: 'pointer', transform: 'scale(1.05)' }}
                      />
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {creator.avatarUrl ? (
                          <img
                            src={creator.avatarUrl}
                            alt={creator.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9' }}
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#64748b' }}>
                            {creator.name[0]}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{creator.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '1px' }}>{creator.handle}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'capitalize', color: '#334155', fontWeight: 500 }}>
                      {creator.platform}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                      {creator.followers}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                      {creator.authScore}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>
                      {creator.er}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {creator.campaign && creator.campaign !== '—' && creator.campaign !== 'None' ? (
                        <span className="campaign-badge">
                          {creator.campaign}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b', fontWeight: 500 }}>
                      {creator.added}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        className="delete-row-btn"
                        onClick={() => onRemoveCreator(creator.id, creator.name, activeList)}
                        title="Remove Creator"
                      >
                        {SVGS.trash}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
