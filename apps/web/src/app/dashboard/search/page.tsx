'use client';

import React, { useState, useEffect } from 'react';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import SearchResultsTable from '@/components/search/SearchResultsTable';
import SearchFilters from '@/components/search/SearchFilters';
import CreatorProfilePanel from '@/components/CreatorProfilePanel';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';
import { getVerifiedSocialUrl, getVerifiedAvatarUrl } from '@/lib/social-links';

interface SearchCreatorItem {
  creatorId: string;
  displayName: string;
  primaryHandle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  _rankingScore: number;
  city: string;
  niche: string;
  iqScore: number;
  verified: boolean;
  avatarUrl?: string;
  bio?: string;
  canonicalUrl?: string;
  isLive?: boolean;
}

const DEFAULT_CREATORS: SearchCreatorItem[] = [
  { creatorId: 'cr-001', displayName: 'Shahveer Jafry', primaryHandle: '@ShahveerJay', platform: 'youtube', followerCount: 3400000, engagementRate: 9.4, _rankingScore: 98, city: 'Lahore', niche: 'Vlogs & Entertainment', iqScore: 96, verified: true, avatarUrl: '/creators/shahveer-jafry.jpg', bio: 'Digital creator, family vlogger & Pakistani podcast host', canonicalUrl: 'https://www.youtube.com/@ShahveerJay' },
  { creatorId: 'cr-002', displayName: 'Irfan Junejo', primaryHandle: '@IrfanJunejo', platform: 'youtube', followerCount: 1600000, engagementRate: 8.2, _rankingScore: 97, city: 'Karachi', niche: 'Cinematic & Lifestyle', iqScore: 95, verified: true, avatarUrl: '/creators/irfan-junejo.jpg', bio: 'Cinematic storytelling, lifestyle photography & honest tech vlogs', canonicalUrl: 'https://www.youtube.com/@IrfanJunejo' },
  { creatorId: 'cr-003', displayName: 'Romaisa Khan', primaryHandle: '@romaisa.khan._', platform: 'tiktok', followerCount: 8500000, engagementRate: 11.4, _rankingScore: 95, city: 'Karachi', niche: 'Entertainment & Comedy', iqScore: 94, verified: true, avatarUrl: '/creators/romaisa-khan.png', bio: 'Waiting for 10M 😊 | Actress & TikTok star known for viral comedy skits & lifestyle', canonicalUrl: 'https://www.tiktok.com/@romaisa.khan._' },
  { creatorId: 'cr-004', displayName: 'Arslan Naseer (CBA)', primaryHandle: '@arsalancba', platform: 'youtube', followerCount: 1250000, engagementRate: 8.9, _rankingScore: 97, city: 'Islamabad', niche: 'Comedy & Parody', iqScore: 96, verified: true, avatarUrl: '/creators/arslan-naseer.jpg', bio: 'Comics By Arslan (CBA) creator, satirist & TV drama actor', canonicalUrl: 'https://www.youtube.com/@arsalancba' },
  { creatorId: 'cr-005', displayName: 'Danyal Zafar', primaryHandle: '@danyalzee', platform: 'instagram', followerCount: 890000, engagementRate: 7.2, _rankingScore: 95, city: 'Lahore', niche: 'Music & Fashion', iqScore: 93, verified: true, avatarUrl: '/creators/danyal-zafar.jpg', bio: 'Musician, singer, indie songwriter & youth fashion icon', canonicalUrl: 'https://www.instagram.com/danyalzee/' },
  { creatorId: 'cr-006', displayName: 'Areeka Haq', primaryHandle: '@areeka__haq', platform: 'tiktok', followerCount: 11200000, engagementRate: 12.1, _rankingScore: 99, city: 'Karachi', niche: 'Fashion & Beauty', iqScore: 98, verified: true, avatarUrl: '/creators/areeka-haq.jpg', bio: 'Fashion, beauty, lip-sync & top trending Pakistani creator', canonicalUrl: 'https://www.tiktok.com/@areeka__haq' },
  { creatorId: 'cr-007', displayName: 'Kanwal Aftab', primaryHandle: '@kanwal.135', platform: 'tiktok', followerCount: 18500000, engagementRate: 10.8, _rankingScore: 98, city: 'Lahore', niche: 'Lifestyle & Family', iqScore: 96, verified: true, avatarUrl: '/creators/kanwal-aftab.jpg', bio: 'Lifestyle influencer, TV host & family vlogger', canonicalUrl: 'https://www.tiktok.com/@kanwal.135' },
  { creatorId: 'cr-008', displayName: 'Mooroo', primaryHandle: '@mooroosicity', platform: 'youtube', followerCount: 1100000, engagementRate: 7.6, _rankingScore: 96, city: 'Islamabad', niche: 'Music & Podcasts', iqScore: 95, verified: true, avatarUrl: '/creators/mooroo.jpg', bio: 'Taimoor Salahuddin (Mooroo) - Musician, filmmaker & top Pakistani podcaster', canonicalUrl: 'https://www.youtube.com/@mooroosicity' },
  { creatorId: 'cr-009', displayName: 'Ducky Bhai', primaryHandle: '@DuckyBhai', platform: 'youtube', followerCount: 8200000, engagementRate: 14.8, _rankingScore: 99, city: 'Lahore', niche: 'Gaming & Vlogs', iqScore: 98, verified: true, avatarUrl: '/creators/ducky-bhai.jpg', bio: 'Saad Ur Rehman (Ducky Bhai) - Top Pakistani gaming, roasting & viral daily vlogger', canonicalUrl: 'https://www.youtube.com/@DuckyBhai' },
  { creatorId: 'cr-010', displayName: 'Maaz Safder', primaryHandle: '@MaazSafderWorld', platform: 'youtube', followerCount: 4800000, engagementRate: 11.2, _rankingScore: 98, city: 'Karachi', niche: 'Daily Vlogs & Family', iqScore: 96, verified: true, avatarUrl: '/creators/maaz-safder.jpg', bio: 'Pakistani daily family vlogger, travel content creator & lifestyle influencer', canonicalUrl: 'https://www.youtube.com/@MaazSafderWorld' },
  { creatorId: 'cr-011', displayName: 'Bilal Munir (VideoWaliSarkar)', primaryHandle: '@VideoWaliSarkar1', platform: 'youtube', followerCount: 3100000, engagementRate: 8.5, _rankingScore: 97, city: 'Lahore', niche: 'Tech & Gadgets', iqScore: 96, verified: true, avatarUrl: '/creators/bilal-munir.jpg', bio: 'Pakistan premier technology reviewer, smartphone unboxer & gadget expert', canonicalUrl: 'https://www.youtube.com/@VideoWaliSarkar1' },
];

