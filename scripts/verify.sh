#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo '[harness] Running harness self-tests...'
python3 -m unittest discover -s tests -p 'test_*.py'
echo '[harness] Validating repository state...'
python3 scripts/check_harness.py

echo '[structure] Running dependency acceptance fixtures and production checks...'
node --test tests/structure/*.test.mjs
node scripts/check_dependencies.mjs
echo '[scope] Python fixtures test scope/approval rules; live authorization requires trusted host verification.'
if [[ -n "${STRUCTURE_SCOPE_BASE:-}${STRUCTURE_SCOPE_HEAD:-}${STRUCTURE_SCOPE_FILE:-}" ]]; then
  : "${STRUCTURE_SCOPE_BASE:?Set an explicit complete-diff base}"
  : "${STRUCTURE_SCOPE_HEAD:?Set an explicit complete-diff head}"
  : "${STRUCTURE_SCOPE_FILE:?Set the proposed/approved scope file}"
  python3 scripts/check_scope.py --base "$STRUCTURE_SCOPE_BASE" --head "$STRUCTURE_SCOPE_HEAD" --scope "$STRUCTURE_SCOPE_FILE"
else
  echo '[scope] No actual diff selected locally. Set STRUCTURE_SCOPE_BASE, STRUCTURE_SCOPE_HEAD and STRUCTURE_SCOPE_FILE to check one.'
fi

if python3 scripts/check_harness.py --needs-product; then
  echo '[product] Implementation story detected. Running mandatory application checks...'
  if [[ ! -f scripts/project-verify.sh ]]; then
    echo '[product] ERROR: scripts/project-verify.sh is missing. Add real, stack-specific tests.' >&2
    exit 2
  fi
  bash scripts/project-verify.sh
  echo '[product] Application verification completed successfully.'
else
  echo '[bootstrap] No implementation-stage story detected: harness-only checks passed.'
  echo '[bootstrap] This does NOT mean product code or acceptance criteria have been tested.'
fi
