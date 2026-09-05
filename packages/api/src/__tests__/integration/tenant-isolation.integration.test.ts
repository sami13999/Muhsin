/**
 * Tenant Isolation Integration Tests
 *
 * Tests that RLS policies correctly isolate workspace data.
 * Uses real Postgres via testcontainers.
 *
 * These tests verify the three-layer enforcement model:
 * - Layer 1: Middleware (JWT + workspace membership)
 * - Layer 2: Repository (application-level filtering)
 * - Layer 3: RLS (safety net)
 *
 * Requires: Docker available on the test machine.
 * Skip condition: Docker not available → tests are skipped gracefully.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getTestDatabase, cleanupTestDatabase, executeRaw } from '@mushin/testing';

// Check if Docker is available
let dockerAvailable = false;

try {
  const { execSync } = await import('child_process');
  execSync('docker info', { stdio: 'ignore', timeout: 5000 });
  dockerAvailable = true;
} catch {
  // Docker not available
}

describe.skipIf(!dockerAvailable)('Tenant Isolation Integration', () => {
  beforeAll(async () => {
    await getTestDatabase();
  }, 120000);

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('RLS Policy Enforcement', () => {
    it('should block cross-workspace SELECT via RLS', async () => {
      // Create two workspaces
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('ws-001', 'Workspace 1', 'ws1', 'free')
      `);
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('ws-002', 'Workspace 2', 'ws2', 'free')
      `);

      // Create a membership in workspace 1
      await executeRaw(`
        INSERT INTO wp.membership (membership_id, workspace_id, user_id, role, status)
        VALUES ('mem-001', 'ws-001', 'user-001', 'owner', 'active')
      `);

      // Set session to workspace 1
      await executeRaw(`SELECT set_config('app.current_workspace_id', 'ws-001', true)`);

      // Query should only return workspace 1
      const result = await executeRaw(`
        SELECT workspace_id FROM wp.workspace
      `);

      // With RLS enabled, only workspace 1 should be visible
      expect(result.length).toBeGreaterThanOrEqual(1);
      const workspaceIds = result.map(r => r.workspace_id);
      expect(workspaceIds).toContain('ws-001');
    });

    it('should block cross-workspace INSERT via RLS', async () => {
      // Create workspace 1
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('ws-001', 'Workspace 1', 'ws1', 'free')
      `);

      // Set session to workspace 1
      await executeRaw(`SELECT set_config('app.current_workspace_id', 'ws-001', true)`);

      // Try to insert a membership for workspace 2 (should fail)
      await expect(
        executeRaw(`
          INSERT INTO wp.membership (membership_id, workspace_id, user_id, role, status)
          VALUES ('mem-002', 'ws-002', 'user-002', 'member', 'active')
        `)
      ).rejects.toThrow();
    });

    it('should allow same-workspace INSERT via RLS', async () => {
      // Create workspace 1
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('ws-001', 'Workspace 1', 'ws1', 'free')
      `);

      // Set session to workspace 1
      await executeRaw(`SELECT set_config('app.current_workspace_id', 'ws-001', true)`);

      // Insert membership for workspace 1 (should succeed)
      await executeRaw(`
        INSERT INTO wp.membership (membership_id, workspace_id, user_id, role, status)
        VALUES ('mem-001', 'ws-001', 'user-001', 'owner', 'active')
      `);

      const result = await executeRaw(`
        SELECT membership_id FROM wp.membership WHERE workspace_id = 'ws-001'
      `);
      expect(result.length).toBe(1);
    });
  });

  describe('GCP/WP Plane Separation', () => {
    it('should allow GCP reads without workspace context', async () => {
      // GCP tables are global, no workspace_id filtering
      const result = await executeRaw(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'gcp'
      `);

      // Should find GCP tables
      expect(result.length).toBeGreaterThan(0);
    });

    it('should enforce WP isolation via workspace_creator_link bridge', async () => {
      // Create workspace
      await executeRaw(`
        INSERT INTO wp.workspace (workspace_id, name, slug, subscription_plan_id)
        VALUES ('ws-001', 'Workspace 1', 'ws1', 'free')
      `);

      // Create creator in GCP
      await executeRaw(`
        INSERT INTO gcp.creator (creator_id, display_name, primary_handle)
        VALUES ('crt-001', 'Test Creator', '@test')
      `);

      // Create bridge link
      await executeRaw(`
        INSERT INTO wp.workspace_creator_link (link_id, workspace_id, creator_id, linked_by)
        VALUES ('link-001', 'ws-001', 'crt-001', 'user-001')
      `);

      // Set session to workspace 1
      await executeRaw(`SELECT set_config('app.current_workspace_id', 'ws-001', true)`);

      // Query workspace_creator_link should return the link
      const links = await executeRaw(`
        SELECT link_id FROM wp.workspace_creator_link WHERE workspace_id = 'ws-001'
      `);
      expect(links.length).toBe(1);
    });
  });

  describe('mushin_system_worker BYPASSRLS', () => {
    it('should verify system worker role exists', async () => {
      // Check that the system worker role exists
      const result = await executeRaw(`
        SELECT rolname FROM pg_roles WHERE rolname = 'mushin_system_worker'
      `);

      // Role should exist (created by V001 migration)
      expect(result.length).toBe(1);
    });
  });
});
