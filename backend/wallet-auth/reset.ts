import { randomUUID } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import Database from 'better-sqlite3';
import { hasTable, identityTables, installIdentityFence } from './identity';

export type LocalResetOptions = { databasePath: string; environment: string; confirmation: string };
export function resetLocalIdentity(options: LocalResetOptions, clearApplications: (db: Database.Database) => void, applicationTables: readonly string[]) {
  if (!['development', 'test'].includes(options.environment) || process.env.NODE_ENV === 'production' ||
      options.confirmation !== 'DELETE-LOCAL-USER-DATA' || !isAbsolute(options.databasePath)) {
    throw new Error('Reset requires an explicit absolute database path, development/test environment and DELETE-LOCAL-USER-DATA acknowledgement. Shared/production resets are not supported.');
  }
  if (!lstatSync(options.databasePath).isFile() || lstatSync(options.databasePath).isSymbolicLink() || realpathSync(options.databasePath) !== options.databasePath) throw new Error('Select the real path of a regular local database file.');
  const db = new Database(options.databasePath, { fileMustExist: true, timeout: 1000 });
  try {
    db.pragma('foreign_keys = ON');
    // Acquire the write lock before inspecting/deleting. No await or partial
    // commit: failures roll back deletion AND the generation change.
    db.transaction(() => {
      if (!['user', 'walletAddress', 'account', 'session', 'verification', 'walletChallenge'].every(table => hasTable(db, table))) throw new Error('Target is not an initialized WalletGate database.');
      // Install guards even on a legacy schema: older processes without the
      // generation function must fail closed instead of recreating old users.
      installIdentityFence(db, [...identityTables, ...applicationTables, 'jwks']);
      clearApplications(db);
      for (const table of identityTables) if (hasTable(db, table)) db.exec(`DELETE FROM "${table}"`);
      if ((db.pragma('foreign_key_check') as unknown[]).length) throw new Error('Reset would leave broken database references.');
      db.prepare('UPDATE walletgateIdentityState SET generation = ? WHERE id = 1').run(randomUUID());
    }).immediate();
    return { databasePath: options.databasePath, environment: options.environment, reset: true };
  } finally { db.close(); }
}
