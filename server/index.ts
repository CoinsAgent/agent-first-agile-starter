import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { resolve } from 'node:path';
import { readConfig } from './config';
import { createWalletGate } from './auth';

const config = readConfig(process.env);
const gate = await createWalletGate(config);
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
  if (req.headers.host !== new URL(config.origin).host) { res.status(403).end('Untrusted host.'); return; }
  const length = Number(req.headers['content-length'] ?? 0);
  if (length > 8192) { res.status(413).end('Request too large.'); return; }
  next();
});
app.all('/api/{*path}', toNodeHandler(gate.handle));
app.use(express.static(resolve('dist')));
app.get('/', (_req, res) => res.sendFile(resolve('dist/index.html')));
const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, '0.0.0.0', () => console.log(`WalletGate listening on ${config.origin}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { gate.close(); process.exit(0); }));
