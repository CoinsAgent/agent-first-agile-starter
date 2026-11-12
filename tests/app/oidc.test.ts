import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createJwk } from 'better-auth/plugins/jwt';
import type { GenericEndpointContext } from '@better-auth/core';
import { createHash, randomBytes, randomUUID, createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createTestWalletGate } from './database-fixture';
const origin = 'http://localhost:3000';
const config = { origin, secret: 'oidc-test-only-secret-012345678901234567890123456789', databasePath: ':memory:' };
let gate: Awaited<ReturnType<typeof createTestWalletGate>>;
let now: number;
class Browser {
  account = privateKeyToAccount(generatePrivateKey());
  cookies = new Map<string, string>();
  async request(path: string, body?: unknown) {
    const headers = new Headers({ origin, cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ') });
    if (body !== undefined) headers.set('content-type','application/json');
    const response = await gate.handle(new Request(origin + path, { headers, method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body) }));
    for (const value of response.headers.getSetCookie()) { const [name,...parts] = value.split(';')[0].split('='); this.cookies.set(name,parts.join('=')); }
    return response;
  }
  async login() {
    const c = await (await this.request('/api/challenge',{ address: this.account.address, chainId:1 })).json();
    expect((await this.request('/api/verify',{ message:c.message, signature:await this.account.signMessage({ message:c.message }) })).status).toBe(200);
  }
  async client() {
    const response = await this.request('/api/applications',{ name:'My application', redirectUris:['https://rp.example/callback'], requestId:randomUUID() });
    expect(response.status).toBe(201);
    const data = await response.json();
    return { id:data.application.clientId as string, secret:data.clientSecret as string };
  }
  async begin(client: {id:string}, extra: Record<string,string> = {}) {
    const verifier=randomBytes(32).toString('base64url');
    const query=new URLSearchParams({ client_id:client.id, redirect_uri:'https://rp.example/callback', response_type:'code', scope:'openid offline_access', state:'rp-state', nonce:'rp-nonce', code_challenge:createHash('sha256').update(verifier).digest('base64url'), code_challenge_method:'S256', ...extra });
    const response=await this.request('/api/auth/oauth2/authorize?'+query);
    expect(response.status).toBe(302);
    const location=response.headers.get('location')!;
    expect(location).toMatch(/^\/#authorize=/);
    const id=location.split('=')[1];
    return {id, verifier};
  }
  async authorize(client:{id:string}, extra:Record<string,string>={}) {
    const flow=await this.begin(client,extra);
    const review=await this.request('/api/authorization/'+flow.id);
    expect(review.status).toBe(200);
    expect((await review.json()).address).toBe(this.account.address.toLowerCase());
    const response=await this.request('/api/authorization/'+flow.id,{accept:true});
    const data=await response.json();
    expect(response.status,JSON.stringify(data)).toBe(200);
    expect(data.url).toMatch(/^https:\/\/rp.example\/callback/);
    const url=new URL(data.url);
    expect(url.searchParams.get('state')).toBe('rp-state');
    return {...flow,code:url.searchParams.get('code')!};
  }
}
async function exchange(client:{id:string;secret:string}, fields:Record<string,string>, endpoint='token') {
  return gate.handle(new Request(origin+'/api/auth/oauth2/'+endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded', authorization:'Basic '+Buffer.from(client.id+':'+client.secret).toString('base64')},body:new URLSearchParams(fields)}));
}
async function issue(browser:Browser,client:{id:string;secret:string}, extra:Record<string,string>={}) {
  const flow=await browser.authorize(client,extra);
  const response=await exchange(client,{grant_type:'authorization_code',code:flow.code,code_verifier:flow.verifier,redirect_uri:'https://rp.example/callback'});
  const data=await response.json(); expect(response.status,JSON.stringify(data)).toBe(200); return {flow,data};
}
const userinfo=(token:string)=>gate.handle(new Request(origin+'/api/auth/oauth2/userinfo',{headers:{authorization:'Bearer '+token}}));
beforeEach(async()=>{now=Date.now();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);gate=await createTestWalletGate(config);});
afterEach(()=>{gate.close();vi.useRealTimers();});
describe('US-003 actual provider interoperability',()=>{
  it('exchanges real SIWE-backed code, verifies ID signature independently and calls UserInfo',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    expect(data.expires_in).toBe(900);expect(data.refresh_token).toBeTypeOf('string');
    const [h,p,s]=data.id_token.split('.');const header=JSON.parse(Buffer.from(h,'base64url').toString());const claims=JSON.parse(Buffer.from(p,'base64url').toString());
    expect(header.alg).toBe('RS256');expect(claims.sub).toBe(b.account.address.toLowerCase());expect(claims.iss).toBe(origin+'/api/auth');expect(claims.aud).toBe(c.id);expect(claims.nonce).toBe('rp-nonce');expect(claims.exp-claims.iat).toBe(900);
    const keys=await (await b.request('/api/auth/jwks')).json();const key=keys.keys.find((k:{kid:string})=>k.kid===header.kid);
    expect(key.d).toBeUndefined();expect(verify('RSA-SHA256',Buffer.from(h+'.'+p),createPublicKey({key,format:'jwk'}),Buffer.from(s,'base64url'))).toBe(true);
    const info=await userinfo(data.access_token);expect(info.status).toBe(200);expect(await info.json()).toEqual({sub:b.account.address.toLowerCase()});
  });
});

describe('US-003 token policy and negative boundaries',()=>{
  it('makes refresh optional and shares one address across two independent clients',async()=>{
    const b=new Browser();await b.login();const a=await b.client(),c=await b.client();
    const one=await issue(b,a,{scope:'openid'}),two=await issue(b,c,{scope:'openid'});
    expect(one.data.refresh_token).toBeUndefined();expect(two.data.refresh_token).toBeUndefined();
    const decode=(t:string)=>JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString());
    expect(decode(one.data.id_token).sub).toBe(decode(two.data.id_token).sub);expect(decode(one.data.id_token).aud).not.toBe(decode(two.data.id_token).aud);
    const d=new Browser();await d.login();const other=await issue(d,a,{scope:'openid'});expect(decode(other.data.id_token).sub).not.toBe(decode(one.data.id_token).sub);
  });
  it('keeps access and refresh usable after wallet logout and preserves original auth_time',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    const first=JSON.parse(Buffer.from(data.id_token.split('.')[1],'base64url').toString());
    await b.request('/api/logout',{});expect((await b.request('/api/session')).status).toBe(401);expect((await userinfo(data.access_token)).status).toBe(200);
    vi.setSystemTime(now+3600001);
    const r=await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token});const next=await r.json();expect(r.status,JSON.stringify(next)).toBe(200);expect(next.refresh_token).not.toBe(data.refresh_token);
    const second=JSON.parse(Buffer.from(next.id_token.split('.')[1],'base64url').toString());expect(second.auth_time).toBe(first.auth_time);expect(second.iat).toBeGreaterThan(first.iat);expect(second.sub).toBe(first.sub);expect((await userinfo(next.access_token)).status).toBe(200);
  });
  it('revokes only the original family on reused refresh even with invalid scope',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const a=await issue(b,c),independent=await issue(b,c);
    const r=await exchange(c,{grant_type:'refresh_token',refresh_token:a.data.refresh_token});const rotated=await r.json();expect(r.status).toBe(200);
    expect((await exchange(c,{grant_type:'refresh_token',refresh_token:a.data.refresh_token,scope:'forbidden'})).status).toBe(400);
    expect((await userinfo(a.data.access_token)).status).toBe(401);expect((await userinfo(rotated.access_token)).status).toBe(401);
    expect((await exchange(c,{grant_type:'refresh_token',refresh_token:rotated.refresh_token})).status).toBe(400);
    expect((await userinfo(independent.data.access_token)).status).toBe(200);
  });
  it('requires owning client credentials without allowing scope changes or family damage',async()=>{
    const b=new Browser();await b.login();const c=await b.client(),other=await b.client();const {data}=await issue(b,c);
    for(const scope of ['openid','openid offline_access email'])expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token,scope})).status).toBe(400);
    expect((await exchange(other,{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBe(400);
    expect((await exchange({...c,secret:'wrong'},{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBeGreaterThanOrEqual(400);
    expect((await userinfo(data.access_token)).status).toBe(200);
    expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token,scope:'offline_access openid'})).status).toBe(200);
  });
  it('revokes active access tokens across all refresh generations without affecting another family',async()=>{
    const b=new Browser();await b.login();const c=await b.client(),wrong=await b.client();const {data}=await issue(b,c),independent=await issue(b,c);
    const next=await(await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})).json();
    expect((await exchange(wrong,{token:next.refresh_token},'revoke')).status).toBe(200);expect((await userinfo(next.access_token)).status).toBe(200);
    expect((await exchange(c,{token:next.refresh_token},'revoke')).status).toBe(200);
    expect((await userinfo(data.access_token)).status).toBe(401);expect((await userinfo(next.access_token)).status).toBe(401);expect((await userinfo(independent.data.access_token)).status).toBe(200);
    expect((await exchange(c,{token:next.refresh_token},'revoke')).status).toBe(200);
    expect((await exchange(c,{token:independent.data.access_token},'revoke')).status).toBe(200);expect((await userinfo(independent.data.access_token)).status).toBe(401);
  });
  it('caps last-minute ID/access expiry at the durable original family deadline',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    const first=gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').get() as {expiresAt:number};const deadline=new Date(first.expiresAt).getTime();
    expect(deadline).toBe(Math.floor(now/1000)*1000+7*86400000);
    vi.setSystemTime(deadline-60000);
    const response=await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token});const next=await response.json();expect(response.status,JSON.stringify(next)).toBe(200);expect(next.expires_in).toBe(60);
    const claims=JSON.parse(Buffer.from(next.id_token.split('.')[1],'base64url').toString());expect(claims.exp*1000).toBe(deadline);
    const rows=gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').all() as {expiresAt:number}[];expect(rows.every(r=>new Date(r.expiresAt).getTime()===deadline)).toBe(true);
    vi.setSystemTime(deadline);expect((await userinfo(next.access_token)).status).toBe(401);expect((await exchange(c,{grant_type:'refresh_token',refresh_token:next.refresh_token})).status).toBe(400);
  });
  it('rejects code at its expiry and code redemption after wallet logout',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const flow=await b.authorize(c);
    vi.setSystemTime(Math.floor(now/1000)*1000+60000);
    expect((await exchange(c,{grant_type:'authorization_code',code:flow.code,code_verifier:flow.verifier,redirect_uri:'https://rp.example/callback'})).status).toBe(400);
    vi.setSystemTime(now);const next=await b.authorize(c);await b.request('/api/logout',{});
    expect((await exchange(c,{grant_type:'authorization_code',code:next.code,code_verifier:next.verifier,redirect_uri:'https://rp.example/callback'})).status).toBe(400);
  });
  it('consumes wrong-PKCE code, rejects replay and issues at most one code exchange concurrently',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const flow=await b.authorize(c);
    expect((await exchange(c,{grant_type:'authorization_code',code:flow.code,code_verifier:'x'.repeat(43),redirect_uri:'https://rp.example/callback'})).status).toBe(400);
    expect((await exchange(c,{grant_type:'authorization_code',code:flow.code,code_verifier:flow.verifier,redirect_uri:'https://rp.example/callback'})).status).toBe(400);
    const next=await b.authorize(c);const fields={grant_type:'authorization_code',code:next.code,code_verifier:next.verifier,redirect_uri:'https://rp.example/callback'};
    const results=await Promise.all([exchange(c,fields),exchange(c,fields)]);expect(results.filter(r=>r.status===200)).toHaveLength(1);
  });
  it('serializes competing refreshes and leaves no active family tokens after reuse',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    const results=await Promise.all([exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token}),exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})]);expect(results.filter(r=>r.status===200)).toHaveLength(1);
    const next=await results.find(r=>r.status===200)!.json();expect((await userinfo(next.access_token)).status).toBe(401);expect((await exchange(c,{grant_type:'refresh_token',refresh_token:next.refresh_token})).status).toBe(400);
  });
  it('binds pending requests to browsers and five minutes, supports independent tabs and refuses duplicate approval',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const a=await b.begin(c),second=await b.begin(c);const outsider=new Browser();
    expect((await outsider.request('/api/authorization/'+a.id)).status).toBe(403);
    expect((await b.request('/api/authorization/'+a.id)).status).toBe(200);expect((await b.request('/api/authorization/'+second.id)).status).toBe(200);
    vi.setSystemTime(now+61000);expect((await b.request('/api/authorization/'+a.id,{accept:true})).status).toBe(200);expect((await b.request('/api/authorization/'+a.id,{accept:true})).status).toBe(410);
    vi.setSystemTime(now+300000);expect((await b.request('/api/authorization/'+second.id)).status).toBe(410);
  });
  it('denies without codes/tokens, requires consent again and refuses silent authorization',async()=>{
    const b=new Browser();await b.login();const c=await b.client();await issue(b,c);const flow=await b.begin(c);
    expect((await(await b.request('/api/authorization/'+flow.id)).json()).name).toBe('My application');
    const result=await(await b.request('/api/authorization/'+flow.id,{accept:false})).json();expect(new URL(result.url).searchParams.get('error')).toBe('access_denied');
    const q=new URLSearchParams({client_id:c.id,redirect_uri:'https://rp.example/callback',response_type:'code',scope:'openid',code_challenge:'a'.repeat(43),code_challenge_method:'S256',prompt:'none'});
    const response=await b.request('/api/auth/oauth2/authorize?'+q);expect(new URL(response.headers.get('location')!).searchParams.get('error')).toBe('consent_required');
  });
  it.each(['login','max_age'])('requires fresh SIWE for %s',async mode=>{
    const b=new Browser();await b.login();const c=await b.client();const flow=await b.begin(c,mode==='login'?{prompt:'login'}:{max_age:'0'});
    expect((await(await b.request('/api/authorization/'+flow.id)).json()).needsLogin).toBe(true);
    await b.request('/api/logout',{});vi.setSystemTime(now+1000);await b.login();expect((await(await b.request('/api/authorization/'+flow.id)).json()).address).toBe(b.account.address.toLowerCase());
  });
  it('requires renewed consent after identity changes and denies untrusted consent POST',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const flow=await b.begin(c);await b.request('/api/authorization/'+flow.id);
    const headers={origin:'https://evil.example','content-type':'application/json',cookie:[...b.cookies].map(([k,v])=>k+'='+v).join('; ')};
    expect((await gate.handle(new Request(origin+'/api/authorization/'+flow.id,{method:'POST',headers,body:'{"accept":true}'}))).status).toBe(403);
    await b.request('/api/logout',{});b.account=privateKeyToAccount(generatePrivateKey());await b.login();expect((await b.request('/api/authorization/'+flow.id,{accept:true})).status).toBe(409);
  });
  it('publishes accurate metadata and filters claims requests without exposing email',async()=>{
    const b=new Browser();const response=await b.request('/api/auth/.well-known/openid-configuration');expect(response.status).toBe(200);const metadata=await response.json();expect(metadata.issuer).toBe(origin+'/api/auth');expect(metadata.userinfo_endpoint).toBe(origin+'/api/auth/oauth2/userinfo');expect(metadata.scopes_supported).toContain('offline_access');
    await b.login();const c=await b.client();const query=new URLSearchParams({client_id:c.id,redirect_uri:'https://evil.example/callback',response_type:'code',scope:'openid'});const invalid=await b.request('/api/auth/oauth2/authorize?'+query);expect(invalid.headers.get('location')??'').not.toContain('evil.example');
    for(const extra of ['claims','resource','request','request_uri']){query.set('redirect_uri','https://rp.example/callback');query.set(extra,'email');expect((await b.request('/api/auth/oauth2/authorize?'+query)).status).toBe(400);query.delete(extra);}
  });
  it('preserves signing keys and absolute family deadline through restart',async()=>{
    gate.close();const dir=mkdtempSync(join(tmpdir(),'walletgate-oidc-'));const persistent={...config,databasePath:join(dir,'test.sqlite')};gate=await createTestWalletGate(persistent);
    try{const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);const keys=await(await b.request('/api/auth/jwks')).json();const deadline=(gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').get() as {expiresAt:number}).expiresAt;
      gate.close();vi.setSystemTime(now+86400000);gate=await createTestWalletGate(persistent);expect(await(await b.request('/api/auth/jwks')).json()).toEqual(keys);const next=await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token});expect(next.status).toBe(200);expect((gate.db.prepare('SELECT MAX(expiresAt) AS expiry FROM oauthRefreshToken').get() as {expiry:number}).expiry).toBe(deadline);
    }finally{gate.close();gate=await createTestWalletGate(config);rmSync(dir,{recursive:true,force:true});}
  });
});

