#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm run typecheck
npm run test
npm run build
npm run test:e2e
