// Coinbase's supported native QR UI emits static inline style elements. Permit
// only the exact published SDK styles, without allowing arbitrary inline CSS.
import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve('node_modules/@coinbase/wallet-sdk/dist/sign/walletlink/relay/ui');
const hashes = [];
for (const file of await readdir(root, { recursive: true })) {
  if (!file.endsWith('-css.js')) continue;
  const { default: css } = await import(pathToFileURL(resolve(root, file)).href);
  if (typeof css !== 'string') throw Error(`Unexpected SDK stylesheet: ${file}`);
  hashes.push(`'sha256-${createHash('sha256').update(css).digest('base64')}'`);
}
if (!hashes.length) throw Error('Coinbase SDK styles were not found; review SDK integration.');
await writeFile('dist/sdk-style-hashes.json', JSON.stringify(hashes));
