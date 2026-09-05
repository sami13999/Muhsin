'use client';

import React, { useState } from 'react';
import { Campaign } from '@/app/dashboard/campaigns/page';
import CampaignsHeader from './CampaignsHeader';
import CampaignsStats from './CampaignsStats';
import CampaignsSearchFilters from './CampaignsSearchFilters';
import CampaignCard from './CampaignCard';
import CreateCampaignModal from './CreateCampaignModal';
import { useToast } from '@/lib/toast';

interface CampaignsListProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
  onCreateCampaign: (data?: Partial<Campaign>) => void;
}

export default function CampaignsList({
  campaigns,
  onSelectCampaign,
  onCreateCampaign
}: CampaignsListProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.niche.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleModalSubmit = (campaignData: Partial<Campaign>) => {
    onCreateCampaign(campaignData);
    toast.success('Campaign Created', `Successfully created campaign "${campaignData.name}".`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      <CampaignsHeader onCreateCampaign={() => setShowCreateModal(true)} />
      <CampaignsStats campaigns={campaigns} />
      <CampaignsSearchFilters 
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        selectedStatus={statusFilter}
      />
      <div className="campaigns-cards-grid" style={{ gap: '12px' }}>
        {filteredCampaigns.map((camp) => (
          <CampaignCard 
            key={camp.id} 
            campaign={camp} 
            onClick={() => onSelectCampaign(camp.id)} 
          />
        ))}
      </div>

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleModalSubmit}
      />
    </div>
  );
}

