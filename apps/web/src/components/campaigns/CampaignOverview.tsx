'use client';

import React, { useState, useEffect } from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';
import CampaignDetailsHeader from './CampaignDetailsHeader';
import CampaignDetailsTabs, { TabId } from './CampaignDetailsTabs';
import CampaignOverviewTab from './CampaignOverviewTab';
import CampaignSettings from './CampaignSettings';
import CreatorsTab from './CreatorsTab';
import PipelineTab, { PipelineCard } from './PipelineTab';
import TimelineTab from './TimelineTab';
import MessagesTab from './MessagesTab';
import AnalyticsTab from './AnalyticsTab';
import FilesCatalog from './FilesCatalog';
import ArchiveModal from './ArchiveModal';

interface CampaignOverviewProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: (updated: Campaign) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

const EID_CARDS: PipelineCard[] = [
  { id: 'p1', name: 'Bilal Hussain', stage: 'prospect', fee: 'Rs. 95K', dueDate: '—', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', handle: '@bilalhussain - 512K' },
  { id: 'p2', name: 'Zainab Iqbal', stage: 'prospect', fee: 'Rs. 32K', dueDate: '—', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', handle: '@zainab.iqbal - 184K' },
  { id: 'c1', name: 'Hira Sheikh', stage: 'contacted', fee: 'Rs. 40K', dueDate: 'Jul 14', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', handle: '@hira.sheikh - 228K' },
  { id: 'n1', name: 'Fahad Qureshi', stage: 'negotiating', fee: 'Rs. 220K', dueDate: 'Jul 12', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', handle: '@fahad.q - 1.2M' },
  { id: 'a1', name: 'Usman Tariq', stage: 'accepted', fee: 'Rs. 180K', dueDate: 'Jul 08', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80', handle: '@usmantariq - 2.4M' }
];

export default function CampaignOverview({
  campaign,
  onBack,
  onUpdate,
  onArchive,
  onDelete
}: CampaignOverviewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [pipelineCards, setPipelineCards] = useState<PipelineCard[]>([]);

  useEffect(() => {
    const roster = campaign.roster || [];
    if (roster.length > 0) {
      const cards: PipelineCard[] = roster.map(c => {
        let mappedStage: PipelineCard['stage'] = 'prospect';
        if (c.stage === 'shortlisted') mappedStage = 'prospect';
        else if (c.stage === 'contacted') mappedStage = 'contacted';
        else if (c.stage === 'negotiating') mappedStage = 'negotiating';
        else if (c.stage === 'contracted' || c.stage === 'deliverable_submitted' || c.stage === 'completed') mappedStage = 'accepted';
        
        return {
          id: c.id,
          name: c.name,
          stage: mappedStage,
          fee: c.fee,
          dueDate: 'Jul 20',
          avatar: c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          handle: `${c.handle} • ${c.followers}`
        };
      });
      setPipelineCards(cards);
    } else if (campaign.id === 'camp-1') {
      setPipelineCards(EID_CARDS);
    } else {
      setPipelineCards([]);
    }
  }, [campaign]);

  const handleMoveCard = (cardId: string, targetStage: PipelineCard['stage']) => {
    setPipelineCards(pipelineCards.map((c) => (c.id === cardId ? { ...c, stage: targetStage } : c)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <CampaignDetailsHeader campaign={campaign} onBack={onBack} onArchive={() => setIsArchiveOpen(true)} />
      <CampaignDetailsTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {activeTab === 'overview' && <CampaignOverviewTab campaign={campaign} />}
      {activeTab === 'creators' && <CreatorsTab campaign={campaign} onUpdateCampaign={onUpdate} />}
      {activeTab === 'pipeline' && <PipelineTab pipelineCards={pipelineCards} onMoveCard={handleMoveCard} />}
      {activeTab === 'timeline' && <TimelineTab />}
      {activeTab === 'messages' && <MessagesTab />}
      {activeTab === 'analytics' && <AnalyticsTab campaign={campaign} />}
      {activeTab === 'files' && <FilesCatalog />}
      {activeTab === 'settings' && <CampaignSettings campaign={campaign} onUpdate={onUpdate} onDelete={() => onDelete(campaign.id)} />}

      {isArchiveOpen && (
        <ArchiveModal campaignName={campaign.name} onClose={() => setIsArchiveOpen(false)} onConfirm={() => { onArchive(campaign.id); setIsArchiveOpen(false); }} />
      )}
    </div>
  );
}
