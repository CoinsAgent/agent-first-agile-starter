import type Database from 'better-sqlite3';
import type { BetterAuthPlugin, GenericEndpointContext } from '@better-auth/core';
import type { DBAdapter } from '@better-auth/core/db/adapter';
import { getOAuthProviderApi, type OAuthOptions, type OAuthRefreshToken, type Scope } from '@better-auth/oauth-provider';
import { parseAccessTokenAuthorization } from '@better-auth/core/oauth2';
import { resolveSigningKey, type JwtOptions } from 'better-auth/plugins/jwt';
import { APIError, createAuthMiddleware } from 'better-auth/api';

export const TOKEN_SECONDS = 900;
export const FAMILY_SECONDS = 7 * 24 * 60 * 60;
function invalid(error = 'invalid_grant'): never { throw new APIError('BAD_REQUEST', { error, error_description: 'The token request is invalid. Start authorization again.' }); }
const sameScopes = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every(v => b.includes(v));

// Existing web/code clients adopt this story's optional offline-access profile
// when consumed by the protocol. Persisted registration ownership/config is unchanged.
function protocolClient<T>(client: T): T {
  if (!client || typeof client !== 'object') return client;
  const value = client as Record<string, unknown>;
  if (Array.isArray(value.scopes) && sameScopes(value.scopes, ['openid']) && value.applicationType === 'web')
    return { ...value, scopes: ['openid', 'offline_access'] } as T;
  return client;
}
export function protocolAdapter(base: DBAdapter, deadline?: number, familyId?: string, forceConsent = false): DBAdapter {
  return {
    ...base,
    async findOne<T>(args: Parameters<DBAdapter['findOne']>[0]) { if (forceConsent && args.model === 'oauthConsent') return null; const row = await base.findOne<T>(args); return args.model === 'oauthClient' ? protocolClient(row) : row; },
    async findMany<T>(args: Parameters<DBAdapter['findMany']>[0]) { if (forceConsent && args.model === 'oauthConsent') return []; return base.findMany<T>(args); },
    async create(args) {
      if (args.model === 'oauthAccessToken' || args.model === 'oauthRefreshToken') {
        const data = { ...args.data, sessionId: null, ...(familyId ? { authorizationCodeId: familyId } : {}) } as Record<string, unknown>;
        if (deadline && data.expiresAt instanceof Date) data.expiresAt = new Date(Math.min(deadline, data.expiresAt.getTime()));
        return base.create({ ...args, data: data as typeof args.data });
      }
      return base.create(args);
    },
  };
}
function revokeFamily(db: Database.Database, row: { authorizationCodeId?: string; id: string }) {
  if (!row.authorizationCodeId) invalid();
  db.prepare('UPDATE oauthAccessToken SET revoked = ? WHERE authorizationCodeId = ?').run(Date.now(), row.authorizationCodeId);
  // Keep rotated rows as reuse/revocation tombstones through the family deadline.
  db.prepare('UPDATE oauthRefreshToken SET revoked = COALESCE(revoked, ?) WHERE authorizationCodeId = ?').run(Date.now(), row.authorizationCodeId);
}
export function tokenPolicy(db: Database.Database, options: OAuthOptions<Scope[]>) {
  async function refresh(ctx: GenericEndpointContext) {
    const provider = getOAuthProviderApi(ctx, options, 'refresh_token');
    const { clientId, client } = await provider.authenticateClient();
    const raw = ctx.body?.refresh_token;
    if (typeof raw !== 'string') invalid('invalid_request');
    const key = await provider.hashToken(raw, 'refresh_token');
    const adapter = ctx.context.adapter;
    const row = await adapter.findOne<OAuthRefreshToken<Scope[]> & { id: string }>({ model: 'oauthRefreshToken', where: [{ field: 'token', value: key }] });
    if (!row || row.clientId !== clientId) invalid();
    if (row.revoked) { revokeFamily(db, row); invalid(); }
    const deadline = new Date(row.expiresAt).getTime();
    const remaining = Math.floor(deadline / 1000) - Math.floor(Date.now() / 1000);
    if (remaining <= 0) invalid();
    if (ctx.body.scope !== undefined && (typeof ctx.body.scope !== 'string' || !sameScopes(ctx.body.scope.split(' '), row.scopes))) invalid('invalid_scope');
    if (ctx.body.resource !== undefined) invalid('invalid_target');
    const user = await ctx.context.internalAdapter.findUserById(row.userId);
    if (!user) invalid();
    // Public minting primitive retains provider rotation, signing and encoding.
    // Authorization above is our policy; absolute deadline is copied to each row.
    const scoped = { ...options, accessTokenExpiresIn: Math.min(TOKEN_SECONDS, remaining), idTokenExpiresIn: Math.min(TOKEN_SECONDS, remaining), refreshTokenExpiresIn: remaining };
    ctx.context.adapter = protocolAdapter(adapter, deadline, row.authorizationCodeId);
    // Capture the public minting result before rendering the HTTP response.
    const issuanceContext: GenericEndpointContext = { ...ctx, json: async body => body };
    const response = await getOAuthProviderApi(issuanceContext, scoped, 'refresh_token').issueTokens({
      client, user, scopes: row.scopes, refreshToken: row,
      authTime: row.authTime ? new Date(row.authTime) : undefined,
    });
    // Provider issuance contains awaits and samples ID-token time separately.
    // Do not release a signed result that outlives the absolute family limit.
    // A 5xx causes the enclosing real transaction to roll back rotation/issuance.
    const body = response;
    const claims = typeof body.id_token === 'string' ? JSON.parse(Buffer.from(body.id_token.split('.')[1], 'base64url').toString('utf8')) : null;
    if (Date.now() >= deadline || !claims || !Number.isFinite(claims.exp) || claims.exp * 1000 > deadline || typeof body.expires_at !== 'number' || body.expires_at * 1000 > deadline) {
      throw new APIError('INTERNAL_SERVER_ERROR', { error: 'server_error', error_description: 'Issuance crossed the token lifetime boundary. Retry or start authorization again.' });
    }
    return ctx.json(response);
  }
  return {
    id: 'walletgate-oidc-policy',
    hooks: { before: [{ matcher: ctx => ['/oauth2/token', '/oauth2/revoke', '/oauth2/authorize', '/oauth2/consent', '/oauth2/userinfo'].includes(ctx.path ?? ''),
      handler: createAuthMiddleware(async ctx => {
        let adapter = protocolAdapter(ctx.context.adapter, undefined, undefined, ctx.path === '/oauth2/authorize' && String(ctx.query?.prompt ?? '').split(' ').includes('none'));
        ctx.context.adapter = adapter;
        if (ctx.path === '/oauth2/token') {
          const grant = ctx.body?.grant_type;
          if (grant !== 'authorization_code' && grant !== 'refresh_token') invalid('unsupported_grant_type');
          await getOAuthProviderApi(ctx, options, grant).authenticateClient();
          if (grant === 'authorization_code') {
            if (typeof ctx.body.code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(ctx.body.code_verifier)) invalid('invalid_request');
            if (typeof ctx.body.code === 'string') {
              const key = await getOAuthProviderApi(ctx, options).hashToken(ctx.body.code, 'authorization_code');
              const code = await ctx.context.internalAdapter.findVerificationValue(key);
              if (code) {
                const value = JSON.parse(code.value) as { sessionId?: string; userId?: string };
                const session = value.sessionId ? db.prepare('SELECT userId, walletAddress, authMethod, expiresAt FROM session WHERE id = ?').get(value.sessionId) as { userId: string; walletAddress: string; authMethod: string; expiresAt: string } | undefined : undefined;
                const expiresAt = new Date(code.expiresAt).getTime();
                if (expiresAt <= Date.now() || !session || session.authMethod !== 'siwe' || session.userId !== value.userId || session.walletAddress !== value.userId || new Date(session.expiresAt).getTime() <= Date.now()) invalid();
                adapter = protocolAdapter(adapter, expiresAt - 60_000 + FAMILY_SECONDS * 1000);
                ctx.context.adapter = adapter;
              }
            }
          }
          const jwtOptions = ctx.context.options.plugins?.find(plugin => plugin.id === 'jwt')?.options as JwtOptions | undefined;
          await resolveSigningKey(ctx, jwtOptions, { signingAlgorithm: 'RS256' });
          if (ctx.body?.grant_type === 'refresh_token') return refresh(ctx);
          if (ctx.body?.grant_type !== 'authorization_code') invalid('unsupported_grant_type');
          if (ctx.body?.resource !== undefined) invalid('invalid_target');
        }
        if (ctx.path === '/oauth2/userinfo') {
          const token = parseAccessTokenAuthorization(ctx.headers?.get('authorization'))?.token ?? (typeof ctx.body?.access_token === 'string' ? ctx.body.access_token : undefined);
          if (token) {
            const payload = await getOAuthProviderApi(ctx, options).requireActiveAccessToken(token);
            if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) {
              ctx.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
              throw new APIError('UNAUTHORIZED', { error: 'invalid_token' });
            }
          }
        }
        if (ctx.path === '/oauth2/revoke') {
          const provider = getOAuthProviderApi(ctx, options);
          const { clientId } = await provider.authenticateClient();
          if (typeof ctx.body?.token !== 'string') invalid('invalid_request');
          const key = await provider.hashToken(ctx.body.token, 'refresh_token');
          const row = db.prepare('SELECT id, clientId, authorizationCodeId FROM oauthRefreshToken WHERE token = ?').get(key) as { id: string; clientId: string; authorizationCodeId?: string } | undefined;
          if (row?.clientId === clientId) { revokeFamily(db, row); return ctx.json({}); }
        }
        return { context: { context: { adapter } } };
      }),
    }] },
  } satisfies BetterAuthPlugin;
}
