import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { analyze, ownerOf, validateConfig } from '../../scripts/check_dependencies.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../../config/project-structure.json', import.meta.url)));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'selected-layout-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  write('frontend/src/main.tsx', "import { wallet } from './wallet-auth'; export const page = wallet;");
  write('frontend/src/wallet-auth/index.ts', "export const wallet = 'verified';");
  write('frontend/src/ui/button.tsx', "export const button = 'button';");
  write('backend/src/index.ts', "import { session } from './wallet-auth'; export const server = session;");
  write('backend/src/wallet-auth/index.ts', "export const session = 'session';");
  write('backend/src/infrastructure/config.ts', "export const port = 3100;");
  return { root, write };
}

test('adopted declaration covers migrated owners and rejects generic app/features destinations', () => {
  validateConfig(config);
  assert.equal(ownerOf('frontend/src/main.tsx', config).role, 'app');
  assert.equal(ownerOf('backend/src/wallet-auth/auth.ts', config).feature, 'wallet-server');
  assert.equal(config.aliases['@/'], 'frontend/src');
  for (const name of ['src/main.tsx', 'server/auth.ts', 'src/app/new.ts', 'src/features/unnamed/index.ts', 'server/features/unnamed/index.ts',
    'frontend/src/app/new.ts', 'frontend/src/features/unnamed/index.ts', 'backend/src/app/new.ts', 'backend/src/features/unnamed/index.ts']) {
    assert.throws(() => ownerOf(name, config), /unowned production path/, name);
  }
});

test('selected frontend/backend public interfaces are checked successfully without legacy directories', t => {
  const f = fixture(t);
  const result = analyze(f.root, config);
  assert.equal(result.files, 6);
  assert.deepEqual(result.errors, []);
});

test('selected generic UI and infrastructure cannot import named domains', t => {
  const f = fixture(t);
  f.write('frontend/src/ui/button.tsx', "export { wallet } from '../wallet-auth';");
  f.write('backend/src/infrastructure/config.ts', "export { session } from '../wallet-auth';");
  const result = analyze(f.root, config);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.every(e => e.rule === 'shared-must-not-import-feature-or-app'));
});

test('selected named domains cannot import composition or the other runtime', t => {
  const f = fixture(t);
  f.write('frontend/src/wallet-auth/private.ts', "export { server } from '../../../backend/src/index';");
  f.write('backend/src/wallet-auth/private.ts', "export { server } from '../index';");
  const result = analyze(f.root, config);
  assert.deepEqual(result.errors.map(e => e.rule).sort(), ['feature-must-not-import-app', 'runtime-boundary']);
});