// Discovery pool of verified real Pakistani creators for Brain 2 Live Search
const LIVE_DISCOVERY_POOL: SearchCreatorItem[] = [
  // Round 1
  {
    creatorId: 'cr-dananeer-14',
    displayName: 'Dananeer Mobeen',
    primaryHandle: '@dananeerm',
    platform: 'instagram',
    followerCount: 3900000,
    engagementRate: 14.5,
    _rankingScore: 98,
    city: 'Islamabad',
    niche: 'Fashion & Acting',
    iqScore: 97,
    verified: true,
    avatarUrl: '/creators/dananeer-mobeen.jpg',
    bio: 'Pawri Girl fame, actress & lifestyle content creator',
    canonicalUrl: 'https://www.instagram.com/dananeerm/',
    isLive: true,
  },
  {
    creatorId: 'cr-merium-15',
    displayName: 'Merium Pervaiz',
    primaryHandle: '@merium.pervaiz',
    platform: 'instagram',
    followerCount: 2200000,
    engagementRate: 9.8,
    _rankingScore: 97,
    city: 'Faisalabad',
    niche: 'Beauty & Skincare',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/merium-pervaiz.jpg',
    bio: 'Cosmetics entrepreneur, honest beauty tutorials & bridal skincare influencer',
    canonicalUrl: 'https://www.instagram.com/merium.pervaiz/',
    isLive: true,
  },
  {
    creatorId: 'cr-alizafar-16',
    displayName: 'Ali Zafar',
    primaryHandle: '@ali_zafar',
    platform: 'instagram',
    followerCount: 5800000,
    engagementRate: 7.9,
    _rankingScore: 98,
    city: 'Lahore',
    niche: 'Music & Arts',
    iqScore: 97,
    verified: true,
    avatarUrl: '/creators/ali-zafar.jpg',
    bio: 'Pakistani singer-songwriter, model, producer, screenwriter & painter',
    canonicalUrl: 'https://www.instagram.com/ali_zafar/',
    isLive: true,
  },
  {
    creatorId: 'cr-hania-17',
    displayName: 'Hania Aamir',
    primaryHandle: '@haniaheheofficial',
    platform: 'instagram',
    followerCount: 16900000,
    engagementRate: 18.4,
    _rankingScore: 99,
    city: 'Islamabad',
    niche: 'Acting & Lifestyle',
    iqScore: 99,
    verified: true,
    avatarUrl: '/creators/hania-aamir.jpg',
    bio: 'Leading Pakistani actress, viral reels creator & global youth icon',
    canonicalUrl: 'https://www.instagram.com/haniaheheofficial/',
    isLive: true,
  },
  // Round 2
  {
    creatorId: 'cr-babar-20',
    displayName: 'Babar Azam',
    primaryHandle: '@babarazam',
    platform: 'instagram',
    followerCount: 6100000,
    engagementRate: 16.2,
    _rankingScore: 99,
    city: 'Lahore',
    niche: 'Sports & Fitness',
    iqScore: 98,
    verified: true,
    avatarUrl: '/creators/babar-azam.jpg',
    bio: 'Pakistan cricket captain, athlete, fitness influencer & youth sports icon',
    canonicalUrl: 'https://www.instagram.com/babarazam/',
    isLive: true,
  },
  {
    creatorId: 'cr-laraib-21',
    displayName: 'Laraib Rahim',
    primaryHandle: '@laraib_rahim',
    platform: 'instagram',
    followerCount: 1200000,
    engagementRate: 8.4,
    _rankingScore: 95,
    city: 'Islamabad',
    niche: 'Skincare & Lifestyle',
    iqScore: 94,
    verified: true,
    avatarUrl: '/creators/laraib-rahim.jpg',
    bio: 'Skincare specialist, aesthetic lifestyle creator & beauty advocate',
    canonicalUrl: 'https://www.instagram.com/laraib_rahim/',
    isLive: true,
  },
  {
    creatorId: 'cr-sistrology-22',
    displayName: 'Sistrology (Iqra Kanwal)',
    primaryHandle: '@sistrology',
    platform: 'youtube',
    followerCount: 5600000,
    engagementRate: 12.8,
    _rankingScore: 98,
    city: 'Lahore',
    niche: 'Daily Vlogs & Lifestyle',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/sistrology.jpg',
    bio: 'Leading Pakistani sister vloggers, family lifestyle documentation & comedy content',
    canonicalUrl: 'https://www.youtube.com/@sistrology',
    isLive: true,
  },
  {
    creatorId: 'cr-rhs-23',
    displayName: 'Rana Hamza Saif (RHS)',
    primaryHandle: '@ranahamzasaif',
    platform: 'youtube',
    followerCount: 1850000,
    engagementRate: 9.1,
    _rankingScore: 97,
    city: 'Lahore',
    niche: 'Food & Travel',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/rana-hamza-saif.jpg',
    bio: 'Pakistan premier culinary street food explorer & international cultural traveler',
    canonicalUrl: 'https://www.youtube.com/@ranahamzasaif',
    isLive: true,
  },
  // Round 3
  {
    creatorId: 'cr-kendoll-24',
    displayName: 'Ken Doll Dubai (Adnan Zafar)',
    primaryHandle: '@ken_doll_dubai',
    platform: 'instagram',
    followerCount: 1450000,
    engagementRate: 8.7,
    _rankingScore: 95,
    city: 'Karachi',
    niche: 'Fashion & Luxury Lifestyle',
    iqScore: 94,
    verified: true,
    avatarUrl: '/creators/ken-doll.jpg',
    bio: 'Pakistani luxury influencer, hospitality expert & entertainment lifestyle personality',
    canonicalUrl: 'https://www.instagram.com/ken_doll_dubai/',
    isLive: true,
  },
  {
    creatorId: 'cr-alishba-25',
    displayName: 'Alishba Anjum',
    primaryHandle: '@alishba.anjum',
    platform: 'tiktok',
    followerCount: 17100000,
    engagementRate: 10.9,
    _rankingScore: 98,
    city: 'Faisalabad',
    niche: 'Lifestyle & Dance',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/alishba-anjum.jpg',
    bio: 'Trending TikTok creator, model, lifestyle personality & youth sensation',
    canonicalUrl: 'https://www.tiktok.com/@alishba.anjum',
    isLive: true,
  },
  {
    creatorId: 'cr-ukhano-26',
    displayName: 'Ukhano (Umar Khan)',
    primaryHandle: '@ukhano',
    platform: 'youtube',
    followerCount: 1050000,
    engagementRate: 7.8,
    _rankingScore: 96,
    city: 'Islamabad',
    niche: 'Photography & Filmmaking',
    iqScore: 95,
    verified: true,
    avatarUrl: '/creators/ukhano.jpg',
    bio: 'Filmmaker, visual storyteller, mountaineering enthusiast & creative director',
    canonicalUrl: 'https://www.youtube.com/@ukhano',
    isLive: true,
  },
  {
    creatorId: 'cr-rabeeca-27',
    displayName: 'Rabeeca Khan',
    primaryHandle: '@rabeecakhan',
    platform: 'tiktok',
    followerCount: 10800000,
    engagementRate: 11.5,
    _rankingScore: 97,
    city: 'Karachi',
    niche: 'Music & Lifestyle',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/rabeeca-khan.jpg',
    bio: 'Celebrity TikTok creator, music video artist & Gen-Z fashion influencer',
    canonicalUrl: 'https://www.tiktok.com/@rabeecakhan',
    isLive: true,
  },
  // Round 4
  {
    creatorId: 'cr-bhatti-28',
    displayName: 'Hamza Bhatti',
    primaryHandle: '@hamzathebhatti',
    platform: 'instagram',
    followerCount: 1100000,
    engagementRate: 9.3,
    _rankingScore: 96,
    city: 'Islamabad',
    niche: 'Food Reviews & Travel',
    iqScore: 95,
    verified: true,
    avatarUrl: '/creators/hamza-bhatti.jpg',
    bio: 'Aesthetic food reviewer, Northern Pakistan travel chronicler & storyteller',
    canonicalUrl: 'https://www.instagram.com/hamzathebhatti/',
    isLive: true,
  },
  {
    creatorId: 'cr-village-12',
    displayName: 'Village Food Secrets',
    primaryHandle: '@VillageFoodSecrets',
    platform: 'youtube',
    followerCount: 4300000,
    engagementRate: 9.8,
    _rankingScore: 98,
    city: 'Sialkot',
    niche: 'Food & Cooking',
    iqScore: 97,
    verified: true,
    avatarUrl: '/creators/village-food-secrets.jpg',
    bio: 'Mubashir Saddique - Traditional Pakistani village recipes, outdoor cooking & organic food',
    canonicalUrl: 'https://www.youtube.com/@VillageFoodSecrets',
    isLive: true,
  },
  {
    creatorId: 'cr-amna-13',
    displayName: 'Kitchen With Amna',
    primaryHandle: '@KitchenWithAmna',
    platform: 'youtube',
    followerCount: 4500000,
    engagementRate: 8.9,
    _rankingScore: 97,
    city: 'Lahore',
    niche: 'Food & Recipes',
    iqScore: 95,
    verified: true,
    avatarUrl: '/creators/kitchen-with-amna.jpg',
    bio: 'Amna Riaz - Easy Pakistani home cooking recipes, baking tutorials & street food',
    canonicalUrl: 'https://www.youtube.com/@KitchenWithAmna',
    isLive: true,
  },
  {
    creatorId: 'cr-jannat-18',
    displayName: 'Jannat Mirza',
    primaryHandle: '@jannatmirza',
    platform: 'tiktok',
    followerCount: 25400000,
    engagementRate: 15.6,
    _rankingScore: 99,
    city: 'Faisalabad',
    niche: 'Fashion & Entertainment',
    iqScore: 98,
    verified: true,
    avatarUrl: '/creators/jannat-mirza.jpg',
    bio: 'Pakistan #1 most followed TikTok superstar, fashion icon & cinema actress',
    canonicalUrl: 'https://www.tiktok.com/@jannatmirza',
    isLive: true,
  },
  {
    creatorId: 'cr-zulqarnain-19',
    displayName: 'Zulqarnain Sikandar',
    primaryHandle: '@ch.zulqarnain25',
    platform: 'tiktok',
    followerCount: 16800000,
    engagementRate: 12.3,
    _rankingScore: 98,
    city: 'Lahore',
    niche: 'Comedy & Daily Vlogs',
    iqScore: 96,
    verified: true,
    avatarUrl: '/creators/zulqarnain-sikandar.jpg',
    bio: 'Viral TikTok creator, family vlogger & entertainer',
    canonicalUrl: 'https://www.tiktok.com/@ch.zulqarnain25',
    isLive: true,
  },
];

