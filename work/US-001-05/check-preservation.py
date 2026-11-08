#!/usr/bin/env python3
"""Reproduce the approved one-level move and ownership/baseline preservation checks."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
mapping = json.loads((root / 'work/US-001-05/mapping.json').read_text())
base = mapping['base']


def before(name):
    return subprocess.check_output(['git', '-C', str(root), 'show', f'{base}:{name}'])


def moved(name):
    return name.replace('frontend/src/', 'frontend/').replace('backend/src/', 'backend/')


original = subprocess.check_output(['git', '-C', str(root), 'ls-tree', '-r', '--name-only', base, '--', 'frontend/src', 'backend/src'], text=True).splitlines()
assert sorted(original) == sorted(m['from'] for m in mapping['moves'])
assert len({m['to'] for m in mapping['moves']}) == len(original)
for entry in mapping['moves']:
    assert entry['to'] == moved(entry['from'])
    expected = before(entry['from'])
    assert hashlib.sha256(expected).hexdigest() == entry['sha256']
    assert (root / entry['to']).read_bytes() == expected, entry['to']
for retired in ['frontend/src', 'backend/src']:
    assert not (root / retired).exists(), retired
expected_files = {m['to'] for m in mapping['moves']} | {'frontend/index.html'}
actual_files = {str(p.relative_to(root)) for area in ['frontend', 'backend'] for p in (root / area).rglob('*') if p.is_file()}
assert actual_files == expected_files, (actual_files - expected_files, expected_files - actual_files)
assert (root / 'frontend/index.html').read_bytes() == before('frontend/index.html').replace(b'src="/src/main.tsx"', b'src="/main.tsx"')
assert (root / 'package-lock.json').read_bytes() == before('package-lock.json')
package = json.loads((root / 'package.json').read_text())
assert package == json.loads(before('package.json').decode().replace('frontend/src', 'frontend').replace('backend/src', 'backend'))
old = json.loads(before('config/project-structure.json'))
current = json.loads((root / 'config/project-structure.json').read_text())
translated = json.loads(json.dumps(old).replace('frontend/src', 'frontend').replace('backend/src', 'backend'))
translated['description'] = current['description']
translated['owners'].insert(0, {'path': 'frontend/index.html', 'kind': 'file', 'role': 'app', 'runtime': 'browser'})
assert current == translated, 'unexpected ownership/configuration policy change'
old_baseline = json.loads(before('config/dependency-baseline.json'))
new_baseline = json.loads((root / 'config/dependency-baseline.json').read_text())
assert old_baseline['version'] == new_baseline['version'] == 1
assert len(old_baseline['violations']) == len(new_baseline['violations']) == 5
for earlier, now in zip(old_baseline['violations'], new_baseline['violations']):
    assert now['importer'] == moved(earlier['importer'])
    assert now['target'] == moved(earlier['target'])
    assert now['rule'] == earlier['rule'] == 'private-feature-import'
    assert now['reason'].endswith('Previous provenance: ' + earlier['reason'])
    assert earlier['importer'] in now['reason'] and earlier['target'] in now['reason']
print(f'PASS: {len(original)} files/assets moved exactly once with identical bytes; retired directories absent; complete source inventory preserved.')
print('PASS: HTML entry only path-adjusted; lockfile/dependencies unchanged; ownership only prefix-translated plus explicit HTML owner; five exact baseline edges retain provenance.')
