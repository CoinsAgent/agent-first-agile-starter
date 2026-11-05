import { readFileSync } from 'node:fs';

// Run before npm ci: a lockfile can retain machine-specific download URLs
// even when npm's registry setting points to the public registry.
const file = process.argv[2] ?? 'package-lock.json';
const lock = JSON.parse(readFileSync(file, 'utf8'));
const invalid = Object.entries(lock.packages ?? {}).filter(([, pkg]) => {
  if (!pkg.resolved) return false;
  try {
    const url = new URL(pkg.resolved);
    return url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || !!url.username || !!url.password;
  } catch { return true; }
});
if (invalid.length) {
  console.error(`Lockfile contains ${invalid.length} non-public-registry download sources. Regenerate using https://registry.npmjs.org.`);
  process.exitCode = 1;
} else console.log('Lockfile download sources use the public npm registry over HTTPS.');