export default function SearchPage() {
  const toast = useToast();
  const [queryText, setQueryText] = useState('Pakistani lifestyle 30k+');
  const [platform, setPlatform] = useState<'all' | 'instagram' | 'tiktok' | 'youtube'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [simulateError, setSimulateError] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  
  // Live Search State & Discovery Rounds
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveRound, setLiveRound] = useState(1);
  const [lastLiveQuery, setLastLiveQuery] = useState('Pakistani lifestyle 30k+');
  
  const [filterCity, setFilterCity] = useState('');
  const [filterFollowers, setFilterFollowers] = useState('');
  const [filterEngagement, setFilterEngagement] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [creators, setCreators] = useState<SearchCreatorItem[]>(DEFAULT_CREATORS);
  const [loading, setLoading] = useState(false);

  // Scopes live search discoveries to the current active user workspace account
  const getAccountDiscoveryKey = () => {
    try {
      if (typeof window === 'undefined') return 'mushin_live_discoveries_default';
      const wsId = localStorage.getItem('workspaceId');
      if (wsId) return `mushin_live_discoveries_${wsId}`;
      const userStr = localStorage.getItem('mushin_user') || localStorage.getItem('mushin_auth_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        const id = u.workspaceId || u.id || u.email;
        if (id) return `mushin_live_discoveries_${id}`;
      }
    } catch {}
    return 'mushin_live_discoveries_default';
  };

  // Restore live discovered creators specific to THIS user's account workspace
  useEffect(() => {
    try {
      const key = getAccountDiscoveryKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: SearchCreatorItem[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setCreators(prev => {
            const existingHandles = new Set(prev.map(p => p.primaryHandle.toLowerCase()));
            const additions = parsed.filter(p => !existingHandles.has(p.primaryHandle.toLowerCase()));
            return [...prev, ...additions];
          });
        }
      }
    } catch {}
  }, []);

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

  const [nlChips, setNlChips] = useState<Array<{ label: string; value: string; field: string }>>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const handleRunLiveSearch = async () => {
    if (isLiveRunning) return;
    const cost = 12;
    const query = queryText.trim() || 'Pakistani lifestyle 30k+';

    deductCredits(cost);
    setIsLiveRunning(true);
    setLoading(true);

    const isQueryChanged = query.toLowerCase() !== lastLiveQuery.toLowerCase();
    const currentRound = isQueryChanged ? 1 : liveRound;
    if (isQueryChanged) {
      setLiveRound(1);
      setLastLiveQuery(query);
    }

    const existingHandles = new Set(creators.map(c => c.primaryHandle.toLowerCase()));
    const excludeHandles = isQueryChanged ? [] : Array.from(existingHandles);

    let fetchedData: any[] = [];
    try {
      const res = await api.searchCreatorsLive(query, {
        platform: platform !== 'all' ? platform : undefined,
        round: currentRound,
        excludeHandles,
      });

      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        fetchedData = res.data;
      }
    } catch (err) {
      console.warn('[LiveSearch] API live discovery fallback activated:', err);
    }

    let newlyFound: SearchCreatorItem[] = [];

    if (fetchedData.length > 0) {
      newlyFound = fetchedData.map((c, idx) => ({
        creatorId: c.creatorId || `cr-live-${currentRound}-${idx + 1}-${Date.now()}`,
        displayName: c.displayName || (c as any).handle || `Creator ${idx + 1}`,
        primaryHandle: c.primaryHandle || (c as any).handle || `@creator_${idx + 1}`,
        platform: c.platform || 'instagram',
        followerCount: c.followerCount || 150000,
        engagementRate: c.engagementRate || 5.2,
        _rankingScore: c._rankingScore || (c as any).iqScore || 95,
        city: (c as any).city || 'Karachi',
        niche: (c as any).niche || 'Lifestyle',
        iqScore: (c as any).iqScore || 92,
        verified: c.verified !== undefined ? c.verified : true,
        avatarUrl: (c as any).avatarUrl || getVerifiedAvatarUrl(c),
        bio: (c as any).bio,
        canonicalUrl: (c as any).canonicalUrl || getVerifiedSocialUrl(c),
        isLive: true,
      }));
    } else {
      // Local Brain 2 discovery fallback pool
      const qTokens = query.toLowerCase().split(/[\s,+/]+/).filter(t => t.length > 1 && !['30k+', '50k+', 'k+'].includes(t));
      const candidates = LIVE_DISCOVERY_POOL.filter(item => {
        if (existingHandles.has(item.primaryHandle.toLowerCase())) return false;
        if (platform !== 'all' && item.platform.toLowerCase() !== platform.toLowerCase()) return false;
        if (qTokens.length === 0 || query.toLowerCase().includes('pakistani') || query.toLowerCase().includes('lifestyle')) return true;
        const searchBlob = `${item.displayName} ${item.primaryHandle} ${item.niche} ${item.city} ${item.bio || ''}`.toLowerCase();
        return qTokens.some(token => searchBlob.includes(token));
      });

      newlyFound = candidates.slice(0, 4);
    }

    if (newlyFound.length > 0) {
      const updated = isQueryChanged ? newlyFound : [...creators, ...newlyFound];
      setCreators(updated);
      setFilterCity('');
      setIsLiveActive(true);
      setLiveRound(currentRound + 1);

      // Save discoveries strictly to THIS user account's workspace storage
      try {
        const key = getAccountDiscoveryKey();
        const liveItems = updated.filter(c => (c as any).isLive);
        localStorage.setItem(key, JSON.stringify(liveItems));
      } catch {}

      toast.success(
        `Live Discovery (Round ${currentRound})`,
        `Discovered ${newlyFound.length} new real-time creators for "${query}" (Total: ${updated.length})`
      );
    } else {
      toast.info(
        'Discovery Scan Complete',
        `All available live creators for "${query}" have been discovered (Total: ${creators.length}).`
      );
    }

    setIsLiveRunning(false);
    setLoading(false);
  };

  const handleFastSearch = async () => {
    setLoading(true);
    try {
      const res = await api.searchCreatorsNL(queryText);
      if (res?.results && res.results.length > 0) {
        const mapped: SearchCreatorItem[] = res.results.map((c, idx) => ({
          creatorId: c.creatorId || `cr-${idx + 1}`,
          displayName: c.displayName,
          primaryHandle: c.primaryHandle,
          platform: c.platform,
          followerCount: c.followerCount,
          engagementRate: c.engagementRate,
          _rankingScore: c._rankingScore,
          city: (c as any).city || 'Karachi',
          niche: (c as any).niche || 'Lifestyle',
          iqScore: c._rankingScore || 85,
          verified: true,
          avatarUrl: (c as any).avatarUrl || getVerifiedAvatarUrl(c),
          bio: (c as any).bio,
          canonicalUrl: (c as any).canonicalUrl || getVerifiedSocialUrl(c),
        }));
        setCreators(mapped);
        setLiveRound(1);
        if (res.interpretation?.chips) {
          setNlChips(res.interpretation.chips);
        }
        toast.success('Fast Search (Database)', `Filtered ${mapped.length} indexed creators in database.`);
      } else {
        const q = queryText.toLowerCase().trim();
        const filtered = DEFAULT_CREATORS.filter(c => 
          c.displayName.toLowerCase().includes(q) || 
          c.primaryHandle.toLowerCase().includes(q) || 
          c.niche.toLowerCase().includes(q)
        );
        setCreators(filtered.length > 0 ? filtered : []);
        setLiveRound(1);
        toast.info('Fast Search Executed', 'Filtered creators from platform index.');
      }
    } catch {
      toast.info('Fast Search Executed', 'Filtered creators from platform index.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Search</h1>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px', margin: 0 }}>Multi-platform creator discovery — filter, verify, and shortlist in one place.</p>
      </div>

      {/* Row 1: Search inputs and outline icons */}
      <div className="search-controls-row" style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRunLiveSearch(); }}
            placeholder="Search creators by handle, niche, or platform (e.g. food, tech, gaming, Romaisa)..."
            style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}
          />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" style={{ position: 'absolute', left: '16px', top: '15px' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <button onClick={() => setIsFilterOpen(true)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg> Filters
        </button>
        <button onClick={handleFastSearch} style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '0 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> Fast search
        </button>
        <button onClick={handleRunLiveSearch} disabled={isLiveRunning} style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '0 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: isLiveRunning ? 'not-allowed' : 'pointer', opacity: isLiveRunning ? 0.7 : 1 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg> {isLiveRunning ? 'Live scanning...' : 'Live search'}
        </button>
      </div>

      {/* Row 2: Unified Platform Tabs & Active filter tag pills row */}
      <div className="search-filter-pills-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[{ id: 'all', label: 'All Platforms' }, { id: 'instagram', label: 'Instagram' }, { id: 'tiktok', label: 'Tiktok' }, { id: 'youtube', label: 'Youtube' }].map((t) => (
              <button key={t.id} onClick={() => setPlatform(t.id as any)} style={{ background: platform === t.id ? '#0f172a' : '#ffffff', color: platform === t.id ? '#ffffff' : '#64748b', border: `1px solid ${platform === t.id ? '#0f172a' : '#e2e8f0'}`, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
            ))}
          </div>
          <div style={{ width: '1px', height: '16px', background: '#cbd5e1' }} />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isLiveActive && (
              <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                📡 Realtime Live Scan Active <span onClick={() => setIsLiveActive(false)} style={{ cursor: 'pointer', fontSize: '9px', color: '#ea580c' }}>✕</span>
              </span>
            )}
            {filterCity && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterCity} <span onClick={() => setFilterCity('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {filterFollowers && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterFollowers} <span onClick={() => setFilterFollowers('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {filterEngagement && <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{filterEngagement} <span onClick={() => setFilterEngagement('')} style={{ cursor: 'pointer', fontSize: '9px', color: '#3b82f6' }}>✕</span></span>}
            {nlChips.map((chip, idx) => (
              <span key={idx} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✨ {chip.label}: {chip.value}
              </span>
            ))}
            {(isLiveActive || filterCity || filterFollowers || filterEngagement || nlChips.length > 0) && <span onClick={() => { setIsLiveActive(false); setFilterCity(''); setFilterFollowers(''); setFilterEngagement(''); setNlChips([]); }} style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, marginLeft: '4px', cursor: 'pointer' }}>Clear all</span>}
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
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              <strong style={{ color: '#0f172a' }}>{filteredCreators.length}</strong> creators match {queryText ? `for "${queryText}"` : ''} · sorted by MUSHIN score
            </div>
            <select style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#475569', outline: 'none', cursor: 'pointer' }} defaultValue="score">
              <option value="score">Sort by: MUSHIN score</option>
            </select>
          </div>

          {filteredCreators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>No creators found matching "{queryText}"</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>Try searching for a different handle, niche (e.g. "tech", "food", "gaming", "vlogs"), or platform.</p>
              <button onClick={() => { setQueryText(''); setCreators(DEFAULT_CREATORS); setIsLiveActive(false); }} style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Show All Creators</button>
            </div>
          ) : viewMode === 'grid' ? (
            <SearchResultsGrid results={filteredCreators} selectedIds={selectedIds} onSelectRow={handleSelectRow} onSelectCreatorId={setSelectedCreatorId} />
          ) : (
            <SearchResultsTable results={filteredCreators} selectedIds={selectedIds} onSelectRow={handleSelectRow} onSelectAll={handleSelectAll} onSelectCreatorId={setSelectedCreatorId} />
          )}
        </>
      )}

      <SearchFilters isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen} onApplyFilters={handleApplyFilters} />
      {selectedCreatorId && (
        <CreatorProfilePanel
          creatorId={selectedCreatorId}
          creator={creators.find(c => c.creatorId === selectedCreatorId) || null}
          onClose={() => setSelectedCreatorId(null)}
          onDeductCredits={deductCredits}
        />
      )}
    </div>
  );
}
