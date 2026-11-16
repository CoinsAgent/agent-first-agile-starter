import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { createTestWalletGate } from './database-fixture';
import { ManagementBrowser,managementOrigin, type TestGate } from './management-fixture';
let gate:TestGate;
beforeEach(async()=>{gate=await createTestWalletGate({origin:managementOrigin,secret:'management-test-only-012345678901234567890123456789',databasePath:':memory:'});});
afterEach(()=>{gate.close();vi.useRealTimers();});
describe('US-004 actual public CLI provider integration',()=>{
 it('issues opaque resource-bound tokens through actual SIWE, code and PKCE without a secret; registers reference-owned RP',async()=>{
  const b=new ManagementBrowser(gate);await b.login();
  expect((await b.request('/api/applications',{name:'Bypass',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()})).status).toBe(401);
  const token=await b.authorize();expect(token.access_token).toBeTypeOf('string');expect(token.access_token.split('.')).toHaveLength(1);expect(token.id_token).toBeUndefined();
  expect(token.owner).toBe(b.account.address.toLowerCase());expect(token.refresh_token).toBeTypeOf('string');
  const r=await b.register(token);expect(r.status,await r.clone().text()).toBe(201);const result=await r.json();expect(result.clientSecret).toBeTypeOf('string');
  expect(gate.db.prepare('SELECT referenceId,userId FROM oauthClient WHERE clientId = ?').get(result.application.clientId)).toEqual({referenceId:b.account.address.toLowerCase(),userId:null});
 });
});

async function owner(){const b=new ManagementBrowser(gate);await b.login();return b;}
async function client(b:ManagementBrowser){const r=await b.register();expect(r.status,await r.clone().text()).toBe(201);return (await r.json()) as {application:{clientId:string};clientSecret:string};}
async function rp(b:ManagementBrowser,c:{application:{clientId:string};clientSecret:string},complete=true){
 const proof=(await import('node:crypto')).randomBytes(32).toString('base64url');
 const q=new URLSearchParams({client_id:c.application.clientId,redirect_uri:'https://rp.example/callback',response_type:'code',scope:'openid offline_access',state:'rp-state',code_challenge:(await import('node:crypto')).createHash('sha256').update(proof).digest('base64url'),code_challenge_method:'S256'});
 const response=await b.request('/api/auth/oauth2/authorize?'+q);expect(response.status).toBe(302);const id=response.headers.get('location')!.split('=')[1];expect((await b.request('/api/authorization/'+id)).status).toBe(200);
 if(!complete)return {id,proof,code:''};const consent=await b.request('/api/authorization/'+id,{accept:true});expect(consent.status).toBe(200);const result=await consent.json();return {id,proof,code:new URL(result.url).searchParams.get('code')!};
}
async function rpExchange(c:{application:{clientId:string};clientSecret:string},fields:Record<string,string>){return gate.handle(new Request(managementOrigin+'/api/auth/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',authorization:'Basic '+Buffer.from(c.application.clientId+':'+c.clientSecret).toString('base64')},body:new URLSearchParams(fields)}));}
async function rpTokens(b:ManagementBrowser,c:{application:{clientId:string};clientSecret:string}){const f=await rp(b,c);const r=await rpExchange(c,{grant_type:'authorization_code',code:f.code,code_verifier:f.proof,redirect_uri:'https://rp.example/callback'});expect(r.status).toBe(200);return r.json();}
const info=(token:string)=>gate.handle(new Request(managementOrigin+'/api/auth/oauth2/userinfo',{headers:{authorization:'Bearer '+token}}));

