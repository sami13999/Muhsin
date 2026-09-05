/**
 * Entitlement Resolver — reads workspace subscription state and returns entitlements.
 * Replaces hardcoded PLAN_ENTITLEMENTS in tenancy middleware.
 *
 * Source: Doc 3 (Pricing), Doc 10 FS-08.01 (Entitlement Catalog)
 */
import type { Database } from '@mushin/database';
import { workspaceRepository } from '@mushin/database';

// ── Types ────────────────────────────────────────────────────

export interface Entitlements {
  seatLimit: number;
  monthlyCreditAllowance: number;
  featureGates: Record<string, boolean>;
}

export interface WorkspaceEntitlements extends Entitlements {
  workspaceId: string;
  subscriptionPlanId: string;
  subscriptionState: string;
  entitlementSnapshotVersion: number;
}

// ── Plan Definitions (from Doc 3) ────────────────────────────

const PLAN_ENTITLEMENTS: Record<string, Entitlements> = {
  free: {
    seatLimit: 1,
    monthlyCreditAllowance: 100,
    featureGates: {
      whatsapp_s2: false,
      exports: false,
      cross_platform_discovery: false,
      advanced_analytics: false,
    },
  },
  starter: {
    seatLimit: 3,
    monthlyCreditAllowance: 500,
    featureGates: {
      whatsapp_s2: false,
      exports: true,
      cross_platform_discovery: false,
      advanced_analytics: false,
    },
  },
  growth: {
    seatLimit: 10,
    monthlyCreditAllowance: 2000,
    featureGates: {
      whatsapp_s2: true,
      exports: true,
      cross_platform_discovery: false,
      advanced_analytics: true,
    },
  },
  agency: {
    seatLimit: 50,
    monthlyCreditAllowance: 10000,
    featureGates: {
      whatsapp_s2: true,
      exports: true,
      cross_platform_discovery: true,
      advanced_analytics: true,
    },
  },
  enterprise: {
    seatLimit: -1, // unlimited
    monthlyCreditAllowance: 50000,
    featureGates: {
      whatsapp_s2: true,
      exports: true,
      cross_platform_discovery: true,
      advanced_analytics: true,
    },
  },
};

// ── Entitlement States ───────────────────────────────────────
// Per ADR-030: subscription state affects what actions are allowed.

const ACTIVE_STATES = new Set(['active', 'trialing']);

/**
 * Whether a workspace can create new reservations.
 * ADR-030: no new reservations when subscription leaves active state.
 */
export function canCreateReservations(subscriptionState: string): boolean {
  return ACTIVE_STATES.has(subscriptionState);
}

/**
 * Whether a workspace can access premium features.
 */
export function canAccessFeature(
  entitlements: Entitlements,
  feature: string,
): boolean {
  return entitlements.featureGates[feature] === true;
}

// ── Resolver ─────────────────────────────────────────────────

/**
 * Get entitlements for a workspace.
 * Reads workspace subscription state and maps to entitlements.
 */
export async function getWorkspaceEntitlements(
  db: Database,
  workspaceId: string,
): Promise<WorkspaceEntitlements> {
  const ws = await workspaceRepository.findById(db, workspaceId);

  if (!ws) {
    // Workspace not found — return free tier defaults
    return {
      workspaceId,
      subscriptionPlanId: 'free',
      subscriptionState: 'active',
      entitlementSnapshotVersion: 0,
      ...PLAN_ENTITLEMENTS['free']!,
    };
  }

  const planId = ws.workspace.subscriptionPlanId ?? 'free';
  const planEntitlements = PLAN_ENTITLEMENTS[planId] ?? PLAN_ENTITLEMENTS['free']!;

  return {
    workspaceId,
    subscriptionPlanId: planId,
    subscriptionState: ws.workspace.subscriptionState,
    entitlementSnapshotVersion: ws.workspace.entitlementSnapshotVersion,
    ...planEntitlements,
  };
}

/**
 * Get just the feature gates for a workspace (lightweight check).
 */
export async function getFeatureGates(
  db: Database,
  workspaceId: string,
): Promise<Record<string, boolean>> {
  const entitlements = await getWorkspaceEntitlements(db, workspaceId);
  return entitlements.featureGates;
}

/**
 * Check if a specific feature is enabled for a workspace.
 */
export async function isFeatureEnabled(
  db: Database,
  workspaceId: string,
  feature: string,
): Promise<boolean> {
  const gates = await getFeatureGates(db, workspaceId);
  return gates[feature] === true;
}

// ── Cache Support ────────────────────────────────────────────
// For hot-path caching via Upstash Redis (ADR-033 recommendation).
// Cache key: `entitlements:{workspaceId}`
// TTL: 60 seconds (invalidate on subscription state change)

export function getCacheKey(workspaceId: string): string {
  return `entitlements:${workspaceId}`;
}

export const CACHE_TTL_SECONDS = 60;
