import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { ApplicationError, validateRegistration } from './registration';
import { getGrant, grantActive, hashManagement, type ManagementGrant, type Permissions } from '../oidc';
function fail(status:number,message:string):never { throw new ApplicationError(status,message); }
type Client = { clientId:string; name:string; redirectUris:string; createdAt:string };
const project = (row:Client)=>({clientId:row.clientId,name:row.name,redirectUris:JSON.parse(row.redirectUris),createdAt:new Date(row.createdAt).toISOString(),profile:'Confidential web · authorization code · PKCE S256 · openid · client_secret_basic'});
export function createManagedApplications(deps:{db:Database.Database;authenticate:(headers:Headers)=>Promise<ManagementGrant|null>;register:(headers:Headers,body:unknown)=>Promise<Response>;invalidate:(id:string,redirects?:string[])=>void}) {
  const {db}=deps;
  function rate(table:'applicationRate'|'managementRate',owner:string) {
    const now=Date.now();
    const row=db.prepare(`SELECT startedAt,attempts FROM ${table} WHERE owner = ?`).get(owner) as {startedAt:number|string;attempts:number}|undefined;
    const start=row ? (typeof row.startedAt==='number'?row.startedAt:new Date(row.startedAt).getTime()) : now;
    if(row && now<start+60000 && row.attempts>=5)throw new ApplicationError(429,'Too many attempts. Retry after the rate window.',undefined,Math.ceil((start+60000-now)/1000));
    const started=table==='applicationRate'?new Date(now).toISOString():now;
    if(row && now<start+60000)db.prepare(`UPDATE ${table} SET attempts = attempts + 1 WHERE owner = ?`).run(owner);
    else if(row)db.prepare(`UPDATE ${table} SET startedAt = ?,attempts = 1 WHERE owner = ?`).run(started,owner);
    else if(table==='applicationRate')db.prepare('INSERT INTO applicationRate (id,owner,startedAt,attempts) VALUES (?,?,?,1)').run(hashManagement(owner),owner,started);
    else db.prepare('INSERT INTO managementRate VALUES (?,?,1)').run(owner,now);
  }
  function iat(headers:Headers) {
    const raw=/^Bearer ([A-Za-z0-9_-]+)$/.exec(headers.get('authorization')??'')?.[1];
    const row=raw ? db.prepare('SELECT * FROM managementIat WHERE token = ?').get(hashManagement(raw)) as {token:string;grantId:string;expiresAt:number;consumed:number}|undefined:undefined;
    const grant=row ? getGrant(db,row.grantId):undefined;
    if(!row || row.expiresAt<=Date.now() || !grantActive(grant) || !grant.registration)fail(401,'A valid registration IAT is required.');
    return {row,grant};
  }
  async function register(request:Request) {
    let grant:ManagementGrant,row:{token:string;grantId:string;expiresAt:number;consumed:number}|undefined;
    // A management token can reconcile a prior public result, never create.
    const manager=await deps.authenticate(request.headers);
    if(manager?.registration)grant=manager;
    else {const result=iat(request.headers);grant=result.grant;row=result.row;}
    rate('applicationRate',grant.owner);
    const input=validateRegistration(await request.json());
    const key=hashManagement(grant.owner+':'+input.requestId),digest=hashManagement(JSON.stringify([input.name,input.redirectUris]));
    const prior=db.prepare('SELECT digest,clientId,result,grantId FROM applicationSubmission WHERE key = ?').get(key) as {digest:string;clientId:string;result:string;grantId:string}|undefined;
    if(prior){
      if(prior.grantId!==grant.id || !grantActive(getGrant(db,prior.grantId)))fail(403,'The original active registration authorization is required for reconciliation.');
      if(prior.digest!==digest)fail(409,'This submission already used different values.');
      const client=db.prepare('SELECT * FROM oauthClient WHERE clientId = ? AND referenceId = ?').get(prior.clientId,grant.owner) as Client|undefined;
      if(!client)fail(404,'Not found or not authorized.');
      db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);
      return {application:{...JSON.parse(prior.result),requestId:input.requestId},replayed:true};
    }
    if(!row || row.expiresAt<=Date.now() || row.consumed)fail(401,'An unexpired unused IAT is required for creation.');
    const count=db.prepare('SELECT count(*) n FROM oauthClient WHERE referenceId = ?').get(grant.owner) as {n:number};
    if(count.n>=20)fail(409,'You have reached the 20-application limit. Delete a client to free a slot.');
    db.exec('SAVEPOINT registration');
    try {
      const response=await deps.register(request.headers,{client_name:input.name,redirect_uris:input.redirectUris,application_type:'web',token_endpoint_auth_method:'client_secret_basic',grant_types:['authorization_code'],response_types:['code'],scope:'openid'});
      const created=await response.json();
      if(!response.ok || typeof created.client_id!=='string' || typeof created.client_secret!=='string')throw new ApplicationError(response.status>=500?503:400,'Registration failed. Check metadata and retry the same submission.');
      const client=db.prepare('SELECT * FROM oauthClient WHERE clientId = ? AND referenceId = ? AND userId IS NULL').get(created.client_id,grant.owner) as Client|undefined;
      if(!client)throw new Error('RegistrationOwnershipMismatch');
      db.prepare('INSERT INTO applicationSubmission (id,key,owner,requestId,digest,clientId,result,grantId) VALUES (?,?,?,?,?,?,?,?)').run(key,key,grant.owner,input.requestId,digest,client.clientId,JSON.stringify(project(client)),grant.id);
      if(db.prepare('UPDATE managementIat SET consumed = 1 WHERE token = ? AND consumed = 0 AND expiresAt > ?').run(row.token,Date.now()).changes!==1)throw new Error('IatExpiredDuringRegistration');
      if(!grantActive(getGrant(db,grant.id)))throw new Error('GrantExpiredDuringRegistration');
      db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);
      db.exec('RELEASE registration');
      return {application:{...project(client),requestId:input.requestId},clientSecret:created.client_secret,replayed:false};
    }catch(error){db.exec('ROLLBACK TO registration');db.exec('RELEASE registration');throw error;}
  }
  return async function applications(request:Request):Promise<Response|null>{
    const url=new URL(request.url);
    if(!['/api/applications','/api/management/iat'].includes(url.pathname) && !/^\/api\/applications\/[^/]+$/.test(url.pathname))return null;
    const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    if(url.pathname==='/api/applications' && request.method==='POST'){
      if(!request.headers.get('content-type')?.startsWith('application/json'))fail(400,'Use JSON.');
      const result=await register(request);return json(result,result.replayed?200:201);
    }
    const grant=await deps.authenticate(request.headers);
    if(!grant)fail(401,'A valid management access token is required.');
    if(url.pathname==='/api/management/iat' && request.method==='POST'){
      if(!grant.registration)fail(403,'Registration permission is required.');
      rate('managementRate',grant.owner);
      const token=randomBytes(32).toString('base64url'),expiresAt=Math.min(Date.now()+300000,grant.expiresAt);
      db.prepare('INSERT INTO managementIat (token,grantId,expiresAt) VALUES (?,?,?)').run(hashManagement(token),grant.id,expiresAt);
      db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);
      return json({initial_access_token:token,expires_at:expiresAt},201);
    }
    const permissions=JSON.parse(grant.permissions) as Permissions;
    const id=url.pathname==='/api/applications'?undefined:decodeURIComponent(url.pathname.slice('/api/applications/'.length));
    const permission=request.method==='GET'?'read':request.method==='PATCH'?'update':request.method==='DELETE'?'delete':null;
    if(!permission)fail(405,'Method not allowed.');
    if(!id && request.method==='GET'){
      const rows=db.prepare('SELECT * FROM oauthClient WHERE referenceId = ? ORDER BY createdAt DESC,clientId').all(grant.owner) as Client[];
      db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);
      return json({applications:rows.filter(row=>permissions[row.clientId]?.includes('read')).map(project)});
    }
    if(!id || !permissions[id]?.includes(permission))fail(404,'Not found or not authorized.');
    const client=db.prepare('SELECT * FROM oauthClient WHERE clientId = ? AND referenceId = ?').get(id,grant.owner) as Client|undefined;
    if(!client)fail(404,'Not found or not authorized.');
    if(request.method==='GET'){db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);return json({application:project(client)});}
    if(request.method==='PATCH'){
      const body=z.object({name:z.string(),redirectUris:z.array(z.string())}).strict().safeParse(await request.json());
      if(!body.success)fail(400,'Only name and redirectUris may be updated.');
      const value=validateRegistration({...body.data,requestId:'00000000-0000-4000-8000-000000000000'});
      deps.invalidate(id,value.redirectUris);
      db.prepare('UPDATE oauthClient SET name = ?,redirectUris = ?,updatedAt = ? WHERE clientId = ? AND referenceId = ?').run(value.name,JSON.stringify(value.redirectUris),new Date().toISOString(),id,grant.owner);
    }else{
      if(request.headers.get('x-walletgate-confirm-delete')!==id)fail(400,'Explicit delete confirmation is required.');
      deps.invalidate(id);
      db.prepare('DELETE FROM oauthClient WHERE clientId = ? AND referenceId = ?').run(id,grant.owner);
      // Keep submission tombstones so replay cannot resurrect deleted clients.
    }
    db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(),grant.id);
    return json({clientId:id,outcome:request.method==='PATCH'?'updated':'deleted'});
  };
}
