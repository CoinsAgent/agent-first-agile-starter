import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { getAddress, verifyMessage, type Hex } from 'viem';
import { createSiweMessage } from 'viem/siwe';
import { z } from 'zod';

export const QR_MS = 5 * 60 * 1000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');
const identifier = z.string().regex(/^[a-f0-9]{64}$/);
const idBody = z.object({ id: identifier }).strict();
const cookieValue = (headers: Headers, name: string) => headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
type QrRow = { id: string; ownerHash: string; phoneHash: string | null; confirmation: string; expiresAt: number; state: 'pending' | 'approved'; message: string | null; signature: string | null };
type Dependencies = {
  nonce: (request: Request) => Promise<string>;
  complete: (request: Request, proof: { message: string; signature: string; expiresAt: number }) => Promise<Response>;
};

// QR coordination is application auth, not a remote wallet RPC connection.
export function createQrAuth(db: Database.Database, origin: string, deps: Dependencies) {
  const secure = origin.startsWith('https:');
  const ownerName = `${secure ? '__Host-' : ''}walletgate-qr-owner`;
  const phoneName = `${secure ? '__Host-' : ''}walletgate-qr-phone`;
  const cookie = (name: string, value: string) => `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=300${secure ? '; Secure' : ''}`;
  const failure = () => json({ error: 'QR request is unavailable, cancelled or expired. Start again.' }, 410);
  const rate = db.transaction((key: string, maximum: number) => {
    const now = Date.now();
    db.prepare('DELETE FROM qrRate WHERE start < ?').run(now - QR_MS);
    const row = db.prepare('SELECT start, count FROM qrRate WHERE key = ?').get(key) as { start: number; count: number } | undefined;
    const fresh = !row || now - row.start >= 60_000;
    const count = fresh ? 1 : row.count + 1;
    db.prepare('INSERT OR REPLACE INTO qrRate VALUES (?, ?, ?)').run(key, fresh ? now : row.start, count);
    return count <= maximum;
  });
  const rowFor = (id: string) => db.prepare('SELECT * FROM qrRequest WHERE id = ? AND expiresAt > ?').get(id, Date.now()) as QrRow | undefined;
  const presentation = (row: QrRow) => ({ id: row.id, confirmation: row.confirmation, expiresAt: new Date(row.expiresAt).toISOString(), state: row.state, origin });
  return async function handleQr(request: Request, path: string, body: unknown): Promise<Response> {
    if (!['create', 'inspect', 'challenge', 'approve', 'status', 'complete', 'cancel', 'reject'].includes(path)) return json({ error: 'Not found.' }, 404);
    if (!rate(`global:${path}`, path === 'status' ? 1200 : 120)) return json({ error: 'Too many requests. Wait a minute and retry.' }, 429, { 'Retry-After': '60' });
    db.prepare('DELETE FROM qrRequest WHERE expiresAt <= ?').run(Date.now());
    const ownerToken = cookieValue(request.headers, ownerName);
    if (path === 'create') {
      z.object({}).strict().parse(body);
      const owner = ownerToken && /^[a-f0-9]{64}$/.test(ownerToken) ? ownerToken : token();
      // First-time browsers must not share the empty-cookie bucket. The global
      // cap above still bounds cookie-rotation abuse; this cap is per initiator.
      if (!rate(`create:${digest(owner)}`, 10)) return json({ error: 'Too many QR attempts. Wait a minute and retry.' }, 429, { 'Retry-After': '60' });
      const id = token();
      const confirmation = randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})(.{4})/, '$1-$2');
      const expiresAt = Date.now() + QR_MS;
      db.transaction(() => {
        db.prepare('DELETE FROM qrRequest WHERE ownerHash = ? OR expiresAt <= ?').run(digest(owner), Date.now());
        db.prepare('INSERT INTO qrRequest (id, ownerHash, confirmation, expiresAt, state) VALUES (?, ?, ?, ?, ?)').run(id, digest(owner), confirmation, expiresAt, 'pending');
      })();
      return json({ ...presentation(rowFor(id)!), approvalUrl: `${origin}/#approve=${id}` }, 200, { 'Set-Cookie': cookie(ownerName, owner) });
    }
    const { id } = idBody.parse({ id: (body as { id?: unknown } | null)?.id });
    if (!rate(`${path}:${id}`, path === 'status' ? 120 : 20)) return json({ error: 'Too many requests. Wait a minute and retry.' }, 429, { 'Retry-After': '60' });
    const row = rowFor(id);
    if (!row) return failure();
    if (['status', 'complete', 'cancel'].includes(path) && (!ownerToken || digest(ownerToken) !== row.ownerHash)) return failure();
    if (path === 'inspect') { idBody.parse(body); return json(presentation(row)); }
    if (path === 'status') { idBody.parse(body); return json(presentation(row)); }
    if (path === 'cancel') {
      idBody.parse(body);
      db.prepare('DELETE FROM qrRequest WHERE id = ? AND ownerHash = ?').run(id, row.ownerHash);
      return json({ success: true });
    }
    if (path === 'challenge') {
      const input = z.object({ id: identifier, address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), chainId: z.literal(1) }).strict().parse(body);
      if (row.state !== 'pending') return failure();
      const address = getAddress(input.address.toLowerCase());
      const nonce = await deps.nonce(request);
      const phone = token();
      const message = createSiweMessage({
        address, chainId: 1, domain: new URL(origin).host, uri: origin, version: '1', nonce,
        issuedAt: new Date(), expirationTime: new Date(row.expiresAt),
        statement: `Approve the other browser's WalletGate login. Compare confirmation ${row.confirmation} on that browser. No transaction.`,
        requestId: id,
      });
      const changed = db.prepare("UPDATE qrRequest SET phoneHash = ?, message = ?, signature = NULL WHERE id = ? AND state = 'pending' AND expiresAt > ?").run(digest(phone), message, id, Date.now());
      if (!changed.changes) return failure();
      return json({ ...presentation(row), message, address: address.toLowerCase() }, 200, { 'Set-Cookie': cookie(phoneName, phone) });
    }
    if (path === 'approve' || path === 'reject') {
      const phone = cookieValue(request.headers, phoneName);
      if (!phone || !row.phoneHash || digest(phone) !== row.phoneHash || row.state !== 'pending') return failure();
      if (path === 'reject') {
        idBody.parse(body);
        db.prepare('DELETE FROM qrRequest WHERE id = ? AND phoneHash = ?').run(id, row.phoneHash);
        return json({ success: true });
      }
      const input = z.object({ id: identifier, message: z.string().max(4096), signature: z.string().regex(/^0x[\da-fA-F]{130}$/), confirmation: z.string() }).strict().parse(body);
      if (input.message !== row.message || input.confirmation !== row.confirmation) return failure();
      // Exact equality with the server-created message preserves domain, URI, nonce,
      // account, issued-at, chain and absolute QR expiry. Check again after await.
      const { parseSiweMessage } = await import('viem/siwe');
      const parsed = parseSiweMessage(input.message);
      if (!parsed.address || !parsed.issuedAt || parsed.issuedAt.getTime() > Date.now() ||
          !await verifyMessage({ address: parsed.address, message: input.message, signature: input.signature as Hex })) return json({ error: 'Signature was not verified. Review a fresh request.' }, 401);
      const changed = db.prepare("UPDATE qrRequest SET state = 'approved', signature = ? WHERE id = ? AND phoneHash = ? AND message = ? AND state = 'pending' AND expiresAt > ?")
        .run(input.signature, id, row.phoneHash, input.message, Date.now());
      return changed.changes ? json({ success: true }) : failure();
    }
    if (path === 'complete') {
      idBody.parse(body);
      // Delete before asynchronous session creation: only one redemption or cancellation wins.
      const approved = db.prepare("DELETE FROM qrRequest WHERE id = ? AND ownerHash = ? AND state = 'approved' AND expiresAt > ? RETURNING *")
        .get(id, row.ownerHash, Date.now()) as QrRow | undefined;
      if (!approved?.message || !approved.signature) return failure();
      return deps.complete(request, { message: approved.message, signature: approved.signature, expiresAt: approved.expiresAt });
    }
    return failure();
  };
}
