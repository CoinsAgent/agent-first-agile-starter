import { createHash } from 'node:crypto';
import { getCurrentAdapter, runWithTransaction } from '@better-auth/core/context';
import { isLoopbackHost } from '@better-auth/core/utils/host';
import type { DBAdapter } from '@better-auth/core/db/adapter';
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';

type Owner = { address: string; expiresAt: string };
type Client = { clientId: string; name?: string; redirectUris: string[]; createdAt: Date; userId?: string; referenceId?: string | null };
type Submission = { key: string; owner: string; requestId: string; digest: string; clientId: string };
type Rate = { id: string; owner: string; startedAt: Date; attempts: number };
type Created = { client_id: string; client_secret?: string };
export type RegistrationInput = { name: string; redirectUris: string[]; requestId: string };
type Dependencies<Options extends BetterAuthOptions> = {
  adapter: DBAdapter<Options>;
  session: (headers: Headers) => Promise<Owner | null>;
  create: (headers: Headers, input: RegistrationInput) => Promise<Created>;
};
export const applicationSchema = {
  id: 'walletgate-applications',
  schema: {
    applicationSubmission: { fields: {
      key: { type: 'string', required: true, unique: true },
      owner: { type: 'string', required: true },
      requestId: { type: 'string', required: true },
      digest: { type: 'string', required: true },
      clientId: { type: 'string', required: true, unique: true },
    } },
    applicationRate: { fields: {
      owner: { type: 'string', required: true, unique: true },
      startedAt: { type: 'date', required: true },
      attempts: { type: 'number', required: true },
    } },
  },
} satisfies BetterAuthPlugin;
export class ApplicationError extends Error {
  constructor(public status: number, message: string, public field?: string, public retryAfter?: number) { super(message); }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const where = (field: string, value: string) => [{ field, value }];
function redirectValid(value: string) {
  if (/[\s\\*#]/u.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return false;
    if (!value.startsWith('https://') || url.protocol !== 'https:') return false;
    return !isLoopbackHost(url.hostname);
  } catch { return false; }
}
export function validateRegistration(body: unknown): RegistrationInput {
  const schema = z.object({
    name: z.string().transform(s => s.trim()).refine(s => Array.from(s).length >= 1 && Array.from(s).length <= 100),
    redirectUris: z.array(z.string().max(2048).refine(redirectValid)).min(1).max(10).refine(items => new Set(items).size === items.length),
    requestId: z.uuid(),
  }).strict();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'form');
    const message = field === 'name' ? 'Enter an application name of 1–100 characters.' : field === 'redirectUris' ? 'Enter 1–10 distinct valid redirect URIs: HTTPS on a non-loopback hostname, including development. No wildcards, fragments or credentials.' : 'Invalid registration fields. Start a new submission.';
    throw new ApplicationError(400, message, field);
  }
  return parsed.data;
}
function project(client: Client, requestId?: string) {
  return { clientId: client.clientId, name: client.name, redirectUris: client.redirectUris,
    createdAt: new Date(client.createdAt).toISOString(), profile: 'Confidential web · authorization code · PKCE S256 · openid · client_secret_basic', ...(requestId ? { requestId } : {}) };
}
export function createApplications<Options extends BetterAuthOptions>(deps: Dependencies<Options>) {
  async function transaction<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await runWithTransaction(deps.adapter, operation); }
      catch (error) {
        const code = error instanceof Error && 'code' in error ? String(error.code) : '';
        if (!code.startsWith('SQLITE_BUSY') && code !== 'SQLITE_LOCKED') throw error;
        if (attempt >= 3) throw new ApplicationError(503, 'Registration is busy. Check your applications and retry the same submission.', undefined, 1);
        await new Promise(resolve => setTimeout(resolve, 10 * 2 ** attempt));
      }
    }
  }
  async function requireOwner(headers: Headers) {
    const owner = await deps.session(headers);
    if (!owner || Date.parse(owner.expiresAt) <= Date.now()) throw new ApplicationError(401, 'Your session expired. Sign in with your wallet again.');
    return owner;
  }
  async function rate(owner: string) {
    // Fixed one-minute window beginning with the first attempt; persisted independently of validation/creation rollback.
    const retry = await transaction(async () => {
      const tx = await getCurrentAdapter(deps.adapter);
      const row = await tx.findOne<Rate>({ model: 'applicationRate', where: where('owner', owner) });
      const now = Date.now();
      if (row && now < row.startedAt.getTime() + 60_000) {
        if (row.attempts >= 5) return Math.ceil((row.startedAt.getTime() + 60_000 - now) / 1000);
        await tx.update({ model: 'applicationRate', where: where('owner', owner), update: { attempts: row.attempts + 1 } });
      } else if (row) await tx.update({ model: 'applicationRate', where: where('owner', owner), update: { startedAt: new Date(now), attempts: 1 } });
      else await tx.create({ model: 'applicationRate', data: { owner, startedAt: new Date(now), attempts: 1 } });
      return 0;
    });
    if (retry) throw new ApplicationError(429, `Too many registration attempts. Try again in ${retry} seconds.`, undefined, retry);
  }
  async function list(headers: Headers, clientId?: string) {
    const owner = await requireOwner(headers);
    const clients = await deps.adapter.findMany<Client>({ model: 'oauthClient', where: [...where('userId', owner.address), ...(clientId ? where('clientId', clientId) : [])], limit: 20, sortBy: { field: 'createdAt', direction: 'desc' } });
    const claims = await deps.adapter.findMany<Submission>({ model: 'applicationSubmission', where: where('owner', owner.address), limit: 20 });
    const result = clients.map(client => project(client, claims.find(claim => claim.clientId === client.clientId)?.requestId));
    if (clientId && !result.length) throw new ApplicationError(404, 'Application not found.');
    return result;
  }
  async function create(headers: Headers, body: () => Promise<unknown>) {
    const owner = await requireOwner(headers);
    await rate(owner.address);
    const input = validateRegistration(await body());
    const key = hash(`${owner.address}:${input.requestId}`);
    const digest = hash(JSON.stringify([input.name, input.redirectUris]));
    return transaction(async () => {
      await requireOwner(headers);
      const tx = await getCurrentAdapter(deps.adapter);
      const prior = await tx.findOne<Submission>({ model: 'applicationSubmission', where: where('key', key) });
      if (prior) {
        if (prior.digest !== digest) throw new ApplicationError(409, 'This submission already used different values. Start a new registration.');
        const client = await tx.findOne<Client>({ model: 'oauthClient', where: [...where('clientId', prior.clientId), ...where('userId', owner.address)] });
        if (!client) throw new Error('IncompleteRegistration');
        return { application: project(client, input.requestId), replayed: true };
      }
      const count = await tx.count({ model: 'oauthClient', where: where('userId', owner.address) });
      if (count >= 20) throw new ApplicationError(409, 'You have reached the 20-application limit. Secret recovery, deletion and allowance resets are not available in this release.');
      const created = await deps.create(headers, input);
      if (!created.client_secret) throw new Error('MissingClientSecret');
      const client = await tx.findOne<Client>({ model: 'oauthClient', where: where('clientId', created.client_id) });
      if (!client || client.userId !== owner.address || client.referenceId != null) throw new Error('ClientOwnershipMismatch');
      await tx.create({ model: 'applicationSubmission', data: { key, owner: owner.address, requestId: input.requestId, digest, clientId: created.client_id } });
      return { application: project(client, input.requestId), clientSecret: created.client_secret, replayed: false };
    });
  }
  return { list, create };
}
