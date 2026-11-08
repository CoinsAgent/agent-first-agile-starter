import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { toNodeHandler } from 'better-auth/node';
import { resolve } from 'node:path';
import { readConfig } from '../infrastructure/config';
import { createWalletGate } from '../wallet-auth/auth';

const config = readConfig(process.env);
const gate = await createWalletGate(config);
const app = express();
app.disable('x-powered-by');
const sdkStyles: string[] = JSON.parse(readFileSync(resolve('dist/sdk-style-hashes.json'), 'utf8'));
if (!sdkStyles.every(value => /^'sha256-[A-Za-z0-9+/=]+'$/.test(value))) throw new Error('Invalid SDK style hashes.');
const walletRpc = process.env.WALLET_RPC_URL;
if (walletRpc && new URL(walletRpc).protocol !== 'https:') throw new Error('WALLET_RPC_URL requires HTTPS.');
app.use((req, res, next) => {
  const nonce = randomBytes(24).toString('base64');
  res.locals.styleNonce = nonce;
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-${nonce}' ${sdkStyles.join(' ')}; connect-src 'self' wss://mm-sdk-relay.api.cx.metamask.io https://www.walletlink.org wss://www.walletlink.org https://rpc.wallet.coinbase.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` });
  if (req.headers.host !== new URL(config.origin).host) { res.status(403).end('Untrusted host.'); return; }
  const length = Number(req.headers['content-length'] ?? 0);
  if (length > 8192) { res.status(413).end('Request too large.'); return; }
  next();
});
app.post('/api/wallet-rpc', express.json({ limit: '8kb' }), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.headers.origin !== config.origin) { res.status(403).json({ error: 'Untrusted origin.' }); return; }
  const { method, id, params } = req.body ?? {};
  if (method !== 'eth_chainId' || !Array.isArray(params ?? [])) { res.status(400).json({ error: 'RPC method unavailable in sign-in flow.' }); return; }
  if (!walletRpc) { res.status(503).json({ error: 'Wallet RPC is not configured.' }); return; }
  try {
    const upstream = await fetch(walletRpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params: [] }), signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error('RPC unavailable.');
    const data = await upstream.json();
    if (data.result !== '0x1') throw new Error('RPC is not Ethereum Mainnet.');
    res.json({ jsonrpc: '2.0', id, result: data.result });
  } catch { res.status(502).json({ error: 'Wallet RPC unavailable or wrong network.' }); }
});
app.all('/api/{*path}', toNodeHandler(gate.handle));
app.use(express.static(resolve('dist'), { index: false }));
app.get(['/', '/index.html'], (_req, res) => {
  const html = readFileSync(resolve('dist/index.html'), 'utf8').replace('<head>', `<head><meta name="style-nonce" content="${res.locals.styleNonce}"><meta name="csp-nonce" content="${res.locals.styleNonce}">`);
  res.set('Cache-Control', 'no-store').type('html').send(html);
});
const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, '0.0.0.0', () => console.log(`WalletGate listening on ${config.origin}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { gate.close(); process.exit(0); }));
