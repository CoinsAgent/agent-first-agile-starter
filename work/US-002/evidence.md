# Verification evidence — US-002

Status: IN_PROGRESS

## Context and provenance

- Branch: codex/us-002-registration; READY base 915e3eb; complete PR base eaca15f.
- Human explicitly approved READY and delivery, web-only scope. Accepted US-001-05 record retained from 0e78698.
- Initial checkout lacked node_modules. bash scripts/verify.sh exited 1 during structure fixtures (TypeScript dependency unavailable); baseline log artifacts/baseline-initial.log. Independent local copy of existing dependencies is being prepared; baseline will be rerun.
- Runtime: Node v22.22.1, npm 9.2.0.
- CI: not requested; no PR or release authorized by this delivery.

## Acceptance matrix

AC-01–13: NOT_RUN; mapping is in plan.md.

## Verification

Implementation checks pending. No passing product result is claimed.

## Review

Independent technical review pending.

## Known limitations

Provider compatibility/atomic creation mechanism under investigation. Existing browser wallet coverage is simulated; no new physical-wallet claim.

## Human acceptance

PENDING finished-result review, authorized PR/CI and actual human merge. No acceptance metadata is changed.

Baseline restored: independent local dependency copy, bash scripts/verify.sh exited 0: 43 harness tests, 41 structure fixtures, 83 application tests, 68 browser tests (51.4s), lint/types/build and dependency checks. Log artifacts/baseline.log. No product code changed before the baseline completed.

## Partial implementation and observed checks — 2026-11-08

- Dependency install: npm install --save-exact @better-auth/oauth-provider@1.7.15 @better-auth/core@1.7.15 exited 0; one new package added, zero audit findings. Complete lock diff preserves all existing resolved versions. Log artifacts/dependency-install.log.
- Internal provider/JWT configuration, schema migrations, verified-owner facade and registration service implemented; HTTP provider/protocol routes stay blocked. No frontend implementation yet.
- Provider client creation, hash-only storage, owner list/detail isolation, profile override rejection, name/redirect validation, fixed-window persisted rate limit, transactional cap and submission claims are present. Real provider create and claim persistence share the supported core transaction. A database trigger independently prevents the 21st client per wallet. Raw secrets leave the service only after transaction success.
- npm run test -- --reporter=dot (existing suite before new tests) exited 0: 83 tests passed. Log artifacts/backend-regressions.log.
- npm run test -- --run tests/app/applications.test.ts exited 1: 34 passed, 1 failed out of 35. Log artifacts/registration-tests.log. Passed cases include actual provider hash storage, distinct clients, own/foreign reads, proven-session/expiry/CSRF checks, unavailable alternate routes, name/redirect negatives, rate boundary, concurrent duplicate retries without another secret, concurrent cap boundary, provider rollback after injected submission failure and restart/replay without secret disclosure.
- The failing case is the approved positive HTTP-localhost redirect journey. The wrapper accepts the approved URIs but the provider rejects them. This is intentionally preserved as a failing AC check; no assertion is weakened and no partial QA claim is made. The facade currently maps this unexpected provider error to generic 500; it is not a completed or review-ready product result.
- npm run lint and npm run typecheck passed. Actual dependency graph result is recorded by the final focused check below. The full application suite was not rerun after adding the new tests because a material policy blocker prevents completing the slice; full QA remains mandatory after resolution.

## Blocking finding and independent research

Read-only researcher registration_facts inspected the exact installed provider and its public types. In node_modules/@better-auth/oauth-provider/dist/authorize-Cmcf5O5Y.mjs, validateClientRedirectUri unconditionally requires HTTPS on non-loopback hosts for web clients; all managed create paths reach it. Public validateRedirectUri docs say client registration is unchanged. There is no supported registration-validator override in the inspected provider options. Native-client substitution or rewriting redirects after provider validation would change the approved scope and is not used.

The human must choose HTTPS/non-loopback callbacks for this web-client story, or retain HTTP loopback and authorize further supported-integration investigation. Existing AC lines and human approval metadata are preserved. BLOCKED means a concrete human policy decision is required, not ordinary test debugging. No frontend, full QA, final technical review, PR/CI, merge or deployment is claimed.

Final focused checks at the blocked checkpoint: python3 scripts/check_harness.py, git diff --check and node scripts/check_dependencies.mjs all exited 0 (22 source files, 39 edges, zero new dependency errors/stale entries; five pre-existing baseline relationships retained).

## Resumed implementation after explicit human policy approval

The human answered "yes" to the proposed AC revision requiring HTTPS non-loopback callbacks, including development. Story policy/AC-05 and tests were revised with that explicit decision, preserving original READY metadata and all other ACs. Resumed IN_PROGRESS. The prior BLOCKED section is historical.

New web journey: existing SIWE sign-in → My applications → register → one-time result/copy → persistent read-only list. Drafts/results stay in memory and are wallet-bound; reauthentication preserves nonsensitive drafts only for the same verified owner. Generic provider and protocol endpoints remain blocked.

Independent preliminary review identified two real defects: a provider transaction could encompass another browser's raw QR writes on the same connection; independent connections could return an opaque SQLite conflict for an idempotent submission. Corrected using per-file facade serialization (input is bounded/read before queueing) and bounded transaction-conflict retries. Added independent-connection replay/cap/rate/persistence tests and concurrent slow-input/QR/rollback protection. These are technical changes within approved ACs.

Focused results before final checks: 43 new registration integration tests passed; all nine new browser tests passed (12.6s), including real signatures behind simulated wallets, lost-response reconciliation, double-click, same/other-owner reauthentication, both themes, mobile layout, keyboard focus, axe checks and masked screenshots. An initial browser locator was ambiguous because output elements also have status roles; corrected to the explicit status paragraph. The first failure diagnostic captured a synthetic test credential, which was redacted from its log and removed from generated DOM error context; the credential suite now disables automatic DOM snapshots and network traces. No production credential/data was used.

Current full-suite and final-review results remain pending; no QA_PASSED claim yet.

## Final implementation review checkpoint

The initial full verification at 15ca1bb failed an unchanged existing QR race assertion (128 passed, one failed): serializing all requests prevented cancel from interrupting approval. Replaced total serialization with shared access for ordinary auth/QR operations and exclusive access for registration. Existing QR assertions are unchanged and now pass. New readers may join while a writer waits; sustained reader traffic can delay registration. This evaluation-only throughput limitation is recorded, not described as production abuse resistance.

Final read-only reviewer registration_facts found no remaining blocking finding after re-review. They executed application+QR tests: 70/70 passed, plus git diff --check. Earlier issues (cross-request rollback, independent-connection conflict and lost-response→429 identity loss) were corrected with regression coverage. The reviewer is not a human business approver and did not claim a full-suite or browser result.

New integration suite now passes 47/47 (artifacts/registration-final-races.log), including the real independent Node-process race using a disposable SQLite file and generated test wallet, one persisted client and exactly one secret-bearing response. Reviewed prior all-application run passed 129/129 before the final additional process-race test. All final code will be committed before the full exact-revision run.