describe('US-003 persistence, rollback and boundary regressions',()=>{
  it('keeps another tab pending through code cleanup and multiple token exchanges',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const pending=await b.begin(c);await issue(b,c);await issue(b,c);
    expect((await b.request('/api/authorization/'+pending.id)).status).toBe(200);
  });
  it('requires fresh authentication at exact session expiry before code redemption',async()=>{
    const b=new Browser();await b.login();const c=await b.client();vi.setSystemTime(now+3600000-10000);const flow=await b.authorize(c);vi.setSystemTime(now+3600000);
    expect((await exchange(c,{grant_type:'authorization_code',code:flow.code,code_verifier:flow.verifier,redirect_uri:'https://rp.example/callback'})).status).toBe(400);
  });
  it('uses max_age inclusive boundary and forces authentication after it',async()=>{
    const b=new Browser();await b.login();const c=await b.client();vi.setSystemTime(now+60000);const first=await b.begin(c,{max_age:'60'});expect((await(await b.request('/api/authorization/'+first.id)).json()).needsLogin).toBeUndefined();
    vi.setSystemTime(now+60001);const second=await b.begin(c,{max_age:'60'});expect((await(await b.request('/api/authorization/'+second.id)).json()).needsLogin).toBe(true);
  });
  it('requires new SIWE when offline authorization restarts after a family deadline',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    const row=gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').get() as {expiresAt:string};const deadline=new Date(row.expiresAt).getTime();
    vi.setSystemTime(deadline-1000);await b.login();vi.setSystemTime(deadline);
    expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBe(400);
    const pending=await b.begin(c);expect((await(await b.request('/api/authorization/'+pending.id)).json()).needsLogin).toBe(true);
    await b.request('/api/logout',{});vi.setSystemTime(deadline+1);await b.login();expect((await(await b.request('/api/authorization/'+pending.id)).json()).needsLogin).toBeUndefined();
  });
  it('rechecks max_age while consent is open before approval',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const pending=await b.begin(c,{max_age:'60'});await b.request('/api/authorization/'+pending.id);
    vi.setSystemTime(now+60001);const result=await(await b.request('/api/authorization/'+pending.id,{accept:true})).json();expect(result).toEqual({needsLogin:true,fresh:true});
    const review=await(await b.request('/api/authorization/'+pending.id)).json();expect(review.needsLogin).toBe(true);
  });
  it('keeps concurrent logout from revoking freshly refreshed access',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);
    const [response]=await Promise.all([exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token}),b.request('/api/logout',{})]);const next=await response.json();expect(response.status).toBe(200);expect((await userinfo(next.access_token)).status).toBe(200);
  });
  it('rolls back failed issuance without leaving partial token rows or a rotated refresh',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);const before=gate.db.prepare('SELECT id,revoked,rotatedAt FROM oauthRefreshToken').all();const accessCount=(gate.db.prepare('SELECT count(*) n FROM oauthAccessToken').get() as {n:number}).n;
    gate.db.exec("CREATE TRIGGER oidc_test_failure BEFORE INSERT ON oauthAccessToken BEGIN SELECT RAISE(ABORT, 'fixture storage failure'); END");
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBe(500);}finally{log.mockRestore();gate.db.exec('DROP TRIGGER oidc_test_failure');}
    expect(gate.db.prepare('SELECT id,revoked,rotatedAt FROM oauthRefreshToken').all()).toEqual(before);expect((gate.db.prepare('SELECT count(*) n FROM oauthAccessToken').get() as {n:number}).n).toBe(accessCount);
    expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBe(200);
  });
  it('selects RSA for the new public issuer while retaining an older stored EdDSA key',async()=>{
    await createJwk({context:await gate.auth.$context} as GenericEndpointContext,{jwks:{keyPairConfig:{alg:'EdDSA'}}});
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);expect(JSON.parse(Buffer.from(data.id_token.split('.')[0],'base64url').toString()).alg).toBe('RS256');expect((gate.db.prepare('SELECT count(*) n FROM jwks').get() as {n:number}).n).toBe(2);
  });
  it('rejects oversized or duplicate form fields and keeps management/introspection hidden',async()=>{
    const b=new Browser();await b.login();const c=await b.client();
    const form=(body:string)=>gate.handle(new Request(origin+'/api/auth/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}));
    expect((await form('x='+ 'a'.repeat(8192))).status).toBe(413);expect((await form('grant_type=refresh_token&grant_type=authorization_code')).status).toBe(400);
    for(const path of ['oauth2/introspect','oauth2/register','oauth2/update-client','token'])expect((await b.request('/api/auth/'+path)).status).toBe(404);
    expect((await exchange(c,{grant_type:'client_credentials',scope:'openid'})).status).toBe(400);
  });
  it('serializes refresh reuse in independent Node processes against one disposable database',async()=>{
    gate.close();const dir=mkdtempSync(join(tmpdir(),'walletgate-oidc-process-'));const persistent={...config,databasePath:join(dir,'test.sqlite')};gate=await createTestWalletGate(persistent);
    try{const b=new Browser();await b.login();const client=await b.client();const {data}=await issue(b,client);
      const worker=()=>new Promise<{status:number}>((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','tests/app/oidc-worker.ts'],{stdio:['pipe','pipe','pipe']});let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(new Error('Fixture process failed: '+error));else{try{resolve(JSON.parse(output));}catch{reject(new Error('Invalid fixture process response'));}}});child.stdin.end(JSON.stringify({config:persistent,client,refreshToken:data.refresh_token}));});
      const responses=await Promise.all([worker(),worker()]);expect(responses.map(r=>r.status).sort()).toEqual([200,400]);expect((gate.db.prepare('SELECT count(*) n FROM oauthAccessToken WHERE revoked IS NULL').get() as {n:number}).n).toBe(0);
    }finally{gate.close();gate=await createTestWalletGate(config);rmSync(dir,{recursive:true,force:true});}
  },15000);
});

describe('US-003 protocol rejection cases',()=>{
  it.each(['unknown client','missing PKCE','plain PKCE','wrong redirect','invalid scope','invalid prompt','invalid max_age'])('rejects %s without issuing tokens',async kind=>{
    const b=new Browser();await b.login();const c=await b.client();const q=new URLSearchParams({client_id:c.id,redirect_uri:'https://rp.example/callback',response_type:'code',scope:'openid',code_challenge:'a'.repeat(43),code_challenge_method:'S256'});
    if(kind==='unknown client')q.set('client_id','unknown');if(kind==='missing PKCE'){q.delete('code_challenge');q.delete('code_challenge_method');}if(kind==='plain PKCE')q.set('code_challenge_method','plain');if(kind==='wrong redirect')q.set('redirect_uri','https://untrusted.example/callback');if(kind==='invalid scope')q.set('scope','openid email');if(kind==='invalid prompt')q.set('prompt','none login');if(kind==='invalid max_age')q.set('max_age','-1');
    const result=await b.request('/api/auth/oauth2/authorize?'+q);const location=result.headers.get('location')??'';expect(location).not.toContain('#authorize=');expect(location).not.toContain('code=');expect(location).not.toContain('untrusted.example');expect((gate.db.prepare('SELECT count(*) n FROM oauthAccessToken').get() as {n:number}).n).toBe(0);
  });
  it('rejects malformed consent JSON and missing bearer without leaking tokens',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const pending=await b.begin(c);await b.request('/api/authorization/'+pending.id);const headers={origin,'content-type':'application/json',cookie:[...b.cookies].map(([k,v])=>k+'='+v).join('; ')};
    expect((await gate.handle(new Request(origin+'/api/authorization/'+pending.id,{method:'POST',headers,body:'bad JSON'}))).status).toBe(400);
    expect((await b.request('/api/auth/oauth2/userinfo')).status).toBe(401);
  });
});

describe('US-003 standard POST transport and bearer parsing',()=>{
  it('supports form POST authorization and header/body UserInfo POST',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const query=new URLSearchParams({client_id:c.id,redirect_uri:'https://rp.example/callback',response_type:'code',scope:'openid',code_challenge:'a'.repeat(43),code_challenge_method:'S256'});
    const headers={'content-type':'application/x-www-form-urlencoded',cookie:[...b.cookies].map(([k,v])=>k+'='+v).join('; ')};
    const start=await gate.handle(new Request(origin+'/api/auth/oauth2/authorize',{method:'POST',headers,body:query}));expect(start.status).toBe(302);expect(start.headers.get('location')).toMatch(/^\/#authorize=/);
    const {data}=await issue(b,c);
    for(const request of [new Request(origin+'/api/auth/oauth2/userinfo',{method:'POST',headers:{authorization:'Bearer '+data.access_token}}),new Request(origin+'/api/auth/oauth2/userinfo',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({access_token:data.access_token})})]){const result=await gate.handle(request);expect(result.status,result.ok ? undefined : await result.clone().text()).toBe(200);expect(await result.json()).toEqual({sub:b.account.address.toLowerCase()});}
  });
  it('rejects exact-expiry tokens with alternate bearer spacing and POST transport',async()=>{
    const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);vi.setSystemTime(Math.floor(now/1000)*1000+900000);
    for(const bearer of ['Bearer '+data.access_token,'Bearer  '+data.access_token,'bearer\t'+data.access_token])expect((await gate.handle(new Request(origin+'/api/auth/oauth2/userinfo',{headers:{authorization:bearer}}))).status).toBe(401);
    const result=await gate.handle(new Request(origin+'/api/auth/oauth2/userinfo',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({access_token:data.access_token})}));expect(result.status).toBe(401);
  });
});

