import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { analyze, validateConfig } from '../../scripts/check_dependencies.mjs';

function fixture(t, files = {}, variant = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const prefix = variant ? 'client/capabilities' : 'src/features';
  const shared = variant ? 'client/common' : 'src/shared';
  const server = variant ? 'service/capabilities' : 'server/features';
  const config = { version: 1, source_roots: variant ? ['client', 'service'] : ['src', 'server'], aliases: { '@/': variant ? 'client' : 'src' },
    feature_roots: [{ path: prefix, runtime: 'browser' }, { path: server, runtime: 'server' }],
    owners: [{ path: shared, kind: 'directory', role: 'shared', runtime: 'browser' },
      { path: variant ? 'client/start.ts' : 'src/main.ts', kind: 'file', role: 'app', runtime: 'browser' }], public_interfaces: [] };
  const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); };
  write(`${prefix}/alpha/index.ts`, 'export const value = 1;');
  write(`${prefix}/alpha/private.ts`, 'export const secret = 2;');
  write(`${prefix}/beta/index.ts`, 'export const beta = 1;');
  write(`${server}/backend/index.ts`, 'export const handler = 1;');
  write(`${shared}/button.ts`, 'export const button = 1;');
  for (const [name, value] of Object.entries(files)) write(name, value);
  return { root, config, write, prefix, shared };
}

test('current and differently named layouts permit public, same-feature and shared use', t => {
  for (const variant of [false, true]) {
    const f = fixture(t, {}, variant);
    f.write(`${f.prefix}/alpha/index.ts`, `export { secret } from './private'; import { beta } from '../beta'; import { button } from '../../${variant ? 'common' : 'shared'}/button';`);
    assert.deepEqual(analyze(f.root, f.config).errors, []);
  }
});

for (const [name, code, rule] of [
  ['private import', "import { secret } from '../alpha/private';", 'private-feature-import'],
  ['type-only private import', "import type { Secret } from '../alpha/private';", 'private-feature-import'],
  ['re-export bypass', "export * from '../alpha/private';", 'private-feature-import'],
  ['alias bypass', "import { secret } from '@/features/alpha/private';", 'private-feature-import'],
  ['literal dynamic import', "const p = import('../alpha/private');", 'private-feature-import'],
  ['CommonJS import', "const p = require('../alpha/private');", 'private-feature-import'],
  ['import equals', "import p = require('../alpha/private');", 'private-feature-import'],
  ['import type expression', "type T = import('../alpha/private').Secret;", 'private-feature-import'],
  ['server runtime boundary', "import { handler } from '../../../server/features/backend';", 'runtime-boundary'],
  ['server builtin', "import fs from 'node:fs';", 'server-builtin-in-browser'],
]) test(name, t => {
  const f = fixture(t, { 'src/features/beta/index.ts': code });
  assert.ok(analyze(f.root, f.config).errors.some(e => e.rule === rule));
});

test('shared cannot use feature public API, private code or application assembly', t => {
  const f = fixture(t);
  f.write('src/main.ts', 'export const app = 1;');
  for (const target of ['../features/alpha', '../features/alpha/private', '../main']) {
    f.write('src/shared/button.ts', `import { value } from '${target}';`);
    assert.ok(analyze(f.root, f.config).errors.some(e => e.rule === 'shared-must-not-import-feature-or-app'));
  }
});

test('shared barrel cannot hide a reverse dependency', t => {
  const f = fixture(t, { 'src/shared/button.ts': "export * from './barrel';", 'src/shared/barrel.ts': "export * from '../features/alpha';" });
  assert.equal(analyze(f.root, f.config).errors[0].importer, 'src/shared/barrel.ts');
});

test('finite baseline accepts old edge, blocks new edge, tolerates removal', t => {
  const f = fixture(t, { 'src/features/beta/index.ts': "import { secret } from '../alpha/private';" });
  const baseline = { version: 1, violations: analyze(f.root, f.config).violations.map(v => ({ ...v, reason: 'existing legacy edge' })) };
  assert.deepEqual(analyze(f.root, f.config, baseline).errors, []);
  f.write('src/shared/button.ts', "import { value } from '../features/alpha';");
  assert.equal(analyze(f.root, f.config, baseline).errors.length, 1);
  f.write('src/features/beta/index.ts', 'export const beta = 1;');
  f.write('src/shared/button.ts', 'export const button = 1;');
  assert.equal(analyze(f.root, f.config, baseline).stale.length, 1);
  assert.deepEqual(analyze(f.root, f.config, baseline).errors, []);
});

