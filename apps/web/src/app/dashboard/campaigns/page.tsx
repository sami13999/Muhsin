'use client';

import React, { useState, useEffect } from 'react';
import CampaignsList from '@/components/campaigns/CampaignsList';
import CampaignOverview from '@/components/campaigns/CampaignOverview';

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'completed' | 'paused';
  budget: string;
  spent: string;
  creatorsCount: number;
  roas: string;
  progress: number;
  niche: string;
  owner?: string;
  dates?: string;
  goal?: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 'camp-1', name: 'Eid Sale 2026', status: 'active', budget: 'Rs. 15.0L', spent: 'Rs. 9.2L', creatorsCount: 7, roas: '4.2x', progress: 62, niche: 'Multi-platform', owner: 'Ahmed Raza Khan', dates: 'Jun 20 – Jul 20', goal: 'Drive 2M reach and 40k landing-page visits for the Eid capsule.' },
  { id: 'camp-2', name: 'Ramadan Beauty Drop', status: 'active', budget: 'Rs. 7.5L', spent: 'Rs. 4.1L', creatorsCount: 0, roas: '3.4x', progress: 48, niche: 'Instagram', owner: 'Ayesha Malik', dates: 'Jun 12 – Jul 08', goal: 'Increase brand awareness and capture 2.5K landing page email sign-ups in Lahore and Karachi during Eid festive seasons.' },
  { id: 'camp-3', name: 'Festive Bridal \'26', status: 'draft', budget: 'Rs. 20.0L', spent: 'Rs. 0.0L', creatorsCount: 0, roas: '—', progress: 12, niche: 'Instagram', owner: 'You', dates: 'Jul 15 – Sep 15', goal: 'Establish presence in bridal wear category with local influencers.' },
  { id: 'camp-4', name: 'FreshFit Q3 Launch', status: 'paused', budget: 'Rs. 6.0L', spent: 'Rs. 0.8L', creatorsCount: 0, roas: '2.1x', progress: 22, niche: 'YouTube', owner: 'You', dates: 'Jun 05 – Aug 30', goal: 'Launch fitness products through macro and micro creators.' }
];

export default function CampaignsPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mushin_campaigns');
    if (saved) {
      setCampaigns(JSON.parse(saved));
    } else {
      setCampaigns(INITIAL_CAMPAIGNS);
      localStorage.setItem('mushin_campaigns', JSON.stringify(INITIAL_CAMPAIGNS));
    }
  }, []);

  const handleCreateCampaign = (data?: Partial<Campaign>) => {
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name: data?.name || 'New campaign',
      status: data?.status || 'draft',
      budget: data?.budget || 'Rs. 10.0L',
      spent: data?.spent || 'Rs. 0.0L',
      creatorsCount: data?.creatorsCount || 0,
      roas: data?.roas || '0.0x',
      progress: data?.progress || 0,
      niche: data?.niche || 'Multi-platform',
      owner: data?.owner || 'You',
      dates: data?.dates || 'Jul 15 – Sep 15',
      goal: data?.goal || 'Add a goal to align creators and stakeholders.'
    };
    const updated = [newCamp, ...campaigns];
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
  };

  const handleUpdateCampaign = (updatedCamp: Campaign) => {
    const updated = campaigns.map((c) => (c.id === updatedCamp.id ? updatedCamp : c));
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
  };

  const handleArchiveCampaign = (id: string) => {
    const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'paused' as const } : c));
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter((c) => c.id !== id);
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
    setSelectedCampaignId(null);
  };

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {activeCampaign ? (
        <CampaignOverview
          campaign={activeCampaign}
          onBack={() => setSelectedCampaignId(null)}
          onUpdate={handleUpdateCampaign}
          onArchive={handleArchiveCampaign}
          onDelete={handleDeleteCampaign}
        />
      ) : (
        <CampaignsList
          campaigns={campaigns}
          onSelectCampaign={setSelectedCampaignId}
          onCreateCampaign={handleCreateCampaign}
        />
      )}
    </div>
  );
}
