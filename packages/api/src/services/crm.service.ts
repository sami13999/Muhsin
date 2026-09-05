/**
 * CRM Service — Lists, tags, and campaign management.
 *
 * Source: Doc 9 (CRM/Campaign/Outreach), Doc 19 Part G (List schema)
 *
 * Lists: Named collections of creators within a workspace.
 * Tags: Free-form labels on workspace-creator links.
 * Campaigns: Organized outreach efforts with objectives and tracking.
 */
import type { Database } from '@mushin/database';
import { list, listMember, workspaceCreatorLink } from '@mushin/database';
import { eq, and, sql } from 'drizzle-orm';
import { emitEvent, EVENT_TYPES } from '@mushin/events';

// ── Types ────────────────────────────────────────────────────

export interface CreateListInput {
  workspaceId: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'workspace';
  createdBy?: string;
}

export interface ListWithMeta {
  listId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  visibility: string;
  memberCount: number;
  createdBy: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddListMemberInput {
  listId: string;
  workspaceCreatorLinkId: string;
  addedBy?: string;
  notes?: string;
}

export interface CampaignInput {
  workspaceId: string;
  name: string;
  objective: string;
  description?: string;
  createdBy?: string;
}

export interface CampaignWithMeta {
  campaignId: string;
  workspaceId: string;
  name: string;
  objective: string;
  description: string | null;
  status: string;
  memberCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Service ──────────────────────────────────────────────────

export class CRMService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // ── Lists ──────────────────────────────────────────────────

  /**
   * Create a new list in a workspace.
   */
  async createList(input: CreateListInput): Promise<ListWithMeta> {
    const [newList] = await this.db.insert(list).values({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      visibility: input.visibility ?? 'workspace',
      createdBy: input.createdBy ?? null,
    }).returning();

    if (!newList) throw new Error('Failed to create list');

    // Emit event
    await this.emitWorkspaceEvent(input.workspaceId, EVENT_TYPES.LIST_CREATED, {
      listId: newList.listId,
      name: input.name,
    });

    return {
      ...newList,
      memberCount: 0,
    };
  }

