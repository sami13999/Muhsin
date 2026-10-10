/**
 * API Client for MUSHIN backend.
 * Handles authentication, workspace context, and error handling.
 */

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
    return `${protocol}//${hostname}`;
  }
  return 'http://localhost:3000';
}

export interface APIError {
  code: string;
  message: string;
  request_id?: string;
}

export interface TenancyContext {
  userId: string;
  workspaceId: string;
  isStaff: boolean;
  roles: string[];
}

class APIClient {
  private token: string | null = null;
  private workspaceId: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  setWorkspaceId(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.workspaceId) {
      headers['X-Workspace-ID'] = this.workspaceId;
    }

    const baseUrl = getApiBase();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err: any) {
      throw new Error(
        err?.message === 'Failed to fetch'
          ? `Cannot connect to MUSHIN API server at ${baseUrl}. Please ensure the backend is running.`
          : (err?.message || 'Network request failed'),
      );
    }

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const error = (await response.json()) as { error?: APIError; message?: string };
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ── Auth ────────────────────────────────────────────────────

  async login(email: string, password: string) {
    return this.request<{
      data: {
        user: { id: string; email: string };
        session: { access_token: string; refresh_token: string; expires_at: number };
      };
    }>('POST', '/auth/login', { email, password });
  }

  async signup(email: string, password: string, name: string) {
    return this.request<{
      data: {
        user: { id: string; email: string } | null;
        session: { access_token: string; refresh_token: string; expires_at: number } | null;
      };
    }>('POST', '/auth/signup', { email, password, name });
  }

  async logout() {
    return this.request<{ data: { success: boolean } }>('POST', '/auth/logout');
  }

  async getSession() {
    return this.request<{
      data: { user: { id: string; email: string } };
    }>('GET', '/auth/session');
  }

  async refreshSession(refreshToken: string) {
    return this.request<{
      data: {
        session: { access_token: string; refresh_token: string; expires_at: number };
      };
    }>('POST', '/auth/refresh', { refresh_token: refreshToken });
  }

  // ── Workspaces ──────────────────────────────────────────────

  async listWorkspaces() {
    return this.request<{
      data: Array<{
        workspace: { id: string; name: string; slug: string };
        membership: { role: string; status: string; joinedAt: string };
      }>;
    }>('GET', '/api/v1/workspaces');
  }

  async createWorkspace(name: string, slug: string) {
    return this.request<{
      data: {
        workspace: { id: string; name: string; slug: string };
        memberCount: number;
        creditBalance: string;
      };
    }>('POST', '/api/v1/workspaces', { name, slug });
  }

  // ── Creators ────────────────────────────────────────────────

  async searchCreators(query: string, filters?: Record<string, unknown>) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
    }
    const queryString = params.toString();
    const url = `/api/v1/creators/search${queryString ? `?${queryString}` : ''}`;
    return this.request<{
      data: Array<{
        creatorId: string;
        displayName: string;
        primaryHandle: string;
        platform: string;
        followerCount: number;
        engagementRate: number;
        _rankingScore: number;
        _explanation?: Record<string, unknown>;
      }>;
      total: number;
      page: number;
      limit: number;
      meta: { request_id: string };
    }>('GET', url);
  }

  async searchCreatorsNL(query: string) {
    return this.request<{
      interpretation: {
        chips: Array<{ label: string; value: string; field: string }>;
        raw: string;
        confidence: number;
        cached: boolean;
      };
      results: Array<{
        creatorId: string;
        displayName: string;
        primaryHandle: string;
        platform: string;
        followerCount: number;
        engagementRate: number;
        _rankingScore: number;
        _explanation?: Record<string, unknown>;
      }>;
      total: number;
      meta: { request_id: string };
    }>('POST', '/api/v1/creators/search/nl', { query });
  }

  async searchCreatorsLive(query: string, options?: { platform?: string; niche?: string; location?: string }) {
    return this.request<{
      data: Array<{
        creatorId: string;
        displayName: string;
        primaryHandle: string;
        platform: string;
        followerCount: number;
        engagementRate: number;
        _rankingScore: number;
        city?: string;
        niche?: string;
        iqScore?: number;
        verified?: boolean;
        isLive?: boolean;
      }>;
      total: number;
      pipelineStages?: {
        aiQueryExpansion: string[];
        serperQueriesExecuted: number;
        duplicatesFiltered: number;
        apifyUrlsScraped: number;
        creatorsPersistedDb: number;
        mushinRankingApplied: boolean;
      };
      executionStats?: {
        scrapedEndpoints: string[];
        latencyMs: number;
        creditsDeducted: number;
        freshness: string;
      };
      meta: { request_id: string; timestamp: string };
    }>('POST', '/api/v1/creators/search/live', { query, ...options });
  }

  async getTrendingCreators(options?: { platform?: string; niche?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.platform) params.set('platform', options.platform);
    if (options?.niche) params.set('niche', options.niche);
    if (options?.limit) params.set('limit', String(options.limit));
    const queryString = params.toString();
    const url = `/api/v1/creators/trending${queryString ? `?${queryString}` : ''}`;
    return this.request<{
      data: Array<{
        creatorId: string;
        displayName: string;
        primaryHandle: string;
        platform: string;
        followerCount: number;
        engagementRate: number;
        primaryNiche: string;
        trendingScore: number;
        trendingExplanation: Record<string, number>;
        trendDirection: 'accelerating' | 'steady' | 'decelerating';
      }>;
      meta: { request_id: string; computedAt: string; ttl: number };
    }>('GET', url);
  }

  async getCreator(creatorId: string) {
    return this.request<{
      data: {
        creator: { creatorId: string; displayName: string; primaryHandle: string; platform: string };
        profiles: unknown[];
        enrichment: unknown[];
        niches: unknown[];
      };
    }>('GET', `/api/v1/creators/${creatorId}`);
  }

  async revealContact(creatorId: string) {
    return this.request<{
      data: {
        creatorId: string;
        revealed: boolean;
        contactDetails: {
          email?: string;
          phone?: string;
          whatsapp?: string;
        };
      };
    }>('POST', `/api/v1/creators/${creatorId}/reveal-contact`);
  }

  // ── CRM ─────────────────────────────────────────────────────

  async listLists() {
    return this.request<{
      data: Array<{
        listId: string;
        name: string;
        description: string | null;
        memberCount: number;
        createdAt: string;
      }>;
    }>('GET', '/api/v1/lists');
  }

  async createList(name: string, description?: string) {
    return this.request<{
      data: {
        list: { listId: string; name: string; description: string | null };
      };
    }>('POST', '/api/v1/lists', { name, description });
  }

  // ── Campaigns ───────────────────────────────────────────────

  async listCampaigns() {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        status: 'active' | 'draft' | 'completed' | 'paused';
        budget: string;
        spent: string;
        creatorsCount: number;
        roas: string;
        progress: number;
        niche: string;
        owner: string;
        dates: string;
        goal: string;
        createdAt: string;
      }>;
    }>('GET', '/api/v1/campaigns');
  }

  async createCampaign(payload: {
    name: string;
    goal?: string;
    budget?: string;
    niche?: string;
    owner?: string;
    dates?: string;
    status?: 'draft' | 'active' | 'paused' | 'completed';
  }) {
    return this.request<{
      data: {
        campaign: {
          id: string;
          name: string;
          status: 'active' | 'draft' | 'completed' | 'paused';
          budget: string;
          spent: string;
          creatorsCount: number;
          roas: string;
          progress: number;
          niche: string;
          owner: string;
          dates: string;
          goal: string;
          createdAt: string;
        };
      };
    }>('POST', '/api/v1/campaigns', payload);
  }

  async getCampaign(id: string) {
    return this.request<{
      data: {
        campaign: {
          id: string;
          name: string;
          status: 'active' | 'draft' | 'completed' | 'paused';
          budget: string;
          spent: string;
          creatorsCount: number;
          roas: string;
          progress: number;
          niche: string;
          owner: string;
          dates: string;
          goal: string;
          createdAt: string;
        };
      };
    }>('GET', `/api/v1/campaigns/${id}`);
  }

  async updateCampaign(
    id: string,
    payload: Partial<{
      name: string;
      goal: string;
      budget: string;
      spent: string;
      progress: number;
      status: 'draft' | 'active' | 'paused' | 'completed';
      niche: string;
      owner: string;
      dates: string;
    }>,
  ) {
    return this.request<{
      data: {
        campaign: {
          id: string;
          name: string;
          status: 'active' | 'draft' | 'completed' | 'paused';
          budget: string;
          spent: string;
          creatorsCount: number;
          roas: string;
          progress: number;
          niche: string;
          owner: string;
          dates: string;
          goal: string;
          createdAt: string;
        };
      };
    }>('PATCH', `/api/v1/campaigns/${id}`, payload);
  }

  async deleteCampaign(id: string) {
    return this.request<void>('DELETE', `/api/v1/campaigns/${id}`);
  }

  // ── Analytics ───────────────────────────────────────────────

  async getWorkspaceAnalytics(period: string) {
    return this.request<{
      data: {
        analytics: {
          creditUsage: { total: number; byCategory: Record<string, number> };
          outreachMetrics: { sent: number; delivered: number; opened: number; replied: number; bounced: number };
          creatorMetrics: { totalCreators: number; activeCreators: number; newListCreators: number };
        };
      };
    }>('GET', `/api/v1/analytics?period=${period}`);
  }

  // ── Outreach ────────────────────────────────────────────────

  async sendOutreachMessage(payload: {
    channel: 'email' | 'whatsapp' | 'instagram_dm';
    recipientContactId: string;
    body: string;
    subject?: string;
    templateId?: string;
  }) {
    return this.request<{
      data: { messageId: string; status: string; sentAt: string };
    }>('POST', '/api/v1/outreach/messages', payload);
  }

  async enrollInSequence(payload: {
    sequenceId: string;
    recipientContactId: string;
  }) {
    return this.request<{
      data: { enrollmentId: string; status: string; enrolledAt: string };
    }>('POST', `/api/v1/outreach/sequences/${payload.sequenceId}/enroll`, {
      recipientContactId: payload.recipientContactId,
    });
  }

  // ── GDPR & Compliance ──────────────────────────────────────

  async requestErasure(creatorId: string, reason: string) {
    return this.request<{
      data: { erasureRequestId: string; status: string; requestedAt: string };
    }>('POST', `/api/v1/creators/${creatorId}/erasure`, { reason });
  }

  async getErasureStatus(creatorId: string) {
    return this.request<{
      data: { creatorId: string; status: string; erasedAt: string | null };
    }>('GET', `/api/v1/creators/${creatorId}/erasure/status`);
  }

  // ── Health ──────────────────────────────────────────────────

  async healthCheck() {
    return this.request<{
      status: string;
      uptime: number;
      checks: Record<string, { status: string; latencyMs?: number }>;
    }>('GET', '/health');
  }
}

export const api = new APIClient();