test('wildcard/duplicate baseline entries cannot broaden exemptions', t => {
  const f = fixture(t);
  const entry = { importer: 'src/features/beta/index.ts', target: 'src/features/alpha/private.ts', rule: 'private-feature-import', reason: 'existing' };
  assert.throws(() => analyze(f.root, f.config, { version: 1, violations: [{ ...entry, target: 'src/*' }] }));
  assert.throws(() => analyze(f.root, f.config, { version: 1, violations: [entry, entry] }));
});

test('unowned paths, unsupported types, unresolved aliases and nonliteral imports fail closed', t => {
  for (const [file, content] of [['src/unknown.ts', 'export const a = 1;'], ['src/features/alpha/widget.vue', '<template/>'],
    ['src/features/alpha/index.ts', "import x from '@/missing';"], ['src/features/alpha/index.ts', 'const p = import(variable);']]) {
    const f = fixture(t, { [file]: content });
    assert.throws(() => analyze(f.root, f.config));
  }
});

test('comments, ordinary strings and JSX text do not become dependency edges', t => {
  const f = fixture(t, { 'src/features/beta/view.tsx': `// import 'node:fs';\nconst text = "import('../alpha/private')";\nexport const view = <p>require('../alpha/private')</p>;` });
  assert.deepEqual(analyze(f.root, f.config).errors, []);
});

test('ambiguous ownership and source/alias overlap fail', t => {
  const f = fixture(t);
  const copy = () => JSON.parse(JSON.stringify(f.config));
  const c = copy(); c.owners.push({ path: 'src/shared/button.ts', kind: 'file', role: 'shared', runtime: 'browser' });
  assert.throws(() => validateConfig(c), /ambiguous/);
  const d = copy(); d.source_roots.push('src/features'); assert.throws(() => validateConfig(d), /overlapping/);
  const e = copy(); e.aliases['@/nested/'] = 'src/shared'; assert.throws(() => validateConfig(e), /overlapping/);
});

test('source symlinks fail instead of reading outside the source root', t => {
  const f = fixture(t);
  fs.symlinkSync('/etc/passwd', path.join(f.root, 'src/features/alpha/link.ts'));
  assert.throws(() => analyze(f.root, f.config), /symlink/);
});

test('broken source symlinks cannot be silently skipped', t => {
  const f = fixture(t);
  fs.symlinkSync('nonexistent.ts', path.join(f.root, 'src/features/alpha/broken.ts'));
  assert.throws(() => analyze(f.root, f.config), /symlink/);
});

test('a candidate Git tree is parsed as data without executing its modules', t => {
  const f = fixture(t, { 'src/features/alpha/index.ts': "throw new Error('must never execute'); export const value = 1;" });
  function git(...args) { const r = spawnSync('git', ['-C', f.root, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); }
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid'); git('add', '.'); git('commit', '-qm', 'fixture');
  const sha = git('rev-parse', 'HEAD');
  f.write('src/features/alpha/index.ts', "import fs from 'node:fs';");
  assert.deepEqual(analyze(f.root, f.config, undefined, sha).errors, []);
  assert.ok(analyze(f.root, f.config).errors.length);
});

test('backend features also require a public interface', t => {
  const f = fixture(t, { 'server/features/backend/private.ts': 'export const secret = 1;', 'server/features/other/index.ts': "export { secret } from '../backend/private';" });
  assert.ok(analyze(f.root, f.config).errors.some(e => e.rule === 'private-feature-import'));
  f.write('server/features/other/index.ts', "export { handler } from '../backend';");
  assert.deepEqual(analyze(f.root, f.config).errors, []);
});

test('shared neutral contracts cannot transitively bridge frontend to server', t => {
  const f = fixture(t, { 'src/contracts/schema.ts': "export { handler } from '../../server/features/backend';", 'src/shared/button.ts': "export * from '../contracts/schema';" });
  f.config.owners.push({ path: 'src/contracts', kind: 'directory', role: 'shared', runtime: 'neutral' });
  assert.ok(analyze(f.root, f.config).errors.some(e => e.rule === 'runtime-boundary'));
});

test('a feature cannot import app composition', t => {
  const f = fixture(t, { 'src/main.ts': 'export const app = 1;', 'src/features/beta/index.ts': "export { app } from '../../main';" });
  assert.ok(analyze(f.root, f.config).errors.some(e => e.rule === 'feature-must-not-import-app'));
});

test('new top-level areas are not silently ignored', t => {
  const f = fixture(t, { 'rogue/new.ts': 'export const value = 1;' });
  const git = (...args) => { const r = spawnSync('git', ['-C', f.root, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0); };
  git('init', '-q');
  f.config.repository_areas = { src: 'frontend', server: 'backend' };
  f.config.root_files = [];
  assert.throws(() => analyze(f.root, f.config), /unclassified repository area/);
});
