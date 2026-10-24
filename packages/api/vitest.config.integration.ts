import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/integration/tenant-isolation.integration.test.ts',
      'src/__tests__/brain1-brain2-e2e.integration.test.ts',
      'src/__tests__/billing.integration.test.ts',
    ],
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
