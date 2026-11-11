import Database from 'better-sqlite3';
import { initializeDatabase } from '../../backend/bootstrap/database';
import { createWalletGate } from '../../backend/wallet-auth/auth';
import type { Config } from '../../backend/infrastructure/config';

// Explicit fixture provisioning, kept outside the production startup path.
export async function createTestWalletGate(config: Config) {
  const db = new Database(config.databasePath);
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get()) initializeDatabase(db);
  return createWalletGate(config, db);
}
