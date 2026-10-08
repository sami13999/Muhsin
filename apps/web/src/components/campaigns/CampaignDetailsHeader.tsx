'use client';

import React, { useState } from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';
import { useToast } from '@/lib/toast';
import ExportModal from '@/components/common/ExportModal';

interface CampaignDetailsHeaderProps {
  campaign: Campaign;
  onBack: () => void;
  onArchive: (id: string) => void;
}

export default function CampaignDetailsHeader({
  campaign,
  onBack,
  onArchive
}: CampaignDetailsHeaderProps) {
  const toast = useToast();
  const isEid = campaign.name.toLowerCase().includes('eid');
  const isRamadan = campaign.name.toLowerCase().includes('ramadan');
  const platformLabel = isEid ? 'Multi-platform' : isRamadan ? 'Instagram' : campaign.niche;

  const statusColors = {
    active: { bg: '#ecfdf5', text: '#10b981' },
    draft: { bg: '#f1f5f9', text: '#475569' },
    paused: { bg: '#fff7ed', text: '#f97316' },
    completed: { bg: '#faf5ff', text: '#a855f7' }
  }[campaign.status] || { bg: '#f1f5f9', text: '#475569' };

  const [showExportModal, setShowExportModal] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard', 'Share URL is ready to be sent.');
    } else {
      toast.success('Share URL generated', window.location.href);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
        {/* Back Link */}
        <div>
          <span 
            onClick={onBack} 
            style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}
          >
            ← Back to campaigns
          </span>
        </div>

        {/* Main Header Content */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {campaign.coverUrl && (
              <img
                src={campaign.coverUrl}
                alt={campaign.name}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 0 0 1px #cbd5e1',
                  flexShrink: 0
                }}
              />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {campaign.name}
                </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '9999px',
                background: statusColors.bg,
                color: statusColors.text,
                textTransform: 'capitalize'
              }}>
                • {campaign.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontWeight: 500 }}>
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                {platformLabel}
              </span>
              <span>•</span>
              <span>Owner: {campaign.owner || 'You'}</span>
              <span>•</span>
              <span>{campaign.dates || '— — —'}</span>
            </div>
          </div>
        </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleShare}
              style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Share
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Export
            </button>
            <button 
              onClick={() => onArchive(campaign.id)}
              style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Archive
            </button>
            <button style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              ...
            </button>
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Export ${campaign.name}`}
        entityName={campaign.name.replace(/\s+/g, '_')}
      />
    </>
  );
}
