import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { getMigrations } from 'better-auth/db/migration';
import { siwe } from 'better-auth/plugins';
import { getAddress, verifyMessage, type Hex } from 'viem';
import { createSiweMessage, parseSiweMessage } from 'viem/siwe';
import { z } from 'zod';
import type { Config } from '../infrastructure/config';
import { createQrAuth } from './qr';
import { applicationSchema, ApplicationError, createApplications } from '../applications';
import { registrationProvider } from '../oidc';

export const CHALLENGE_MS = 5 * 60 * 1000;
export const SESSION_MS = 60 * 60 * 1000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieValue = (headers: Headers, name: string) => headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

class RequestTooLarge extends Error {}
async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Missing JSON body');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 8192) {
      // Cancelling Better Call's input stream destroys its socket before 413 can be sent.
      // Leave input paused and close the connection after writing the response instead.
      reader.releaseLock();
      throw new RequestTooLarge();
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
type Challenge = { message: string; expiresAt: number };
export async function createWalletGate(config: Config) {
  if (config.databasePath !== ':memory:') mkdirSync(dirname(config.databasePath), { recursive: true, mode: 0o700 });
  const db = new Database(config.databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE IF NOT EXISTS walletChallenge (attemptHash TEXT PRIMARY KEY, message TEXT NOT NULL, expiresAt INTEGER NOT NULL)');
  const secure = config.origin.startsWith('https:');
  const attemptCookie = secure ? '__Host-walletgate-attempt' : 'walletgate-attempt';
  const cookie = (token: string, age: number) => `${attemptCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const unauthorised = () => new APIError('UNAUTHORIZED', { message: 'Sign-in attempt is invalid or expired. Start again.' });
  const auth = betterAuth({
    appName: 'WalletGate', baseURL: config.origin, secret: config.secret, database: db,
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: SESSION_MS / 1000, disableSessionRefresh: true, cookieCache: { enabled: false },
      additionalFields: {
        authMethod: { type: 'string', required: false, input: false },
        walletAddress: { type: 'string', required: false, input: false },
      },
    },
    advanced: { useSecureCookies: secure, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure } },
    plugins: [applicationSchema, ...registrationProvider(), siwe({
      domain: new URL(config.origin).host, anonymous: true,
      getNonce: async () => randomBytes(24).toString('hex'),
      verifyMessage: async ({ message, signature, address }) => {
        try {
          const parsed = parseSiweMessage(message);
          return !!parsed.expirationTime && Date.now() < parsed.expirationTime.getTime() &&
            await verifyMessage({ address: address as Hex, message, signature: signature as Hex });
        } catch { return false; }
      },
    })],
    hooks: {
      before: createAuthMiddleware(async ctx => {
        if (ctx.path !== '/siwe/verify') return;
        if (ctx.headers?.get('origin') !== config.origin) throw unauthorised();
        const body = z.object({ message: z.string().max(4096), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).strict().safeParse(ctx.body);
        if (!body.success) throw unauthorised();
        const token = cookieValue(ctx.headers, attemptCookie);
        const row = db.prepare('SELECT message, expiresAt FROM walletChallenge WHERE attemptHash = ?').get(hash(token)) as Challenge | undefined;
        if (!row || row.message !== body.data.message || row.expiresAt <= Date.now()) throw unauthorised();
        const parsed = parseSiweMessage(body.data.message);
        if (!parsed.issuedAt || parsed.issuedAt.getTime() > Date.now() ||
            (parsed.notBefore && parsed.notBefore.getTime() > Date.now())) throw unauthorised();
        // Delete atomically before asynchronous signature verification: two workers cannot accept one attempt.
        const consumed = db.prepare('DELETE FROM walletChallenge WHERE attemptHash = ? AND message = ? AND expiresAt > ? RETURNING attemptHash').get(hash(token), body.data.message, Date.now());
        if (!consumed) throw unauthorised();
      }),
    },
    databaseHooks: {
      session: { create: { before: async (session, ctx) => {
        if (ctx?.path !== '/siwe/verify') return false;
        const parsed = parseSiweMessage(ctx.body.message);
        if (!parsed.address || parsed.chainId !== 1 || !parsed.expirationTime || parsed.expirationTime.getTime() <= Date.now()) return false;
        return { data: { ...session, createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_MS), authMethod: 'siwe', walletAddress: parsed.address.toLowerCase() } };
      } } },
    },
  });
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
  // The SIWE plugin uses canonical checksummed addresses; prevent concurrent duplicate wallet identities.
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS wallet_address_chain_unique ON walletAddress(address, chainId)');
  // Defense in depth: cap is enforced by SQLite even under independent concurrent connections.
  db.exec(`CREATE TRIGGER IF NOT EXISTS walletgate_client_cap BEFORE INSERT ON oauthClient
    WHEN NEW.referenceId IS NOT NULL AND (SELECT count(*) FROM oauthClient WHERE referenceId = NEW.referenceId) >= 20
    BEGIN SELECT RAISE(ABORT, 'ApplicationLimit'); END`);
  async function session(headers: Headers) {
    const data = await auth.api.getSession({ headers });
    if (!data || data.session.authMethod !== 'siwe' || typeof data.session.walletAddress !== 'string' || !/^0x[0-9a-f]{40}$/.test(data.session.walletAddress ?? '') || data.session.expiresAt.getTime() <= Date.now()) return null;
    return { address: data.session.walletAddress, expiresAt: data.session.expiresAt.toISOString() };
  }
  const applications = createApplications({
    adapter: (await auth.$context).adapter, session,
    create: (headers, input) => auth.api.createOAuthClient({ headers, body: {
      client_name: input.name, redirect_uris: input.redirectUris, application_type: 'web',
      token_endpoint_auth_method: 'client_secret_basic', grant_types: ['authorization_code'],
      response_types: ['code'], scope: 'openid',
    } }),
  });
  function internal(request: Request, path: string, body: unknown) {
    return auth.handler(new Request(`${config.origin}/api/auth${path}`, { method: 'POST', headers: request.headers, body: JSON.stringify(body) }));
  }
  const qr = createQrAuth(db, config.origin, {
    nonce: async request => {
      const response = await internal(request, '/siwe/nonce', {});
      if (!response.ok) throw new Error('NonceUnavailable');
      return (await response.json() as { nonce: string }).nonce;
    },
    complete: async (request, proof) => {
      // Reuse the supported SIWE plugin and its nonce consumption/session hooks.
      // This attempt binding is server-only, made solely for the approved QR proof.
      const binding = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO walletChallenge VALUES (?, ?, ?)').run(hash(binding), proof.message, proof.expiresAt);
      const headers = new Headers(request.headers);
      const existing = (headers.get('cookie') ?? '').split(';').filter(v => !v.trim().startsWith(`${attemptCookie}=`)).join(';');
      headers.set('cookie', `${existing}; ${attemptCookie}=${binding}`);
      try {
        const response = await internal(new Request(request.url, { headers }), '/siwe/verify', { message: proof.message, signature: proof.signature });
        const result = json(response.ok ? { success: true } : { error: 'QR approval expired or could not complete. Start again.' }, response.ok ? 200 : 401);
        for (const value of response.headers.getSetCookie()) result.headers.append('Set-Cookie', value);
        return result;
      } finally { db.prepare('DELETE FROM walletChallenge WHERE attemptHash = ?').run(hash(binding)); }
    },
  });
  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== config.origin) return json({ error: 'Untrusted origin.' }, 403);
    if (request.method === 'POST' && (request.headers.get('origin') !== config.origin || !request.headers.get('content-type')?.startsWith('application/json')))
      return json({ error: 'Use a same-origin JSON request.' }, 403);
    try {
      if (url.pathname === '/api/applications' && request.method === 'POST') {
        const result = await applications.create(request.headers, () => readJson(request));
        return json(result, result.replayed ? 200 : 201);
      }
      if (request.method === 'GET' && (url.pathname === '/api/applications' || /^\/api\/applications\/[^/]+$/.test(url.pathname))) {
        const id = url.pathname === '/api/applications' ? undefined : decodeURIComponent(url.pathname.slice('/api/applications/'.length));
        const list = await applications.list(request.headers, id);
        return json(id ? { application: list[0] } : { applications: list });
      }
      if (url.pathname.startsWith('/api/qr/') && request.method === 'POST') return await qr(request, url.pathname.slice('/api/qr/'.length), await readJson(request));
      if (url.pathname === '/api/session' && request.method === 'GET') {
        const current = await session(request.headers);
        return current ? json(current) : json({ error: 'Sign in with your wallet.' }, 401);
      }
      if (url.pathname === '/api/challenge' && request.method === 'POST') {
        const input = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), chainId: z.literal(1) }).strict().parse(await readJson(request));
        const address = getAddress(input.address.toLowerCase());
        const nonceResponse = await internal(request, '/siwe/nonce', {});
        if (!nonceResponse.ok) return json({ error: 'Could not start sign-in. Try again.' }, 400);
        const { nonce } = await nonceResponse.json() as { nonce: string };
        const now = Date.now();
        const expiresAt = now + CHALLENGE_MS;
        const message = createSiweMessage({
          address, chainId: 1, domain: new URL(config.origin).host, uri: config.origin,
          version: '1', nonce, issuedAt: new Date(now), expirationTime: new Date(expiresAt),
          statement: 'Sign in to WalletGate. This proves wallet control and does not authorize a transaction.',
        });
        const token = randomBytes(32).toString('hex');
        const oldToken = cookieValue(request.headers, attemptCookie);
        db.prepare('DELETE FROM walletChallenge WHERE attemptHash = ? OR expiresAt <= ?').run(hash(oldToken), now);
        db.prepare('INSERT INTO walletChallenge (attemptHash, message, expiresAt) VALUES (?, ?, ?)').run(hash(token), message, expiresAt);
        return json({ message, address: address.toLowerCase(), expiresAt: new Date(expiresAt).toISOString() }, 200, { 'Set-Cookie': cookie(token, CHALLENGE_MS / 1000) });
      }
      if (url.pathname === '/api/verify' && request.method === 'POST') {
        const body = await readJson(request);
        const response = await internal(request, '/siwe/verify', body);
        const result = json(response.ok ? { success: true } : { error: 'Signature or sign-in attempt is invalid or expired. Start again.' }, response.ok ? 200 : 401);
        for (const value of response.headers.getSetCookie()) result.headers.append('Set-Cookie', value);
        result.headers.append('Set-Cookie', cookie('', 0));
        return result;
      }
      if (url.pathname === '/api/logout' && request.method === 'POST') {
        const response = await internal(request, '/sign-out', {});
        const result = json({ success: response.ok }, response.ok ? 200 : 400);
        for (const value of response.headers.getSetCookie()) result.headers.append('Set-Cookie', value);
        const token = cookieValue(request.headers, attemptCookie);
        db.prepare('DELETE FROM walletChallenge WHERE attemptHash = ?').run(hash(token));
        result.headers.append('Set-Cookie', cookie('', 0));
        return result;
      }
      // Do not expose Better Auth's generic login, account linking or client-registration routes.
      return json({ error: 'Not found.' }, 404);
    } catch (error) {
      if (error instanceof ApplicationError) return json({ error: error.message, field: error.field }, error.status, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined);
      if (error instanceof RequestTooLarge) return json({ error: 'Request too large.' }, 413, { Connection: 'close' });
      if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Invalid sign-in request.' }, 400);
      // Do not include signatures, session credentials or upstream errors in responses/logs.
      console.error('WalletGate request failed:', error instanceof Error ? error.name : 'UnknownError');
      return json({ error: 'Sign-in is unavailable. Try again.' }, 500);
    }
  }
  return { handle, db, auth, close: () => db.close() };
}
