# Delivery plan — US-001-07

## Story and scope

Native user ownership for fresh-database OAuth clients; AC-01 through AC-09 in backlog/US-001-07.md. No conversion, deployed-data change, UI redesign, new management API, PR/CI or deployment.

## Current architecture and approach

Remove the provider clientReference callback; use its supported native session-user ownership. Replace application owner queries/counts and stored-owner checks with userId. Define the user-based cap SQL and a read-only compatibility assertion in feature-local backend/applications/ownership.ts, exported through applications/index.ts. Bootstrap's fresh SQL snapshot consumes the cap definition; wallet-auth composition invokes readiness before WAL/configuration/requests. Conservatively require the expected cap trigger and exclusively user-owned, user-linked client rows; refuse old storage, never upgrade it.

## Structure and writable paths

- Structure: docs/PROJECT_STRUCTURE.md. Existing applications owns client authorization/limits; oidc owns provider config; bootstrap assembles fixed initial schema; wallet-auth consumes public application interfaces. No new directory or dependency exception. ownership.ts is the only new runtime file, within the existing applications owner.
- Exact writable files and execution artifacts: scope.json. Include prior US-001-06 story/evidence acceptance record, retained from a396aa2; AGENTS.md and story-map edits are authorized shaping/standing READY defaults carried into this branch.
- Branch: codex/us-001-07-user-client-ownership. Complete diff base: 2583a5f8a78cba5b9bcbece7bacf54adefc143f8 (merged main). Starting head: a396aa2af40bf5267bb0cd4e4a803d1a864a1a7f.
- Approval: human explicitly requested READY approval US 001 07; verified GitHub CoinsAgent; date 2026-11-12, standing defaults recorded in AGENTS.md.
- Reconfirmed PR #9 human CoinsAgent merge at 2026-11-11T10:20:31Z and successful required run 43002292173 for head17a45038021bc2df7186c4b8314661040134124c. US-002 and US-001-06 are ACCEPTED; no other delivery WIP.
- Baseline: bash scripts/verify.sh exited 0 before product edits: 43 harness tests, 41 structure fixtures, 167 application tests, 78 browser tests, plus dependency/lockfile/lint/types/build checks (artifacts/baseline.log).
- Technical path revisions: none.
- Human-owned decision changes: none.

## Acceptance tests

| AC | Executable verification | Layer |
|---|---|---|
| AC-01 | Real provider creation, canonical user/session/client join, null reference and independent credentials | app integration |
| AC-02 | Two clients; re-sign-in/restart, list/detail and retry without secrets | app integration/browser regressions |
| AC-03 | Wrong owner, ownership overrides, expired/unproven/mismatched sessions, blocked provider routes | app integration |
| AC-04 | Twenty/21 boundary, separate owner, restart, independent connections/processes and direct insert guard | SQLite/provider integration |
| AC-05 | Existing rate exact boundaries, retries, rollback, independent processes; add reauthentication retry | app integration |
| AC-06 | Legacy/missing guard and reference/unowned rows refused; full schema/data snapshots unchanged; existing initializer tests | database integration |
| AC-07 | Existing auth/QR/identity/reset tests with native foreign keys; secret hash assertion | integration/browser |
| AC-08 | Existing registration/recovery/accessibility/theme/browser suite, unchanged UI | browser |
| AC-09 | Setup docs, complete diff/scope/dependency review, full verify and evidence | full harness/product |

## Verification commands

- Baseline and final: bash scripts/verify.sh (final with STRUCTURE_SCOPE_BASE/HEAD/FILE).
- Focused: npx vitest run tests/app/applications.test.ts tests/app/database.test.ts tests/app/reset.test.ts; npm run typecheck; node scripts/check_dependencies.mjs.
- Fresh read-only review after implementation; no reviewer acts as human approver.
- No hosted CI/PR until explicit approval of finished result; human merge establishes acceptance. No production release.

## Risks and execution

Fresh-only code will refuse deployed reference-owned storage. No live database is opened or changed. Exact trigger comparison is deliberately conservative for the pinned initial schema; equivalent manually customized schema also requires separate fresh setup.
Baseline and implementation complete. Red-to-green focused suite: 9 expected failures/72 passes before production changes, then 81 passes; readiness-order review added one more case and its 34-test database/reset suite passes. Full verification passed on f957d0b1dab4f92d7400270486ef1c5cc82c2b97: 43 harness, 41 structure, 175 app and 78 browser tests, plus lockfile/dependency/scope/lint/types/build. Fresh read-only primary-agent review completed; no unresolved findings. Evidence is recorded; QA_PASSED handoff awaits human finished-result approval before PR/CI. Present verified revision and actual paths for human finished-result approval before PR/CI.

## Final paths and review handoff

All 19 actual changed paths are within scope.json: six backend files, three application test files, two setup/structure docs, AGENTS.md, story map, this story, three execution records, plus prior US-001-06 story/evidence acceptance. No planned path expansion was needed. Alternative of retaining reference ownership and patching userId was rejected in favor of supported native behavior. No frontend code or dependency/config/check policy changed. Complete diff base remains current main2583a5f; implementation/test revision f957d0b. Final record-only commit preserves that verified source. No PR, hosted CI, acceptance or release has been performed.

## Human-authorized operation-test release

The human requested “release to port 3000 for human operation test” after the fresh-only behavior and undeployed status were explained. Prepare immutable reviewed release 0d024d4086a327c6304dbd3bb0e278e388132810 (source/tests identical to fully verified f957d0b). Use a separate explicitly initialized empty persistent database for this fresh-only test deployment; preserve the previous database, runtime.env/secret/origin/port and HTTPS routing. No conversion/reset of old storage. The earlier explicit fresh-database deployment instruction and this story's confirmed fresh-only scope remain applicable. Prepare/build/smoke the actual release before switching; save previous drop-in and consistent private old-database backup, then switch only the service release/database override. Roll back to the previous release/database on failure. Verify local/public routes, assets, TLS/browser rendering and new storage health; actual wallet signing is performed by the human. Existing plan/evidence/artifacts scope covers these operational records; no product changes, QA transition, PR/CI or merge acceptance.

Operation-test release completed successfully: immutable0d024d4 active on3000 with a separate explicit fresh database; previous release/database/three users/three clients and consistent backup retained. Actual-release SIWE/client/session smoke, local/public TLS/assets, browser home/application auth gate and private storage permissions passed. Concrete paths/results/rollback and human-test steps are in evidence. No product changes or PR/CI/acceptance; final checks are record-only.

## Human-approved PR/CI phase

The human explicitly requested “opening its PR and running CI” after reviewing the finished/deployed result. Publish the branch with an authorization-record-only commit; no product/test changes follow verified f957d0b. Reconfirm current main/base, focused metadata/whitespace/complete scope, check for an existing PR and open once. Required existing CI runs from PR creation; inspect completion at bounded checkpoints without repeated polling or record-only pushes. Human merges after required CI and review; record acceptance locally afterward. No merge or additional deployment/data operation is authorized by this step.
