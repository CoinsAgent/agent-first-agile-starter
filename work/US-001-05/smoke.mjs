/** Exercise the unchanged root commands without persistent data or wallet/network calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const artifactDir = path.join(root, 'work/US-001-05/artifacts');
fs.mkdirSync(artifactDir, { recursive: true });
const envFile = path.join(root, '.env');
let temporaryEnv = false;
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(envFile, '# Temporary smoke-test configuration; values supplied through process environment.\n', { flag: 'wx' });
  temporaryEnv = true;
}
try {
  for (const [command, port] of [['dev', 3215], ['start', 3216]]) {
    const origin = `http://localhost:${port}`;
    const output = fs.openSync(path.join(artifactDir, `root-${command}.log`), 'w');
    const child = spawn('npm', ['run', command], {
      cwd: root, detached: true, stdio: ['ignore', output, output],
      env: { ...process.env, PORT: String(port), TRUSTED_ORIGIN: origin, DATABASE_PATH: ':memory:', BETTER_AUTH_SECRET: 'test-only-us00105-smoke-secret-0987654321', WALLET_RPC_URL: '' },
    });
    fs.closeSync(output);
    const closed = once(child, 'close');
    try {
      let response;
      for (let attempt = 0; attempt < 100; attempt++) {
        assert.equal(child.exitCode, null, `${command} exited before readiness`);
        try { response = await fetch(origin, { signal: AbortSignal.timeout(1000) }); }
        catch { /* Startup is bounded below. */ }
        if (response?.ok) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(response?.ok, `${command} failed to become ready`);
      const html = await response.text();
      assert.match(html, /WalletGate — Your wallet\. Your way in\./);
      assert.doesNotMatch(html, /\/src\/main\.tsx/);
      assert.match(html, /<meta name="style-nonce" content="[^"]+">/);
      const nonce = html.match(/<meta name="style-nonce" content="([^"]+)">/)[1];
      assert.ok(response.headers.get('content-security-policy').includes(`'nonce-${nonce}'`));
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(m => m[1]);
      assert.ok(assets.some(a => a.endsWith('.js')), 'built JS entry missing');
      assert.ok(assets.some(a => a.endsWith('.css')), 'built stylesheet missing');
      for (const asset of assets) {
        const result = await fetch(origin + asset);
        assert.equal(result.status, 200, asset);
        assert.ok((await result.arrayBuffer()).byteLength > 0, asset);
      }
      assert.equal((await fetch(origin + '/index.html')).status, 200);
      const session = await fetch(origin + '/api/session');
      assert.equal(session.status, 401);
      const hashes = JSON.parse(fs.readFileSync(path.join(root, 'dist/sdk-style-hashes.json'), 'utf8'));
      assert.ok(hashes.length > 0);
      assert.ok(hashes.every(hash => response.headers.get('content-security-policy').includes(hash)));
      console.log(`PASS: npm run ${command} from root serves built HTML, JS/CSS, nonce/hash CSP and unauthenticated API on ${origin}; database is in memory.`);
    } finally {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (e) { if (e.code !== 'ESRCH') throw e; }
      const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already stopped. */ } }, 3000);
      try { await closed; } finally { clearTimeout(timer); }
    }
  }
} finally {
  if (temporaryEnv) fs.unlinkSync(envFile);
}
