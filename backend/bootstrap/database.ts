import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { initialSchema } from './schema';

// A fixed initial schema, not an existing-database schema diff or upgrade.
export function initializeDatabase(db: Database.Database) {
  db.transaction(() => {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get()) {
      throw new Error('Initialization requires an empty database. Existing tables/data are never changed.');
    }
    db.exec(initialSchema);
    db.prepare('INSERT INTO walletgateIdentityState (id, generation) VALUES (1, ?)').run(randomUUID());
  }).immediate();
}
