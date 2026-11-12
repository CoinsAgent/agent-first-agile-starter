import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getCurrentAdapter, runWithTransaction } from '@better-auth/core/context';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { siwe } from 'better-auth/plugins';
import { getAddress, verifyMessage, type Hex } from 'viem';
import { createSiweMessage, parseSiweMessage } from 'viem/siwe';
import { z } from 'zod';
import type { Config } from '../infrastructure/config';
import { createQrAuth } from './qr';
import { applicationSchema, ApplicationError, assertCompatibleApplications, createApplications } from '../applications';
import { registrationProvider } from '../oidc';
import { assertCompatibleIdentity, attachIdentityFence, canonicalAddress } from './identity';

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
// SIWE/QR requests may overlap (cancellation must interrupt verification), but
// registration and SIWE transactions need exclusive access to their SQLite connection.
// Existing requests share access; a registration waits until they finish.
type DatabaseQueue = { readers: number; writer: boolean; readersWaiting: (() => void)[]; writersWaiting: (() => void)[]; references: number };
const databaseQueues = new Map<string, DatabaseQueue>();
function acquireDatabase(queue: DatabaseQueue, exclusive: boolean): Promise<() => void> {
  return new Promise(resolve => {
    const advance = () => {
      if (queue.writer) return;
      // Allow waiting ordinary operations together, preserving QR cancellation.
      for (const enter of queue.readersWaiting.splice(0)) enter();
      if (queue.readers === 0) queue.writersWaiting.shift()?.();
    };
    const enter = () => {
      if (exclusive) queue.writer = true; else queue.readers++;
      resolve(() => { if (exclusive) queue.writer = false; else queue.readers--; advance(); });
    };
    if (exclusive) { queue.writersWaiting.push(enter); if (!queue.writer && queue.readers === 0) queue.writersWaiting.shift()?.(); }
    else if (queue.writer) queue.readersWaiting.push(enter);
    else enter();
  });
}
type Challenge = { message: string; expiresAt: number };
class VerificationFailed extends Error {
  constructor(public response: Response) { super('VerificationFailed'); }
}
export async function createWalletGate(config: Config, connection?: Database.Database) {
  let db: Database.Database;
  try { db = connection ?? new Database(config.databasePath, { fileMustExist: true }); }
  catch { throw new Error('WalletGate database is missing. Run scripts/init-database.ts --database /absolute/path/to/empty.sqlite before starting the server.'); }
  let generationCurrent: () => boolean;
  try { generationCurrent = attachIdentityFence(db); assertCompatibleApplications(db); assertCompatibleIdentity(db); } catch (error) { db.close(); throw error; }
  const proofContext = new AsyncLocalStorage<{ message: string; verifiedAddress?: string }>();
  const queueKey = config.databasePath === ':memory:' ? randomUUID() : resolve(config.databasePath);
  const queue = databaseQueues.get(queueKey) ?? { readers: 0, writer: false, readersWaiting: [], writersWaiting: [], references: 0 };
  queue.references++; databaseQueues.set(queueKey, queue);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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
          const valid = !!parsed.expirationTime && Date.now() < parsed.expirationTime.getTime() &&
            await verifyMessage({ address: address as Hex, message, signature: signature as Hex });
          const context = proofContext.getStore();
          if (!valid || !context || context.message !== message || parsed.chainId !== 1) return false;
          context.verifiedAddress = address.toLowerCase();
          return true;
        } catch { return false; }
      },
    })],
    hooks: {
      before: createAuthMiddleware(async ctx => {
        if (ctx.path !== '/siwe/verify') return;
        if (ctx.headers?.get('origin') !== config.origin) throw unauthorised();
        const body = z.object({ message: z.string().max(4096), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).strict().safeParse(ctx.body);
        if (!body.success) throw unauthorised();
        if (proofContext.getStore()?.message !== body.data.message) throw unauthorised();
        // The SIWE plugin also calls context.adapter directly. Give this
        // endpoint the supported transaction adapter, not the pooled fallback.
        return { context: { context: { adapter: await getCurrentAdapter(ctx.context.adapter) } } };
      }),
    },
    databaseHooks: {
      user: { create: { before: async (user, ctx) => {
        const address = proofContext.getStore()?.verifiedAddress;
        if (ctx?.path !== '/siwe/verify' || !canonicalAddress(address)) throw unauthorised();
        return { data: { ...user, id: address } };
      } } },
      session: { create: { before: async (session, ctx) => {
        if (ctx?.path !== '/siwe/verify') return false;
        const parsed = parseSiweMessage(ctx.body.message);
        const address = proofContext.getStore()?.verifiedAddress;
        if (!parsed.address || !canonicalAddress(address) || session.userId !== address || parsed.address.toLowerCase() !== address || parsed.chainId !== 1 || !parsed.expirationTime || parsed.expirationTime.getTime() <= Date.now()) return false;
        // Better Auth merges these custom fields into its native session data.
        return { data: { authMethod: 'siwe', walletAddress: address } };
      } } },
    },
  });
  async function session(headers: Headers) {
    if (!generationCurrent()) return null;
    const data = await auth.api.getSession({ headers });
    if (!data || data.session.authMethod !== 'siwe' || typeof data.session.walletAddress !== 'string' || !/^0x[0-9a-f]{40}$/.test(data.session.walletAddress ?? '') || data.session.expiresAt.getTime() <= Date.now()) return null;
    const address = data.session.walletAddress;
    if (data.user.id !== address || data.session.userId !== address ||
        !db.prepare('SELECT 1 FROM walletAddress WHERE userId = ? AND lower(address) = ? AND chainId = 1').get(address, address)) return null;
    return { userId: address, address, expiresAt: data.session.expiresAt.toISOString() };
  }
  const applications = createApplications({
    adapter: (await auth.$context).adapter, session,
    create: (headers, input) => auth.api.createOAuthClient({ headers, body: {
      client_name: input.name, redirect_uris: input.redirectUris, application_type: 'web',
      token_endpoint_auth_method: 'client_secret_basic', grant_types: ['authorization_code'],
      response_types: ['code'], scope: 'openid',
    } }),
  });
  async function internal(request: Request, path: string, body: unknown) {
    const invoke = () => auth.handler(new Request(`${config.origin}/api/auth${path}`, { method: 'POST', headers: request.headers, body: JSON.stringify(body) }));
    if (path !== '/siwe/verify') return invoke();
    // Consume the browser attempt BEFORE the account transaction. A failed
    // signature/storage operation must not resurrect that attempt on rollback.
    const parsedBody = z.object({ message: z.string().max(4096), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).strict().safeParse(body);
    if (!parsedBody.success || request.headers.get('origin') !== config.origin) return json({ error: 'Invalid sign-in attempt.' }, 401);
    const { message } = parsedBody.data;
    const attempt = cookieValue(request.headers, attemptCookie);
    const row = db.prepare('SELECT message, expiresAt FROM walletChallenge WHERE attemptHash = ?').get(hash(attempt)) as Challenge | undefined;
    const parsed = parseSiweMessage(message);
    if (!row || row.message !== message || row.expiresAt <= Date.now() || !parsed.issuedAt || parsed.issuedAt.getTime() > Date.now() ||
        (parsed.notBefore && parsed.notBefore.getTime() > Date.now())) return json({ error: 'Invalid sign-in attempt.' }, 401);
    if (!db.prepare('DELETE FROM walletChallenge WHERE attemptHash = ? AND message = ? AND expiresAt > ? RETURNING attemptHash').get(hash(attempt), message, Date.now())) return json({ error: 'Invalid sign-in attempt.' }, 401);
    try {
      return await runWithTransaction((await auth.$context).adapter, () => proofContext.run({ message }, async () => {
        const response = await auth.api.verifySiweMessage({
          headers: request.headers, body: parsedBody.data,
          request: new Request(`${config.origin}/api/auth/siwe/verify`, { method: 'POST', headers: request.headers }),
          asResponse: true,
        });
        // Better Auth converts endpoint errors to responses. Throw across the
        // transaction boundary so incomplete identity creation is rolled back.
        if (!response.ok) throw new VerificationFailed(response);
        return response;
      }));
    } catch (error) {
      if (error instanceof VerificationFailed) return error.response;
      throw error;
    }
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
  await (await auth.$context).checkSchema?.();
  async function handle(request: Request, readBody = () => readJson(request)): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== config.origin) return json({ error: 'Untrusted origin.' }, 403);
    if (request.method === 'POST' && (request.headers.get('origin') !== config.origin || !request.headers.get('content-type')?.startsWith('application/json')))
      return json({ error: 'Use a same-origin JSON request.' }, 403);
    try {
      if (url.pathname === '/api/applications' && request.method === 'POST') {
        const result = await applications.create(request.headers, () => readBody());
        return json(result, result.replayed ? 200 : 201);
      }
      if (request.method === 'GET' && (url.pathname === '/api/applications' || /^\/api\/applications\/[^/]+$/.test(url.pathname))) {
        const id = url.pathname === '/api/applications' ? undefined : decodeURIComponent(url.pathname.slice('/api/applications/'.length));
        const list = await applications.list(request.headers, id);
        return json(id ? { application: list[0] } : { applications: list });
      }
      if (url.pathname.startsWith('/api/qr/') && request.method === 'POST') return await qr(request, url.pathname.slice('/api/qr/'.length), await readBody());
      if (url.pathname === '/api/session' && request.method === 'GET') {
        const current = await session(request.headers);
        return current ? json(current) : json({ error: 'Sign in with your wallet.' }, 401);
      }
      if (url.pathname === '/api/challenge' && request.method === 'POST') {
        const input = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), chainId: z.literal(1) }).strict().parse(await readBody());
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
        const body = await readBody();
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
  async function queuedHandle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Read bounded input before joining the database queue: a slow sender must
    // never hold every other browser's database operations. Preserve parse errors
    // for the handler, including authenticated rate accounting on invalid input.
    const needsBody = request.method === 'POST' && url.origin === config.origin &&
      request.headers.get('origin') === config.origin && request.headers.get('content-type')?.startsWith('application/json') &&
      (['/api/applications', '/api/challenge', '/api/verify', '/api/logout'].includes(url.pathname) || url.pathname.startsWith('/api/qr/'));
    const parsed = needsBody ? await readJson(request).then(value => ({ value }), error => ({ error })) : { value: undefined };
    const exclusive = request.method === 'POST' && ['/api/applications', '/api/verify', '/api/qr/complete'].includes(url.pathname);
    const release = await acquireDatabase(queue, exclusive);
    try {
      if (!generationCurrent()) return json({ error: 'Local data was reset. Restart this server before signing in again.' }, 503);
      const response = await handle(request, async () => {
        if ('error' in parsed) throw parsed.error;
        return parsed.value;
      });
      return generationCurrent() ? response : json({ error: 'Local data was reset. Restart this server before signing in again.' }, 503);
    } finally { release(); }
  }
  return { handle: queuedHandle, db, auth, close: () => {
    db.close(); queue.references--; if (!queue.references) databaseQueues.delete(queueKey);
  } };
}
