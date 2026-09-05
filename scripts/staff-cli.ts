#!/usr/bin/env node

/**
 * Staff Management CLI — DOC-029 compliant.
 *
 * Commands:
 *   pnpm staff:create   — Create a new staff user
 *   pnpm staff:promote  — Promote existing user to staff
 *   pnpm staff:demote   — Demote staff user
 *   pnpm staff:list     — List all staff users
 *
 * Environment variables required:
 *   DATABASE_URL — PostgreSQL connection string
 *   SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 */

import { Command } from 'commander';
import { StaffService } from '../packages/api/src/services/staff.service.js';
import { getDb } from '../packages/database/src/client.js';

// ── Helpers ──────────────────────────────────────────────────

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} environment variable is required`);
    process.exit(1);
  }
  return value;
}

function createService(): StaffService {
  const databaseUrl = getEnvOrThrow('DATABASE_URL');
  const supabaseUrl = getEnvOrThrow('SUPABASE_URL');
  const serviceRoleKey = getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY');

  const db = getDb(databaseUrl);
  return new StaffService(db, supabaseUrl, serviceRoleKey);
}

// ── CLI ──────────────────────────────────────────────────────

const program = new Command();

program
  .name('staff-cli')
  .description('Staff management CLI for MUSHIN')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new staff user')
  .requiredOption('-e, --email <email>', 'Staff email address')
  .requiredOption('-p, --password <password>', 'Staff password (min 8 chars)')
  .requiredOption('-n, --name <name>', 'Staff display name')
  .requiredOption('-r, --role <role>', 'Staff role (admin or support)')
  .option('-d, --department <department>', 'Department')
  .option('--notes <notes>', 'Notes about the staff member')
  .action(async (options) => {
    try {
      const service = createService();
      const staffUser = await service.createStaffUser({
        email: options.email,
        password: options.password,
        displayName: options.name,
        role: options.role as 'admin' | 'support',
        department: options.department,
        notes: options.notes,
      });

      console.log('Staff user created successfully:');
      console.log(`  ID: ${staffUser.staffUserId}`);
      console.log(`  Email: ${staffUser.email}`);
      console.log(`  Name: ${staffUser.displayName}`);
      console.log(`  Role: ${staffUser.role}`);
      console.log(`  Department: ${staffUser.department ?? 'N/A'}`);
    } catch (err) {
      console.error('Failed to create staff user:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('promote')
  .description('Promote an existing user to staff')
  .requiredOption('-u, --user-id <userId>', 'Supabase Auth user ID')
  .requiredOption('-r, --role <role>', 'Staff role (admin or support)')
  .requiredOption('-n, --name <name>', 'Staff display name')
  .option('-d, --department <department>', 'Department')
  .action(async (options) => {
    try {
      const service = createService();
      const staffUser = await service.promoteToStaff(
        options.userId,
        options.role as 'admin' | 'support',
        options.name,
        options.department,
      );

      console.log('User promoted to staff:');
      console.log(`  ID: ${staffUser.staffUserId}`);
      console.log(`  Name: ${staffUser.displayName}`);
      console.log(`  Role: ${staffUser.role}`);
    } catch (err) {
      console.error('Failed to promote user:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('demote')
  .description('Demote a staff user to regular user')
  .requiredOption('-u, --user-id <userId>', 'Supabase Auth user ID')
  .action(async (options) => {
    try {
      const service = createService();
      await service.demoteStaffUser(options.userId);
      console.log(`User ${options.userId} demoted from staff`);
    } catch (err) {
      console.error('Failed to demote user:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all staff users')
  .action(async () => {
    try {
      const service = createService();
      const staffUsers = await service.listStaffUsers();

      if (staffUsers.length === 0) {
        console.log('No staff users found');
        return;
      }

      console.log(`Found ${staffUsers.length} staff user(s):\n`);
      for (const user of staffUsers) {
        console.log(`  ${user.displayName} (${user.email})`);
        console.log(`    ID: ${user.staffUserId}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    Department: ${user.department ?? 'N/A'}`);
        console.log('');
      }
    } catch (err) {
      console.error('Failed to list staff users:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
