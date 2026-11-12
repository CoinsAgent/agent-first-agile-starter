# Verification evidence — US-001-07

Status: NOT_RUN

## Context and provenance

Story: US-001-07. Branch: codex/us-001-07-user-client-ownership. Human approval: CoinsAgent, 2026-11-12. Previous acceptance retained from a396aa2; PR9 merge and required CI reconfirmed read-only. No live database/deployment operations.

## Baseline

Command: bash scripts/verify.sh. Exit 0 before product edits: 43 harness tests, 41 structure fixtures, 167 application tests and 78 browser tests, plus dependency/lockfile/lint/types/build. Log: artifacts/baseline.log. Node v22.22.1; pinned Better Auth/core/provider1.7.15; SQLite via better-sqlite3; existing Playwright Chromium.

## Focused checks

- Red-to-green: npx vitest run tests/app/applications.test.ts tests/app/database.test.ts tests/app/reset.test.ts exited 1 before product edits, with 9 expected failures / 72 passes: native ownership/reset assertions and six incompatible-storage refusal cases. artifacts/red-tests.log.
- Same command after implementation exited 0: 81 tests passed. artifacts/focused-tests.log.
- npm run typecheck, node scripts/check_dependencies.mjs and npm run lint exited 0; dependency output retains five existing baselined private-feature edges and no new errors/stale exceptions.
- Startup-order review found older identity data could mask fresh-schema guidance. Application readiness now runs before identity-data validation, after initialization/fence attachment and before journal/configuration writes. The reset legacy fixture now keeps native client links consistent with its intentionally legacy user. Added older-guard-plus-legacy-identity refusal regression. npx vitest run tests/app/database.test.ts tests/app/reset.test.ts exited 0: 34 tests passed. artifacts/readiness-review-tests.log.

## Acceptance matrix

AC-01 through AC-09: NOT_RUN; see plan for verification mapping.

## Verification

Final full verification: NOT_RUN. CI not requested; explicit finished-result approval required first.

## Review

NOT_RUN.

## Known limitations

Fresh databases only; no conversion or deployment authorized. Runtime tools already installed; cloud environment status tool is unavailable in this executor. Tests use disposable local databases and existing Playwright.

## Human acceptance

PENDING human review, approved PR/CI and human merge. No acceptance claimed.
