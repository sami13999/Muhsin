'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';
import ListsGridView from '@/components/lists/ListsGridView';
import ListDetailsView from '@/components/lists/ListDetailsView';

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
  avatars?: string[];
}

const UNSPLASH_PEOPLE = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
];

export default function ListsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mushin_crm_lists');
    const seededMarker = localStorage.getItem('mushin_crm_lists_seeded_v1');
    // Force seeding if no creators are present in list-1 or if seeded marker is absent
    const needsSeed = !saved || !seededMarker || (() => {
      try {
        const parsed = JSON.parse(saved);
        return !parsed.length || !parsed[0]?.creators?.length;
      } catch {
        return true;
      }
    })();

    if (!needsSeed) {
      setLists(JSON.parse(saved!));
    } else {
      // Build Bridal Lahore Q3 detailed creators
      const list1Creators: CreatorItem[] = [
        {
          id: 'c-1',
          name: 'Sana Riaz',
          handle: '@sanaa.k',
          platform: 'instagram',
          followers: '412K',
          authScore: 92,
          er: '5.2%',
          campaign: 'Bridal Q3',
          added: '2d ago',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'c-2',
          name: 'Ayesha Malik',
          handle: '@ayeshamalik',
          platform: 'instagram',
          followers: '684K',
          authScore: 88,
          er: '6.1%',
          campaign: '—',
          added: '5d ago',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'c-3',
          name: 'Hira Sheikh',
          handle: '@hira.sheikh',
          platform: 'instagram',
          followers: '228K',
          authScore: 90,
          er: '7.8%',
          campaign: 'Bridal Q3',
          added: '1w ago',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
        }
      ];

      // Add 21 generic creators to reach exactly 24 matching the KPI stats
      const extraNames = [
        'Zainab Alvi', 'Hamza Butt', 'Fatima Lodhi', 'Bilal Sethi', 'Amina Jamil',
        'Omar Farooq', 'Sadia Imam', 'Ali Raza', 'Mariam Khan', 'Usman Ghani',
        'Mahnoor Baloch', 'Fahad Mustafa', 'Saba Qamar', 'Humayun Saeed', 'Mehwish Hayat',
        'Sheheryar Munawar', 'Maya Ali', 'Bilal Abbas', 'Sajal Aly', 'Ahad Raza Mir',
        'Yumna Zaidi'
      ];

      extraNames.forEach((name, idx) => {
        list1Creators.push({
          id: `c-extra-${idx}`,
          name,
          handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
          platform: idx % 3 === 0 ? 'youtube' : idx % 3 === 1 ? 'tiktok' : 'instagram',
          followers: `${Math.floor(Math.random() * 400) + 100}K`,
          authScore: Math.floor(Math.random() * 10) + 82,
          er: `${(Math.random() * 4 + 4).toFixed(1)}%`,
          campaign: idx % 4 === 0 ? 'Bridal Q3' : '—',
          added: `${idx + 2}d ago`,
          avatarUrl: UNSPLASH_PEOPLE[idx % UNSPLASH_PEOPLE.length]
        });
      });

      const initial: List[] = [
        { 
          id: 'list-1', 
          name: 'Bridal Lahore Q3', 
          desc: 'Verified bridal-fashion creators shortlisted for the Heritage Lahore Q3 push.', 
          count: 24, 
          reach: '3.2M', 
          avgAuth: 89, 
          updated: 'Updated 2h', 
          favorite: true, 
          shared: true, 
          creators: list1Creators,
          avatars: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80'
          ]
        },
        { 
          id: 'list-2', 
          name: 'Karachi tech reviewers', 
          desc: 'Long-form YouTube reviewers in Karachi & Islamabad with >100k subs.', 
          count: 12, 
          reach: '1.8M', 
          avgAuth: 93, 
          updated: 'Updated Yesterday', 
          favorite: false, 
          shared: false, 
          creators: [],
          avatars: [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80'
          ]
        },
        { 
          id: 'list-3', 
          name: 'Ramadan food creators', 
          desc: 'Halal cooking & iftar content creators for the Ramadan drop.', 
          count: 38, 
          reach: '4.6M', 
          avgAuth: 86, 
          updated: 'Updated 3d', 
          favorite: true, 
          shared: true, 
          creators: [],
          avatars: [
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'
          ]
        },
        { id: 'list-4', name: 'Comedy shortform', desc: 'TikTok Urdu comedy under 30s. Strong repeat-watch metrics.', count: 18, reach: '5.1M', avgAuth: 82, updated: 'Updated 1w', favorite: false, shared: false, creators: [] },
        { id: 'list-5', name: 'Wellness - Islamabad', desc: 'Yoga, mindfulness, women-focused creators.', count: 9, reach: '820K', avgAuth: 91, updated: 'Updated 2w', favorite: false, shared: false, creators: [] },
        { id: 'list-6', name: 'Q4 exploratory', desc: 'Wildcard creator pool for Q4 experiments.', count: 0, reach: '0K', avgAuth: 0, updated: 'Updated just now', favorite: false, shared: false, creators: [] }
      ];
      setLists(initial);
      localStorage.setItem('mushin_crm_lists', JSON.stringify(initial));
      localStorage.setItem('mushin_crm_lists_seeded_v1', 'true'); // marker so we refresh it once
    }
    setLoading(false);
  }, []);

  const handleCreateList = (data: {
    name: string;
    desc: string;
    category?: string;
    visibility?: 'private' | 'shared';
    tags?: string[];
    favorite?: boolean;
  }) => {
    const newList: List = {
      id: `list-${Date.now()}`,
      name: data.name,
      desc: data.desc || 'No description provided.',
      count: 0,
      reach: '0K',
      avgAuth: 90,
      updated: 'Just now',
      favorite: !!data.favorite,
      shared: data.visibility === 'shared',
      creators: [],
      avatars: []
    };
    const updated = [newList, ...lists];
    setLists(updated);
    localStorage.setItem('mushin_crm_lists', JSON.stringify(updated));

    // Async sync to backend Hono API
    api.createList(data.name, data.desc).catch((err) => {
      console.log('Backend API sync notice:', err.message);
    });

    toast.success('List Created', `Successfully initialized shortlist "${data.name}".`);
  };

  const handleToggleFavorite = (id: string) => {
    const updated = lists.map(l => l.id === id ? { ...l, favorite: !l.favorite } : l);
    setLists(updated);
    localStorage.setItem('mushin_crm_lists', JSON.stringify(updated));
    const targetList = lists.find(l => l.id === id);
    if (targetList) {
      if (targetList.favorite) {
        toast.info('Removed from Favorites', `"${targetList.name}" has been removed from favorites.`);
      } else {
        toast.success('Added to Favorites', `"${targetList.name}" has been starred.`);
      }
    }
  };

  const handleDuplicateList = (id: string) => {
    const listToDup = lists.find(l => l.id === id);
    if (!listToDup) return;
    const duplicated: List = {
      ...listToDup,
      id: `list-${Date.now()}`,
      name: `${listToDup.name} (Copy)`,
      favorite: false,
      updated: 'Updated just now'
    };
    const updated = [...lists, duplicated];
    setLists(updated);
    localStorage.setItem('mushin_crm_lists', JSON.stringify(updated));
    toast.success('List Duplicated', `Created copy of "${listToDup.name}".`);
  };

  const handleExportList = (id: string) => {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    const headers = ['Name', 'Handle', 'Platform', 'Followers', 'Auth Score', 'ER', 'Campaign', 'Added'];
    const rows = list.creators.map(c => [
      c.name,
      c.handle,
      c.platform,
      c.followers,
      c.authScore,
      c.er,
      c.campaign,
      c.added
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${list.name.toLowerCase().replace(/\s+/g, '_')}_creators.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', `CSV for "${list.name}" has been downloaded.`);
  };

  const handleShareList = (id: string) => {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/lists?id=${id}`);
    toast.success('Link Copied', `Share link for "${list.name}" copied to clipboard.`);
  };

  const handleDeleteList = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the list "${name}"?`)) {
      const updated = lists.filter(l => l.id !== id);
      setLists(updated);
      localStorage.setItem('mushin_crm_lists', JSON.stringify(updated));
      setSelectedListId(null);
      toast.success('List Deleted', `"${name}" has been deleted.`);
    }
  };

  const handleRemoveCreator = (creatorId: string, name: string, list: List) => {
    const updatedCreators = list.creators.filter(c => c.id !== creatorId);
    const updatedLists = lists.map(l => l.id === list.id ? { ...l, creators: updatedCreators, count: updatedCreators.length } : l);
    setLists(updatedLists);
    localStorage.setItem('mushin_crm_lists', JSON.stringify(updatedLists));
    toast.success('Creator Removed', `Successfully removed "${name}" from "${list.name}".`);
  };

  const activeList = lists.find((l) => l.id === selectedListId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {activeList ? (
        <ListDetailsView
          activeList={activeList}
          onBack={() => setSelectedListId(null)}
          onDeleteList={handleDeleteList}
          onRemoveCreator={handleRemoveCreator}
          onToggleFavorite={handleToggleFavorite}
          onDuplicateList={handleDuplicateList}
          onExportList={handleExportList}
          onShareList={handleShareList}
        />
      ) : (
        <ListsGridView
          lists={lists}
          onSelectList={setSelectedListId}
          onCreateList={handleCreateList}
          onToggleFavorite={handleToggleFavorite}
          onDuplicateList={handleDuplicateList}
          onExportList={handleExportList}
          onShareList={handleShareList}
        />
      )}
    </div>
  );
}
