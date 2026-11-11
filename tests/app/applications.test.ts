import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SESSION_MS } from '../../backend/wallet-auth/auth';
import { createTestWalletGate as createWalletGate } from './database-fixture';

const origin = 'http://localhost:3000';
const config = { origin, secret: 'test-only-applications-session-secret-01234567890123456789', databasePath: ':memory:' };
let gate: Awaited<ReturnType<typeof createWalletGate>>;
let now: number;
class Browser {
  target?: Awaited<ReturnType<typeof createWalletGate>>;
  account = privateKeyToAccount(generatePrivateKey());
  cookies = new Map<string, string>();
  async request(path: string, body?: unknown, options: { method?: string; origin?: string } = {}) {
    const headers = new Headers({ origin: options.origin ?? origin, cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') });
    if (body !== undefined) headers.set('content-type', 'application/json');
    const response = await (this.target ?? gate).handle(new Request(`${origin}${path}`, { method: options.method ?? (body === undefined ? 'GET' : 'POST'), headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    for (const value of response.headers.getSetCookie()) { const [name, ...parts] = value.split(';')[0].split('='); if (parts.join('=')) this.cookies.set(name, parts.join('=')); else this.cookies.delete(name); }
    return response;
  }
  async login() {
    const c = await (await this.request('/api/challenge', { address: this.account.address, chainId: 1 })).json();
    expect((await this.request('/api/verify', { message: c.message, signature: await this.account.signMessage({ message: c.message }) })).status).toBe(200);
  }
  create(extra: Record<string, unknown> = {}) { return this.request('/api/applications', { name: 'My application', redirectUris: ['https://app.example/callback?source=wallet'], requestId: randomUUID(), ...extra }); }
}
const count = () => (gate.db.prepare('SELECT count(*) AS n FROM oauthClient').get() as { n: number }).n;
beforeEach(async () => { now = Date.now(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); gate = await createWalletGate(config); });
afterEach(() => { gate.close(); vi.useRealTimers(); });

describe('US-002 registration and owner boundaries', () => {
  it('registers independent clients through the real provider and stores hashes only', async () => {
    const owner = new Browser(); await owner.login();
    const first = await owner.create({ name: '  <script>Untrusted name</script>  ' });
    expect(first.status).toBe(201);
    const a = await first.json();
    const b = await (await owner.create()).json();
    expect(a.application.clientId !== b.application.clientId).toBe(true);
    expect(a.clientSecret !== b.clientSecret && a.clientSecret.length >= 32).toBe(true);
    expect(a.application.clientId !== owner.account.address.toLowerCase()).toBe(true);
    expect(a.application.name).toBe('<script>Untrusted name</script>');
    const rows = gate.db.prepare('SELECT * FROM oauthClient').all() as Record<string, unknown>[];
    expect(rows.every(row => row.referenceId === owner.account.address.toLowerCase())).toBe(true);
    expect(rows[0].clientSecret === a.clientSecret).toBe(false);
    expect(rows[0].clientSecret === createHash('sha256').update(a.clientSecret).digest('base64url')).toBe(true);
    expect(rows[0].grantTypes).toBe('["authorization_code"]');
    expect(rows[0].scopes).toBe('["openid"]');
    expect(rows[0].tokenEndpointAuthMethod).toBe('client_secret_basic');
    expect(rows[0].requirePKCE === null || rows[0].requirePKCE === 1).toBe(true);
    const list = await owner.request('/api/applications');
    const text = await list.text();
    expect(text.includes(a.clientSecret) || text.includes(String(rows[0].clientSecret))).toBe(false);
    expect(JSON.parse(text).applications).toHaveLength(2);
    expect(first.headers.get('cache-control')).toBe('no-store');
    await owner.request('/api/logout', {}); await owner.login();
    expect((await (await owner.request('/api/applications')).json()).applications).toHaveLength(2);
  });
  it('isolates owners for list and guessed client reads', async () => {
    const a = new Browser(); await a.login(); const created = await (await a.create()).json();
    const b = new Browser(); await b.login();
    expect((await (await b.request('/api/applications')).json()).applications).toEqual([]);
    expect((await b.request(`/api/applications/${created.application.clientId}`)).status).toBe(404);
    expect((await a.request(`/api/applications/${created.application.clientId}`)).status).toBe(200);
    const unauth = new Browser(); expect((await unauth.create()).status).toBe(401); expect((await unauth.request('/api/applications')).status).toBe(401);
  });
  it('rejects expired/unproven sessions, ownership overrides and cross-origin creation', async () => {
    const owner = new Browser(); await owner.login();
    expect((await owner.create({ owner: '0x' + '1'.repeat(40) })).status).toBe(400);
    expect((await owner.request('/api/applications', {}, { origin: 'https://evil.example' })).status).toBe(403);
    gate.db.prepare("UPDATE session SET authMethod = 'password'").run();
    expect((await owner.create()).status).toBe(401);
    gate.db.prepare("UPDATE session SET authMethod = 'siwe'").run();
    vi.setSystemTime(now + SESSION_MS - 1); expect((await owner.request('/api/applications')).status).toBe(200);
    vi.setSystemTime(now + SESSION_MS); expect((await owner.create()).status).toBe(401);
    expect(count()).toBe(0);
  });
  it.each(['scope', 'grant_types', 'token_endpoint_auth_method', 'application_type', 'refresh_token'])('rejects profile override %s', async field => {
    const owner = new Browser(); await owner.login(); expect((await owner.create({ [field]: 'unsupported' })).status).toBe(400); expect(count()).toBe(0);
  });
  it('keeps generic provider, mutation and protocol endpoints unavailable', async () => {
    const owner = new Browser(); await owner.login();
    for (const path of ['/api/auth/oauth2/create-client', '/api/auth/oauth2/register', '/api/auth/oauth2/rotate-client-secret', '/api/auth/oauth2/update-client', '/api/auth/oauth2/delete-client', '/api/auth/oauth2/token', '/api/auth/oauth2/authorize', '/api/auth/jwks', '/.well-known/openid-configuration']) {
      expect((await owner.request(path, {})).status).toBe(404);
      expect((await owner.request(path)).status).toBe(404);
    }
    expect((await owner.request('/api/applications/guessed', {}, { method: 'DELETE' })).status).toBe(404);
  });
});

describe('US-002 validation, limits and atomic submissions', () => {
  it.each(['', '   ', 'a'.repeat(101)])('rejects invalid name boundary', async name => { const b = new Browser(); await b.login(); expect((await b.create({ name })).status).toBe(400); expect(count()).toBe(0); });
  it('accepts 1 and 100 Unicode characters and duplicate display names', async () => {
    const b = new Browser(); await b.login();
    expect((await b.create({ name: 'a' })).status).toBe(201);
    expect((await b.create({ name: '😀'.repeat(100) })).status).toBe(201);
    expect((await b.create({ name: 'a' })).status).toBe(201);
  });
  it.each([
    [], Array.from({ length: 11 }, (_, i) => `https://app.example/${i}`),
    ['https://app.example/cb', 'https://app.example/cb'], ['http://app.example/cb'], ['http://localhost:4000/cb'], ['http://127.0.0.1:4001/cb'], ['http://[::1]:4002/cb'], ['https://localhost/cb'], ['https://127.0.0.1/cb'], ['https://[::1]/cb'], ['https://app.localhost/cb'], ['https://localhost./cb'], ['https://127.1/cb'],
    ['http://localhost.evil.example/cb'], ['http://127.1/cb'], ['http://2130706433/cb'],
    ['https://*.example/cb'], ['https://app.example/*'], ['https://app.example/#fragment'],
    ['https://app.example/#'], ['https://user:pass@app.example/cb'], ['javascript:alert(1)'],
    ['https://app.example\\evil/cb'], [' https://app.example/cb'], ['https://'],
  ])('rejects invalid redirects', async redirectUris => { const b = new Browser(); await b.login(); expect((await b.create({ redirectUris })).status).toBe(400); expect(count()).toBe(0); });
  it('accepts ten HTTPS non-loopback redirects, preserving query, port and path', async () => {
    const b = new Browser(); await b.login();
    const redirectUris = Array.from({ length: 10 }, (_, i) => `https://app.example:${4400 + i}/CB?x=${i}`);
    const response = await b.create({ redirectUris }); expect(response.status).toBe(201);
    expect((await response.json()).application.redirectUris).toEqual(redirectUris);
  });
  it('counts invalid attempts, isolates wallets, and resets exactly at the fixed-window boundary', async () => {
    const b = new Browser(); await b.login();
    for (let i = 0; i < 5; i++) expect((await b.create({ name: '' })).status).toBe(400);
    const limited = await b.create(); expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
    vi.setSystemTime(now + 59_999); expect((await b.create()).status).toBe(429);
    const other = new Browser(); await other.login(); expect((await other.create()).status).toBe(201);
    vi.setSystemTime(now + 60_000); expect((await b.create()).status).toBe(201);
  });
  it('retries concurrently without duplicate clients or repeat secret disclosure', async () => {
    const b = new Browser(); await b.login(); const requestId = randomUUID();
    const results = await Promise.all([b.create({ requestId }), b.create({ requestId }), b.create({ requestId })]);
    expect(results.map(r => r.status).sort()).toEqual([200, 200, 201]);
    const values = await Promise.all(results.map(r => r.json()));
    expect(values.filter(v => typeof v.clientSecret === 'string')).toHaveLength(1);
    expect(new Set(values.map(v => v.application.clientId)).size).toBe(1); expect(count()).toBe(1);
    expect((await b.create({ requestId, name: 'Changed' })).status).toBe(409);
    const list = await (await b.request('/api/applications')).json();
    expect(list.applications[0].requestId).toBe(requestId);
    expect('clientSecret' in list.applications[0]).toBe(false);
  });
  it('rolls back provider creation if submission persistence fails, then permits retry', async () => {
    const b = new Browser(); await b.login(); const requestId = randomUUID();
    gate.db.exec("CREATE TRIGGER fail_submission BEFORE INSERT ON applicationSubmission BEGIN SELECT RAISE(ABORT, 'SimulatedFailure'); END");
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await b.create({ requestId })).status).toBe(500);
    expect(count()).toBe(0); expect(gate.db.prepare('SELECT count(*) AS n FROM applicationSubmission').get()).toEqual({ n: 0 });
    gate.db.exec('DROP TRIGGER fail_submission');
    expect((await b.create({ requestId })).status).toBe(201); expect(count()).toBe(1); spy.mockRestore();
  });
  it('enforces the twentieth-client boundary under concurrent distinct submissions', async () => {
    const b = new Browser(); await b.login();
    for (let i = 0; i < 19; i++) { vi.setSystemTime(now + Math.floor(i / 5) * 60_000); expect((await b.create()).status).toBe(201); }
    vi.setSystemTime(now + 4 * 60_000);
    const results = await Promise.all([b.create(), b.create()]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]); expect(count()).toBe(20);
    expect((await b.create()).status).toBe(409);
  });
  it('persists configuration and retry claims across a server restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'walletgate-applications-'));
    try {
      gate.close(); gate = await createWalletGate({ ...config, databasePath: join(dir, 'test.sqlite') });
      const b = new Browser(); await b.login(); const requestId = randomUUID();
      expect((await b.create({ requestId })).status).toBe(201);
      gate.close(); gate = await createWalletGate({ ...config, databasePath: join(dir, 'test.sqlite') });
      const replay = await b.create({ requestId }); expect(replay.status).toBe(200);
      const body = await replay.json(); expect(body.replayed).toBe(true); expect('clientSecret' in body).toBe(false);
      expect((await (await b.request('/api/applications')).json()).applications).toHaveLength(1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('preserves concurrent QR creation when registration rolls back', async () => {
    const b = new Browser(); await b.login();
    gate.db.exec("CREATE TRIGGER fail_submission BEFORE INSERT ON applicationSubmission BEGIN SELECT RAISE(ABORT, 'SimulatedFailure'); END");
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let finish: () => void = () => {};
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      finish = () => { controller.enqueue(new TextEncoder().encode(JSON.stringify({ name: 'Rollback case', redirectUris: ['https://app.example/cb'], requestId: randomUUID() }))); controller.close(); };
    } });
    const pendingCreate = gate.handle(new Request(`${origin}/api/applications`, { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...b.cookies].map(([k, v]) => `${k}=${v}`).join('; ') }, body, duplex: 'half' } as RequestInit));
    let qrFinished = false;
    const qr = b.request('/api/qr/create', {}).then(response => { qrFinished = true; return response; });
    await new Promise(resolve => setTimeout(resolve, 20)); expect(qrFinished).toBe(true);
    finish(); expect((await pendingCreate).status).toBe(500); expect((await qr).status).toBe(200);
    expect(gate.db.prepare('SELECT count(*) AS n FROM qrRequest').get()).toEqual({ n: 1 }); expect(count()).toBe(0);
    spy.mockRestore();
  });
  it('coordinates independent connections for replay, rate and cap boundaries', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'walletgate-concurrent-'));
    let second: Awaited<ReturnType<typeof createWalletGate>> | undefined;
    try {
      gate.close(); const databasePath = join(dir, 'test.sqlite'); gate = await createWalletGate({ ...config, databasePath });
      second = await createWalletGate({ ...config, databasePath });
      const a = new Browser(); await a.login(); const b = new Browser(); b.target = second; b.account = a.account; b.cookies = new Map(a.cookies);
      const requestId = randomUUID();
      const concurrent = await Promise.all([a.create({ requestId }), b.create({ requestId })]);
      expect(concurrent.map(r => r.status).sort()).toEqual([200, 201]); expect(count()).toBe(1);
      const values = await Promise.all(concurrent.map(r => r.json())); expect(values.filter(v => typeof v.clientSecret === 'string')).toHaveLength(1);
      for (let i = 1; i < 19; i++) { vi.setSystemTime(now + i * 60_000); expect((await a.create()).status).toBe(201); }
      vi.setSystemTime(now + 20 * 60_000);
      expect((await Promise.all([a.create(), b.create()])).map(r => r.status).sort()).toEqual([201, 409]); expect(count()).toBe(20);
      vi.setSystemTime(now + 21 * 60_000);
      const attempts = await Promise.all(Array.from({ length: 6 }, (_, i) => (i % 2 ? a : b).create({ name: '' })));
      expect(attempts.filter(r => r.status === 400)).toHaveLength(5); expect(attempts.filter(r => r.status === 429)).toHaveLength(1);
      second.close(); second = undefined; gate.close(); gate = await createWalletGate({ ...config, databasePath });
      vi.setSystemTime(now + 22 * 60_000); expect((await a.create()).status).toBe(409); expect(count()).toBe(20);
    } finally { second?.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('reconciles a same-submission race across independent Node processes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'walletgate-process-race-'));
    const script = `
      import { createInterface } from 'node:readline';
      import { createWalletGate } from './backend/wallet-auth/auth.ts';
      const lines = createInterface({ input: process.stdin });
      const iterator = lines[Symbol.asyncIterator]();
      const input = JSON.parse((await iterator.next()).value);
      const gate = await createWalletGate(input.config);
      console.log(JSON.stringify({ ready: true }));
      await iterator.next();
      const response = await gate.handle(new Request(input.config.origin + '/api/applications', { method: 'POST', headers: { origin: input.config.origin, 'content-type': 'application/json', cookie: input.cookie }, body: JSON.stringify(input.body) }));
      const result = await response.json();
      console.log(JSON.stringify({ status: response.status, secret: typeof result.clientSecret === 'string' }));
      gate.close(); lines.close();
    `;
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = createInterface({ input: child.stdout });
    try {
      gate.close(); const databasePath = join(dir, 'test.sqlite'); gate = await createWalletGate({ ...config, databasePath });
      const b = new Browser(); await b.login(); const requestId = randomUUID();
      child.stdin.write(JSON.stringify({ config: { ...config, databasePath }, cookie: [...b.cookies].map(([k, v]) => `${k}=${v}`).join('; '), body: { name: 'My application', redirectUris: ['https://app.example/callback?source=wallet'], requestId } }) + '\n');
      expect(JSON.parse(String((await once(lines, 'line'))[0])).ready).toBe(true);
      const resultLine = once(lines, 'line'); child.stdin.write('go\n');
      const parent = await b.create({ requestId }); const parentBody = await parent.json();
      const remote = JSON.parse(String((await resultLine)[0]));
      expect([parent.status, remote.status].sort()).toEqual([200, 201]);
      expect(Number(typeof parentBody.clientSecret === 'string') + Number(remote.secret)).toBe(1);
      expect(count()).toBe(1);
    } finally { lines.close(); child.kill(); rmSync(dir, { recursive: true, force: true }); }
  }, 20_000);

});
