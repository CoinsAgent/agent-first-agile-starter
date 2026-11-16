import { isLoopbackHost } from '@better-auth/core/utils/host';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
export type RegistrationInput = { name: string; redirectUris: string[]; requestId: string };
export const applicationSchema = {
  id: 'walletgate-applications',
  schema: {
    applicationSubmission: { fields: {
      key: { type: 'string', required: true, unique: true },
      owner: { type: 'string', required: true },
      requestId: { type: 'string', required: true },
      digest: { type: 'string', required: true },
      result: { type: 'string', required: true },
      grantId: { type: 'string', required: true },
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
