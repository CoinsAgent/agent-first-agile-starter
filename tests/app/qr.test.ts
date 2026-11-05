import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { parseSiweMessage } from 'viem/siwe';
import { createWalletGate, SESSION_MS } from '../../server/auth';
import { QR_MS } from '../../server/qr';
const origin = 'http://localhost:3000';
const wallet = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
let gate: Awaited<ReturnType<typeof createWalletGate>>;
let now: number;
class Browser {
  cookies = new Map<string, string>();
  async call(action: string, body: unknown = {}, extra: Record<string,string> = {}) {
    const response = await gate.handle(new Request(`${origin}/api/${action}`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json', cookie: [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '), ...extra }, body: JSON.stringify(body) }));
    for (const cookie of response.headers.getSetCookie()) { const [k,...v]=cookie.split(';')[0].split('='); this.cookies.set(k,v.join('=')); }
    return response;
  }
  async session() { return gate.handle(new Request(`${origin}/api/session`, { headers: { cookie: [...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ') } })); }
  async create() {
    const r = await this.call('qr/create'); expect(r.status).toBe(200);
    return await r.json() as { id: string; confirmation: string; approvalUrl: string; expiresAt: string };
  }
  async challenge(id: string) {
    const r=await this.call('qr/challenge',{id,address:wallet.address,chainId:1}); expect(r.status).toBe(200);
    return await r.json() as { message: string; confirmation: string; expiresAt: string };
  }
  async approval(id: string) {
    const c=await this.challenge(id);
    const proof={id,message:c.message,confirmation:c.confirmation,signature:await wallet.signMessage({message:c.message})};
    return proof;
  }
}
beforeEach(async()=>{now=Date.now();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);gate=await createWalletGate({origin,secret:'qr-test-only-secret-at-least-thirty-two-characters',databasePath:':memory:'});});
afterEach(()=>{gate.close();vi.useRealTimers();});
describe('custom QR authentication — separate phone approval and desktop redemption',()=>{
  it('authenticates only the originating desktop through Better Auth with canonical identity and SIWE provenance',async()=>{
    const desktop=new Browser(),phone=new Browser(),stranger=new Browser();const q=await desktop.create();
    expect(q.approvalUrl).toBe(`${origin}/#approve=${q.id}`);
    expect(q.expiresAt).toBe(new Date(now+QR_MS).toISOString());
    expect([...desktop.cookies.keys()]).toEqual(['walletgate-qr-owner']);
    const inspect=await phone.call('qr/inspect',{id:q.id});expect(inspect.status).toBe(200);
    expect(await inspect.json()).toMatchObject({confirmation:q.confirmation,state:'pending',origin});
    expect(inspect.headers.getSetCookie()).toEqual([]);
    const proof=await phone.approval(q.id);
    const parsed=parseSiweMessage(proof.message);
    expect(parsed).toMatchObject({requestId:q.id,chainId:1,uri:origin,domain:'localhost:3000',address:wallet.address});
    expect(parsed.statement).toContain(q.confirmation);
    expect((await stranger.call('qr/approve',proof)).status).toBe(410);
    const approved=await phone.call('qr/approve',proof);expect(approved.status).toBe(200);expect(approved.headers.getSetCookie()).toEqual([]);
    expect((await phone.session()).status).toBe(401);expect(gate.db.prepare('SELECT count(*) n FROM session').get()).toEqual({n:0});
    expect((await phone.call('qr/complete',{id:q.id})).status).toBe(410);
    expect((await stranger.call('qr/complete',{id:q.id})).status).toBe(410);
    expect((await desktop.call('qr/complete',{id:q.id})).status).toBe(200);
    expect(await (await desktop.session()).json()).toEqual({address:wallet.address.toLowerCase(),expiresAt:new Date(now+SESSION_MS).toISOString()});
    expect(gate.db.prepare('SELECT authMethod, walletAddress FROM session').get()).toEqual({authMethod:'siwe',walletAddress:wallet.address.toLowerCase()});
    expect((await phone.session()).status).toBe(401);
    expect((await desktop.call('qr/complete',{id:q.id})).status).toBe(410);
    expect(gate.db.prepare('SELECT count(*) n FROM walletChallenge').get()).toEqual({n:0});
    expect((await desktop.call('logout')).status).toBe(200);expect((await desktop.session()).status).toBe(401);
  });
  it('rejects completion before approval and keeps the request usable',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create();expect((await d.call('qr/complete',{id:q.id})).status).toBe(410);
    expect((await p.call('qr/approve',await p.approval(q.id))).status).toBe(200);
    expect((await d.call('qr/complete',{id:q.id})).status).toBe(200);
  });
  it.each([QR_MS-1,QR_MS,QR_MS+1])('enforces approval deadline at %d ms',async delta=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);vi.setSystemTime(now+delta);
    expect((await p.call('qr/approve',proof)).status).toBe(delta<QR_MS?200:410);
    expect((await d.session()).status).toBe(401);
  });
  it.each([QR_MS-1,QR_MS,QR_MS+1])('enforces completion deadline at %d ms',async delta=>{
    const d=new Browser(),p=new Browser(),q=await d.create();await p.call('qr/approve',await p.approval(q.id));vi.setSystemTime(now+delta);
    expect((await d.call('qr/complete',{id:q.id})).status).toBe(delta<QR_MS?200:410);
    expect(gate.db.prepare('SELECT count(*) n FROM session').get()).toEqual({n:delta<QR_MS?1:0});
  });
  it('caps a late phone challenge at the original QR deadline',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create();vi.setSystemTime(now+QR_MS-1000);const c=await p.challenge(q.id);
    expect(c.expiresAt).toBe(q.expiresAt);expect(parseSiweMessage(c.message).expirationTime?.toISOString()).toBe(q.expiresAt);
  });
  it.each(['message','confirmation','signature'])('rejects substituted %s without creating a session',async field=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);
    if(field==='message') {proof.message=proof.message.replace('Chain ID: 1','Chain ID: 10');proof.signature=await wallet.signMessage({message:proof.message});}
    if(field==='confirmation') proof.confirmation='WRONG';
    if(field==='signature') proof.signature=await other.signMessage({message:proof.message});
    expect((await p.call('qr/approve',proof)).ok).toBe(false);expect((await d.session()).status).toBe(401);
  });
  it('rejects cross-request proof substitution, old phone capabilities and local-verification misuse',async()=>{
    const d=new Browser(),p=new Browser(),otherDesktop=new Browser(),q=await d.create(),proof=await p.approval(q.id);
    const attacker=new Browser();attacker.cookies=new Map(p.cookies);
    const next=await p.approval(q.id);
    expect((await attacker.call('qr/approve',proof)).status).toBe(410);
    const q2=await otherDesktop.create();expect((await p.call('qr/approve',{...next,id:q2.id})).status).toBe(410);
    expect((await p.call('verify',{message:next.message,signature:next.signature})).status).toBe(401);
    expect((await p.call('qr/approve',next)).status).toBe(200);
    expect((await d.call('qr/complete',{id:q.id})).status).toBe(200);
  });
  it('does not allow a scan/reference alone to cancel or redeem the desktop attempt',async()=>{
    const d=new Browser(),stranger=new Browser(),q=await d.create();
    for(const action of ['cancel','reject','complete','status']) expect((await stranger.call(`qr/${action}`,{id:q.id})).status).toBe(410);
    expect((await stranger.call('qr/inspect',{id:q.id})).status).toBe(200);
    expect((await d.call('qr/status',{id:q.id})).status).toBe(200);
  });
  it('cancellation or replacement invalidates existing phone proof',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);
    expect((await d.call('qr/cancel',{id:q.id})).status).toBe(200);expect((await p.call('qr/approve',proof)).status).toBe(410);
    const old=await d.create(),oldProof=await p.approval(old.id);await d.create();
    expect((await p.call('qr/approve',oldProof)).status).toBe(410);expect((await d.session()).status).toBe(401);
  });
  it('phone rejection invalidates the request',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);
    expect((await p.call('qr/reject',{id:q.id})).status).toBe(200);expect((await p.call('qr/approve',proof)).status).toBe(410);
    expect((await d.call('qr/complete',{id:q.id})).status).toBe(410);
  });
  it('atomic approval rejects duplicates and cancellation wins against an in-flight signature',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);
    const results=await Promise.all([p.call('qr/approve',proof),p.call('qr/approve',proof)]);
    expect(results.map(r=>r.status).sort()).toEqual([200,410]);
    const q2=await d.create(),proof2=await p.approval(q2.id);
    const approving=p.call('qr/approve',proof2);await d.call('qr/cancel',{id:q2.id});
    expect((await approving).status).toBe(410);expect((await d.session()).status).toBe(401);
  });
  it('creates at most one session for concurrent completions',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create();await p.call('qr/approve',await p.approval(q.id));
    const results=await Promise.all([d.call('qr/complete',{id:q.id}),d.call('qr/complete',{id:q.id})]);
    expect(results.map(r=>r.status).sort()).toEqual([200,410]);expect(gate.db.prepare('SELECT count(*) n FROM session').get()).toEqual({n:1});
  });
  it('requires same-origin JSON, limits creation abuse and rejects malformed or unsupported requests',async()=>{
    const d=new Browser();expect((await d.call('qr/create',{}, {origin:'https://evil.example'})).status).toBe(403);
    expect((await d.call('qr/inspect',{id:'bad'})).status).toBe(400);
    const q=await d.create();expect((await d.call('qr/challenge',{id:q.id,address:wallet.address,chainId:10})).status).toBe(400);
    for(let i=0;i<9;i++) expect((await d.call('qr/create')).status).toBe(200);
    expect((await d.call('qr/create')).status).toBe(429);
  });
  it('uses secure HttpOnly scoped capabilities on HTTPS and leaves secrets out of presentation',async()=>{
    gate.close();gate=await createWalletGate({origin:'https://auth.example',secret:'qr-test-only-secret-at-least-thirty-two-characters',databasePath:':memory:'});
    const r=await gate.handle(new Request('https://auth.example/api/qr/create',{method:'POST',headers:{origin:'https://auth.example','content-type':'application/json'},body:'{}'}));
    const body=await r.json();const c=r.headers.get('set-cookie')!;
    expect(c).toContain('__Host-walletgate-qr-owner=');expect(c).toContain('HttpOnly');expect(c).toContain('SameSite=Strict');expect(c).toContain('Secure');
    expect(Object.keys(body).sort()).toEqual(['approvalUrl','confirmation','expiresAt','id','origin','state']);
    expect(body.approvalUrl).not.toContain(c.split('=')[1].split(';')[0]);
  });
});

