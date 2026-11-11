import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export const canonicalAddress = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-f]{40}$/.test(value);
export const identityTables = ['session', 'account', 'walletAddress', 'user', 'verification', 'walletChallenge', 'qrRequest', 'qrRate'] as const;
// Tables are fixed identifiers from the installed schema, never caller input.
export function hasTable(db: Database.Database, name: string) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}
export function assertCompatibleIdentity(db: Database.Database) {
  if (!hasTable(db, 'user')) return;
  const users = db.prepare('SELECT id FROM user').all() as { id: string }[];
  for (const user of users) {
    if (!canonicalAddress(user.id) || !hasTable(db, 'walletAddress') || !hasTable(db, 'account')) throw incompatible();
    const bindings = db.prepare('SELECT address, chainId FROM walletAddress WHERE userId = ?').all(user.id) as { address: string; chainId: number }[];
    if (bindings.length !== 1 || bindings[0].address.toLowerCase() !== user.id || bindings[0].chainId !== 1) throw incompatible();
    const accounts = db.prepare('SELECT providerId, accountId FROM account WHERE userId = ?').all(user.id) as { providerId: string; accountId: string }[];
    if (accounts.length !== 1 || accounts[0].providerId !== 'siwe' || accounts[0].accountId.toLowerCase() !== `${user.id}:1`) throw incompatible();
  }
  if (hasTable(db, 'walletAddress') && db.prepare('SELECT 1 FROM walletAddress w LEFT JOIN user u ON u.id = w.userId WHERE u.id IS NULL LIMIT 1').get()) throw incompatible();
}
function incompatible() {
  return new Error('Incompatible wallet identity data. Startup has not reset or migrated it. For a local development/test database, stop the server and follow the explicit reset procedure in docs/DEVELOPMENT.md. Shared/production reset requires separate authorization.');
}

// A persisted generation plus per-connection SQLite function fences work that
// began before an explicit reset, including across processes and awaits.
export function installIdentityFence(db: Database.Database, tables: readonly string[]) {
  db.exec('CREATE TABLE IF NOT EXISTS walletgateIdentityState (id INTEGER PRIMARY KEY CHECK(id = 1), generation TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO walletgateIdentityState VALUES (1, ?)').run(randomUUID());
  const generation = (db.prepare('SELECT generation FROM walletgateIdentityState WHERE id = 1').get() as { generation: string }).generation;
  db.function('walletgate_generation', () => generation);
  for (const table of tables) {
    if (!hasTable(db, table)) continue;
    for (const action of ['INSERT', 'UPDATE', 'DELETE']) db.exec(`CREATE TRIGGER IF NOT EXISTS "walletgate_fence_${table}_${action}" BEFORE ${action} ON "${table}"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END`);
  }
  return () => (db.prepare('SELECT generation FROM walletgateIdentityState WHERE id = 1').get() as { generation: string }).generation === generation;
}

export function installIdentityConstraints(db: Database.Database) {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS walletgate_one_wallet_per_user ON walletAddress(userId);
    CREATE UNIQUE INDEX IF NOT EXISTS walletgate_one_user_per_address ON walletAddress(lower(address));
    CREATE TRIGGER IF NOT EXISTS walletgate_user_address BEFORE INSERT ON user
    WHEN length(NEW.id) != 42 OR substr(NEW.id, 1, 2) != '0x' OR substr(NEW.id, 3) GLOB '*[^0-9a-f]*'
    BEGIN SELECT RAISE(ABORT, 'User ID must be a canonical wallet address'); END;
    CREATE TRIGGER IF NOT EXISTS walletgate_wallet_binding BEFORE INSERT ON walletAddress
    WHEN lower(NEW.address) != NEW.userId OR NEW.chainId != 1
    BEGIN SELECT RAISE(ABORT, 'Wallet must match its user ID'); END;`);
}
