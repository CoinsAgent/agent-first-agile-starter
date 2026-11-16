import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin, GenericEndpointContext } from '@better-auth/core';
import { getOAuthProviderApi, type OAuthOptions, type OAuthRefreshToken, type Scope } from '@better-auth/oauth-provider';
import { protocolAdapter } from './policy';

export const CLI_CLIENT = 'walletgate-cli';
export const MANAGEMENT_RESOURCE = 'urn:walletgate:management';
export const MANAGEMENT_SCOPES = ['clients:manage', 'clients:register', 'offline_access'];
export const MANAGEMENT_IDLE = 7 * 86400_000;
export const MANAGEMENT_MAX = 30 * 86400_000;
export const managementSchema = `
CREATE TABLE managementGrant (id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, label TEXT NOT NULL, permissions TEXT NOT NULL, registration INTEGER NOT NULL, createdAt INTEGER NOT NULL, lastActivity INTEGER NOT NULL, expiresAt INTEGER NOT NULL, revoked INTEGER, codeId TEXT UNIQUE, replacement TEXT, activated INTEGER NOT NULL DEFAULT 0);
CREATE TABLE managementIat (token TEXT PRIMARY KEY, grantId TEXT NOT NULL REFERENCES managementGrant(id) ON DELETE CASCADE, expiresAt INTEGER NOT NULL, consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE managementRate (owner TEXT PRIMARY KEY, startedAt INTEGER NOT NULL, attempts INTEGER NOT NULL);
`;
export type Permissions = Record<string, ('read' | 'update' | 'delete')[]>;
export type ManagementGrant = { id: string; owner: string; label: string; permissions: string; registration: number; createdAt: number; lastActivity: number; expiresAt: number; revoked: number | null; codeId: string | null; replacement: string | null; activated: number };
export const hashManagement = (value: string) => createHash('sha256').update(value).digest('hex');
export function grantActive(grant: ManagementGrant | undefined, activated = true): grant is ManagementGrant {
  return !!grant && (!activated || !!grant.activated) && !grant.revoked && Date.now() < grant.expiresAt && Date.now() < grant.lastActivity + MANAGEMENT_IDLE;
}
export function getGrant(db: Database.Database, id: string) { return db.prepare('SELECT * FROM managementGrant WHERE id = ?').get(id) as ManagementGrant | undefined; }
export function revokeManagement(db: Database.Database, id: string) {
  const grant = getGrant(db, id);
  if (!grant) return;
  db.prepare('UPDATE managementGrant SET revoked = COALESCE(revoked, ?) WHERE id = ?').run(Date.now(), id);
  if (grant.codeId) {
    db.prepare('UPDATE oauthAccessToken SET revoked = ? WHERE authorizationCodeId = ?').run(Date.now(), grant.codeId);
    db.prepare('UPDATE oauthRefreshToken SET revoked = COALESCE(revoked, ?) WHERE authorizationCodeId = ?').run(Date.now(), grant.codeId);
  }
}
function invalid(error = 'invalid_grant'): never { throw new APIError('BAD_REQUEST', { error, error_description: 'Authorization is invalid or expired. Authorize the CLI again.' }); }
export function managementTokenPolicy(db: Database.Database, options: OAuthOptions<Scope[]>) {
  return { id: 'walletgate-management-policy', hooks: { before: [{ matcher: ctx => ctx.path === '/oauth2/token' || ctx.path === '/oauth2/revoke', handler: createAuthMiddleware(async ctx => {
    const provider = getOAuthProviderApi(ctx, options, ctx.body?.grant_type === 'refresh_token' ? 'refresh_token' : 'authorization_code');
    const { clientId, client } = await provider.authenticateClient({ requireCredentials: false });
    if (clientId !== CLI_CLIENT) invalid('unauthorized_client');
    if (ctx.path === '/oauth2/revoke') {
      if (typeof ctx.body.token !== 'string') invalid('invalid_request');
      for (const [table, type] of [['oauthRefreshToken', 'refresh_token'], ['oauthAccessToken', 'access_token']] as const) {
        const token = await provider.hashToken(ctx.body.token, type);
        const row = db.prepare(`SELECT authorizationCodeId FROM ${table} WHERE token = ? AND clientId = ?`).get(token, CLI_CLIENT) as { authorizationCodeId: string } | undefined;
        const grant = row ? db.prepare('SELECT id FROM managementGrant WHERE codeId = ?').get(row.authorizationCodeId) as { id: string } | undefined : undefined;
        if (grant) revokeManagement(db, grant.id);
      }
      return ctx.json({});
    }
    if (ctx.body.grant_type === 'authorization_code') {
      if (typeof ctx.body.code !== 'string') invalid();
      const codeId = await provider.hashToken(ctx.body.code, 'authorization_code');
      const code = await ctx.context.internalAdapter.findVerificationValue(codeId);
      if (!code) {
        const previous = db.prepare('SELECT id FROM managementGrant WHERE codeId = ?').get(codeId) as { id: string } | undefined;
        if (previous) revokeManagement(db, previous.id);
        invalid();
      }
      if(new Date(code.expiresAt).getTime()<=Date.now())invalid();
      const value = JSON.parse(code.value);
      const grant = getGrant(db, value.query?.walletgate_grant ?? '');
      if (!grantActive(grant, false) || grant.activated || grant.owner !== value.userId || value.query.client_id !== CLI_CLIENT || value.query.resource !== MANAGEMENT_RESOURCE) invalid();
      if (ctx.body.resource !== undefined && ctx.body.resource !== MANAGEMENT_RESOURCE) invalid('invalid_target');
      const session = db.prepare('SELECT authMethod, walletAddress, userId, expiresAt FROM session WHERE id = ?').get(value.sessionId) as { authMethod: string; walletAddress: string; userId: string; expiresAt: string } | undefined;
      if (!session || session.authMethod !== 'siwe' || session.walletAddress !== grant.owner || session.userId !== grant.owner || new Date(session.expiresAt).getTime() <= Date.now()) invalid();
      db.prepare('UPDATE managementGrant SET codeId = ? WHERE id = ?').run(codeId, grant.id);
      ctx.context.adapter = protocolAdapter(ctx.context.adapter, grant.expiresAt, codeId);
      return { context: { context: { adapter: ctx.context.adapter } } };
    }
    if (ctx.body.grant_type !== 'refresh_token' || typeof ctx.body.refresh_token !== 'string') invalid('unsupported_grant_type');
    const token = await provider.hashToken(ctx.body.refresh_token, 'refresh_token');
    const row = await ctx.context.adapter.findOne<OAuthRefreshToken<Scope[]> & { id: string }>({ model: 'oauthRefreshToken', where: [{ field: 'token', value: token }] });
    if (!row || row.clientId !== CLI_CLIENT) invalid();
    const grant = db.prepare('SELECT * FROM managementGrant WHERE codeId = ?').get(row.authorizationCodeId) as ManagementGrant | undefined;
    if (row.revoked) { if (grant) revokeManagement(db, grant.id); invalid(); }
    if (!grantActive(grant) || row.userId !== grant.owner || new Date(row.expiresAt).getTime() <= Date.now()) invalid();
    if (ctx.body.scope !== undefined && ctx.body.scope !== row.scopes.join(' ')) invalid('invalid_scope');
    if (ctx.body.resource !== undefined && ctx.body.resource !== MANAGEMENT_RESOURCE) invalid('invalid_target');
    const user = await ctx.context.internalAdapter.findUserById(grant.owner);
    if (!user) invalid();
    const remaining = Math.floor(grant.expiresAt / 1000) - Math.floor(Date.now() / 1000);
    if (remaining <= 0) invalid();
    ctx.context.adapter = protocolAdapter(ctx.context.adapter, grant.expiresAt, grant.codeId!);
    const issuance: GenericEndpointContext = { ...ctx, json: async body => body };
    const result = await getOAuthProviderApi(issuance, { ...options, accessTokenExpiresIn: Math.min(900, remaining), refreshTokenExpiresIn: remaining }, 'refresh_token').issueTokens({ client, user, scopes: row.scopes, refreshToken: row, resources: [MANAGEMENT_RESOURCE], originalResources: [MANAGEMENT_RESOURCE], authTime: row.authTime ? new Date(row.authTime) : undefined });
    if (Date.now() >= grant.expiresAt) throw new APIError('INTERNAL_SERVER_ERROR', { error: 'server_error' });
    db.prepare('UPDATE managementGrant SET lastActivity = ? WHERE id = ?').run(Date.now(), grant.id);
    return ctx.json(result);
  }) }] } } satisfies BetterAuthPlugin;
}

