import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 120000, // 2 minutes for container startup
    hookTimeout: 120000,
    pool: 'forks', // Isolate test files
    reporters: ['verbose'],
  },
});
