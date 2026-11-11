import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const databasePath = join(mkdtempSync(join(tmpdir(), 'walletgate-e2e-')), 'walletgate.sqlite');
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: `node --import tsx scripts/init-database.ts --database '${databasePath.replaceAll("'", "'\\''")}' && npx tsx backend/index.ts`, url: 'http://localhost:3100', reuseExistingServer: false,
    env: { PORT: '3100', TRUSTED_ORIGIN: 'http://localhost:3100', DATABASE_PATH: databasePath, BETTER_AUTH_SECRET: 'test-only-session-secret-do-not-use-outside-tests-0987654321' },
  },
});
