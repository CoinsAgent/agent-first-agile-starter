import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { createTestWalletGate as createWalletGate } from './database-fixture';
import { config, IdentityBrowser, type Gate } from './identity-fixture';

let gate: Gate;
beforeEach(async () => { gate = await createWalletGate(config); });
afterEach(() => gate.close());
describe('US-001-06 persisted address identity', () => {
  it('keeps one complete identity across independent Node process sign-in races', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'walletgate-identity-process-'));
    const script = `
      import { createInterface } from 'node:readline';
      import { createWalletGate } from './backend/wallet-auth/auth.ts';
      const lines = createInterface({input: process.stdin}); const iterator = lines[Symbol.asyncIterator]();
      const input = JSON.parse((await iterator.next()).value);
      const gate = await createWalletGate(input.config); console.log(JSON.stringify({ready:true}));
      await iterator.next();
      const r = await gate.handle(new Request(input.config.origin + '/api/verify', {method:'POST', headers:{origin:input.config.origin,'content-type':'application/json',cookie:input.cookie},body:JSON.stringify(input.proof)}));
      console.log(JSON.stringify({status:r.status})); gate.close(); lines.close();
    `;
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = createInterface({ input: child.stdout });
    try {
      const databasePath = join(dir, 'test.sqlite'); gate.close(); gate = await createWalletGate({ ...config, databasePath });
      const a = new IdentityBrowser(gate), b = new IdentityBrowser(gate); b.account = a.account;
      const p1 = await a.proof(), p2 = await b.proof();
      const ready = once(lines, 'line');
      child.stdin.write(JSON.stringify({ config: { ...config, databasePath }, cookie: b.cookie(), proof: p2 }) + '\n');
      expect(JSON.parse(String((await ready)[0])).ready).toBe(true);
      const remoteResult = once(lines, 'line'); child.stdin.write('go\n');
      const local = await a.call('verify', p1); const remote = JSON.parse(String((await remoteResult)[0]));
      expect([local.status, remote.status]).toContain(200);
      for (const table of ['user', 'walletAddress', 'account']) expect(gate.db.prepare(`SELECT count(*) n FROM "${table}"`).get()).toEqual({ n: 1 });
      expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id: a.account.address.toLowerCase() }]);
      expect(gate.db.pragma('foreign_key_check')).toEqual([]);
      await a.login(); await b.login();
    } finally { lines.close(); child.kill(); rmSync(dir, { recursive: true, force: true }); }
  }, 20_000);
  it('stores the actual canonical user primary key and all user references, preserving technical IDs', async () => {
    const b = new IdentityBrowser(gate); await b.login();
    const id = b.account.address.toLowerCase();
    expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id }]);
    for (const table of ['walletAddress', 'account', 'session']) {
      const row = gate.db.prepare(`SELECT id, userId FROM "${table}"`).get() as { id: string; userId: string };
      expect(row.userId).toBe(id); expect(row.id).not.toBe(id);
    }
    expect(await (await b.call('session')).json()).toMatchObject({ userId: id, address: id });
    await b.call('logout', {}); await b.login();
    expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id }]);
  });
  it('keeps account switches distinct and preserves only the verified owner applications', async () => {
    const b = new IdentityBrowser(gate); await b.login();
    expect((await b.register()).status).toBe(201); expect((await b.register()).status).toBe(201);
    const oldCookies = new Map(b.cookies); const oldAccount = b.account;
    b.account = new IdentityBrowser(gate).account; await b.login();
    expect(await (await b.call('applications')).json()).toEqual({ applications: [] });
    expect(gate.db.prepare('SELECT id FROM user ORDER BY id').all()).toEqual([oldAccount.address.toLowerCase(), b.account.address.toLowerCase()].sort().map(id => ({ id })));
    b.cookies = oldCookies; b.account = oldAccount;
    expect((await (await b.call('applications')).json()).applications).toHaveLength(2);
    expect((await b.call('auth/link-social', {})).status).toBe(404);
  });
  it('rolls back failed account creation and leaves the attempt consumed, permitting a fresh retry', async () => {
    const b = new IdentityBrowser(gate); const proof = await b.proof();
    gate.db.exec("CREATE TRIGGER fail_account BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT, 'injected account failure'); END");
    expect((await b.call('verify', proof)).ok).toBe(false);
    for (const table of ['user', 'walletAddress', 'account', 'session']) expect(gate.db.prepare(`SELECT count(*) n FROM "${table}"`).get()).toEqual({ n: 0 });
    expect(gate.db.prepare('SELECT count(*) n FROM walletChallenge').get()).toEqual({ n: 0 });
    gate.db.exec('DROP TRIGGER fail_account');
    expect((await b.call('verify', proof)).status).toBe(401);
    await b.login();
  });
  it('rolls back a failed session insertion without emitting a usable cookie or leaving a partial user', async () => {
    const b = new IdentityBrowser(gate);
    gate.db.exec("CREATE TRIGGER fail_session BEFORE INSERT ON session BEGIN SELECT RAISE(ABORT, 'injected session failure'); END");
    const response = await b.call('verify', await b.proof());
    expect(response.ok).toBe(false);
    expect(response.headers.getSetCookie().some(v => v.includes('session_token'))).toBe(false);
    for (const table of ['user', 'walletAddress', 'account', 'session']) expect(gate.db.prepare(`SELECT count(*) n FROM "${table}"`).get()).toEqual({ n: 0 });
    gate.db.exec('DROP TRIGGER fail_session'); await b.login();
  });
  it('creates no user for an invalid signer and rejects caller-provided IDs', async () => {
    const b = new IdentityBrowser(gate); const proof = await b.proof();
    proof.signature = await new IdentityBrowser(gate).account.signMessage({ message: proof.message });
    expect((await b.call('verify', proof)).status).toBe(401);
    expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 0 });
    expect((await b.call('verify', { ...await b.proof(), userId: 'chosen-by-caller' })).status).toBe(401);
    expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 0 });
  });
  it.each(['address', 'userId', 'wallet'])('rejects a session whose %s disagrees with the persisted identity', async field => {
    const b = new IdentityBrowser(gate); const other = new IdentityBrowser(gate); await b.login(); await other.login();
    if (field === 'address') gate.db.prepare('UPDATE session SET walletAddress = ? WHERE userId = ?').run(other.account.address.toLowerCase(), b.account.address.toLowerCase());
    if (field === 'userId') gate.db.prepare('UPDATE session SET userId = ? WHERE userId = ?').run(other.account.address.toLowerCase(), b.account.address.toLowerCase());
    if (field === 'wallet') gate.db.prepare('UPDATE walletAddress SET address = ? WHERE userId = ?').run(`0x${'1'.repeat(40)}`, b.account.address.toLowerCase());
    expect((await b.call('session')).status).toBe(401);
    expect((await b.call('applications')).status).toBe(401);
  });
  it('serializes independent valid attempts across connections, reuses case identity and survives restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'walletgate-identity-')); let second: Gate | undefined;
    try {
      const databasePath = join(dir, 'test.sqlite'); gate.close(); gate = await createWalletGate({ ...config, databasePath });
      second = await createWalletGate({ ...config, databasePath });
      const a = new IdentityBrowser(gate), b = new IdentityBrowser(second); b.account = a.account;
      const [p1, p2] = await Promise.all([a.proof(), b.proof(a.account.address.toLowerCase() as typeof a.account.address)]);
      expect((await Promise.all([a.call('verify', p1), b.call('verify', p2)])).map(r => r.status)).toEqual([200, 200]);
      expect(gate.db.prepare('SELECT id FROM user').all()).toEqual([{ id: a.account.address.toLowerCase() }]);
      expect(gate.db.prepare('SELECT count(*) n FROM walletAddress').get()).toEqual({ n: 1 });
      expect((gate.db.prepare('PRAGMA foreign_key_check').all())).toEqual([]);
      second.close(); second = undefined; gate.close(); gate = await createWalletGate({ ...config, databasePath }); a.gate = gate;
      expect((await a.call('session')).status).toBe(200); await a.login();
      expect(gate.db.prepare('SELECT count(*) n FROM user').get()).toEqual({ n: 1 });
    } finally { second?.close(); rmSync(dir, { recursive: true, force: true }); }
  });
});
