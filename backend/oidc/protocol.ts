import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';

type Identity = { id: string; address: string; createdAt: number };
type Pending = { query: string; owner: string; createdAt: number; initialSession?: string; fresh: boolean; reviewedSession?: string; signedQuery?: string };
type Dependencies = { origin: string; db: Database.Database; native: (request: Request) => Promise<Response>; identity: (headers: Headers) => Promise<Identity | null> };
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const json = (body: unknown, status = 200, extra?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
async function destination(response: Response): Promise<string | undefined> {
  const location = response.headers.get('location');
  if (location) return location;
  try { const result = await response.clone().json(); return result.redirect && typeof result.url === 'string' ? result.url : undefined; } catch { return undefined; }
}
export function createProtocol(deps: Dependencies) {
  const { origin, db } = deps;
  const name = origin.startsWith('https:') ? '__Host-walletgate-authorization' : 'walletgate-authorization';
  const cookie = (headers: Headers, id: string) => headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '-' + id + '='))?.slice(name.length + id.length + 2) ?? '';
  const bindingCookie = (id: string, value: string, age: number) => `${name}-${id}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`;
  const rowKey = (id: string) => 'walletgate:authorization:' + id;
  const store = (id: string, value: Pending, expiresAt: number) => db.prepare('INSERT OR REPLACE INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(rowKey(id), rowKey(id), JSON.stringify(value), new Date(expiresAt).toISOString(), new Date(value.createdAt).toISOString(), new Date().toISOString());
  const native = (path: string, request: Request, body?: unknown, params?: URLSearchParams) => {
    const headers = new Headers(request.headers); headers.set('accept', 'application/json');
    if (body !== undefined) { headers.set('content-type', 'application/json'); headers.set('origin', origin); }
    return deps.native(new Request(origin + '/api/auth' + path + (params ? '?' + params : ''), { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  };
  return async function protocol(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/oauth2/authorize' && ['GET', 'POST'].includes(request.method)) {
      if (request.method === 'POST' && (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded') || url.search)) return json({ error: 'invalid_request' }, 400);
      const query = new URLSearchParams(request.method === 'POST' ? await request.text() : url.search);
      if ([...query.keys()].some(k => query.getAll(k).length > 1)) return json({ error: 'invalid_request' }, 400);
      if (['resource', 'claims', 'request', 'request_uri'].some(k => query.has(k))) return json({ error: 'invalid_request' }, 400);
      const prompts = (query.get('prompt') ?? '').split(' ').filter(Boolean);
      if (prompts.some(p => !['login', 'consent', 'none'].includes(p)) || prompts.includes('none') && prompts.length > 1) return json({ error: 'invalid_request' }, 400);
      const scopes = (query.get('scope') ?? '').split(' ');
      if (!scopes.includes('openid') || scopes.some(s => !['openid', 'offline_access'].includes(s)) || new Set(scopes).size !== scopes.length) return json({ error: 'invalid_scope' }, 400);
      if (query.has('max_age') && !/^\d+$/.test(query.get('max_age')!)) return json({ error: 'invalid_request' }, 400);
      if (query.has('code_challenge') && !/^[A-Za-z0-9_-]{43}$/.test(query.get('code_challenge')!)) return json({ error: 'invalid_request' }, 400);
      const identity = await deps.identity(request.headers);
      const age = Number(query.get('max_age'));
      const previous = identity && scopes.includes('offline_access') ? db.prepare('SELECT expiresAt FROM oauthRefreshToken WHERE clientId = ? AND userId = ?').all(query.get('client_id'), identity.address) as { expiresAt: string }[] : [];
      const exhausted = identity && previous.some(row => { const expiry = new Date(row.expiresAt).getTime(); return expiry <= Date.now() && identity.createdAt <= expiry; });
      const fresh = !!exhausted || prompts.includes('login') || query.has('max_age') && (!identity || age === 0 || Date.now() - identity.createdAt > age * 1000);
      // Always obtain a consent continuation; none remains noninteractive.
      if (!prompts.includes('none')) query.set('prompt', [...new Set([...prompts, 'consent'])].join(' '));
      const safeHeaders = new Headers(request.headers);
      if (!identity) safeHeaders.delete('cookie');
      const response = await native('/oauth2/authorize', new Request(request.url, { headers: safeHeaders }), undefined, query);
      const target = await destination(response);
      if (!target) return response;
      const next = new URL(target, origin);
      if (next.origin !== origin || !['/oidc-login', '/oidc-consent'].includes(next.pathname)) return new Response(null, { status: 302, headers: { Location: next.toString(), 'Cache-Control': 'no-store' } });
      const id = randomBytes(24).toString('hex');
      const binding = randomBytes(32).toString('hex');
      const createdAt = Date.now();
      store(id, { query: query.toString(), owner: digest(binding), createdAt, fresh, initialSession: identity?.id }, createdAt + 300_000);
      return new Response(null, { status: 302, headers: { Location: '/#authorize=' + id, 'Cache-Control': 'no-store', 'Set-Cookie': bindingCookie(id, binding, 300) } });
    }
    const match = /^\/api\/authorization\/([a-f0-9]{48})$/.exec(url.pathname);
    if (match && ['GET', 'POST'].includes(request.method)) {
      const id = match[1];
      const stored = db.prepare('SELECT value, expiresAt FROM verification WHERE identifier = ?').get(rowKey(id)) as { value: string; expiresAt: string } | undefined;
      const row = stored ? { value: stored.value, expiresAt: new Date(stored.expiresAt).getTime() } : undefined;
      if (!row || row.expiresAt <= Date.now()) return json({ error: 'Authorization expired. Start again from the application.' }, 410);
      const pending = JSON.parse(row.value) as Pending;
      if (!cookie(request.headers, id) || digest(cookie(request.headers, id)) !== pending.owner) return json({ error: 'Authorization belongs to another browser.' }, 403);
      const identity = await deps.identity(request.headers);
      const requestedAge = new URLSearchParams(pending.query).get('max_age');
      const needsFresh = identity && (pending.fresh && (identity.id === pending.initialSession || identity.createdAt < pending.createdAt) || requestedAge !== null && Number(requestedAge) > 0 && Date.now() - identity.createdAt > Number(requestedAge) * 1000);
      if (!identity || needsFresh) return json({ needsLogin: true, fresh: !!needsFresh });
      if (request.method === 'GET') {
        const query = new URLSearchParams(pending.query); query.delete('max_age'); query.set('prompt', 'consent');
        const response = await native('/oauth2/authorize', request, undefined, query);
        const target = await destination(response);
        const next = target ? new URL(target, origin) : null;
        if (!next || next.origin !== origin || next.pathname !== '/oidc-consent') return json({ error: 'Authorization could not continue. Start again.' }, 400);
        pending.signedQuery = next.search.slice(1); pending.reviewedSession = identity.id;
        store(id, pending, row.expiresAt);
        const clientId = query.get('client_id');
        const client = db.prepare('SELECT name FROM oauthClient WHERE clientId = ?').get(clientId) as { name: string } | undefined;
        return json({ clientId, name: client?.name ?? clientId, address: identity.address, scopes: query.get('scope')!.split(' '), expiresAt: row.expiresAt });
      }
      if (request.headers.get('origin') !== origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Use a same-origin JSON request.' }, 403);
      const body = await request.json();
      if (!body || typeof body.accept !== 'boolean' || Object.keys(body).some(k => k !== 'accept')) return json({ error: 'Invalid consent.' }, 400);
      if (!pending.signedQuery || pending.reviewedSession !== identity.id) return json({ error: 'Session changed. Review consent again.' }, 409);
      const query = new URLSearchParams(pending.query); query.delete('max_age'); query.set('prompt', 'consent');
      const renewed = await destination(await native('/oauth2/authorize', request, undefined, query));
      const consent = renewed ? new URL(renewed, origin) : null;
      if (!consent || consent.origin !== origin || consent.pathname !== '/oidc-consent') return json({ error: 'Review consent again.' }, 409);
      db.prepare('DELETE FROM verification WHERE identifier = ?').run(rowKey(id));
      const response = await native('/oauth2/consent', request, { accept: body.accept, oauth_query: consent.search.slice(1) });
      const headers = new Headers(response.headers); headers.append('Set-Cookie', bindingCookie(id, '', 0));
      return new Response(response.body, { status: response.status, headers });
    }
    const getPaths = ['/api/auth/jwks', '/api/auth/oauth2/userinfo', '/api/auth/.well-known/openid-configuration'];
    if (url.pathname === '/api/auth/oauth2/userinfo' && request.method === 'POST') {
      const headers = new Headers(request.headers); headers.delete('cookie'); headers.delete('origin');
      const text = await request.text();
      if (!text) { headers.set('content-type', 'application/x-www-form-urlencoded'); return deps.native(new Request(request.url, { method: 'POST', headers, body: '' })); }
      if (!headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return json({ error: 'invalid_request' }, 400);
      const form = new URLSearchParams(text);
      if ([...form.keys()].some(key => form.getAll(key).length > 1)) return json({ error: 'invalid_request' }, 400);
      return deps.native(new Request(request.url, { method: 'POST', headers, body: text }));
    }
    const postPaths = ['/api/auth/oauth2/token', '/api/auth/oauth2/revoke'];
    if (getPaths.includes(url.pathname) && request.method === 'GET') {
      const response = await deps.native(request);
      if (!url.pathname.endsWith('/.well-known/openid-configuration') || !response.ok) return response;
      const metadata = await response.json();
      const fields = ['issuer', 'authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri', 'revocation_endpoint', 'response_types_supported', 'response_modes_supported', 'grant_types_supported', 'subject_types_supported', 'id_token_signing_alg_values_supported', 'scopes_supported', 'claims_supported', 'code_challenge_methods_supported'];
      const selected = Object.fromEntries(fields.filter(key => metadata[key] !== undefined).map(key => [key, metadata[key]]));
      return json({ ...selected, token_endpoint_auth_methods_supported: ['client_secret_basic'], revocation_endpoint_auth_methods_supported: ['client_secret_basic'], claims_parameter_supported: false, request_parameter_supported: false, request_uri_parameter_supported: false });
    }
    if (postPaths.includes(url.pathname) && request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return json({ error: 'invalid_request' }, 400);
      const headers = new Headers(request.headers); headers.delete('cookie');
      // Client credentials protect these server-to-server endpoints; cookie origin middleware does not apply.
      headers.delete('origin');
      const text = await request.text();
      const form = new URLSearchParams(text);
      if ([...form.keys()].some(key => form.getAll(key).length > 1)) return json({ error: 'invalid_request' }, 400);
      return deps.native(new Request(request.url, { method: 'POST', headers, body: text }));
    }
    return null;
  };
}