describe('US-004 grant isolation, purpose and browser binding',()=>{
 it('preserves independent refresh authority after logout and rejects replay only for its family',async()=>{
  const b=await owner(),a=await b.authorize(),other=await b.authorize();await b.request('/api/logout',{});
  expect((await b.api('/api/applications',a.access_token)).status).toBe(200);
  const refresh=await b.exchange({grant_type:'refresh_token',refresh_token:a.refresh_token,resource:'urn:walletgate:management'});expect(refresh.status).toBe(200);const next=await refresh.json();expect(next.refresh_token).not.toBe(a.refresh_token);expect(next.owner).toBe(a.owner);
  expect((await b.exchange({grant_type:'refresh_token',refresh_token:a.refresh_token})).status).toBe(400);
  expect((await b.api('/api/applications',next.access_token)).status).toBe(401);expect((await b.api('/api/applications',other.access_token)).status).toBe(200);
 });
 it('requires separate registration permission and rejects IAT/RP/token/cookie substitutions',async()=>{
  const b=await owner(),c=await client(b),readonly=await b.authorize({[c.application.clientId]:['read']},false),registration=await b.authorize();
  expect((await b.api('/api/management/iat',readonly.access_token,{})).status).toBe(403);
  const iat=await(await b.api('/api/management/iat',registration.access_token,{})).json();expect((await b.api('/api/applications',iat.initial_access_token)).status).toBe(401);
  const tokens=await rpTokens(b,c);for(const credential of [tokens.access_token,tokens.id_token,c.clientSecret,'forged'])expect((await b.api('/api/applications',credential)).status).toBe(401);
  expect((await b.request('/api/applications')).status).toBe(401);
  expect((await b.request('/api/applications',{name:'Session bypass',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()})).status).toBe(401);
  for(const path of ['/api/auth/oauth2/create-client','/api/auth/oauth2/register','/api/auth/oauth2/update-client','/api/auth/oauth2/delete-client','/api/auth/oauth2/rotate-client-secret'])expect((await b.request(path,{})).status).toBe(404);
 });
 it('requires per-target operations and ownership, with no read implied by update/delete',async()=>{
  const b=await owner(),x=await client(b),y=await client(b),t=await b.authorize({[x.application.clientId]:['read'],[y.application.clientId]:['update','delete']},false);
  const list=await(await b.api('/api/applications',t.access_token)).json();expect(list.applications.map((c:{clientId:string})=>c.clientId)).toEqual([x.application.clientId]);
  expect((await b.api('/api/applications/'+y.application.clientId,t.access_token)).status).toBe(404);
  expect((await b.api('/api/applications/'+x.application.clientId,t.access_token,{name:'unauthorized',redirectUris:['https://rp.example/other']},'PATCH')).status).toBe(404);
  const update=await b.api('/api/applications/'+y.application.clientId,t.access_token,{name:'Updated',redirectUris:['https://rp.example/callback']},'PATCH');expect(await update.json()).toEqual({clientId:y.application.clientId,outcome:'updated'});
  expect((await b.api('/api/applications/'+y.application.clientId,t.access_token,{owner:b.account.address,name:'No',redirectUris:['https://rp.example/callback']},'PATCH')).status).toBe(400);
  const other=await owner(),flow=await other.begin();await other.request('/api/management/approval/'+flow.id);expect((await other.request('/api/management/approval/'+flow.id,{accept:true,registration:false,permissions:{[x.application.clientId]:['read']}})).status).toBe(400);
  expect((await b.api('/api/applications/'+y.application.clientId,t.access_token,undefined,'DELETE')).status).toBe(400);
 });
 it('binds consent to its initiating browser, reviewed session and exact callback/verifier',async()=>{
  const b=await owner(),flow=await b.begin(),other=await owner();expect((await other.request('/api/management/approval/'+flow.id)).status).toBe(403);
  await b.request('/api/management/approval/'+flow.id);await b.request('/api/logout',{});await b.login();expect((await b.request('/api/management/approval/'+flow.id,{accept:true,registration:true,permissions:{}})).status).toBe(409);
  await b.request('/api/management/approval/'+flow.id);const r=await b.request('/api/management/approval/'+flow.id,{accept:true,registration:true,permissions:{}});const code=new URL((await r.json()).url).searchParams.get('code')!;
  expect((await b.exchange({grant_type:'authorization_code',code,code_verifier:'x'.repeat(43),redirect_uri:'http://127.0.0.1:54321/callback'})).status).toBe(400);
  expect((await b.exchange({grant_type:'authorization_code',code,code_verifier:flow.verifier,redirect_uri:'http://127.0.0.1:54321/callback'})).status).toBe(400);
  const bad=await b.request('/api/auth/oauth2/authorize?'+new URLSearchParams({...Object.fromEntries(flow.query),redirect_uri:'https://attacker.example/callback'}));expect(bad.status).toBe(400);
 });
 it('denial consumes approval, never issues credentials, and invalid grants cannot widen scopes/resource',async()=>{
  const b=await owner(),flow=await b.begin();await b.request('/api/management/approval/'+flow.id);const denied=await b.request('/api/management/approval/'+flow.id,{accept:false,registration:false,permissions:{}});const result=await denied.json();expect(new URL(result.url).searchParams.get('error')).toBe('access_denied');expect((await b.request('/api/management/approval/'+flow.id)).status).toBe(410);
  const t=await b.authorize();expect((await b.exchange({grant_type:'refresh_token',refresh_token:t.refresh_token,scope:'clients:manage clients:register openid offline_access'})).status).toBe(400);expect((await b.exchange({grant_type:'refresh_token',refresh_token:t.refresh_token,resource:'https://attacker.example'})).status).toBe(400);
  expect((await b.exchange({grant_type:'client_credentials',scope:'clients:manage'})).status).toBe(400);
 });
 it('lists/revokes only the owner authorization, revoking access, refresh and outstanding IATs',async()=>{
  const b=await owner(),a=await b.authorize(),other=await b.authorize(),iat=await(await b.api('/api/management/iat',a.access_token,{})).json();
  const wrong=await owner();expect((await wrong.request('/api/management/authorizations/'+a.authorization_id,{})).status).toBe(404);
  const list=await(await b.request('/api/management/authorizations')).json();expect(list.authorizations).toHaveLength(2);expect(JSON.stringify(list)).not.toContain(a.access_token);
  expect((await b.request('/api/management/authorizations/'+a.authorization_id,{})).status).toBe(200);
  expect((await b.api('/api/applications',a.access_token)).status).toBe(401);expect((await b.exchange({grant_type:'refresh_token',refresh_token:a.refresh_token})).status).toBe(400);
  expect((await b.api('/api/applications',iat.initial_access_token,{name:'No',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()})).status).toBe(401);expect((await b.api('/api/applications',other.access_token)).status).toBe(200);
 });
 it('registration-only reconciliation returns the immutable creation result, never later unreadable configuration, and records activity',async()=>{
  const b=await owner(),parent=await b.authorize(),body={name:'Original',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()};
  const created=await(await b.register(parent,body)).json(),id=created.application.clientId;
  const editor=await b.authorize({[id]:['update']},false);
  expect((await b.api('/api/applications/'+id,editor.access_token,{name:'Unreadable later name',redirectUris:['https://rp.example/private']},'PATCH')).status).toBe(200);
  vi.useFakeTimers({toFake:['Date']});const now=Date.now()+10000;vi.setSystemTime(now);
  const result=await b.api('/api/applications',parent.access_token,body);expect(result.status).toBe(200);const text=await result.text();expect(JSON.parse(text).application.name).toBe('Original');expect(text).not.toContain('Unreadable later name');expect(text).not.toContain('/private');
  expect(gate.db.prepare('SELECT lastActivity FROM managementGrant WHERE id = ?').get(parent.authorization_id)).toEqual({lastActivity:now});
 });
 it('does not let an unrelated registration grant reconcile a revoked original parent, or let expired IATs authenticate replay',async()=>{
  const b=await owner(),original=await b.authorize(),other=await b.authorize(),body={name:'Original parent',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()};
  const iat=await(await b.api('/api/management/iat',original.access_token,{})).json();expect((await b.api('/api/applications',iat.initial_access_token,body)).status).toBe(201);
  expect((await b.api('/api/applications',other.access_token,body)).status).toBe(403);
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(iat.expires_at);
  expect((await b.api('/api/applications',iat.initial_access_token,body)).status).toBe(401);
  expect((await b.api('/api/applications',original.access_token,body)).status).toBe(200);
  await b.request('/api/management/authorizations/'+original.authorization_id,{});
  expect((await b.api('/api/applications',other.access_token,body)).status).toBe(403);
 });
 it('replaces one grant after successful expanded consent and leaves others unaffected',async()=>{
  const b=await owner(),a=await b.authorize(),other=await b.authorize(),next=await b.authorize({},true,{walletgate_replace:a.authorization_id});
  expect(next.authorization_id).not.toBe(a.authorization_id);expect((await b.api('/api/applications',a.access_token)).status).toBe(401);expect((await b.api('/api/applications',next.access_token)).status).toBe(200);expect((await b.api('/api/applications',other.access_token)).status).toBe(200);
 });
});