describe('QR race and issued-at regression boundaries',()=>{
  it('cancellation and redemption have only one winner and never mint duplicate sessions',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create();await p.call('qr/approve',await p.approval(q.id));
    const results=await Promise.all([d.call('qr/complete',{id:q.id}),d.call('qr/cancel',{id:q.id})]);
    expect(results.map(r=>r.status).sort()).toEqual([200,410]);
    const sessions=gate.db.prepare('SELECT count(*) n FROM session').get() as {n:number};
    expect(sessions.n).toBe(results[0].ok?1:0);
    expect((await d.call('qr/complete',{id:q.id})).status).toBe(410);
  });
  it('refuses a phone proof whose issuance is in the future',async()=>{
    const d=new Browser(),p=new Browser(),q=await d.create(),proof=await p.approval(q.id);vi.setSystemTime(now-1);
    expect((await p.call('qr/approve',proof)).status).toBe(401);expect((await d.session()).status).toBe(401);
  });
});


describe('QR creation fairness and global abuse boundary',()=>{
  it('keeps first-time browsers independent while enforcing the shared creation ceiling',async()=>{
    for(let i=0;i<120;i++) {
      const browser=new Browser();
      expect((await browser.call('qr/create')).status).toBe(200);
    }
    expect((await new Browser().call('qr/create')).status).toBe(429);
  });
});
