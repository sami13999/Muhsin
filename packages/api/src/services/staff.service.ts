/**
 * Staff Identity Service — DOC-029 compliant.
 *
 * Manages staff user lifecycle via Supabase Admin API.
 * Staff identities use app_metadata for realm/role claims.
 *
 * Flow:
 * 1. Create user in Supabase Auth
 * 2. Set app_metadata with realm=staff and staff_role
 * 3. Create staff_user record for additional metadata
 *
 * Key invariant: staff tokens carry realm=staff in app_metadata,
 * which the tenancy middleware reads to set isStaff=true.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { staffUser } from '@mushin/database';
import { eq } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────

export type StaffRole = 'admin' | 'support';

export interface CreateStaffInput {
  email: string;
  password: string;
  displayName: string;
  role: StaffRole;
  department?: string;
  notes?: string;
}

export interface StaffUser {
  staffUserId: string;
  displayName: string;
  email: string;
  role: StaffRole;
  department: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Service ──────────────────────────────────────────────────

export class StaffService {
  private supabaseAdmin: SupabaseClient;
  private db: Database;

  constructor(db: Database, supabaseUrl: string, serviceRoleKey: string) {
    this.db = db;
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create a new staff user.
   * 1. Create user in Supabase Auth
   * 2. Set app_metadata with staff claims
   * 3. Create staff_user record
   */
  async createStaffUser(input: CreateStaffInput): Promise<StaffUser> {
    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: {
        realm: 'staff',
        staff_role: input.role,
      },
      user_metadata: {
        display_name: input.displayName,
      },
    });

    if (authError) {
      throw new Error(`Failed to create staff user: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error('Failed to create staff user: no user returned');
    }

    // 2. Create staff_user record
    const [created] = await this.db
      .insert(staffUser)
      .values({
        staffUserId: authUser.user.id,
        displayName: input.displayName,
        department: input.department ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create staff_user record');
    }

    return {
      staffUserId: created.staffUserId,
      displayName: created.displayName,
      email: input.email,
      role: input.role,
      department: created.department,
      notes: created.notes,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Promote an existing user to staff role.
   * Sets app_metadata with staff claims.
   */
  async promoteToStaff(
    userId: string,
    role: StaffRole,
    displayName: string,
    department?: string,
  ): Promise<StaffUser> {
    // 1. Update app_metadata in Supabase Auth
    const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          realm: 'staff',
          staff_role: role,
        },
      },
    );

    if (updateError) {
      throw new Error(`Failed to promote user: ${updateError.message}`);
    }

    // 2. Create or update staff_user record
    const existing = await this.db
      .select()
      .from(staffUser)
      .where(eq(staffUser.staffUserId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await this.db
        .update(staffUser)
        .set({
          displayName,
          department: department ?? null,
          updatedAt: new Date(),
        })
        .where(eq(staffUser.staffUserId, userId));

      return {
        staffUserId: userId,
        displayName,
        email: '',
        role,
        department: department ?? null,
        notes: null,
        createdAt: existing[0]!.createdAt,
        updatedAt: new Date(),
      };
    }

    // Create new record
    const [created] = await this.db
      .insert(staffUser)
      .values({
        staffUserId: userId,
        displayName,
        department: department ?? null,
      })
      .returning();

    return {
      staffUserId: userId,
      displayName,
      email: '',
      role,
      department: department ?? null,
      notes: null,
      createdAt: created?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Demote a staff user to regular user.
   * Removes staff realm from app_metadata.
   */
  async demoteStaffUser(userId: string): Promise<void> {
    // 1. Remove staff claims from app_metadata
    const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          realm: null,
          staff_role: null,
        },
      },
    );

    if (updateError) {
      throw new Error(`Failed to demote user: ${updateError.message}`);
    }

    // 2. Optionally remove staff_user record (keep for audit trail)
    // We keep the record but it's no longer active
  }

  /**
   * Revoke staff access by disabling the user account.
   */
  async revokeStaffAccess(userId: string): Promise<void> {
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          realm: null,
          staff_role: null,
        },
      },
    );

    if (error) {
      throw new Error(`Failed to revoke staff access: ${error.message}`);
    }

    // Note: We don't delete the user, just remove staff claims
    // The user can still exist as a regular user
  }

  /**
   * List all staff users.
   */
  async listStaffUsers(): Promise<StaffUser[]> {
    // Get all users with staff realm
    const { data: users, error } = await this.supabaseAdmin.auth.admin.listUsers();

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    // Filter to staff users only
    const staffUserIds: string[] = [];
    const staffUserMeta = new Map<string, { role: StaffRole; email: string; displayName: string; createdAt: string; lastSignIn: string | null }>();

    for (const user of users?.users ?? []) {
      const appMeta = user.app_metadata as Record<string, unknown>;
      if (appMeta?.['realm'] === 'staff' && appMeta?.['staff_role']) {
        staffUserIds.push(user.id);
        staffUserMeta.set(user.id, {
          role: appMeta['staff_role'] as StaffRole,
          email: user.email ?? '',
          displayName: (user.user_metadata as Record<string, unknown>)?.['display_name'] as string ?? user.email ?? 'Unknown',
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at ?? null,
        });
      }
    }

    if (staffUserIds.length === 0) {
      return [];
    }

    // Batch fetch staff profiles (single query instead of N+1)
    const profiles = await this.db
      .select()
      .from(staffUser)
      .where(sql`${staffUser.staffUserId} IN (${sql.join(staffUserIds.map(id => sql`${id}`), sql`,`)})`);

    const profileMap = new Map(profiles.map(p => [p.staffUserId, p]));

    // Assemble results
    const staffUsersList: StaffUser[] = [];
    for (const userId of staffUserIds) {
      const meta = staffUserMeta.get(userId)!;
      const profile = profileMap.get(userId);

      staffUsersList.push({
        staffUserId: userId,
        displayName: profile?.displayName ?? meta.displayName,
        email: meta.email,
        role: meta.role,
        department: profile?.department ?? null,
        notes: profile?.notes ?? null,
        createdAt: profile?.createdAt ?? new Date(meta.createdAt),
        updatedAt: profile?.updatedAt ?? new Date(meta.lastSignIn ?? meta.createdAt),
      });
    }

    return staffUsersList;
  }

  /**
   * Get a staff user by ID.
   */
  async getStaffUser(userId: string): Promise<StaffUser | null> {
    // Get user from Supabase Auth
    const { data: user, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !user?.user) {
      return null;
    }

    const appMeta = user.user.app_metadata as Record<string, unknown>;
    if (appMeta?.['realm'] !== 'staff' || !appMeta?.['staff_role']) {
      return null;
    }

    // Get staff profile
    const [profile] = await this.db
      .select()
      .from(staffUser)
      .where(eq(staffUser.staffUserId, userId))
      .limit(1);

    return {
      staffUserId: user.user.id,
      displayName: profile?.displayName ?? (user.user.user_metadata as Record<string, unknown>)?.['display_name'] as string ?? user.user.email ?? 'Unknown',
      email: user.user.email ?? '',
      role: appMeta['staff_role'] as StaffRole,
      department: profile?.department ?? null,
      notes: profile?.notes ?? null,
      createdAt: profile?.createdAt ?? new Date(user.user.created_at),
      updatedAt: profile?.updatedAt ?? new Date(user.user.last_sign_in_at ?? user.user.created_at),
    };
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createStaffService(
  db: Database,
  supabaseUrl: string,
  serviceRoleKey: string,
): StaffService {
  return new StaffService(db, supabaseUrl, serviceRoleKey);
}