describe('US-004 deletion and redirect enforcement against actual RP protocol',()=>{
 it('atomically updates redirects, invalidates removed pending requests/codes and preserves issued families',async()=>{
  const b=await owner(),c=await client(b),issued=await rpTokens(b,c),pending=await rp(b,c,false),code=await rp(b,c),t=await b.authorize({[c.application.clientId]:['read','update']});
  const path='/api/applications/'+c.application.clientId;
  expect((await b.api(path,t.access_token,{name:'Bad',redirectUris:['http://evil.example']},'PATCH')).status).toBe(400);expect((await(await b.api(path,t.access_token)).json()).application.name).toBe('Managed RP');
  expect((await b.api(path,t.access_token,{name:'Changed',redirectUris:['https://rp.example/new']},'PATCH')).status).toBe(200);
  expect((await b.request('/api/authorization/'+pending.id,{accept:true})).status).toBe(410);
  expect((await rpExchange(c,{grant_type:'authorization_code',code:code.code,code_verifier:code.proof,redirect_uri:'https://rp.example/callback'})).status).toBe(400);
  expect((await info(issued.access_token)).status).toBe(200);expect((await rpExchange(c,{grant_type:'refresh_token',refresh_token:issued.refresh_token})).status).toBe(200);
 });
 it('deletion stops pending/code/refresh/UserInfo while preserving another RP family and returning non-disclosing repeats',async()=>{
  const b=await owner(),c=await client(b),other=await client(b),issued=await rpTokens(b,c),survivor=await rpTokens(b,other),pending=await rp(b,c,false),code=await rp(b,c),t=await b.authorize({[c.application.clientId]:['delete']});
  const path='/api/applications/'+c.application.clientId,headers={'x-walletgate-confirm-delete':c.application.clientId};
  expect((await b.api(path,t.access_token,undefined,'DELETE',headers)).status).toBe(200);
  expect((await b.request('/api/authorization/'+pending.id,{accept:true})).status).toBe(410);expect((await rpExchange(c,{grant_type:'authorization_code',code:code.code,code_verifier:code.proof,redirect_uri:'https://rp.example/callback'})).status).toBeGreaterThanOrEqual(400);
  expect((await rpExchange(c,{grant_type:'refresh_token',refresh_token:issued.refresh_token})).status).toBeGreaterThanOrEqual(400);expect((await info(issued.access_token)).status).toBe(401);expect((await info(survivor.access_token)).status).toBe(200);
  const repeated=await b.api(path,t.access_token,undefined,'DELETE',headers);expect(repeated.status).toBe(404);expect(await repeated.json()).toEqual({error:'Not found or not authorized.'});expect(gate.db.pragma('foreign_key_check')).toEqual([]);
 });
 it('no usable RP token survives deletion racing a code exchange',async()=>{
  const b=await owner(),c=await client(b),f=await rp(b,c),t=await b.authorize({[c.application.clientId]:['delete']});
  const [exchange,deletion]=await Promise.all([rpExchange(c,{grant_type:'authorization_code',code:f.code,code_verifier:f.proof,redirect_uri:'https://rp.example/callback'}),b.api('/api/applications/'+c.application.clientId,t.access_token,undefined,'DELETE',{'x-walletgate-confirm-delete':c.application.clientId})]);expect(deletion.status).toBe(200);if(exchange.ok){const tokens=await exchange.json();expect((await info(tokens.access_token)).status).toBe(401);}expect(gate.db.prepare('SELECT count(*) n FROM oauthAccessToken WHERE clientId = ?').get(c.application.clientId)).toEqual({n:0});
 });
});

