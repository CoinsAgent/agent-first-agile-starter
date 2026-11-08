import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx tsx backend/src/index.ts', url: 'http://localhost:3100', reuseExistingServer: false,
    env: { PORT: '3100', TRUSTED_ORIGIN: 'http://localhost:3100', DATABASE_PATH: ':memory:', BETTER_AUTH_SECRET: 'test-only-session-secret-do-not-use-outside-tests-0987654321' },
  },
});
