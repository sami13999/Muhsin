/**
 * API Client for MUSHIN backend.
 * Handles authentication, workspace context, and error handling.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json() as { error: APIError };
      throw new Error(error.error?.message || `API error: ${response.status}`);
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
