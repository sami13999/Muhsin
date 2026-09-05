'use client';

import React, { useState } from 'react';

interface CampaignsSearchFiltersProps {
  onSearchChange: (text: string) => void;
  onStatusFilterChange: (status: string) => void;
  selectedStatus: string;
}

export default function CampaignsSearchFilters({
  onSearchChange,
  onStatusFilterChange,
  selectedStatus
}: CampaignsSearchFiltersProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' }
  ];

  return (
    <div style={{ display: 'flex', gap: '12px', zIndex: 10, position: 'relative', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input 
          type="text" 
          placeholder="Search campaigns..." 
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} 
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ position: 'absolute', left: '16px', top: '13px' }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
          </svg> 
          Filters {selectedStatus !== 'all' ? `(${selectedStatus})` : ''}
        </button>

        {showDropdown && (
          <div style={{ position: 'absolute', right: 0, top: '42px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minWidth: '150px', zIndex: 50, padding: '6px 0' }}>
            {statuses.map((s) => (
              <div 
                key={s.value} 
                onClick={() => { onStatusFilterChange(s.value); setShowDropdown(false); }}
                style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', color: selectedStatus === s.value ? '#4f46e5' : '#475569', background: selectedStatus === s.value ? '#f5f3ff' : 'transparent', fontWeight: selectedStatus === s.value ? 600 : 400 }}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
