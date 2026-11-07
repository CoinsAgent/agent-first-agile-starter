import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { analyze } from '../../scripts/check_dependencies.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../../config/project-structure.json', import.meta.url)));
for (const [name, importer, target, code, rule] of [
  ['browser to backend', 'frontend/src/wallet-auth/probe.ts', 'backend/src/wallet-auth/index.ts', "import type { Value } from '../../../backend/src/wallet-auth';", 'runtime-boundary'],
  ['infrastructure to domain', 'backend/src/infrastructure/probe.ts', 'backend/src/wallet-auth/index.ts', "import type { Value } from '../wallet-auth';", 'shared-must-not-import-feature-or-app'],
  ['infrastructure to bootstrap', 'backend/src/infrastructure/probe.ts', 'backend/src/bootstrap/server.ts', "import '../bootstrap/server';", 'shared-must-not-import-feature-or-app'],
  ['domain to pages', 'frontend/src/wallet-auth/probe.ts', 'frontend/src/pages/sign-in.tsx', "import '../pages/sign-in';", 'feature-must-not-import-app'],
  ['domain to bootstrap', 'frontend/src/wallet-auth/probe.ts', 'frontend/src/bootstrap/app.tsx', "import '../bootstrap/app';", 'feature-must-not-import-app'],
  ['ui alias to public domain type', 'frontend/src/ui/probe.ts', 'frontend/src/wallet-auth/index.ts', "import type { Value } from '@/wallet-auth';", 'shared-must-not-import-feature-or-app'],
  ['lib to bootstrap', 'frontend/src/lib/probe.ts', 'frontend/src/bootstrap/app.tsx', "export * from '../bootstrap/app';", 'shared-must-not-import-feature-or-app'],
]) {
  test(`adopted layout rejects ${name}`, t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrated-layout-'));
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const [file, content] of [[target, 'export type Value = string;'], [importer, code]]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    }
    assert.ok(analyze(root, config).errors.some(e => e.rule === rule));
  });
}
