# Verification evidence — US-001-06

Status: NOT_RUN (final committed-revision full verification pending)

## Context and provenance

- Approval: Forrest / 2026-11-11, explicit READY and deliver-story requests with supplied metadata.
- Branch: codex/us-001-06-address-identity; complete-diff base ad5ed3442f1b8661da5b98a3935c14842e4c8b31. US-002 acceptance-only commit 7c62060 is retained and within declared scope; live host merge/check facts confirmed before WIP evaluation.
- Runtime: Node v22.22.1, npm 9.2.0; installed committed-lock dependencies reused, no dependency versions changed. Tests use disposable SQLite data; no real reset or deployment.
- CI: not requested; PR publication requires explicit human approval of the locally verified result.

## Observed verification before final candidate

| Command/scenario | Actual result | Artifact |
|---|---|---|
| Baseline bash scripts/verify.sh | Exit 0: 43 harness, 41 structure, 130 application, 78 browser tests; lint/types/build/lock/dependencies passed | artifacts/baseline.log |
| Initial transaction experiment | Interrupted after verification timeouts; adapter-context issue corrected through supported API/hooks | artifacts/initial-auth.log, initial-types.log |
| Focused auth/QR | Exit 0, 74 tests | artifacts/auth-focused.log |
| Focused identity/registration | Exit 0, 56 tests | artifacts/identity-registration.log |
| Identity/reset after correcting provisional test data shape | Exit 0, 23 tests | artifacts/identity-reset.log |
| All-app checkpoint | Exit 0, 153 tests | artifacts/all-app.log |
| Final reset-focused | Exit 0, 18 tests, includes nonempty provider dependency/FK rows | artifacts/reset-final-focused.log |
| Complete candidate verification at b15bba3bba18137b09eac918bd693a2a9400dbf4 | Exit 0: 43 harness, 41 structure, 158 app, 78 browser tests; full scope/dependency/lint/types/build/lock passed. Subsequent test-only strengthening requires a final committed-revision run | artifacts/full-verify.log |

## Final acceptance matrix

Final committed-revision results will be entered after the required full check completes; implementation remains IN_PROGRESS until then. The plan maps AC-01–AC-11 to the actual named test scenarios.

## Fresh technical review

Primary agent performed a separate fresh diff review after implementation. Checked proof-derived IDs, canonical session/owner references, transaction adapter/rollback and consumed attempts, replay/expiry policy, independent-process races, fixed-table reset deletion order, generation guards across old/current connections, local-only command arguments, metadata preservation and complete-path scope. Review found coverage/guard gaps: populate provider dependencies, install fences for legacy schemas, and reject unrelated databases. These are fixed and focused tests pass. No human acceptance or independent human review is claimed.

## Known limitations and human acceptance

- No new physical wallet/browser verification: browser wallet tests use simulated providers and real signatures. No UI redesign; existing theme/mobile/keyboard/accessibility browser checks remain applicable.
- Reset is destructive by design and local development/test only. Labels/path checks are not a deployment-identity or filesystem security boundary. Stop all writers first; after reset, restart server connections. No shared/production data operations or reset were run.
- Tests verify data deletion and logical credential invalidation, not forensic secure erasure of SQLite pages/WAL/backups. Existing operator backups remain operator-controlled.
- SQLite contention may fail a competing attempt safely; tests verify one canonical identity and successful fresh retry. Production throughput/fairness is not claimed.
- No fresh npm ci was needed locally; existing installation and lockfile verification used. CI, PR and merge are not requested or performed.
- Acceptance: PENDING human review of the finished result, subsequent PR/CI authorization, passing required checks and actual human merge under PROCESS. No ACCEPTED metadata is set.
