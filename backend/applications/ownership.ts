import type Database from 'better-sqlite3';
const CLI_CLIENT = 'walletgate-cli';
// Fresh-only schema contract; never installed during normal startup.
export const clientCapTrigger = `CREATE TRIGGER walletgate_client_cap BEFORE INSERT ON oauthClient
    WHEN NEW.referenceId IS NOT NULL AND (SELECT count(*) FROM oauthClient WHERE referenceId = NEW.referenceId) >= 20
    BEGIN SELECT RAISE(ABORT, 'ApplicationLimit'); END;`;
const normalize = (sql:string)=>sql.trim().replace(/;$/, '').replace(/\s+/g,' ');
export function assertCompatibleApplications(db:Database.Database) {
  try {
    const trigger = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'walletgate_client_cap'").get() as {sql:string}|undefined;
    if (!trigger || normalize(trigger.sql)!==normalize(clientCapTrigger)) throw new Error();
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'managementGrant'").get()) throw new Error();
    const system = db.prepare('SELECT userId,referenceId,tokenEndpointAuthMethod,applicationType FROM oauthClient WHERE clientId = ?').get(CLI_CLIENT) as {userId:string|null;referenceId:string|null;tokenEndpointAuthMethod:string;applicationType:string}|undefined;
    if (!system || system.userId!==null || system.referenceId!==null || system.tokenEndpointAuthMethod!=='none' || system.applicationType!=='native') throw new Error();
    if (db.prepare(`SELECT 1 FROM oauthClient c LEFT JOIN user u ON u.id = c.referenceId WHERE c.clientId != ? AND (c.userId IS NOT NULL OR u.id IS NULL) LIMIT 1`).get(CLI_CLIENT)) throw new Error();
  } catch { throw new Error('Incompatible application ownership storage. Select a separate fresh database and run scripts/init-database.ts --database /absolute/path/to/empty.sqlite. Existing tables/data have not been changed. No conversion or reset is performed.'); }
}
