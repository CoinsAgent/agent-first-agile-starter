#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo '[harness] Running harness self-tests...'
python3 -m unittest discover -s tests -p 'test_*.py'
echo '[harness] Validating repository state...'
python3 scripts/check_harness.py

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
