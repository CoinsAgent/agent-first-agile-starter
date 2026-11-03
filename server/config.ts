export type Config = { origin: string; secret: string; databasePath: string };
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const url = new URL(env.TRUSTED_ORIGIN ?? 'http://localhost:3000');
  if (url.origin !== (env.TRUSTED_ORIGIN ?? 'http://localhost:3000') || url.username || url.password)
    throw new Error('TRUSTED_ORIGIN must be an origin without a path, credentials or trailing slash.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    throw new Error('Use HTTPS except for local loopback development.');
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error('Set BETTER_AUTH_SECRET to a locally generated secret of at least 32 characters.');
  return { origin: url.origin, secret: env.BETTER_AUTH_SECRET, databasePath: env.DATABASE_PATH ?? './data/walletgate.sqlite' };
}