it('keeps simultaneous first authorization tabs independently bound',async()=>{
  const b=new Browser();await b.login();const c=await b.client();
  const [a,second]=await Promise.all([b.begin(c),b.begin(c)]);expect((await b.request('/api/authorization/'+a.id)).status).toBe(200);expect((await b.request('/api/authorization/'+second.id)).status).toBe(200);
  expect((await b.request('/api/authorization/'+a.id,{accept:false})).status).toBe(200);expect((await b.request('/api/authorization/'+second.id)).status).toBe(200);
});

it('rolls back signed output that crosses the family cap during async issuance',async()=>{
  const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);const deadline=new Date((gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').get() as {expiresAt:string}).expiresAt).getTime();
  vi.setSystemTime(deadline-60000);const context=await gate.auth.$context;const lookup=context.internalAdapter.findUserById.bind(context.internalAdapter);const spy=vi.spyOn(context.internalAdapter,'findUserById').mockImplementation(async id=>{vi.setSystemTime(deadline-59000);return lookup(id);});
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{expect((await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token})).status).toBe(500);}finally{spy.mockRestore();log.mockRestore();}
  expect((gate.db.prepare('SELECT count(*) n FROM oauthRefreshToken').get() as {n:number}).n).toBe(1);expect((gate.db.prepare('SELECT revoked FROM oauthRefreshToken').get() as {revoked:null}).revoked).toBeNull();
  const retry=await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token});expect(retry.status).toBe(200);const next=await retry.json();expect(JSON.parse(Buffer.from(next.id_token.split('.')[1],'base64url').toString()).exp*1000).toBe(deadline);
});
it('releases no token when issuance itself reaches the absolute deadline',async()=>{
  const b=new Browser();await b.login();const c=await b.client();const {data}=await issue(b,c);const deadline=new Date((gate.db.prepare('SELECT expiresAt FROM oauthRefreshToken').get() as {expiresAt:string}).expiresAt).getTime();vi.setSystemTime(deadline-1000);
  const context=await gate.auth.$context;const create=context.adapter.create.bind(context.adapter);const spy=vi.spyOn(context.adapter,'create').mockImplementation(async args=>{if(args.model==='oauthAccessToken')vi.setSystemTime(deadline);return create(args);});const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{const response=await exchange(c,{grant_type:'refresh_token',refresh_token:data.refresh_token});expect(response.status).toBe(500);expect((await response.json()).access_token).toBeUndefined();}finally{spy.mockRestore();log.mockRestore();}
  expect((gate.db.prepare('SELECT count(*) n FROM oauthRefreshToken').get() as {n:number}).n).toBe(1);
});
