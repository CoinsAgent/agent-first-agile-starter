import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { parseSiweMessage } from 'viem/siwe';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
import { toNodeHandler } from 'better-auth/node';
import { createWalletGate, CHALLENGE_MS, SESSION_MS } from '../../backend/wallet-auth/auth';
import { readConfig } from '../../backend/infrastructure/config';

const origin = 'http://localhost:3000';
const config = { origin, secret: 'test-only-secret-for-unit-tests-01234567890123456789', databasePath: ':memory:' };
const wallet = privateKeyToAccount(generatePrivateKey());
const otherWallet = privateKeyToAccount(generatePrivateKey());
let gate: Awaited<ReturnType<typeof createWalletGate>>;
let now: number;
class Browser {
  cookies = new Map<string, string>();
  async request(path: string, body?: unknown, extra?: Record<string,string>) {
    const headers = new Headers({ origin, cookie: [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '), ...extra });
    if (body !== undefined) headers.set('content-type', 'application/json');
    const res = await gate.handle(new Request(`${origin}${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    for (const cookie of res.headers.getSetCookie()) {
      const [name, ...parts] = cookie.split(';')[0].split('=');
      if (parts.join('=')) this.cookies.set(name, parts.join('=')); else this.cookies.delete(name);
    }
    return res;
  }
  async challenge(address = wallet.address) {
    const res = await this.request('/api/challenge', { address, chainId: 1 });
    expect(res.status).toBe(200);
    return await res.json() as { message: string; address: string; expiresAt: string };
  }
  async login(account = wallet) {
    const c = await this.challenge(account.address);
    const signature = await account.signMessage({ message: c.message });
    const res = await this.request('/api/verify', { message: c.message, signature });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    return c;
  }
}
beforeEach(async () => {
  now = Date.now();
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
  gate = await createWalletGate(config);
});
afterEach(() => { gate.close(); vi.useRealTimers(); });

describe('SIWE authentication (AC-01, AC-02, AC-06, AC-10)', () => {
  it('signs a trusted message and returns only the canonical verified address and expiry', async () => {
    const browser = new Browser();
    expect((await browser.request('/api/session')).status).toBe(401);
    const c = await browser.login();
    const parsed = parseSiweMessage(c.message);
    expect(parsed).toMatchObject({ domain: 'localhost:3000', uri: origin, chainId: 1, version: '1', address: wallet.address });
    expect(parsed.expirationTime?.getTime()).toBe(now + CHALLENGE_MS);
    const response = await browser.request('/api/session');
    expect(await response.json()).toEqual({ userId: wallet.address.toLowerCase(), address: wallet.address.toLowerCase(), expiresAt: new Date(now + SESSION_MS).toISOString() });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect([...browser.cookies.keys()].some(k=>k.includes('session_token'))).toBe(true);
    const user = gate.db.prepare('SELECT emailVerified FROM user').get() as { emailVerified: number };
    expect(user.emailVerified).toBe(0);
  });
  it('canonicalizes case variants into one wallet identity and distinguishes other wallets', async () => {
    const a = new Browser(); await a.login();
    const b = new Browser();
    const c = await b.challenge(wallet.address.toLowerCase() as typeof wallet.address);
    expect(c.address).toBe(wallet.address.toLowerCase());
    expect((await b.request('/api/verify', { message: c.message, signature: await wallet.signMessage({ message: c.message }) })).status).toBe(200);
    expect(gate.db.prepare('SELECT count(*) AS n FROM walletAddress').get()).toEqual({ n: 1 });
    const d = new Browser(); await d.login(otherWallet);
    expect(await (await d.request('/api/session')).json()).toMatchObject({ address: otherWallet.address.toLowerCase() });
    expect(gate.db.prepare('SELECT count(*) AS n FROM user').get()).toEqual({ n: 2 });
  });
  it.each([
    ['domain', (s:string)=>s.replace('localhost:3000 wants', 'attacker.example wants')],
    ['URI', (s:string)=>s.replace(`URI: ${origin}`, 'URI: https://attacker.example')],
    ['chain', (s:string)=>s.replace('Chain ID: 1', 'Chain ID: 10')],
    ['address', (s:string)=>s.replace(wallet.address, otherWallet.address)],
    ['version', (s:string)=>s.replace('Version: 1', 'Version: 2')],
    ['unknown nonce', (s:string)=>s.replace(/Nonce: .+/, 'Nonce: ABCDEFGH12345678')],
    ['missing nonce', (s:string)=>s.replace(/Nonce: .+\n/, '')],
    ['future issued-at', (s:string)=>s.replace(/Issued At: .+/, `Issued At: ${new Date(now+1).toISOString()}`)],
    ['future not-before', (s:string)=>s+`\nNot Before: ${new Date(now+1).toISOString()}`],
    ['extended expiry', (s:string)=>s.replace(/Expiration Time: .+/, `Expiration Time: ${new Date(now+CHALLENGE_MS+1).toISOString()}`)],
    ['expired message', (s:string)=>s.replace(/Expiration Time: .+/, `Expiration Time: ${new Date(now).toISOString()}`)],
    ['malformed date', (s:string)=>s.replace(/Issued At: .+/, 'Issued At: invalid')],
    ['missing date', (s:string)=>s.replace(/Issued At: .+\n?/, '')],
    ['malformed message', (_s:string)=>'not a SIWE message'],
  ])('rejects a correctly signed message with altered %s', async (_name, alter) => {
    const browser = new Browser(); const c = await browser.challenge();
    const message = alter(c.message);
    const signature = await wallet.signMessage({ message });
    expect((await browser.request('/api/verify', { message, signature })).status).toBe(401);
    expect((await browser.request('/api/session')).status).toBe(401);
  });
  it('rejects a valid signature made by another account', async () => {
    const b = new Browser(); const c = await b.challenge();
    expect((await b.request('/api/verify', { message: c.message, signature: await otherWallet.signMessage({ message:c.message }) })).status).toBe(401);
  });
  it('rejects hostile origin and unsupported challenge input', async () => {
    const b = new Browser();
    expect((await b.request('/api/challenge', { address: wallet.address, chainId: 1 }, { origin: 'https://attacker.example' })).status).toBe(403);
    expect((await b.request('/api/challenge', { address: wallet.address, chainId: 10 })).status).toBe(400);
    expect((await b.request('/api/challenge', { address: 'garbage', chainId: 1 })).status).toBe(400);
    const c = await b.challenge();
    expect((await b.request('/api/verify', { message:c.message, signature: await wallet.signMessage({ message:c.message }) }, { origin: 'https://attacker.example' })).status).toBe(403);
    expect((await gate.handle(new Request('http://evil.example/api/session'))).status).toBe(403);
  });
});

describe('challenge binding, atomic consumption and boundaries (AC-03, AC-04, AC-05)', () => {
  it.each([CHALLENGE_MS-1, CHALLENGE_MS, CHALLENGE_MS+1])('validates challenge deadline at %d ms', async delta => {
    const b = new Browser(); const c = await b.challenge(); const signature = await wallet.signMessage({ message:c.message });
    vi.setSystemTime(now+delta);
    expect((await b.request('/api/verify', { message:c.message, signature })).status).toBe(delta < CHALLENGE_MS ? 200 : 401);
  });
  it('rejects a future issued-at even for an unchanged server message', async () => {
    const b = new Browser(); const c = await b.challenge(); const signature = await wallet.signMessage({ message:c.message });
    vi.setSystemTime(now-1);
    expect((await b.request('/api/verify', { message:c.message, signature })).status).toBe(401);
  });
  it('rejects cross-browser attempts without preventing the initiating browser from authenticating', async () => {
    const a = new Browser(); const b = new Browser(); const c = await a.challenge();
    const body = { message:c.message, signature:await wallet.signMessage({ message:c.message }) };
    expect((await b.request('/api/verify', body)).status).toBe(401);
    expect((await a.request('/api/verify', body)).status).toBe(200);
  });
  it('accepts at most one concurrent submission and rejects replay', async () => {
    const b = new Browser(); const c = await b.challenge();
    const body = { message:c.message, signature:await wallet.signMessage({ message:c.message }) };
    const results = await Promise.all([b.request('/api/verify', body), b.request('/api/verify', body)]);
    expect(results.map(r=>r.status).sort()).toEqual([200,401]);
    expect((await b.request('/api/verify',body)).status).toBe(401);
  });
  it('replaces prior challenges on retry and succeeds with a new challenge', async () => {
    const b = new Browser(); const old = await b.challenge(); const current = await b.challenge();
    // Both were generated at the same instant, but carry independent random nonces.
    expect(old.message).not.toBe(current.message);
    expect((await b.request('/api/verify', { message:old.message, signature:await wallet.signMessage({ message:old.message }) })).status).toBe(401);
    await b.login();
  });
  it.each([{}, { message:'x' }, { message:'x',signature:'0x00' }, { message:'x',signature:null }])('rejects malformed verification body %j', async body => {
    const b = new Browser();
    expect((await b.request('/api/verify',body)).status).toBe(401);
    expect((await b.request('/api/session')).status).toBe(401);
  });
});

describe('persisted SIWE-only sessions (AC-07, AC-08)', () => {
  it.each([SESSION_MS-1, SESSION_MS, SESSION_MS+1])('enforces absolute session deadline at %d ms without refresh', async delta => {
    const b = new Browser(); await b.login();
    vi.setSystemTime(now+30*60*1000);
    expect((await b.request('/api/session')).status).toBe(200);
    vi.setSystemTime(now+delta);
    const res=await b.request('/api/session');
    expect(res.status).toBe(delta < SESSION_MS ? 200 : 401);
    if(res.ok) expect(await res.json()).toMatchObject({ expiresAt:new Date(now+SESSION_MS).toISOString() });
  });
  it('revokes a logged-out credential while keeping another browser session valid', async () => {
    const a=new Browser(); const b=new Browser(); await a.login(); await b.login();
    const replay = new Browser(); replay.cookies=new Map(a.cookies);
    expect((await a.request('/api/logout',{})).status).toBe(200);
    expect((await a.request('/api/session')).status).toBe(401);
    expect((await replay.request('/api/session')).status).toBe(401);
    expect((await b.request('/api/session')).status).toBe(200);
    await a.login();
  });
  it('rejects forged credentials and sessions lacking SIWE provenance', async () => {
    const b=new Browser(); await b.login();
    const original=new Map(b.cookies);
    const key=[...b.cookies.keys()].find(k=>k.includes('session_token'))!;
    b.cookies.set(key,'forged');
    expect((await b.request('/api/session')).status).toBe(401);
    b.cookies=original;
    gate.db.prepare('UPDATE session SET authMethod = NULL').run();
    expect((await b.request('/api/session')).status).toBe(401);
  });
  it.each(['sign-up/email','sign-in/email','sign-in/social','sign-in/anonymous','passkey/verify-authentication','link-social','siwe/nonce','siwe/get-nonce','siwe/verify','get-session','register'])('does not expose generic auth route %s', async path => {
    expect((await new Browser().request(`/api/auth/${path}`,{})).status).toBe(404);
  });
  it('persists sessions across server restart without a browser signing again', async () => {
    const dir=mkdtempSync(join(tmpdir(),'walletgate-'));
    try {
      gate.close(); gate=await createWalletGate({...config,databasePath:join(dir,'test.sqlite')});
      const b=new Browser(); await b.login(); gate.close();
      gate=await createWalletGate({...config,databasePath:join(dir,'test.sqlite')});
      expect((await b.request('/api/session')).status).toBe(200);
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
});

describe('configuration (AC-10)', () => {
  it('requires a strong configured secret and a trusted origin', () => {
    expect(()=>readConfig({})).toThrow(/secret/i);
    expect(()=>readConfig({BETTER_AUTH_SECRET:config.secret,TRUSTED_ORIGIN:'http://lan.example'})).toThrow(/HTTPS/);
    expect(()=>readConfig({BETTER_AUTH_SECRET:config.secret,TRUSTED_ORIGIN:'https://auth.example/'})).toThrow(/origin/);
    expect(readConfig({BETTER_AUTH_SECRET:config.secret,TRUSTED_ORIGIN:'https://auth.example'}).origin).toBe('https://auth.example');
  });
});

describe('HTTP request boundaries', () => {
  it('limits streamed bodies even without Content-Length', async () => {
    const request = new Request(`${origin}/api/verify`, {
      method:'POST', headers:{origin,'content-type':'application/json'}, body:JSON.stringify({message:'x'.repeat(9000),signature:'x'}),
    });
    expect(request.headers.has('content-length')).toBe(false);
    expect((await gate.handle(request)).status).toBe(413);
  });
  it('rejects invalid JSON and mutation requests without an Origin', async () => {
    expect((await gate.handle(new Request(`${origin}/api/verify`,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'}))).status).toBe(400);
    expect((await gate.handle(new Request(`${origin}/api/challenge`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}))).status).toBe(403);
  });
  it('uses Secure HttpOnly host cookies on an HTTPS origin', async () => {
    gate.close(); gate=await createWalletGate({...config,origin:'https://walletgate.example'});
    const res=await gate.handle(new Request('https://walletgate.example/api/challenge',{method:'POST',headers:{origin:'https://walletgate.example','content-type':'application/json'},body:JSON.stringify({address:wallet.address,chainId:1})}));
    expect(res.status).toBe(200);
    const cookie=res.headers.get('set-cookie')!;
    expect(cookie).toContain('__Host-walletgate-attempt=');
    expect(cookie).toContain('Secure'); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
  });
});


describe('actual Node HTTP transport', () => {
  it('returns HTTP 413 for an oversized chunked body rather than resetting the socket', async () => {
    const server=createServer(toNodeHandler(gate.handle));
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port=(server.address() as {port:number}).port;
    try {
      const result=await new Promise<{status:number;body:string}>((resolve,reject)=>{
        const req=httpRequest({host:'127.0.0.1',port,path:'/api/verify',method:'POST',headers:{Host:'localhost:3000',Origin:origin,'Content-Type':'application/json','Transfer-Encoding':'chunked'}},res=>{
          let body='';res.on('data',chunk=>{body+=chunk;});res.on('end',()=>resolve({status:res.statusCode!,body}));
        });
        req.on('error',reject);
        req.write('{"message":"');req.write('x'.repeat(9000));req.end('","signature":"x"}');
      });
      expect(result.status).toBe(413);expect(JSON.parse(result.body)).toEqual({error:'Request too large.'});
    } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
  });
});
