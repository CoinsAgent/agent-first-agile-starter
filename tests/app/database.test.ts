import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../../backend/bootstrap/database';
import { createWalletGate } from '../../backend/wallet-auth/auth';
import { config, IdentityBrowser } from './identity-fixture';

let dir: string, databasePath: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'walletgate-init-')); databasePath = join(dir, 'test.sqlite'); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const command = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/init-database.ts', ...args], { encoding: 'utf8', timeout: 10_000 });
const schema = (db: Database.Database) => db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name").all();

describe('US-001-06 explicit initial schema setup', () => {
  it('requires setup before missing/empty database startup and creates no tables or file implicitly', async () => {
    await expect(createWalletGate({ ...config, databasePath })).rejects.toThrow(/init-database/);
    expect(() => statSync(databasePath)).toThrow();
    const empty = new Database(databasePath); empty.close();
    await expect(createWalletGate({ ...config, databasePath })).rejects.toThrow(/not initialized/);
    const inspect = new Database(databasePath);
    expect(schema(inspect)).toEqual([]); inspect.close();
  });
  it('the real command initializes once, then normal sign-in and restart never change schema or lose users/apps', async () => {
    const result = command('--database', databasePath);
    expect(result.status, result.stderr).toBe(0);
    expect(statSync(databasePath).mode & 0o777).toBe(0o600);
    const inspect = new Database(databasePath); const before = schema(inspect); inspect.close();
    let gate = await createWalletGate({ ...config, databasePath });
    try {
      expect(schema(gate.db)).toEqual(before);
      const b = new IdentityBrowser(gate); await b.login(); expect((await b.register()).status).toBe(201);
      const id = b.account.address.toLowerCase();
      expect(schema(gate.db)).toEqual(before);
      const repeat = command('--database', databasePath);
      expect(repeat.status).toBe(1);
      expect(schema(gate.db)).toEqual(before);
      expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id }]);
      gate.close(); gate = await createWalletGate({ ...config, databasePath }); b.gate = gate;
      expect((await b.call('session')).status).toBe(200);
      expect((await (await b.call('applications')).json()).applications).toHaveLength(1);
      expect(schema(gate.db)).toEqual(before);
      expect(gate.db.pragma('foreign_key_check')).toEqual([]);
    } finally { gate.close(); }
  });
  it.each(['existing', 'sqliteXfixture'])('refuses a partial or unrelated table %s without altering its rows/schema', async table => {
    const db = new Database(databasePath);
    db.exec(`CREATE TABLE "${table}" (id TEXT); INSERT INTO "${table}" VALUES ('preserve')`);
    const before = schema(db);
    expect(() => initializeDatabase(db)).toThrow(/empty database/);
    expect(command('--database', databasePath).status).toBe(1);
    await expect(createWalletGate({ ...config, databasePath })).rejects.toThrow(/not initialized/);
    expect(schema(db)).toEqual(before);
    expect(db.prepare(`SELECT * FROM "${table}"`).all()).toEqual([{ id: 'preserve' }]); db.close();
  });
  it('rolls back partial schema creation if initialization fails', () => {
    const db = new Database(databasePath), execute = db.exec.bind(db);
    db.exec = () => { execute('CREATE TABLE partial_fixture (id TEXT)'); throw new Error('Injected schema creation failure'); };
    expect(() => initializeDatabase(db)).toThrow(/Injected schema creation failure/);
    expect(schema(db)).toEqual([]); db.close();
  });
  it.each([[], ['--database', 'relative.sqlite'], ['--unknown', '/tmp/not-used'], ['--database', '/tmp/not-used', '--extra', 'x']].map(args => ({ args })))('refuses invalid command arguments: $args', ({ args }) => {
    expect(command(...args).status).toBe(1);
    expect(() => statSync(databasePath)).toThrow();
  });
});

describe('US-001-07 fresh-only native client ownership readiness', () => {
  const snapshot = (db: Database.Database) => ({ schema: schema(db), data: (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[])
    .map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]) });
  it.each(['old empty guard', 'old guard and legacy identity', 'missing guard', 'reference owner', 'mixed owner', 'unowned client', 'missing user'])('refuses %s without changing any schema or rows', async kind => {
    const init = new Database(databasePath); initializeDatabase(init); init.close();
    const gate = await createWalletGate({ ...config, databasePath });
    try {
      if (kind.includes('guard')) {
        if (kind === 'old guard and legacy identity') {
          const b = new IdentityBrowser(gate); await b.login(); expect((await b.register()).status).toBe(201);
          gate.db.pragma('foreign_keys = OFF'); gate.db.exec("UPDATE user SET id = 'legacy-user-id'");
        }
        gate.db.exec('DROP TRIGGER walletgate_client_cap');
        if (kind.startsWith('old')) gate.db.exec(`CREATE TRIGGER walletgate_client_cap BEFORE INSERT ON oauthClient
          WHEN NEW.referenceId IS NOT NULL AND (SELECT count(*) FROM oauthClient WHERE referenceId = NEW.referenceId) >= 20
          BEGIN SELECT RAISE(ABORT, 'ApplicationLimit'); END`);
      } else {
        const b = new IdentityBrowser(gate); await b.login(); expect((await b.register()).status).toBe(201);
        if (kind === 'reference owner') gate.db.exec('UPDATE oauthClient SET referenceId = userId, userId = NULL');
        if (kind === 'mixed owner') gate.db.exec('UPDATE oauthClient SET referenceId = userId');
        if (kind === 'unowned client') gate.db.exec('UPDATE oauthClient SET userId = NULL');
        if (kind === 'missing user') {
          gate.db.pragma('foreign_keys = OFF'); gate.db.exec("UPDATE oauthClient SET userId = '0x1111111111111111111111111111111111111111'");
        }
      }
      const before = snapshot(gate.db); gate.close();
      await expect(createWalletGate({ ...config, databasePath })).rejects.toThrow(/Incompatible application ownership.*fresh.*init-database/);
      const inspect = new Database(databasePath, { readonly: true });
      try { expect(snapshot(inspect)).toEqual(before); } finally { inspect.close(); }
      expect(command('--database', databasePath).status).toBe(1);
    } finally { if (gate.db.open) gate.close(); }
  });
});