describe('US-004 exact deadline boundaries',()=>{
 for(const delta of [-1,0,1]){
  it(`continuation deadline ${delta}ms`,async()=>{const b=await owner(),flow=await b.begin();const row=gate.db.prepare('SELECT expiresAt FROM verification WHERE identifier = ?').get('cli:'+flow.id) as {expiresAt:string};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(row.expiresAt).getTime()+delta);expect((await b.request('/api/management/approval/'+flow.id)).status).toBe(delta<0?200:410);});
  it(`IAT deadline ${delta}ms`,async()=>{const b=await owner(),t=await b.authorize(),r=await(await b.api('/api/management/iat',t.access_token,{})).json();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(r.expires_at+delta);expect((await b.api('/api/applications',r.initial_access_token,{name:'Boundary',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()})).status).toBe(delta<0?201:401);});
  it(`access deadline ${delta}ms`,async()=>{const b=await owner(),t=await b.authorize();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(t.expires_at*1000+delta);expect((await b.api('/api/applications',t.access_token)).status).toBe(delta<0?200:401);});
  it(`inactivity deadline ${delta}ms`,async()=>{const b=await owner(),t=await b.authorize(),row=gate.db.prepare('SELECT lastActivity FROM managementGrant WHERE id = ?').get(t.authorization_id) as {lastActivity:number};vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(row.lastActivity+7*86400000+delta);expect((await b.exchange({grant_type:'refresh_token',refresh_token:t.refresh_token})).status).toBe(delta<0?200:400);});
  it(`absolute grant deadline ${delta}ms after active refreshes`,async()=>{const b=await owner();let t=await b.authorize();const end=t.grant_expires_at,start=end-30*86400000;vi.useFakeTimers({toFake:['Date']});for(const days of [6,12,18,24]){vi.setSystemTime(start+days*86400000);const r=await b.exchange({grant_type:'refresh_token',refresh_token:t.refresh_token});expect(r.status,await r.clone().text()).toBe(200);t=await r.json();}vi.setSystemTime(end+delta);expect((await b.exchange({grant_type:'refresh_token',refresh_token:t.refresh_token})).status).toBe(delta<0?200:400);});
 }
});


