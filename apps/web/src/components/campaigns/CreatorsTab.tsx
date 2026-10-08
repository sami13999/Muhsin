'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';
import { Campaign, CampaignCreatorItem } from '@/app/dashboard/campaigns/page';
import AddCreatorModal from './AddCreatorModal';

interface CreatorsTabProps {
  campaign: Campaign;
  onUpdateCampaign: (updated: Campaign) => void;
}

export default function CreatorsTab({ campaign, onUpdateCampaign }: CreatorsTabProps) {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const roster = campaign.roster || [];

  const handleAddCreator = (newCreator: CampaignCreatorItem) => {
    // Check if creator already exists in roster
    if (roster.some((c) => c.handle.toLowerCase() === newCreator.handle.toLowerCase())) {
      toast.error('Creator already in campaign', `"${newCreator.name}" is already part of this roster.`);
      return;
    }

    const updatedRoster = [newCreator, ...roster];
    const updatedCampaign: Campaign = {
      ...campaign,
      roster: updatedRoster,
      creatorsCount: updatedRoster.length
    };

    onUpdateCampaign(updatedCampaign);
    toast.success('Creator Added', `Successfully added "${newCreator.name}" to ${campaign.name}.`);
  };

  const handleRemoveCreator = (creatorId: string, name: string) => {
    const updatedRoster = roster.filter((c) => c.id !== creatorId);
    const updatedCampaign: Campaign = {
      ...campaign,
      roster: updatedRoster,
      creatorsCount: updatedRoster.length
    };

    onUpdateCampaign(updatedCampaign);
    toast.success('Creator Removed', `Removed "${name}" from campaign roster.`);
  };

  const handleStageChange = (creatorId: string, newStage: CampaignCreatorItem['stage']) => {
    const updatedRoster = roster.map((c) => (c.id === creatorId ? { ...c, stage: newStage } : c));
    const updatedCampaign: Campaign = {
      ...campaign,
      roster: updatedRoster
    };

    onUpdateCampaign(updatedCampaign);
    toast.success('Stage Updated', `Updated creator stage to "${newStage.replace('_', ' ')}".`);
  };

  const filteredRoster = roster.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.handle.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStage = stageFilter === 'all' || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageBadge = (stage: CampaignCreatorItem['stage']) => {
    const configs: Record<string, { bg: string; color: string; label: string }> = {
      shortlisted: { bg: '#f1f5f9', color: '#475569', label: 'Shortlisted' },
      contacted: { bg: '#eff6ff', color: '#3b82f6', label: 'Contacted' },
      negotiating: { bg: '#fffbeb', color: '#d97706', label: 'Negotiating' },
      contracted: { bg: '#ecfdf5', color: '#10b981', label: 'Contracted' },
      deliverable_submitted: { bg: '#faf5ff', color: '#a855f7', label: 'Deliverable Submitted' },
      completed: { bg: '#f0fdf4', color: '#15803d', label: 'Completed' }
    };
    const cfg = configs[stage] || configs.shortlisted;
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: CampaignCreatorItem['priority']) => {
    const configs: Record<string, { color: string }> = {
      high: { color: '#ef4444' },
      medium: { color: '#f59e0b' },
      low: { color: '#64748b' }
    };
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, color: configs[priority]?.color || '#64748b', textTransform: 'capitalize' }}>
        • {priority}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      {/* Table Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>
            {roster.length} {roster.length === 1 ? 'creator' : 'creators'} in this campaign
          </span>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none', background: '#fff' }}
          >
            <option value="all">All Stages</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="contacted">Contacted</option>
            <option value="negotiating">Negotiating</option>
            <option value="contracted">Contracted</option>
            <option value="deliverable_submitted">Deliverable Submitted</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search creator name or handle..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', width: '220px', outline: 'none' }}
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            + Add creator
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 1fr',
          padding: '12px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '10px',
          fontWeight: 800,
          color: '#64748b',
          letterSpacing: '0.05em'
        }}>
          <span>CREATOR</span>
          <span>PLATFORM</span>
          <span>AUDIENCE</span>
          <span>AUTH SCORE</span>
          <span>FEE & STAGE</span>
          <span>PRIORITY</span>
          <span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>

        {filteredRoster.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              👤
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>No creators in campaign roster</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add creator" above to recruit creators to this campaign.</div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
            >
              + Add First Creator
            </button>
          </div>
        ) : (
          filteredRoster.map((creator) => (
            <div
              key={creator.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1fr 1fr',
                padding: '14px 16px',
                borderBottom: '1px solid #f1f5f9',
                alignItems: 'center',
                fontSize: '13px',
                transition: 'background 0.15s ease'
              }}
            >
              {/* Creator Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={creator.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={creator.name}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{creator.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{creator.handle}</div>
                </div>
              </div>

              {/* Platform */}
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                {creator.platform}
              </span>

              {/* Followers */}
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{creator.followers}</span>

              {/* Auth Score */}
              <div>
                <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  {creator.authScore}/100
                </span>
              </div>

              {/* Fee & Stage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{creator.fee}</span>
                {getStageBadge(creator.stage)}
              </div>

              {/* Priority */}
              {getPriorityBadge(creator.priority)}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <select
                  value={creator.stage}
                  onChange={(e) => handleStageChange(creator.id, e.target.value as any)}
                  style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', outline: 'none', background: '#ffffff', cursor: 'pointer' }}
                >
                  <option value="shortlisted">Shortlisted</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="contracted">Contracted</option>
                  <option value="deliverable_submitted">Deliverable</option>
                  <option value="completed">Completed</option>
                </select>

                <button
                  onClick={() => handleRemoveCreator(creator.id, creator.name)}
                  title="Remove creator"
                  style={{ background: '#fee2e2', border: 'none', color: '#dc2626', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Creator Modal */}
      <AddCreatorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCreator={handleAddCreator}
      />
    </div>
  );
}
