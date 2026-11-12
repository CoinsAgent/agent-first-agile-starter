import type Database from 'better-sqlite3';

// Shared by explicit fresh setup and read-only runtime readiness; never applied at startup.
export const clientCapTrigger = `CREATE TRIGGER walletgate_client_cap BEFORE INSERT ON oauthClient
    WHEN NEW.userId IS NOT NULL AND (SELECT count(*) FROM oauthClient WHERE userId = NEW.userId) >= 20
    BEGIN SELECT RAISE(ABORT, 'ApplicationLimit'); END;`;

const normalize = (sql: string) => sql.trim().replace(/;$/, '').replace(/\s+/g, ' ');
export function assertCompatibleApplications(db: Database.Database) {
  try {
    const trigger = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'walletgate_client_cap'").get() as { sql: string } | undefined;
    if (!trigger || normalize(trigger.sql) !== normalize(clientCapTrigger)) throw new Error('Client cap schema mismatch');
    const incompatible = db.prepare(`SELECT 1 FROM oauthClient c LEFT JOIN user u ON u.id = c.userId
      WHERE c.referenceId IS NOT NULL OR u.id IS NULL LIMIT 1`).get();
    if (incompatible) throw new Error('Client owner mismatch');
  } catch {
    throw new Error('Incompatible application ownership storage. Select a separate fresh database and run scripts/init-database.ts --database /absolute/path/to/empty.sqlite, then configure DATABASE_PATH. Existing tables/data have not been changed. No conversion or reset is performed. See docs/DEVELOPMENT.md.');
  }
}
