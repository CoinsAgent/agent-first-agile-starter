import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createTestWalletGate } from './database-fixture';
import { ManagementBrowser,managementOrigin,type TestGate } from './management-fixture';
let gate:TestGate,b:ManagementBrowser,token:Record<string,any>,now:number;
const config={origin:managementOrigin,secret:'applications-test-only-012345678901234567890123456789',databasePath:':memory:'};
beforeEach(async()=>{now=Date.now();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);gate=await createTestWalletGate(config);b=new ManagementBrowser(gate);await b.login();token=await b.authorize();});
afterEach(()=>{gate.close();vi.useRealTimers();});
const input=(extra:Record<string,unknown>={})=>({name:'Test RP',redirectUris:['https://app.example/callback?query=1'],requestId:randomUUID(),...extra});
async function iat(){const response=await b.api('/api/management/iat',token.access_token,{});expect(response.status,await response.clone().text()).toBe(201);return (await response.json()).initial_access_token as string;}
const count=()=> (gate.db.prepare("SELECT count(*) n FROM oauthClient WHERE clientId != 'walletgate-cli'").get() as {n:number}).n;
async function create(extra:Record<string,unknown>={}){return b.api('/api/applications',await iat(),input(extra));}
describe('US-004 preserves registration validation with IAT authorization',()=>{
 it.each(['owner','userId','referenceId','subject','client_id','scope','grant_types','application_type','token_endpoint_auth_method'])('rejects caller-supplied ownership/profile field %s under a valid IAT',async field=>{
  expect((await create({[field]:'unauthorized-override'})).status).toBe(400);expect(count()).toBe(0);
 });
 it.each(['','  ','x'.repeat(101)])('rejects name boundary %s',async name=>{expect((await create({name})).status).toBe(400);expect(count()).toBe(0);});
 it('accepts one/100 Unicode characters, independent duplicate display names and hashed one-time secrets',async()=>{
  const a=await(await create({name:'a'})).json(),c=await(await create({name:'😀'.repeat(100)})).json();
  expect(a.application.clientId).not.toBe(c.application.clientId);expect(a.clientSecret).not.toBe(c.clientSecret);
  const rows=gate.db.prepare('SELECT * FROM oauthClient WHERE referenceId = ?').all(b.account.address.toLowerCase()) as Record<string,unknown>[];
  expect(rows).toHaveLength(2);expect(rows.every(row=>row.referenceId===b.account.address.toLowerCase()&&row.userId===null)).toBe(true);
  expect(rows[0].clientSecret).not.toBe(a.clientSecret);expect(rows[0].scopes).toBe('["openid"]');expect(rows[0].grantTypes).toBe('["authorization_code"]');
 });
 it.each([[],Array.from({length:11},(_,i)=>`https://app.example/${i}`),['https://app.example/cb','https://app.example/cb'],['http://app.example/cb'],['http://localhost:4000/cb'],['http://127.0.0.1:4001/cb'],['http://[::1]:4002/cb'],['https://localhost/cb'],['https://127.0.0.1/cb'],['https://[::1]/cb'],['https://app.localhost/cb'],['https://localhost./cb'],['https://127.1/cb'],['http://localhost.evil.example/cb'],['http://2130706433/cb'],['https://*.example/cb'],['https://app.example/*'],['https://app.example/#fragment'],['https://app.example/#'],['https://user:pass@app.example/cb'],['javascript:alert(1)'],['https://app.example\\evil/cb'],[' https://app.example/cb'],['https://']])('rejects redirect set %j',async redirectUris=>{expect((await create({redirectUris})).status).toBe(400);expect(count()).toBe(0);});
 it('accepts ten exact HTTPS redirect URIs',async()=>{const redirectUris=Array.from({length:10},(_,i)=>`https://app.example:${4400+i}/CB?q=${i}`);const response=await create({redirectUris});expect(response.status).toBe(201);expect((await response.json()).application.redirectUris).toEqual(redirectUris);});
 it.each(['owner','userId','referenceId','client_id','scope','grant_types','token_endpoint_auth_method','application_type','refresh_token'])('rejects authority/profile override %s',async field=>{expect((await create({[field]:'override'})).status).toBe(400);expect(count()).toBe(0);});
 it('blocks session-only and invalid bearer plus valid-cookie bypass on every old alias',async()=>{
  expect((await b.request('/api/applications',input())).status).toBe(401);expect((await b.request('/api/applications')).status).toBe(401);
  for(const path of ['/api/auth/oauth2/create-client','/api/auth/oauth2/register','/api/auth/oauth2/update-client','/api/auth/oauth2/delete-client','/api/auth/oauth2/rotate-client-secret'])expect((await b.request(path,{})).status).toBe(404);
  expect((await gate.handle(new Request(managementOrigin+'/api/applications',{headers:{authorization:'Bearer invalid',cookie:[...b.cookies].map(([k,v])=>k+'='+v).join('; ')}}))).status).toBe(401);
 });
});
describe('US-004 registration integrity, retries and storage',()=>{
 it('consumes an IAT only after successful metadata and permits one successful creation',async()=>{
  const credential=await iat(),body=input();expect((await b.api('/api/applications',credential,{...body,name:''})).status).toBe(400);
  expect((await b.api('/api/applications',credential,body)).status).toBe(201);
  const retry=await b.api('/api/applications',credential,body);expect(retry.status).toBe(200);expect((await retry.json()).clientSecret).toBeUndefined();
  expect((await b.api('/api/applications',credential,input())).status).toBe(401);expect(count()).toBe(1);
 });
 it('reconciles a consumed/expired IAT through valid parent registration authority without secret redisclosure',async()=>{
  const body=input(),credential=await iat();expect((await b.api('/api/applications',credential,body)).status).toBe(201);vi.setSystemTime(now+300001);
  const retry=await b.api('/api/applications',token.access_token,body);expect(retry.status).toBe(200);expect((await retry.json()).clientSecret).toBeUndefined();
  expect((await b.api('/api/applications',token.access_token,{...body,name:'changed'})).status).toBe(409);expect(count()).toBe(1);
 });
 it('persists failed-attempt rate and independent IAT issuance limits across tokens',async()=>{
  const credential=await iat();for(let i=0;i<5;i++)expect((await b.api('/api/applications',credential,input({name:''}))).status).toBe(400);
  expect((await b.api('/api/applications',credential,input())).status).toBe(429);
  for(let i=0;i<4;i++)expect((await b.api('/api/management/iat',token.access_token,{})).status).toBe(201);
  const other=await b.authorize();expect((await b.api('/api/management/iat',other.access_token,{})).status).toBe(429);
  vi.setSystemTime(now+60000);expect((await b.api('/api/management/iat',other.access_token,{})).status).toBe(201);expect((await b.api('/api/applications',credential,input())).status).toBe(201);
 });
 it('rolls back native creation and IAT consumption on a persistence failure, retaining the attempt limit',async()=>{
  const credential=await iat(),body=input();gate.db.exec("CREATE TRIGGER fail_submission BEFORE INSERT ON applicationSubmission BEGIN SELECT RAISE(ABORT,'injected'); END");const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  expect((await b.api('/api/applications',credential,body)).status).toBe(500);expect(count()).toBe(0);expect(gate.db.prepare('SELECT consumed FROM managementIat').get()).toEqual({consumed:0});
  gate.db.exec('DROP TRIGGER fail_submission');expect((await b.api('/api/applications',credential,body)).status).toBe(201);log.mockRestore();
 });
 it('rejects cross-owner reconciliation and native owner mutation',async()=>{
  const body=input(),response=await b.api('/api/applications',await iat(),body);expect(response.status).toBe(201);const id=(await response.json()).application.clientId;
  const other=new ManagementBrowser(gate);await other.login();const delegated=await other.authorize();expect((await other.api('/api/applications',delegated.access_token,body)).status).toBe(401);
  expect(()=>gate.db.prepare('UPDATE oauthClient SET referenceId = ? WHERE clientId = ?').run(other.account.address.toLowerCase(),id)).toThrow(/immutable/);
 });
 it('enforces quota, frees a deletion slot and cannot resurrect a deleted submission',async()=>{
  const bodies=[];for(let i=0;i<20;i++){vi.setSystemTime(now+Math.floor(i/5)*60000);const body=input();bodies.push(body);expect((await b.api('/api/applications',await iat(),body)).status).toBe(201);}
  vi.setSystemTime(now+240000);expect((await create()).status).toBe(409);expect(count()).toBe(20);
  const first=gate.db.prepare('SELECT clientId FROM oauthClient WHERE referenceId = ? ORDER BY rowid').get(b.account.address.toLowerCase()) as {clientId:string};
  const managed=await b.authorize({[first.clientId]:['delete']});expect((await b.api('/api/applications/'+first.clientId,managed.access_token,undefined,'DELETE',{'x-walletgate-confirm-delete':first.clientId})).status).toBe(200);
  expect((await b.api('/api/applications',token.access_token,bodies[0])).status).toBe(404);expect((await create()).status).toBe(201);expect(count()).toBe(20);
 });
 it('serializes same-IAT/same-submission use across real database connections and restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'walletgate-iat-'));let second:TestGate|undefined;
  try{
   gate.close();gate=await createTestWalletGate({...config,databasePath:join(dir,'test.sqlite')});b=new ManagementBrowser(gate);await b.login();token=await b.authorize();second=await createTestWalletGate({...config,databasePath:join(dir,'test.sqlite')});
   const other=new ManagementBrowser(second),credential=await iat(),body=input();
   const responses=await Promise.all([b.api('/api/applications',credential,body),other.api('/api/applications',credential,body)]);expect(responses.map(r=>r.status).sort()).toEqual([200,201]);expect(count()).toBe(1);
   const secrets=await Promise.all(responses.map(r=>r.json()));expect(secrets.filter(v=>v.clientSecret)).toHaveLength(1);
   second.close();second=undefined;gate.close();gate=await createTestWalletGate({...config,databasePath:join(dir,'test.sqlite')});b.gate=gate;expect((await b.api('/api/applications',token.access_token,body)).status).toBe(200);
  }finally{second?.close();rmSync(dir,{recursive:true,force:true});}
 });
 it('single-success creation survives independent-process retries without duplicate secrets',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'walletgate-process-'));
  try{
   gate.close();const persistent={...config,databasePath:join(dir,'test.sqlite')};gate=await createTestWalletGate(persistent);b=new ManagementBrowser(gate);await b.login();token=await b.authorize();const credential=await iat(),body=input();
   const worker=()=>new Promise<{status:number;secret:boolean}>((resolve,reject)=>{
    const code=`import {createWalletGate} from './backend/wallet-auth/auth.ts';let text='';for await(const chunk of process.stdin)text+=chunk;const v=JSON.parse(text);const g=await createWalletGate(v.config);const r=await g.handle(new Request(v.config.origin+'/api/applications',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+v.token},body:JSON.stringify(v.body)}));const b=await r.json();console.log(JSON.stringify({status:r.status,secret:typeof b.clientSecret==='string'}));g.close();`;
    const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',code],{stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);child.once('error',reject);child.once('close',status=>status===0?resolve(JSON.parse(output.trim())):reject(new Error('worker failed')));child.stdin.end(JSON.stringify({config:persistent,token:credential,body}));
   });
   const results=await Promise.all([worker(),worker()]);expect(results.map(r=>r.status).sort()).toEqual([200,201]);expect(results.filter(r=>r.secret)).toHaveLength(1);expect(count()).toBe(1);
  }finally{rmSync(dir,{recursive:true,force:true});}
 },15000);
});
