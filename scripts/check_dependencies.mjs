#!/usr/bin/env node
/** Static first-party dependencies; candidate modules are parsed, never imported. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { API } from 'typescript/unstable/sync';
import { SyntaxKind } from 'typescript/unstable/ast';

const codeExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const dataExtensions = new Set(['.html', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.md', '.json', '.txt', '.woff', '.woff2']);
const builtin = new Set(builtinModules.flatMap(n => [n, `node:${n}`]));
const roles = new Set(['app', 'feature', 'shared']);
const runtimes = new Set(['browser', 'server', 'neutral']);

function fail(message) { throw new Error(message); }
function canonical(p) {
  if (typeof p !== 'string' || !p || /[\\*?\[\]:\x00-\x1f]/.test(p) || p.split('/').some(x => !x || x === '.' || x === '..' || x === '.git') || path.posix.normalize(p) !== p || p.startsWith('/')) fail(`unsafe path: ${JSON.stringify(p)}`);
  return p;
}
function inside(file, dir) { return file === dir || file.startsWith(dir + '/'); }
function overlap(a, b) {
  return a.path === b.path || (a.kind !== 'file' && inside(b.path, a.path)) || (b.kind !== 'file' && inside(a.path, b.path));
}
export function validateConfig(config) {
  if (config.version !== 1 || !Array.isArray(config.source_roots) || !config.source_roots.length || !Array.isArray(config.owners) || !Array.isArray(config.feature_roots)) fail('invalid ownership configuration');
  config.source_roots.forEach(canonical);
  const roots = config.source_roots.map(p => ({ path: p, kind: 'directory' }));
  for (let i = 0; i < roots.length; i++) for (const b of roots.slice(i + 1)) if (overlap(roots[i], b)) fail('overlapping source roots');
  const entries = [...config.owners, ...config.feature_roots.map(r => ({ ...r, kind: 'directory' }))];
  for (const entry of entries) {
    canonical(entry.path);
    if (!config.source_roots.some(r => inside(entry.path, r)) || !['file', 'directory'].includes(entry.kind) || !runtimes.has(entry.runtime)) fail(`invalid owner: ${entry.path}`);
  }
  for (const owner of config.owners) {
    if (!roles.has(owner.role) || (owner.role === 'feature' && (typeof owner.feature !== 'string' || !owner.feature))) fail(`invalid owner role/feature: ${owner.path}`);
  }
  for (let i = 0; i < entries.length; i++) for (const b of entries.slice(i + 1)) if (overlap(entries[i], b)) fail(`ambiguous ownership: ${entries[i].path}, ${b.path}`);
  if (!Array.isArray(config.public_interfaces)) fail('public_interfaces must be explicit');
  config.public_interfaces.forEach(canonical);
  if (!config.aliases || typeof config.aliases !== 'object' || Array.isArray(config.aliases)) fail('aliases must be explicit');
  for (const [alias, dir] of Object.entries(config.aliases)) {
    if (!alias.endsWith('/') || alias.length < 2 || !/^[A-Za-z@#][A-Za-z0-9_@#/-]*\/$/.test(alias)) fail('aliases require safe prefixes ending in /');
    canonical(dir);
  }
  const aliases = Object.keys(config.aliases);
  for (let i = 0; i < aliases.length; i++) for (const b of aliases.slice(i + 1)) if (b.startsWith(aliases[i]) || aliases[i].startsWith(b)) fail('overlapping aliases');
  return config;
}

export function ownerOf(file, config) {
  for (const owner of config.owners) if (file === owner.path || (owner.kind === 'directory' && inside(file, owner.path))) return owner;
  for (const root of config.feature_roots) {
    if (file.startsWith(root.path + '/')) {
      const parts = file.slice(root.path.length + 1).split('/');
      if (parts.length < 2 || !parts[0]) fail(`feature needs a named directory: ${file}`);
      return { path: `${root.path}/${parts[0]}`, role: 'feature', runtime: root.runtime, feature: `${root.path}/${parts[0]}` };
    }
  }
  fail(`unowned production path: ${file}; declare its owner before adding code`);
}

function publicInterface(file, config) {
  if (config.public_interfaces.includes(file)) return true;
  return config.feature_roots.some(root => file.startsWith(root.path + '/') && file.slice(root.path.length + 1).split('/').length === 2 && file.endsWith('/index.ts'));
}

function ruleFor(from, to, importer, target, config) {
  if ((from.runtime === 'browser' && to.runtime === 'server') || (from.runtime === 'server' && to.runtime === 'browser') || (from.runtime === 'neutral' && to.runtime !== 'neutral')) return 'runtime-boundary';
  if (from.role === 'shared' && to.role !== 'shared') return 'shared-must-not-import-feature-or-app';
  if (from.role === 'feature' && to.role === 'app') return 'feature-must-not-import-app';
  if (to.role === 'feature' && (from.role !== 'feature' || from.feature !== to.feature) && !publicInterface(target, config)) return 'private-feature-import';
  return null;
}

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(`Git ${args[0]} failed; missing/invalid ref or repository`);
  return result.stdout;
}

function sources(root, config, ref) {
  const files = new Map();
  if (ref) {
    if (!/^[0-9a-f]{40}$/.test(ref)) fail('--ref requires a full commit SHA');
    for (const record of git(root, ['ls-tree', '-r', '-z', ref]).toString().split('\0').filter(Boolean)) {
      const split = record.indexOf('\t');
      const [mode] = record.slice(0, split).split(' ');
      const file = record.slice(split + 1);
      if (!config.source_roots.some(r => inside(file, r))) continue;
      canonical(file);
      if (!['100644', '100755'].includes(mode)) fail(`unsupported source mode: ${file}`);
      files.set(file, git(root, ['show', `${ref}:${file}`]));
    }
  } else {
    function walk(relative) {
      const absolute = path.join(root, relative);
      canonical(relative);
      let stat;
      try { stat = fs.lstatSync(absolute); }
      catch (error) {
        if (error.code === 'ENOENT' && config.source_roots.includes(relative)) return;
        throw error;
      }
      if (stat.isSymbolicLink()) fail(`symlink in production sources: ${relative}`);
      if (stat.isDirectory()) for (const name of fs.readdirSync(absolute)) walk(`${relative}/${name}`);
      else if (stat.isFile()) files.set(relative, fs.readFileSync(absolute));
      else fail(`unsupported production file: ${relative}`);
    }
    config.source_roots.forEach(walk);
  }
  return files;
}

function resolveTarget(importer, specifier, files, config) {
  // Vite asset query suffixes do not change ownership of the underlying file.
  const spec = specifier.split('?')[0];
  let target;
  if (spec.startsWith('.')) target = path.posix.normalize(path.posix.join(path.posix.dirname(importer), spec));
  else {
    const alias = Object.keys(config.aliases).find(a => spec.startsWith(a));
    if (alias) target = path.posix.normalize(config.aliases[alias] + '/' + spec.slice(alias.length));
    else if (spec.startsWith('/') || spec.startsWith('#')) fail(`unsupported internal import: ${importer} -> ${specifier}`);
    else return null; // External packages are outside first-party static analysis.
  }
  canonical(target);
  const candidates = [target, ...codeExtensions.map(e => target + e), ...codeExtensions.map(e => target + '/index' + e)];
  if (/\.[cm]?js$/.test(target)) candidates.push(...['.ts', '.tsx', '.mts', '.cts'].map(e => target.replace(/\.[cm]?js$/, e)));
  const found = candidates.find(f => files.has(f));
  if (!found) fail(`unresolved first-party import: ${importer} -> ${specifier}; configure its alias/owner or fix the import`);
  return found;
}

function baselineKeys(baseline) {
  if (!baseline || baseline.version !== 1 || !Array.isArray(baseline.violations)) fail('invalid dependency baseline');
  const keys = new Set();
  for (const entry of baseline.violations) {
    if (!entry || Object.keys(entry).sort().join(',') !== 'importer,reason,rule,target' || typeof entry.reason !== 'string' || !entry.reason.trim()) fail('baseline entries require importer, target, rule and reason');
    canonical(entry.importer); canonical(entry.target);
    if (!['runtime-boundary', 'shared-must-not-import-feature-or-app', 'feature-must-not-import-app', 'private-feature-import', 'server-builtin-in-browser'].includes(entry.rule)) fail('invalid baseline rule');
    const key = JSON.stringify([entry.importer, entry.target, entry.rule]);
    if (keys.has(key)) fail('duplicate baseline violation');
    keys.add(key);
  }
  return keys;
}

export function analyze(root, configuration, baseline = { version: 1, violations: [] }, ref) {
  const config = validateConfig(configuration);
  if (config.repository_areas) {
    if (!Array.isArray(config.root_files)) fail('root_files inventory must be explicit');
    config.root_files.forEach(canonical);
    const inventory = (ref ? git(root, ['ls-tree', '-r', '--name-only', '-z', ref]) : git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])).toString().split('\0').filter(Boolean);
    for (const file of inventory) {
      canonical(file);
      if (file.includes('/') ? !Object.hasOwn(config.repository_areas, file.split('/')[0]) : !config.root_files.includes(file)) fail(`unclassified repository area: ${file}; obtain reviewed structure declaration`);
    }
  }
  const exceptions = baselineKeys(baseline);
  const files = sources(root, config, ref);
  const production = [...files.keys()].filter(f => {
    ownerOf(f, config);
    const ext = path.extname(f);
    if (codeExtensions.includes(ext)) return true;
    if (!dataExtensions.has(ext)) fail(`unsupported configured source type: ${f}`);
    return false;
  });
  if (!production.length) fail('no production modules found; source roots/configuration may be incorrect');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'structure-parse-'));
  let api;
  const violations = [];
  let edges = 0;
  try {
    for (const [file, bytes] of files) {
      const output = path.join(temporary, file);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, bytes);
    }
    fs.writeFileSync(path.join(temporary, 'tsconfig.json'), JSON.stringify({ compilerOptions: { allowJs: true, noEmit: true, jsx: 'preserve', noResolve: true }, files: production }));
    api = new API({ cwd: temporary });
    const snapshot = api.updateSnapshot({ openProjects: [path.join(temporary, 'tsconfig.json')] });
    const project = snapshot.getProjects()[0];
    if (!project) fail('parser could not load production snapshot');
    for (const importer of production) {
      const source = project.program.getSourceFile(path.join(temporary, importer));
      if (!source || project.program.getSyntacticDiagnostics(path.join(temporary, importer)).length) fail(`cannot parse production module: ${importer}`);
      const from = ownerOf(importer, config);
      const imports = new Set();
      function literal(node) {
        if (!node || ![SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral].includes(node.kind)) fail(`nonliteral import/require cannot be checked: ${importer}`);
        imports.add(node.text);
      }
      function visit(node) {
        if (node.kind === SyntaxKind.ImportDeclaration || node.kind === SyntaxKind.ExportDeclaration) {
          if (node.moduleSpecifier) literal(node.moduleSpecifier);
        } else if (node.kind === SyntaxKind.ImportEqualsDeclaration && node.moduleReference?.expression) literal(node.moduleReference.expression);
        else if (node.kind === SyntaxKind.ImportType) literal(node.argument?.literal);
        else if (node.kind === SyntaxKind.CallExpression && (node.expression.kind === SyntaxKind.ImportKeyword || (node.expression.kind === SyntaxKind.Identifier && node.expression.text === 'require'))) literal(node.arguments[0]);
        node.forEachChild(visit);
      }
      visit(source);
      for (const specifier of imports) {
        const target = resolveTarget(importer, specifier, files, config);
        let rule;
        if (!target) {
          if (builtin.has(specifier) && from.runtime !== 'server') rule = 'server-builtin-in-browser';
          else continue;
        } else rule = ruleFor(from, ownerOf(target, config), importer, target, config);
        edges++;
        if (rule) violations.push({ importer, target: target ?? specifier, rule });
      }
    }
  } finally {
    api?.close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  const errors = violations.filter(v => !exceptions.has(JSON.stringify([v.importer, v.target, v.rule])));
  return { files: production.length, edges, violations, errors, stale: [...exceptions].filter(key => !violations.some(v => JSON.stringify([v.importer, v.target, v.rule]) === key)) };
}

function main() {
  const args = process.argv.slice(2);
  const options = { '--root': process.cwd(), '--config': 'config/project-structure.json', '--baseline': 'config/dependency-baseline.json' };
  for (let i = 0; i < args.length; i += 2) {
    if (!['--root', '--config', '--baseline', '--ref'].includes(args[i]) || !args[i + 1]) fail('usage: check_dependencies.mjs [--root path] [--config file] [--baseline file] [--ref full-sha]');
    options[args[i]] = args[i + 1];
  }
  const result = analyze(path.resolve(options['--root']), JSON.parse(fs.readFileSync(options['--config'])), JSON.parse(fs.readFileSync(options['--baseline'])), options['--ref']);
  for (const error of result.errors) console.error(`${error.rule}: ${error.importer} -> ${error.target}; use the public interface/correct owner or request reviewed policy work`);
  console.log(JSON.stringify(result));
  if (result.errors.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`Dependency check failed: ${error.message}`); process.exitCode = 1; }
}