type Identity = { id: string; address: string };
type Pending = { query: string; binding: string; createdAt: number; reviewedSession?: string; owner?: string; replacement?: string };
const json = (body: unknown, status = 200, extra?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
async function destination(response: Response) { const value = await response.clone().json().catch(() => null); return response.headers.get('location') ?? (value?.redirect ? value.url as string : undefined); }
export function createManagement(deps: { db: Database.Database; origin: string; native: (request: Request) => Promise<Response>; identity: (headers: Headers) => Promise<Identity | null>; context: () => Promise<GenericEndpointContext>; options: OAuthOptions<Scope[]> }) {
  const { db, origin } = deps;
  const cookieName = origin.startsWith('https:') ? '__Host-walletgate-cli-' : 'walletgate-cli-';
  const native = (path: string, request: Request, body?: unknown, query?: URLSearchParams) => {
    const headers = new Headers(request.headers); headers.set('accept', 'application/json');
    if (body !== undefined) { headers.set('content-type', 'application/json'); headers.set('origin', origin); }
    return deps.native(new Request(origin + '/api/auth' + path + (query ? '?' + query : ''), { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  };
  async function authenticate(headers: Headers) {
    try {
      const raw = /^Bearer ([A-Za-z0-9_-]+)$/.exec(headers.get('authorization') ?? '')?.[1];
      if (!raw) throw new Error();
      const ctx = await deps.context(); ctx.headers = headers;
      const provider = getOAuthProviderApi(ctx, deps.options);
      const payload = await provider.requireActiveAccessToken(raw, CLI_CLIENT);
      const row = db.prepare('SELECT authorizationCodeId FROM oauthAccessToken WHERE token = ? AND clientId = ?').get(await provider.hashToken(raw, 'access_token'), CLI_CLIENT) as { authorizationCodeId: string } | undefined;
      const grant = row ? db.prepare('SELECT * FROM managementGrant WHERE codeId = ?').get(row.authorizationCodeId) as ManagementGrant | undefined : undefined;
      const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (payload.iss!==origin+'/api/auth' || typeof payload.scope!=='string' || !payload.scope.split(' ').includes('clients:manage') || !grantActive(grant) || payload.sub !== grant.owner || !audience.includes(MANAGEMENT_RESOURCE) || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) throw new Error();
      return grant;
    } catch { return null; }
  }
  async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/oauth2/authorize' && url.searchParams.get('client_id') === CLI_CLIENT) {
      if (request.method !== 'GET' || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) return json({ error: 'invalid_request' }, 400);
      const query = url.searchParams;
      try { const callback=new URL(query.get('redirect_uri')??'');if(callback.protocol!=='http:'||callback.hostname!=='127.0.0.1'||callback.pathname!=='/callback'||callback.search||callback.hash||callback.username||callback.password)return json({error:'invalid_request'},400); }
      catch { return json({error:'invalid_request'},400); }
      if (query.get('response_type') !== 'code' || query.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(query.get('code_challenge') ?? '') || !/^[A-Za-z0-9_-]{32,128}$/.test(query.get('state') ?? '') || query.get('resource') !== MANAGEMENT_RESOURCE || query.has('walletgate_grant')) return json({ error: 'invalid_request' }, 400);
      const scopes = (query.get('scope') ?? '').split(' ');
      if (!scopes.includes('clients:manage') || !scopes.includes('offline_access') || scopes.some(scope => !MANAGEMENT_SCOPES.includes(scope)) || new Set(scopes).size !== scopes.length) return json({ error: 'invalid_scope' }, 400);
      if ([...query.keys()].some(key => !['client_id','response_type','redirect_uri','scope','state','code_challenge','code_challenge_method','resource','walletgate_label','walletgate_replace'].includes(key))) return json({ error: 'invalid_request' }, 400);
      const label = query.get('walletgate_label') ?? 'CLI';
      if (!label.trim() || label.length > 80) return json({ error: 'invalid_request' }, 400);
      const replacement = query.get('walletgate_replace') ?? undefined;
      if (replacement && !/^[a-f0-9-]{36}$/.test(replacement)) return json({ error: 'invalid_request' }, 400);
      query.set('prompt', 'consent');
      const headers = new Headers(request.headers); if (!await deps.identity(headers)) headers.delete('cookie');
      const response = await native('/oauth2/authorize', new Request(request.url, { headers }), undefined, query);
      const target = await destination(response);
      if (!target || new URL(target, origin).origin !== origin) return json({ error: 'invalid_request' }, 400);
      const id = randomBytes(24).toString('hex'), binding = randomBytes(32).toString('hex'), now = Date.now();
      const row: Pending = { query: query.toString(), binding: hashManagement(binding), createdAt: now, replacement };
      db.prepare('INSERT INTO verification (id,identifier,value,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)').run('cli:'+id,'cli:'+id,JSON.stringify(row),new Date(now+300_000).toISOString(),new Date(now).toISOString(),new Date(now).toISOString());
      return new Response(null, { status: 302, headers: { Location: '/#cli=' + id, 'Cache-Control': 'no-store', 'Set-Cookie': `${cookieName}${id}=${binding}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${origin.startsWith('https:') ? '; Secure' : ''}` } });
    }
    const match = /^\/api\/management\/approval\/([a-f0-9]{48})$/.exec(url.pathname);
    if (match && ['GET','POST'].includes(request.method)) {
      const row = db.prepare('SELECT value,expiresAt FROM verification WHERE identifier = ?').get('cli:'+match[1]) as { value: string; expiresAt: string } | undefined;
      if (!row || new Date(row.expiresAt).getTime() <= Date.now()) return json({ error: 'CLI authorization expired. Start login again.' }, 410);
      const pending = JSON.parse(row.value) as Pending;
      const binding = request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+match[1]+'='))?.split('=')[1] ?? '';
      if (hashManagement(binding) !== pending.binding) return json({ error: 'Authorization belongs to another browser.' }, 403);
      const identity = await deps.identity(request.headers);
      if (!identity) return json({ needsLogin: true });
      const replacement = pending.replacement ? getGrant(db, pending.replacement) : undefined;
      if (pending.replacement && (!replacement || replacement.owner !== identity.address)) return json({ error: 'Authorization wallet does not match.' }, 403);
      if (pending.owner && pending.owner !== identity.address) return json({ error: 'Wallet changed. Start login again.' }, 409);
      const query = new URLSearchParams(pending.query);
      if (request.method === 'GET') {
        pending.reviewedSession = identity.id; pending.owner = identity.address;
        db.prepare('UPDATE verification SET value = ? WHERE identifier = ?').run(JSON.stringify(pending),'cli:'+match[1]);
        const clients = db.prepare('SELECT clientId,name FROM oauthClient WHERE referenceId = ? ORDER BY createdAt,clientId').all(identity.address);
        return json({ address: identity.address, label: query.get('walletgate_label') ?? 'CLI', expiresAt: new Date(row.expiresAt).getTime(), clients, registration: query.get('scope')!.split(' ').includes('clients:register'), replacement: replacement?.id });
      }
      if (request.headers.get('origin') !== origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Use same-origin JSON.' },403);
      const body = z.object({ accept: z.boolean(), registration: z.boolean(), permissions: z.record(z.string().max(200),z.array(z.enum(['read','update','delete'])).min(1).max(3)).refine(v=>Object.keys(v).length<=20) }).strict().safeParse(await request.json());
      if (!body.success) return json({ error: 'Invalid consent selection.' },400);
      if (pending.reviewedSession !== identity.id || pending.owner !== identity.address) return json({ error: 'Session changed. Review consent again.' },409);
      for (const [id, ops] of Object.entries(body.data.permissions)) if (new Set(ops).size !== ops.length || !db.prepare('SELECT 1 FROM oauthClient WHERE clientId = ? AND referenceId = ?').get(id,identity.address)) return json({ error: 'Invalid consent selection.' },400);
      if (body.data.registration && !query.get('scope')!.split(' ').includes('clients:register')) return json({ error: 'Registration was not requested.' },400);
      const grantId = randomUUID();
      query.set('walletgate_grant',grantId); query.set('scope','clients:manage offline_access'+(body.data.registration?' clients:register':''));
      const response = await native('/oauth2/authorize',request,undefined,query);
      const target = await destination(response);
      if (!target || new URL(target,origin).pathname !== '/oidc-consent') return json({ error: 'Review consent again.' },409);
      if (body.data.accept) db.prepare('INSERT INTO managementGrant (id,owner,label,permissions,registration,createdAt,lastActivity,expiresAt,replacement) VALUES (?,?,?,?,?,?,?,?,?)').run(grantId,identity.address,query.get('walletgate_label') ?? 'CLI',JSON.stringify(body.data.permissions),Number(body.data.registration),Date.now(),Date.now(),Math.floor(Date.now()/1000)*1000+MANAGEMENT_MAX,replacement?.id ?? null);
      db.prepare('DELETE FROM verification WHERE identifier = ?').run('cli:'+match[1]);
      return native('/oauth2/consent',request,{ accept:body.data.accept, oauth_query:new URL(target,origin).search.slice(1) });
    }
    if (url.pathname === '/api/management/authorizations' || /^\/api\/management\/authorizations\/[a-f0-9-]{36}$/.test(url.pathname)) {
      const identity = await deps.identity(request.headers);
      if (!identity) return json({ error:'Sign in with your wallet.' },401);
      if (request.method === 'GET' && url.pathname.endsWith('/authorizations')) {
        const rows = db.prepare('SELECT * FROM managementGrant WHERE owner = ? AND activated = 1 ORDER BY createdAt DESC,id').all(identity.address) as ManagementGrant[];
        return json({ authorizations:rows.map(row=>({ id:row.id,label:row.label,permissions:JSON.parse(row.permissions),registration:!!row.registration,createdAt:row.createdAt,lastActivity:row.lastActivity,expiresAt:Math.min(row.expiresAt,row.lastActivity+MANAGEMENT_IDLE),active:grantActive(row) })) });
      }
      if (request.method === 'POST' && !url.pathname.endsWith('/authorizations')) {
        if (request.headers.get('origin') !== origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error:'Use same-origin JSON.' },403);
        const id = url.pathname.split('/').pop()!;
        const grant = getGrant(db,id);
        if (!grant || grant.owner !== identity.address) return json({ error:'Not found or not authorized.' },404);
        revokeManagement(db,id); return json({ revoked:true });
      }
      return json({ error:'Not found.' },404);
    }
    if (['/api/auth/oauth2/token','/api/auth/oauth2/revoke'].includes(url.pathname) && request.method === 'POST') {
      const text = await request.clone().text(), body = new URLSearchParams(text);
      if (body.get('client_id') !== CLI_CLIENT) return null;
      if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded') || [...body.keys()].some(k=>body.getAll(k).length!==1)) return json({ error:'invalid_request' },400);
      const headers = new Headers(request.headers); headers.delete('cookie'); headers.delete('origin');
      const response = await deps.native(new Request(request.url,{ method:'POST',headers,body:text }));
      if (response.ok && url.pathname.endsWith('/token')) {
        const tokens = await response.clone().json();
        const ctx = await deps.context();
        const key = await getOAuthProviderApi(ctx,deps.options).hashToken(tokens.access_token,'access_token');
        const row = db.prepare('SELECT authorizationCodeId FROM oauthAccessToken WHERE token = ?').get(key) as { authorizationCodeId:string } | undefined;
        const grant = row ? db.prepare('SELECT * FROM managementGrant WHERE codeId = ?').get(row.authorizationCodeId) as ManagementGrant | undefined : undefined;
        if (!grantActive(grant,false)) throw new Error('ManagementIssuanceMismatch');
        db.prepare('UPDATE managementGrant SET activated = 1 WHERE id = ?').run(grant.id);
        if (grant.replacement) revokeManagement(db,grant.replacement);
        return json({ ...tokens, authorization_id:grant.id, owner:grant.owner, permissions:JSON.parse(grant.permissions), registration:!!grant.registration, grant_expires_at:grant.expiresAt, issuer:origin+'/api/auth' });
      }
      return response;
    }
    return null;
  }
  return { handle, authenticate };
}
