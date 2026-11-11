import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { createWalletGate } from '../../backend/wallet-auth/auth';
import { resetLocalIdentity } from '../../backend/wallet-auth/reset';
import { identityTables } from '../../backend/wallet-auth/identity';
import { applicationDataTables, clearApplicationData } from '../../backend/applications';
import { config, IdentityBrowser, type Gate } from './identity-fixture';

let gate: Gate;
let dir: string;
let databasePath: string;
let closed: boolean;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'walletgate-reset-')); databasePath = join(dir, 'test.sqlite'); closed = false;
  gate = await createWalletGate({ ...config, databasePath });
});
afterEach(() => { if (!closed) gate.close(); rmSync(dir, { recursive: true, force: true }); });
const reset = () => resetLocalIdentity({ databasePath, environment: 'test', confirmation: 'DELETE-LOCAL-USER-DATA' }, clearApplicationData, applicationDataTables);
const command = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reset-local-data.ts', ...args], { encoding: 'utf8', timeout: 10_000 });
const args = () => ['--database', databasePath, '--environment', 'test', '--confirm', 'DELETE-LOCAL-USER-DATA'];
const snapshot = () => gate.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row => {
  const name = (row as { name: string }).name;
  return [name, gate.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()];
});

describe('US-001-06 explicit local reset', () => {
  it('deletes dependent identity/application/proof data, preserves unrelated data/config, fences old servers and restarts cleanly', async () => {
    const b = new IdentityBrowser(gate), phone = new IdentityBrowser(gate); await b.login();
    const client = await (await b.register()).json();
    const proof = await b.proof(); const qr = await (await b.call('qr/create', {})).json();
    const qrProof = await (await phone.call('qr/challenge', { id: qr.id, address: phone.account.address, chainId: 1 })).json();
    expect((await phone.call('qr/approve', { id: qr.id, message: qrProof.message, confirmation: qr.confirmation, signature: await phone.account.signMessage({ message: qrProof.message }) })).status).toBe(200);
    const source = readFileSync('backend/wallet-auth/auth.ts'); const configPath = join(dir, 'server.env'); writeFileSync(configPath, 'preserve-config');
    gate.db.exec("CREATE TABLE unrelated (value TEXT); INSERT INTO unrelated VALUES ('preserve')");
    const jwks = gate.db.prepare('SELECT * FROM jwks').all();
    expect(reset().reset).toBe(true);
    for (const table of [...identityTables, ...applicationDataTables]) expect(gate.db.prepare(`SELECT count(*) n FROM "${table}"`).get()).toEqual({ n: 0 });
    expect(gate.db.prepare('SELECT * FROM jwks').all()).toEqual(jwks);
    expect(gate.db.prepare('SELECT * FROM unrelated').all()).toEqual([{ value: 'preserve' }]);
    expect(readFileSync('backend/wallet-auth/auth.ts')).toEqual(source); expect(readFileSync(configPath, 'utf8')).toBe('preserve-config');
    expect((await b.call('session')).status).toBe(503);
    expect(() => gate.db.prepare('INSERT INTO walletChallenge VALUES (?, ?, ?)').run('stale', 'stale', Date.now() + 1000)).toThrow(/restart/);
    gate.close(); gate = await createWalletGate({ ...config, databasePath }); b.gate = gate;
    expect((await b.call('session')).status).toBe(401);
    expect((await b.call('verify', proof)).status).toBe(401);
    expect((await b.call('qr/complete', { id: qr.id })).status).toBe(410);
    await b.login();
    expect((await b.call(`applications/${client.application.clientId}`)).status).toBe(404);
    expect((await b.register()).status).toBe(201);
    expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id: b.account.address.toLowerCase() }]);
    reset(); reset();
    expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 0 });
  });
  it('refuses legacy startup without changing data, then explicitly resets legacy data instead of migrating it', async () => {
    const b = new IdentityBrowser(gate); await b.login(); await b.register();
    gate.db.pragma('foreign_keys = OFF');
    gate.db.prepare("UPDATE user SET id = 'legacy-random-id'").run();
    for (const table of ['account', 'session', 'walletAddress']) gate.db.prepare(`UPDATE "${table}" SET userId = 'legacy-random-id'`).run();
    gate.db.pragma('foreign_keys = ON');
    const before = snapshot(); gate.close(); closed = true;
    await expect(createWalletGate({ ...config, databasePath })).rejects.toThrow(/Incompatible wallet identity/);
    const inspect = new Database(databasePath, { readonly: true });
    expect(inspect.prepare('SELECT id FROM user').all()).toEqual([{ id: 'legacy-random-id' }]); inspect.close();
    // Full row/schema snapshot through the retained fixture connection proves no conversion.
    const reader = new Database(databasePath); gate = { ...gate, db: reader };
    expect(snapshot()).toEqual(before); reader.close();
    expect(command(...args()).status).toBe(0);
    gate = await createWalletGate({ ...config, databasePath }); closed = false;
    expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 0 });
    const fresh = new IdentityBrowser(gate); await fresh.login();
  });
  it('rolls back every deletion and generation change on storage failure, keeping old credentials usable', async () => {
    const b = new IdentityBrowser(gate); await b.login(); await b.register();
    gate.db.exec("CREATE TRIGGER fail_reset BEFORE DELETE ON user BEGIN SELECT RAISE(ABORT, 'injected reset failure'); END");
    const before = snapshot();
    expect(() => reset()).toThrow(/injected reset failure/);
    expect(snapshot()).toEqual(before);
    expect((await b.call('session')).status).toBe(200);
    expect((await (await b.call('applications')).json()).applications).toHaveLength(1);
  });
  it('rejects a reset while another connection holds the write lock, without partial deletion', async () => {
    const b = new IdentityBrowser(gate); await b.login();
    const before = snapshot(); gate.db.exec('BEGIN IMMEDIATE');
    try { expect(command(...args()).status).toBe(1); } finally { gate.db.exec('ROLLBACK'); }
    expect(snapshot()).toEqual(before); expect((await b.call('session')).status).toBe(200);
  });
  it('fences an in-flight challenge paused after nonce creation so it cannot restore deleted proof state', async () => {
    const b = new IdentityBrowser(gate);
    let unblock!: () => void, entered!: () => void;
    const blocked = new Promise<void>(resolve => { unblock = resolve; });
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const original = gate.auth.handler;
    gate.auth.handler = async request => {
      const response = await original(request);
      if (request.url.endsWith('/siwe/nonce')) { entered(); await blocked; }
      return response;
    };
    const pending = b.call('challenge', { address: b.account.address, chainId: 1 });
    await ready; reset(); unblock();
    expect((await pending).status).toBe(503);
    for (const table of ['walletChallenge', 'verification', 'user']) expect(gate.db.prepare(`SELECT count(*) n FROM "${table}"`).get()).toEqual({ n: 0 });
  });
  it.each([
    { name: 'no arguments', input: () => [] },
    { name: 'missing acknowledgement', input: () => args().slice(0, 4) },
    { name: 'missing environment', input: () => [...args().slice(0, 2), ...args().slice(4)] },
    { name: 'missing database', input: () => args().slice(2) },
    { name: 'relative target', input: () => ['--database', 'relative.sqlite', ...args().slice(2)] },
    { name: 'shared target', input: () => ['--database', databasePath, '--environment', 'shared', ...args().slice(4)] },
    { name: 'wrong acknowledgement', input: () => [...args().slice(0, 4), '--confirm', 'yes'] },
    { name: 'duplicate argument', input: () => [...args(), '--database', databasePath] },
    { name: 'unknown option', input: () => [...args(), '--unknown', 'x'] },
  ])('the real command refuses $name without altering the target', async ({ input }) => {
    const b = new IdentityBrowser(gate); await b.login(); const before = snapshot();
    expect(command(...input()).status).toBe(1); expect(snapshot()).toEqual(before);
  });
  it('the real command refuses production even with a single well-formed target and preserves it', async () => {
    const b = new IdentityBrowser(gate); await b.login(); const before = snapshot();
    expect(command('--database', databasePath, '--environment', 'production', '--confirm', 'DELETE-LOCAL-USER-DATA').status).toBe(1);
    expect(snapshot()).toEqual(before);
  });
  it('refuses a production runtime even when a test environment is claimed', async () => {
    const b = new IdentityBrowser(gate); await b.login(); const before = snapshot();
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reset-local-data.ts', ...args()], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, NODE_ENV: 'production' } });
    expect(result.status).toBe(1); expect(snapshot()).toEqual(before);
  });
  it('refuses an unrelated user database without adding metadata or deleting records', () => {
    const otherPath = join(dir, 'unrelated.sqlite'), other = new Database(otherPath);
    other.exec("CREATE TABLE user (id TEXT); INSERT INTO user VALUES ('unrelated')"); other.close();
    expect(command('--database', otherPath, '--environment', 'test', '--confirm', 'DELETE-LOCAL-USER-DATA').status).toBe(1);
    const inspect = new Database(otherPath);
    expect(inspect.prepare('SELECT * FROM user').all()).toEqual([{ id: 'unrelated' }]);
    expect(inspect.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([{ name: 'user' }]); inspect.close();
  });
  it('installs reset fences on legacy schemas and blocks an old connection without the generation function', async () => {
    const b = new IdentityBrowser(gate); await b.login();
    for (const row of gate.db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'walletgate_fence_%'").all() as { name: string }[]) gate.db.exec(`DROP TRIGGER "${row.name}"`);
    gate.db.exec('DROP TABLE walletgateIdentityState');
    const legacy = new Database(databasePath);
    reset();
    try { expect(() => legacy.prepare('INSERT INTO walletChallenge VALUES (?, ?, ?)').run('old', 'old', Date.now())).toThrow(/function/); }
    finally { legacy.close(); }
    expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 0 });
  });
});
