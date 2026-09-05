'use client';

import React, { useState } from 'react';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import SearchResultsTable from '@/components/search/SearchResultsTable';
import SearchFilters from '@/components/search/SearchFilters';
import LiveSearchModal from '@/components/search/LiveSearchModal';
import CreatorProfilePanel from '@/components/CreatorProfilePanel';
import { useToast } from '@/lib/toast';

export default function SearchPage() {
  const toast = useToast();
  const [platform, setPlatform] = useState<'all' | 'instagram' | 'tiktok' | 'youtube'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [simulateError, setSimulateError] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  
  const [filterCity, setFilterCity] = useState('Karachi');
  const [filterFollowers, setFilterFollowers] = useState('100K-1M');
  const [filterEngagement, setFilterEngagement] = useState('5%+');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const creators = [
    { creatorId: 'cr-003', displayName: 'Sana Riaz', primaryHandle: '@sanaa.k', platform: 'instagram', followerCount: 412000, engagementRate: 5.2, _rankingScore: 89, city: 'Karachi', niche: 'Bridal', iqScore: 89, verified: true },
    { creatorId: 'cr-002', displayName: 'Bilal Hussain', primaryHandle: '@bilalhussain', platform: 'youtube', followerCount: 512000, engagementRate: 5.5, _rankingScore: 88, city: 'Karachi', niche: 'Food', iqScore: 88, verified: false }
  ];

  const deductCredits = (amount: number) => {
    const cur = Number(localStorage.getItem('mushin_credits') || 83591);
    localStorage.setItem('mushin_credits', String(Math.max(0, cur - amount)));
    window.dispatchEvent(new Event('mushin_credits_update'));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? creators.map(c => c.creatorId) : []);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleApplyFilters = (filters: any) => {
    setFilterCity(filters.city);
    setFilterFollowers(filters.follower);
    setFilterEngagement(filters.engagement);
  };

  const filteredCreators = creators.filter(c => {
    if (filterCity && c.city.toLowerCase() !== filterCity.toLowerCase()) return false;
    if (filterFollowers === '10K-100K' && (c.followerCount < 10000 || c.followerCount > 100000)) return false;
    if (filterFollowers === '100K-1M' && (c.followerCount < 100000 || c.followerCount > 1000000)) return false;
    if (filterFollowers === '1M+' && c.followerCount < 1000000) return false;
    if (filterEngagement && c.engagementRate < parseFloat(filterEngagement)) return false;
    return platform === 'all' || c.platform === platform;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Search</h1>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px', margin: 0 }}>Multi-platform creator discovery — filter, verify, and shortlist in one place.</p>
      </div>

      {/* Row 1: Search inputs and outline icons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="text" defaultValue="Pakistani lifestyle 50k+" style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" style={{ position: 'absolute', left: '16px', top: '15px' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <button onClick={() => setIsFilterOpen(true)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg> Filters
        </button>
        <button style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '0 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Fast search
        </button>
        <button onClick={() => setIsLiveOpen(true)} style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '0 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg> Live search
        </button>
      </div>

      {/* Row 2: Unified Platform Tabs & Active filter tag pills row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[{ id: 'all', label: 'All Platforms' }, { id: 'instagram', label: 'Instagram' }, { id: 'tiktok', label: 'Tiktok' }, { id: 'youtube', label: 'Youtube' }].map((t) => (
              <button key={t.id} onClick={() => setPlatform(t.id as any)} style={{ background: platform === t.id ? '#0f172a' : '#ffffff', color: platform === t.id ? '#ffffff' : '#64748b', border: `1px solid ${platform === t.id ? '#0f172a' : '#e2e8f0'}`, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
            ))}
          </div>
          <div style={{ width: '1px', height: '16px', background: '#cbd5e1' }} />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {filterCity && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterCity} <span onClick={() => setFilterCity('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {filterFollowers && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterFollowers} <span onClick={() => setFilterFollowers('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {filterEngagement && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterEngagement} <span onClick={() => setFilterEngagement('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {(filterCity || filterFollowers || filterEngagement) && <span onClick={() => { setFilterCity(''); setFilterFollowers(''); setFilterEngagement(''); }} style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, marginLeft: '4px', cursor: 'pointer' }}>Clear all</span>}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
            <input type="checkbox" checked={simulateError} onChange={(e) => { setSimulateError(e.target.checked); if (e.target.checked) toast.error('Simulated error active'); }} style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#6366f1' }} />
            Simulate error
          </label>
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{ border: 'none', background: viewMode === 'grid' ? '#f1f5f9' : '#ffffff', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: viewMode === 'grid' ? '#0f172a' : '#94a3b8' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button onClick={() => setViewMode('table')} style={{ border: 'none', background: viewMode === 'table' ? '#f1f5f9' : '#ffffff', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: viewMode === 'table' ? '#0f172a' : '#94a3b8' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Selection bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 24px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>{selectedIds.length} selected</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { toast.success(`Added ${selectedIds.length} creators to list`); setSelectedIds([]); }} style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}>+ Add to list</button>
            <button onClick={() => { toast.info(`Comparing ${selectedIds.length} creators`); setSelectedIds([]); }} style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>Compare</button>
            <button onClick={() => { toast.success(`Saved ${selectedIds.length} creators for later`); setSelectedIds([]); }} style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}>🔖 Save</button>
            <span onClick={() => setSelectedIds([])} style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer', marginLeft: '6px' }}>Clear</span>
          </div>
        </div>
      )}

      {/* Row 4: Results & Grid/Table rendering */}
      {simulateError ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Simulated search error</h3>
          <button onClick={() => setSimulateError(false)} style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Reset Simulation</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}><strong style={{ color: '#0f172a' }}>{filteredCreators.length}</strong> creators match . sorted by MUSHIN score</div>
            <select style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#475569', outline: 'none', cursor: 'pointer' }} defaultValue="score">
              <option value="score">Sort by: MUSHIN score</option>
            </select>
          </div>

          {viewMode === 'grid' ? (
            <SearchResultsGrid results={filteredCreators} selectedIds={selectedIds} onSelectRow={handleSelectRow} onSelectCreatorId={setSelectedCreatorId} />
          ) : (
            <SearchResultsTable results={filteredCreators} selectedIds={selectedIds} onSelectRow={handleSelectRow} onSelectAll={handleSelectAll} onSelectCreatorId={setSelectedCreatorId} />
          )}
        </>
      )}

      <SearchFilters isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen} onApplyFilters={handleApplyFilters} />
      <LiveSearchModal isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} onRunSearch={deductCredits} />
      {selectedCreatorId && <CreatorProfilePanel creatorId={selectedCreatorId} onClose={() => setSelectedCreatorId(null)} onDeductCredits={deductCredits} />}
    </div>
  );
}
