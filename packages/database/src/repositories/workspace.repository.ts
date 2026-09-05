/**
 * M1 Workspace Repository — Data access layer for workspace operations.
 * Manages workspaces, memberships, and tenancy resolution.
 * Every method takes db as first param for transaction participation (ADR-020).
 */
import { eq, and, sql, count, type SQL } from 'drizzle-orm';
import type { Database } from '../client.js';
import { workspace, membership, workspaceCreditBalance } from '../schema/wp/index.js';

// ── Types ────────────────────────────────────────────────────

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  ownerId: string;
  defaultTimezone?: string;
  defaultCurrency?: string;
}

export interface WorkspaceWithMeta {
  workspace: typeof workspace.$inferSelect;
  memberCount: number;
  creditBalance: bigint;
}

export interface MembershipWithWorkspace {
  membership: typeof membership.$inferSelect;
  workspace: typeof workspace.$inferSelect;
}

// ── Repository ───────────────────────────────────────────────

/**
 * Find workspace by ID with member count and credit balance.
 */
export async function findById(
  db: Database,
  id: string,
): Promise<WorkspaceWithMeta | null> {
  const [ws] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.workspaceId, id))
    .limit(1);

  if (!ws) return null;

  const memberCountResult = await db
    .select({ memberCount: count() })
    .from(membership)
    .where(
      and(
        eq(membership.workspaceId, id),
        sql`${membership.removedAt} IS NULL`,
      ),
    );
  const memberCount = memberCountResult[0]?.memberCount ?? 0;

  const [balance] = await db
    .select({ balance: workspaceCreditBalance.balance })
    .from(workspaceCreditBalance)
    .where(eq(workspaceCreditBalance.workspaceId, id))
    .limit(1);

  return {
    workspace: ws,
    memberCount,
    creditBalance: balance?.balance ?? 0n,
  };
}

/**
 * Find workspace by slug.
 */
export async function findBySlug(
  db: Database,
  slug: string,
): Promise<WorkspaceWithMeta | null> {
  const [ws] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .limit(1);

  if (!ws) return null;
  return findById(db, ws.workspaceId);
}

/**
 * Create workspace + owner membership + credit balance in ONE transaction.
 */
export async function create(
  db: Database,
  input: CreateWorkspaceInput,
): Promise<WorkspaceWithMeta> {
  // Insert workspace
  const wsRows = await db
    .insert(workspace)
    .values({
      name: input.name,
      slug: input.slug,
      defaultTimezone: input.defaultTimezone ?? 'Asia/Karachi',
      defaultCurrency: input.defaultCurrency ?? 'PKR',
    })
    .returning();
  const ws = wsRows[0];
  if (!ws) throw new Error('Failed to create workspace');

  // Insert owner membership
  await db.insert(membership).values({
    workspaceId: ws.workspaceId,
    userId: input.ownerId,
    role: 'owner',
    status: 'active',
    joinedAt: new Date(),
  });

  // Initialize credit balance (0 credits, version 1)
  await db.insert(workspaceCreditBalance).values({
    workspaceId: ws.workspaceId,
    balance: 0n,
    version: 1,
  });

  return findById(db, ws.workspaceId) as Promise<WorkspaceWithMeta>;
}

/**
 * Add a member to a workspace.
 */
export async function addMember(
  db: Database,
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member',
  invitedEmail?: string,
): Promise<typeof membership.$inferSelect> {
  const memberRows = await db
    .insert(membership)
    .values({
      workspaceId,
      userId,
      role,
      status: 'active',
      invitedEmail,
      joinedAt: new Date(),
    })
    .returning();
  const m = memberRows[0];
  if (!m) throw new Error('Failed to add member');
  return m;
}

/**
 * Remove a member (soft-delete via removed_at).
 */
export async function removeMember(
  db: Database,
  membershipId: string,
): Promise<void> {
  await db
    .update(membership)
    .set({ removedAt: new Date(), updatedAt: new Date() })
    .where(eq(membership.membershipId, membershipId));
}

/**
 * Get membership for a user in a workspace.
 * THIS IS THE METHOD THE TENANCY MIDDLEWARE CALLS.
 */
export async function getMembership(
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<typeof membership.$inferSelect | null> {
  const [m] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.userId, userId),
        eq(membership.workspaceId, workspaceId),
        sql`${membership.removedAt} IS NULL`,
      ),
    )
    .limit(1);

  return m ?? null;
}

/**
 * List all workspaces a user belongs to (for workspace switcher, Doc 11 B1).
 */
export async function listUserWorkspaces(
  db: Database,
  userId: string,
): Promise<MembershipWithWorkspace[]> {
  const rows = await db
    .select({
      membership: membership,
      workspace: workspace,
    })
    .from(membership)
    .innerJoin(workspace, eq(membership.workspaceId, workspace.workspaceId))
    .where(
      and(
        eq(membership.userId, userId),
        sql`${membership.removedAt} IS NULL`,
      ),
    )
    .orderBy(workspace.name);

  return rows;
}

/**
 * Update subscription status. Called by M10 on Paddle webhooks.
 */
export async function updateSubscriptionStatus(
  db: Database,
  workspaceId: string,
  status: 'trialing' | 'active' | 'past_due' | 'paused_grace' | 'canceled_pending' | 'expired',
  paddleSubscriptionId?: string,
  paddleCustomerId?: string,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    subscriptionState: status,
    updatedAt: new Date(),
  };

  if (paddleSubscriptionId) updateData['subscriptionPaddleId'] = paddleSubscriptionId;
  if (paddleCustomerId) updateData['paddleCustomerId'] = paddleCustomerId;

  // Increment entitlement snapshot version (Doc 10 A2)
  await db
    .update(workspace)
    .set({
      ...updateData,
      entitlementSnapshotVersion: sql`${workspace.entitlementSnapshotVersion} + 1`,
    })
    .where(eq(workspace.workspaceId, workspaceId));
}
