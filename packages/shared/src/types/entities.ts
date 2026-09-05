/**
 * Domain entities from Doc-18 Domain Model.
 */

// ── Workspace ────────────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspacePlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type WorkspaceStatus = 'active' | 'suspended' | 'deleted';

// ── Creator ──────────────────────────────────────────────────────────
export interface Creator {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: CreatorStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatorStatus = 'active' | 'suspended' | 'deleted';

// ── Workspace-Creator Link (ADR-024 bridge entity) ───────────────────
export interface WorkspaceCreatorLink {
  id: string;
  workspaceId: string;
  creatorId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  invitedBy: string | null;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

// ── Credit System (ADR-026) ──────────────────────────────────────────
export interface WorkspaceCreditBalance {
  workspaceId: string;
  balanceCents: bigint;
  version: number;
  updatedAt: Date;
}

export interface CreditLedgerEntry {
  id: string;
  workspaceId: string;
  amountCents: bigint;
  type: CreditLedgerType;
  referenceId: string | null;
  description: string;
  createdAt: Date;
}

export type CreditLedgerType =
  | 'credit'
  | 'debit'
  | 'reserve'
  | 'release'
  | 'refund'
  | 'adjustment';

export interface CreditReservation {
  id: string;
  workspaceId: string;
  amountCents: bigint;
  status: ReservationStatus;
  referenceType: string;
  referenceId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationStatus = 'pending' | 'committed' | 'released' | 'expired';

// ── Interaction Timeline ─────────────────────────────────────────────
export interface InteractionTimeline {
  id: string;
  workspaceId: string;
  creatorId: string;
  channel: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

// ── Consent (PATCH-006) ──────────────────────────────────────────────
export interface ConsentRecord {
  id: string;
  workspaceId: string;
  creatorId: string;
  channel: string;
  status: ConsentStatus;
  source: string;
  grantedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsentStatus = 'granted' | 'revoked' | 'pending';

// ── GCP Entities ─────────────────────────────────────────────────────
export interface GcpCreator {
  id: string;
  externalId: string;
  email: string;
  workspaceId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface InflightUrlLock {
  id: string;
  url: string;
  lockedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

// ── Outbox (ADR-020) ────────────────────────────────────────────────
export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}

export type OutboxStatus = 'pending' | 'processing' | 'published' | 'failed';