  /**
   * Get list by ID with member count.
   */
  async getList(listId: string): Promise<ListWithMeta | null> {
    const result = await this.db.execute(sql`
      SELECT l.*, COUNT(lm.list_member_id) AS member_count
      FROM wp.list l
      LEFT JOIN wp.list_member lm ON l.list_id = lm.list_id AND lm.removed_at IS NULL
      WHERE l.list_id = ${listId}
      GROUP BY l.list_id
    `);

    if (result.length === 0) return null;

    const row = result[0]!;
    return {
      listId: row['list_id'] as string,
      workspaceId: row['workspace_id'] as string,
      name: row['name'] as string,
      description: row['description'] as string | null,
      visibility: row['visibility'] as string,
      memberCount: Number(row['member_count']),
      createdBy: row['created_by'] as string | null,
      archivedAt: row['archived_at'] ? new Date(row['archived_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * List all lists in a workspace.
   */
  async listLists(workspaceId: string): Promise<ListWithMeta[]> {
    const results = await this.db.execute(sql`
      SELECT l.*, COUNT(lm.list_member_id) AS member_count
      FROM wp.list l
      LEFT JOIN wp.list_member lm ON l.list_id = lm.list_id AND lm.removed_at IS NULL
      WHERE l.workspace_id = ${workspaceId} AND l.archived_at IS NULL
      GROUP BY l.list_id
      ORDER BY l.created_at DESC
    `);

    return results.map((row) => ({
      listId: row['list_id'] as string,
      workspaceId: row['workspace_id'] as string,
      name: row['name'] as string,
      description: row['description'] as string | null,
      visibility: row['visibility'] as string,
      memberCount: Number(row['member_count']),
      createdBy: row['created_by'] as string | null,
      archivedAt: row['archived_at'] ? new Date(row['archived_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    }));
  }

  /**
   * Archive a list (soft delete).
   */
  async archiveList(listId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE wp.list
      SET archived_at = NOW(), updated_at = NOW()
      WHERE list_id = ${listId}
    `);
  }

  // ── List Members ───────────────────────────────────────────

  /**
   * Add a creator to a list.
   */
  async addListMember(input: AddListMemberInput): Promise<void> {
    await this.db.insert(listMember).values({
      listId: input.listId,
      workspaceCreatorLinkId: input.workspaceCreatorLinkId,
      addedBy: input.addedBy ?? null,
      notes: input.notes ?? null,
    });

    // Look up workspace ID from the list
    const listResult = await this.db.execute(sql`
      SELECT workspace_id FROM wp.list WHERE list_id = ${input.listId}
    `);
    const workspaceId = listResult[0]?.['workspace_id'] as string ?? '';

    await this.emitWorkspaceEvent(workspaceId, EVENT_TYPES.LIST_MEMBERSHIP_CHANGED, {
      listId: input.listId,
      action: 'added',
      workspaceCreatorLinkId: input.workspaceCreatorLinkId,
    });
  }

  /**
   * Remove a creator from a list (soft delete).
   */
  async removeListMember(listMemberId: string): Promise<void> {
    // Look up workspace ID from the list member
    const memberResult = await this.db.execute(sql`
      SELECT l.workspace_id FROM wp.list_member lm
      JOIN wp.list l ON lm.list_id = l.list_id
      WHERE lm.list_member_id = ${listMemberId}
    `);
    const workspaceId = memberResult[0]?.['workspace_id'] as string ?? '';

    await this.db.execute(sql`
      UPDATE wp.list_member
      SET removed_at = NOW()
      WHERE list_member_id = ${listMemberId}
    `);

    await this.emitWorkspaceEvent(workspaceId, EVENT_TYPES.LIST_MEMBERSHIP_CHANGED, {
      listMemberId,
      action: 'removed',
    });
  }

  /**
   * Get members of a list.
   */
  async getListMembers(listId: string): Promise<Array<{
    listMemberId: string;
    workspaceCreatorLinkId: string;
    addedBy: string | null;
    notes: string | null;
    addedAt: Date;
  }>> {
    const results = await this.db.execute(sql`
      SELECT list_member_id, workspace_creator_link_id, added_by, notes, added_at
      FROM wp.list_member
      WHERE list_id = ${listId} AND removed_at IS NULL
      ORDER BY added_at DESC
    `);

    return results.map((row) => ({
      listMemberId: row['list_member_id'] as string,
      workspaceCreatorLinkId: row['workspace_creator_link_id'] as string,
      addedBy: row['added_by'] as string | null,
      notes: row['notes'] as string | null,
      addedAt: new Date(row['added_at'] as string),
    }));
  }

  // ── Tags ───────────────────────────────────────────────────

  /**
   * Add tags to a workspace-creator link.
   */
  async addTags(workspaceCreatorLinkId: string, tags: string[]): Promise<void> {
    await this.db.execute(sql`
      UPDATE wp.workspace_creator_link
      SET tags = array_cat(tags, ${tags}), last_active_at = NOW()
      WHERE link_id = ${workspaceCreatorLinkId}
    `);
  }

  /**
   * Remove tags from a workspace-creator link.
   */
  async removeTags(workspaceCreatorLinkId: string, tags: string[]): Promise<void> {
    await this.db.execute(sql`
      UPDATE wp.workspace_creator_link
      SET tags = array_remove(tags, ${tags}), last_active_at = NOW()
      WHERE link_id = ${workspaceCreatorLinkId}
    `);
  }

  /**
   * Get all unique tags in a workspace.
   */
  async getWorkspaceTags(workspaceId: string): Promise<string[]> {
    const results = await this.db.execute(sql`
      SELECT DISTINCT unnest(tags) AS tag
      FROM wp.workspace_creator_link
      WHERE workspace_id = ${workspaceId} AND workspace_removed_at IS NULL
      ORDER BY tag
    `);

    return results.map((row) => row['tag'] as string);
  }

  // ── Helpers ────────────────────────────────────────────────

  private async emitWorkspaceEvent(
    workspaceId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await emitEvent(this.db as Parameters<typeof emitEvent>[0], {
        eventId: crypto.randomUUID(),
        type: eventType,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'current-user' },
        correlationId: crypto.randomUUID(),
        occurredAt: new Date(),
        payload,
      });
    } catch (err) {
      console.warn('[CRM] Failed to emit event:', err);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createCRMService(db: Database): CRMService {
  return new CRMService(db);
}
