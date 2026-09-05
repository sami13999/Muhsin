'use client';
import React, { useState, useEffect } from 'react';

import CreateListModal from './CreateListModal';

export interface NewListData {
  name: string;
  desc: string;
  category: string;
  visibility: 'private' | 'shared';
  tags: string[];
  favorite: boolean;
}

interface List {
  id: string; name: string; desc: string; count: number; reach: string;
  avgAuth: number; updated: string; favorite?: boolean; starred?: boolean; shared: boolean;
  avatars?: string[];
  category?: string;
  tags?: string[];
}

const SVGS = {
  folder: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  chart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l-5.684 5.684a3 3 0 104.243 4.243l5.684-5.684m-4.243-4.242a3 3 0 004.243-4.242L16.243 1.9a3 3 0 00-4.243 4.243l.566.566"/></svg>
};

const MOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
];

export default function ListsGridView({
  lists,
  onSelectList,
  onCreateList,
  onToggleFavorite,
  onDuplicateList,
  onExportList,
  onShareList
}: {
  lists: List[];
  onSelectList: (id: string) => void;
  onCreateList: (listData: NewListData) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicateList: (id: string) => void;
  onExportList: (id: string) => void;
  onShareList: (id: string) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const kpis = [
    { title: 'TOTAL LISTS', value: lists.length.toString(), icon: SVGS.folder },
    { title: 'TOTAL CREATORS', value: lists.reduce((acc, l) => acc + l.count, 0).toString(), icon: SVGS.users },
    { title: 'AVG AUTHENTICITY', value: Math.round(lists.reduce((acc, l) => acc + l.avgAuth, 0) / (lists.filter(l => l.avgAuth > 0).length || 1)).toString(), icon: SVGS.shield },
    { title: 'EST. REACH', value: '15.5M', icon: SVGS.chart },
    { title: 'UPDATED TODAY', value: lists.filter(l => l.updated.includes('Just now') || l.updated.includes('2h') || l.updated.includes('Today')).length.toString() || '2', icon: SVGS.clock },
    { title: 'CAMPAIGN-LINKED', value: '2', icon: SVGS.link }
  ];

  const menuItemStyle = {
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    padding: '8px 12px',
    fontSize: '13px',
    color: '#334155',
    cursor: 'pointer',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.15s ease, color 0.15s ease',
  };

  const filteredLists = lists.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = l.name.toLowerCase().includes(q);
    const descMatch = l.desc.toLowerCase().includes(q);
    const tagMatch = l.tags?.some(t => t.toLowerCase().includes(q));
    return nameMatch || descMatch || tagMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Lists</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>Save and organize creator shortlists across your workspace.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'inline-flex', alignItems: 'center', background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(15,23,42,0.15)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          + New list
        </button>
      </div>

      <div className="lists-kpis-grid" style={{ gap: '16px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {kpi.icon} {kpi.title}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Search lists by name, description or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff' }}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ position: 'absolute', left: '14px', top: '13px' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
      </div>

      <div className="lists-cards-grid" style={{ gap: '20px' }}>
        {filteredLists.map((list) => {
          const isStarred = list.starred || list.favorite;
          const defaultTags = list.id === 'list-1' ? ['#bridal', '#lahore', '#q3'] : list.id === 'list-2' ? ['#tech', '#karachi', '#youtube'] : list.id === 'list-3' ? ['#food', '#ramadan', '#urdu'] : list.id === 'list-4' ? ['#comedy', '#tiktok'] : list.id === 'list-5' ? ['#wellness', '#islamabad'] : ['#new'];
          const displayTags = list.tags && list.tags.length > 0 ? list.tags : defaultTags;

          return (
            <div
              key={list.id}
              onClick={() => onSelectList(list.id)}
              style={{
                position: 'relative',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '235px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <style>{`
                .menu-item:hover {
                  background-color: #f8fafc !important;
                  color: #0f172a !important;
                }
                .dots-btn:hover {
                  background-color: #f1f5f9 !important;
                  color: #0f172a !important;
                }
              `}</style>
              {list.count === 0 ? (
                <div style={{ height: '90px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9', borderTopLeftRadius: '15px', borderTopRightRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '24px', fontWeight: 300, position: 'relative' }}>+</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: '90px', borderBottom: '1px solid #f1f5f9', borderTopLeftRadius: '15px', borderTopRightRadius: '15px', overflow: 'hidden', position: 'relative' }}>
                  {(list.avatars || MOCK_PHOTOS).map((p, idx) => <img key={idx} src={p} alt="creator" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
                  {list.shared && <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '8px', backgroundColor: 'rgba(15,23,42,0.8)', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shared</span>}
                </div>
              )}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {list.name}
                    {isStarred && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" style={{ color: '#eab308', flexShrink: 0 }}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )}
                  </h3>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="dots-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === list.id ? null : list.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      •••
                    </button>
                    {activeMenuId === list.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '28px',
                          right: 0,
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 50,
                          minWidth: '160px',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="menu-item"
                          onClick={() => {
                            onToggleFavorite(list.id);
                            setActiveMenuId(null);
                          }}
                          style={menuItemStyle}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          {isStarred ? 'Unfavorite' : 'Favorite'}
                        </button>
                        <button
                          className="menu-item"
                          onClick={() => {
                            onDuplicateList(list.id);
                            setActiveMenuId(null);
                          }}
                          style={menuItemStyle}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Duplicate
                        </button>
                        <button
                          className="menu-item"
                          onClick={() => {
                            onShareList(list.id);
                            setActiveMenuId(null);
                          }}
                          style={menuItemStyle}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          Share
                        </button>
                        <button
                          className="menu-item"
                          onClick={() => {
                            onExportList(list.id);
                            setActiveMenuId(null);
                          }}
                          style={menuItemStyle}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Export CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px', lineHeight: 1.4, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{list.desc || 'No description provided.'}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {displayTags.map((tag, tIdx) => (
                    <span key={tIdx} style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500, color: '#94a3b8', marginTop: 'auto' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{list.count} creators</span>
                  <span>{list.updated}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => onCreateList(data)}
      />
    </div>
  );
}