describe('US-004 deadline and revocation persistence across actual server restart',()=>{
 for(const delta of [-1,0,1])for(const boundary of ['iat','access','idle','absolute','continuation'] as const){
  it(`${boundary} deadline ${delta}ms after restart`,async()=>{
   const dir=mkdtempSync(join(tmpdir(),'walletgate-management-restart-'));
   const config={origin:managementOrigin,secret:'restart-test-only-012345678901234567890123456789',databasePath:join(dir,'test.sqlite')};
   try{
    gate.close();gate=await createTestWalletGate(config);const b=await owner();let token=await b.authorize();
    const row=gate.db.prepare('SELECT lastActivity,expiresAt FROM managementGrant WHERE id = ?').get(token.authorization_id) as {lastActivity:number;expiresAt:number};
    let deadline=boundary==='idle'?row.lastActivity+7*86400000:boundary==='absolute'?row.expiresAt:token.expires_at*1000;
    let iat:{initial_access_token:string;expires_at:number}|undefined;let pending:Awaited<ReturnType<ManagementBrowser['begin']>>|undefined;
    if(boundary==='iat'){iat=await(await b.api('/api/management/iat',token.access_token,{})).json();deadline=iat!.expires_at;}
    if(boundary==='continuation'){pending=await b.begin();const v=gate.db.prepare('SELECT expiresAt FROM verification WHERE identifier = ?').get('cli:'+pending.id) as {expiresAt:string};deadline=new Date(v.expiresAt).getTime();}
    vi.useFakeTimers({toFake:['Date']});
    if(boundary==='absolute')for(const days of [6,12,18,24]){vi.setSystemTime(row.expiresAt-30*86400000+days*86400000);const response=await b.exchange({grant_type:'refresh_token',refresh_token:token.refresh_token});expect(response.status).toBe(200);token=await response.json();}
    gate.close();gate=await createTestWalletGate(config);b.gate=gate;vi.setSystemTime(deadline+delta);
    const response=boundary==='iat'?await b.api('/api/applications',iat!.initial_access_token,{name:'Restart boundary',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()}):boundary==='access'?await b.api('/api/applications',token.access_token):boundary==='continuation'?await b.request('/api/management/approval/'+pending!.id):await b.exchange({grant_type:'refresh_token',refresh_token:token.refresh_token});
    expect(response.status,await response.clone().text()).toBe(delta<0?(boundary==='iat'?201:200):boundary==='continuation'?410:boundary==='iat'||boundary==='access'?401:400);
   }finally{rmSync(dir,{recursive:true,force:true});}
  });
 }
 it('retains explicit revocation across restart without changing another installation',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'walletgate-management-revoked-')),config={origin:managementOrigin,secret:'revoked-test-only-012345678901234567890123456789',databasePath:join(dir,'test.sqlite')};
  try{gate.close();gate=await createTestWalletGate(config);const b=await owner(),a=await b.authorize(),other=await b.authorize();await b.request('/api/management/authorizations/'+a.authorization_id,{});gate.close();gate=await createTestWalletGate(config);b.gate=gate;expect((await b.api('/api/applications',a.access_token)).status).toBe(401);expect((await b.exchange({grant_type:'refresh_token',refresh_token:a.refresh_token})).status).toBe(400);expect((await b.api('/api/applications',other.access_token)).status).toBe(200);}finally{rmSync(dir,{recursive:true,force:true});}
 });
});
