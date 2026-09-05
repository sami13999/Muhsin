import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/config',
  'packages/database',
  'packages/events',
  'packages/adapters',
  'packages/api',
  'packages/testing',
  'apps/workers',
]);
