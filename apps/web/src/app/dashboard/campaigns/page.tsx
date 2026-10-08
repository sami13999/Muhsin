'use client';

import React, { useState, useEffect } from 'react';
import CampaignsList from '@/components/campaigns/CampaignsList';
import CampaignOverview from '@/components/campaigns/CampaignOverview';
import { api } from '@/lib/api';

export interface CampaignCreatorItem {
  id: string;
  name: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  followers: string;
  authScore: number;
  fee: string;
  stage: 'shortlisted' | 'contacted' | 'negotiating' | 'contracted' | 'deliverable_submitted' | 'completed';
  priority: 'high' | 'medium' | 'low';
  avatarUrl?: string;
  addedDate?: string;
}

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
  coverUrl?: string;
  roster?: CampaignCreatorItem[];
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Eid Sale 2026',
    status: 'active',
    budget: 'Rs. 15.0L',
    spent: 'Rs. 9.2L',
    creatorsCount: 4,
    roas: '4.2x',
    progress: 62,
    niche: 'Multi-platform',
    owner: 'Ahmed Raza Khan',
    dates: 'Jun 20 – Jul 20',
    goal: 'Drive 2M reach and 40k landing-page visits for the Eid capsule.',
    coverUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=400&auto=format&fit=crop&q=80',
    roster: [
      { id: 'cc-1', name: 'Sana Riaz', handle: '@sanaa.k', platform: 'instagram', followers: '412K', authScore: 92, fee: 'Rs. 85,000', stage: 'contracted', priority: 'high', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', addedDate: 'Jul 01' },
      { id: 'cc-2', name: 'Ayesha Malik', handle: '@ayeshamalik', platform: 'instagram', followers: '684K', authScore: 88, fee: 'Rs. 120,000', stage: 'negotiating', priority: 'high', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', addedDate: 'Jul 03' },
      { id: 'cc-3', name: 'Hira Sheikh', handle: '@hira.sheikh', platform: 'instagram', followers: '228K', authScore: 90, fee: 'Rs. 45,000', stage: 'contacted', priority: 'medium', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', addedDate: 'Jul 05' },
      { id: 'cc-4', name: 'Zain Ahmed', handle: '@zaintech', platform: 'youtube', followers: '320K', authScore: 94, fee: 'Rs. 150,000', stage: 'shortlisted', priority: 'low', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', addedDate: 'Jul 06' }
    ]
  },
  {
    id: 'camp-2',
    name: 'Ramadan Beauty Drop',
    status: 'active',
    budget: 'Rs. 7.5L',
    spent: 'Rs. 4.1L',
    creatorsCount: 2,
    roas: '3.4x',
    progress: 48,
    niche: 'Instagram',
    owner: 'Ayesha Malik',
    dates: 'Jun 12 – Jul 08',
    goal: 'Increase brand awareness and capture 2.5K landing page email sign-ups in Lahore and Karachi during Eid festive seasons.',
    coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
    roster: [
      { id: 'cc-5', name: 'Fatima Ali', handle: '@fatimabeauty', platform: 'instagram', followers: '280K', authScore: 89, fee: 'Rs. 60,000', stage: 'contracted', priority: 'high', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', addedDate: 'Jun 15' },
      { id: 'cc-6', name: 'Hamza Sheikh', handle: '@hamzafitness', platform: 'tiktok', followers: '450K', authScore: 86, fee: 'Rs. 75,000', stage: 'deliverable_submitted', priority: 'medium', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', addedDate: 'Jun 18' }
    ]
  },
  {
    id: 'camp-3',
    name: 'Festive Bridal \'26',
    status: 'draft',
    budget: 'Rs. 20.0L',
    spent: 'Rs. 0.0L',
    creatorsCount: 0,
    roas: '—',
    progress: 12,
    niche: 'Instagram',
    owner: 'You',
    dates: 'Jul 15 – Sep 15',
    goal: 'Establish presence in bridal wear category with local influencers.',
    coverUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=400&auto=format&fit=crop&q=80',
    roster: []
  },
  {
    id: 'camp-4',
    name: 'FreshFit Q3 Launch',
    status: 'paused',
    budget: 'Rs. 6.0L',
    spent: 'Rs. 0.8L',
    creatorsCount: 0,
    roas: '2.1x',
    progress: 22,
    niche: 'YouTube',
    owner: 'You',
    dates: 'Jun 05 – Aug 30',
    goal: 'Launch fitness products through macro and micro creators.',
    coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80',
    roster: []
  }
];

export default function CampaignsPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchCampaigns() {
      try {
        const res = await api.listCampaigns();
        if (active && res?.data && res.data.length > 0) {
          const mapped: Campaign[] = res.data.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            budget: c.budget || 'Rs. 10.0L',
            spent: c.spent || 'Rs. 0.0L',
            creatorsCount: c.creatorsCount ?? 0,
            roas: c.roas || '0.0x',
            progress: c.progress ?? 0,
            niche: c.niche || 'Multi-platform',
            owner: c.owner || 'You',
            dates: c.dates || 'Jul 15 – Sep 15',
            goal: c.goal || 'Drive campaign objectives & creator activation.',
          }));
          setCampaigns(mapped);
          localStorage.setItem('mushin_campaigns', JSON.stringify(mapped));
          return;
        }
      } catch {
        // Fallback to local storage or defaults
      }

      if (active) {
        const saved = localStorage.getItem('mushin_campaigns');
        if (saved) {
          setCampaigns(JSON.parse(saved));
        } else {
          setCampaigns(INITIAL_CAMPAIGNS);
          localStorage.setItem('mushin_campaigns', JSON.stringify(INITIAL_CAMPAIGNS));
        }
      }
    }

    fetchCampaigns();

    return () => {
      active = false;
    };
  }, []);

  const handleCreateCampaign = async (data?: Partial<Campaign>) => {
    const name = data?.name || 'New campaign';
    const status = data?.status || 'draft';
    const budget = data?.budget || 'Rs. 10.0L';

    try {
      const res = await api.createCampaign({
        name,
        status,
        budget,
        goal: data?.goal,
        niche: data?.niche,
        owner: data?.owner,
        dates: data?.dates,
      });

      if (res?.data?.campaign) {
        const c = res.data.campaign;
        const newCamp: Campaign = {
          id: c.id,
          name: c.name,
          status: c.status,
          budget: c.budget,
          spent: c.spent,
          creatorsCount: c.creatorsCount,
          roas: c.roas,
          progress: c.progress,
          niche: c.niche,
          owner: c.owner,
          dates: c.dates,
          goal: c.goal,
        };
        const updated = [newCamp, ...campaigns];
        setCampaigns(updated);
        localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
        return;
      }
    } catch {
      // Fallback local creation if API is offline
    }

    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name,
      status,
      budget,
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

  const handleUpdateCampaign = async (updatedCamp: Campaign) => {
    const updated = campaigns.map((c) => (c.id === updatedCamp.id ? updatedCamp : c));
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));

    try {
      await api.updateCampaign(updatedCamp.id, {
        name: updatedCamp.name,
        goal: updatedCamp.goal,
        budget: updatedCamp.budget,
        spent: updatedCamp.spent,
        progress: updatedCamp.progress,
        status: updatedCamp.status,
        niche: updatedCamp.niche,
        owner: updatedCamp.owner,
        dates: updatedCamp.dates,
      });
    } catch {
      // Silent fail over local state
    }
  };

  const handleArchiveCampaign = async (id: string) => {
    const updated = campaigns.map((c) => (c.id === id ? { ...c, status: 'paused' as const } : c));
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));

    try {
      await api.updateCampaign(id, { status: 'paused' });
    } catch {
      // Silent fail over local state
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    const updated = campaigns.filter((c) => c.id !== id);
    setCampaigns(updated);
    localStorage.setItem('mushin_campaigns', JSON.stringify(updated));
    setSelectedCampaignId(null);

    try {
      await api.deleteCampaign(id);
    } catch {
      // Silent fail over local state
    }
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
