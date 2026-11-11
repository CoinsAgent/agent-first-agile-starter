# Verification evidence — US-001-06

Status: PASS

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

## Verification

Tested and freshly reviewed revision: **6fb9c10029ef18dc8d8d50d7dc988b30e34b58af**. The full command below exited **0** with 43 harness tests, 41 structure fixtures, 158 application tests and 78 browser tests (1.0m), plus lockfile/download-source, dependency, complete-diff scope, lint, TypeScript and production build checks. No required check was skipped or weakened.

```bash
STRUCTURE_SCOPE_BASE=ad5ed3442f1b8661da5b98a3935c14842e4c8b31 \
STRUCTURE_SCOPE_HEAD=6fb9c10029ef18dc8d8d50d7dc988b30e34b58af \
STRUCTURE_SCOPE_FILE=work/US-001-06/scope.json bash scripts/verify.sh
```

Log: artifacts/record-corrected-verify.log (ignored local reproducible artifact). Browser test results: existing test-results/ and playwright-report/ (ignored generated output). The human-readable AC mapping below refers to actual passing tests, not generated evidence treated as tests.

## Acceptance matrix

| AC | Actual test/review evidence | Result |
|---|---|---|
| AC-01 | identity.test.ts persisted primary key, wallet/account/session refs, API userId/address and distinct technical IDs | PASS |
| AC-02 | identity.test.ts repeat/case/independent-connection/restart cases; auth.test.ts reload/logout/session tests; qr.test.ts persisted user assertion | PASS |
| AC-03 | identity.test.ts account switch/two-owner/two-app case and caller-ID rejection; hidden linking/auth routes in auth.test.ts | PASS |
| AC-04 | identity.test.ts independent Node-process race, independent connections, account/session insertion failures, consumed-attempt replay rejection and fresh retry | PASS |
| AC-05 | auth.test.ts malformed messages, domain/URI/chain/nonce/substitution/replay/cross-browser/time bounds; identity.test.ts invalid signer leaves no user; qr.test.ts approval/binding/expiry regressions | PASS |
| AC-06 | identity.test.ts three persisted mismatch cases; auth.test.ts SIWE provenance, session expiry boundaries, logout/replay and independent-session behavior | PASS |
| AC-07 | applications.test.ts registration/owner boundaries and provider behavior; identity.test.ts two independent apps retained only for original owner; reset.test.ts fresh post-reset registration | PASS |
| AC-08 | reset.test.ts legacy startup refusal with unchanged row/table inventory; identity.test.ts compatible restart plus retained credential and fresh sign-in; fresh initialization throughout all tests | PASS |
| AC-09 | reset.test.ts populated user/session/wallet/account/challenge/QR/application/submission/rate plus seeded access/refresh/consent/client-resource/assertion rows; all removed, keys/resources/unrelated rows/config/source preserved; rollback, busy refusal, repeated reset, old credentials/proofs and pending/stale writer fencing | PASS |
| AC-10 | reset.test.ts actual subprocess: explicit disposable legacy target success; missing/relative/duplicate/unknown/ack/environment/production NODE_ENV/unrelated-database refusal; reviewed docs explain target classification and local-only operations | PASS |
| AC-11 | Complete docs/structure/source/test diff reviewed; full verify passes existing light/dark/mobile/keyboard/accessibility/SIWE/QR/registration browser regressions. New UI interactions/wallets are not introduced | PASS |

The primary agent reread the final test strengthening and complete 23-path diff, ran git diff --check and complete committed scope validation, and found no remaining material issue. Proposed and actual paths agree with scope.json; no unrelated source edits, dependency upgrades, host changes, early PR/CI, real reset or deployment. Previous US-002 acceptance files are deliberate carry-forward records.

After this passing run, only story lifecycle, plan and evidence records change to record QA_PASSED. Final record commit receives focused harness metadata, whitespace and complete committed scope checks; its product/test code remains identical to the tested revision. Human finished-result review and PR/CI authorization remain pending.

## Review

Primary agent performed a separate fresh diff review after implementation. Checked proof-derived IDs, canonical session/owner references, transaction adapter/rollback and consumed attempts, replay/expiry policy, independent-process races, fixed-table reset deletion order, generation guards across old/current connections, local-only command arguments, metadata preservation and complete-path scope. Review found coverage/guard gaps: populate provider dependencies, install fences for legacy schemas, and reject unrelated databases. These are fixed and focused tests pass. No human acceptance or independent human review is claimed.

## Known limitations

- No new physical wallet/browser verification: browser wallet tests use simulated providers and real signatures. No UI redesign; existing theme/mobile/keyboard/accessibility browser checks remain applicable.
- Reset is destructive by design and local development/test only. Labels/path checks are not a deployment-identity or filesystem security boundary. Stop all writers first; after reset, restart server connections. No shared/production data operations or reset were run.
- Tests verify data deletion and logical credential invalidation, not forensic secure erasure of SQLite pages/WAL/backups. Existing operator backups remain operator-controlled.
- SQLite contention may fail a competing attempt safely; tests verify one canonical identity and successful fresh retry. Production throughput/fairness is not claimed.
- No fresh npm ci was needed locally; existing installation and lockfile verification used. CI, PR and merge are not requested or performed.
- Acceptance: PENDING human review of the finished result, subsequent PR/CI authorization, passing required checks and actual human merge under PROCESS. No ACCEPTED metadata is set.

## Evidence format correction

The first lifecycle-record metadata check failed because this document used non-template section titles. The product run had passed, but the required headings Acceptance matrix, Verification and Review were missing. Restored the exact required headings, returned the story to IN_PROGRESS, and rerun the full verification before the next QA_PASSED transition. Product/test source is unchanged from 3db9e25. No check was weakened.

Final format-corrected run completed with exit 0 on 6fb9c10029ef18dc8d8d50d7dc988b30e34b58af: 43 harness, 41 structure, 158 application and 78 browser tests, lock/source/dependency/scope/lint/types/build all passed. Restore QA_PASSED only after this observed result. Final source/test diff against 3db9e25 is empty; record-only changes receive focused validation. Strict standalone maintenance-command TypeScript check also passed with `npx tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --strict --skipLibCheck scripts/reset-local-data.ts` (TS7 requires --ignoreConfig for explicitly selected files), and `npx oxlint --deny-warnings scripts/reset-local-data.ts` exited 0. Artifact: artifacts/maintenance-static.log.

## Human acceptance

Not yet accepted. The finished result awaits human review and explicit PR/CI authorization. No PR/CI or real database reset/deployment has run. The final record commit changes only lifecycle, plan and evidence; tested implementation remains 6fb9c10.

## Requested deployment — prepared, awaiting deployed-data decision

The human explicitly requested release on existing port 3000 for https://walletgate.beeswarm.dev/. This authorizes deployment, but does not override the approved local-only reset boundary or authorize deleting deployed data.

- Prepared exact snapshot 469af5021a2957d90e7530f737d2c3bf1fa4ce12 with git archive in /home/ubuntu/walletgate-releases/469af5021a2957d90e7530f737d2c3bf1fa4ce12, with an independent copy of installed dependencies. Release build exited 0 (artifacts/release-build.log). Product/test code matches tested 6fb9c10.
- Isolated production-mode startup on temporary port 3107 with a disposable in-memory DB passed: page200, unauthenticated session/applications401, hidden generic provider routes404. Smoke process stopped afterward. artifacts/release-smoke.log and release-smoke-result.json. No production secrets used.
- Read-only deployed-database preflight: quick_check ok; 13 users, all with incompatible legacy IDs, and 5 registered applications. New release intentionally refuses this data. Current service release is 0122477a387366d2ad740f414dda743a377a367c. Configured origin/port match https://walletgate.beeswarm.dev/ and 3000. Private target metadata: artifacts/deployment-preflight.json; no secret values printed/copied. Corrected that artifact's root ownership to ubuntu with private mode retained after a local read failed; no runtime file permissions changed.
- Existing walletgate.service remains active and public HTTPS returns200 with TLS verification. No service stop, runtime config/secret/database change, reset, restore or release switch occurred. Await a separate human decision on fresh deployed data or another explicitly authorized data plan. The suggested path preserves the old database and switches the site to a new empty database. No PR/CI or acceptance is implied; QA_PASSED remains the local implementation result.

## Human-authorized fresh deployment database

The human explicitly instructed “deploy with a new empty database” after disclosure of the 13 legacy users and 5 existing registered applications. This authorizes switching the requested port-3000 HTTPS site to the prepared release with a new database, preserving the existing database and previous configuration for rollback. Do not invoke the reset command or delete/restore the old data. Keep runtime.env and secrets unchanged; use a dedicated systemd environment-file override for DATABASE_PATH. Save previous drop-in, stop the old process, switch/restart, then verify local/public routes/assets and actual browser rendering. No PR/CI, story acceptance or unrelated permissions are implied.

## Fresh-database deployment completed

- Human authorization: “deploy with a new empty database”, following disclosure of incompatible deployed data and recommendation to preserve the old database. This operational authorization is separate from PR/CI and story acceptance.
- Exact release: /home/ubuntu/walletgate-releases/469af5021a2957d90e7530f737d2c3bf1fa4ce12; service walletgate.service active on port3000 with PID 3818288, process cwd verified. New database: /home/ubuntu/walletgate-data/us-001-06-20261111T041832Z/walletgate.sqlite; after startup quick_check passed and user/application counts were both zero. No reset command was invoked.
- Stopped previous PID 2928850; retained previous release /home/ubuntu/walletgate-releases/0122477a387366d2ad740f414dda743a377a367c. Made a private consistent SQLite backup at /home/ubuntu/walletgate-backups/us-001-06-20261111T041832Z/walletgate.sqlite with quick_check ok. Original database /home/ubuntu/agent-first-agile-starter/data/walletgate.sqlite remains intact with 13 users and 5 applications; no deletion or restore performed.
- Preserved /etc/walletgate/runtime.env byte-for-byte and verified in-memory equality of the service's auth secret, trusted HTTPS origin and port. Added only /etc/walletgate/us-001-06-database.env for the new DATABASE_PATH, referenced after the original EnvironmentFile by the existing 05-release.conf drop-in. Previous drop-in retained privately in artifacts/previous-release-dropin.conf. nginx -t passed; no TLS/DNS/nginx routing or host-protection changes.
- Local trusted-Host/X-Forwarded-Proto checks passed: page200, unauthenticated session/applications401, hidden generic provider routes404. Public https://walletgate.beeswarm.dev/ returned200 with TLS verification; all three referenced JS/CSS assets exactly match release bytes/fingerprints. Public session/applications401 and hidden provider routes404. artifacts/deployment-result.json and public-release-check.json.
- Actual headless Chromium loaded the public sign-in and #applications auth gate without page errors. Screenshot artifacts/deployed-sign-in.png was inspected; artifacts/deployed-browser-check.json reports PASS. No real wallet proof or application creation was performed against the new persistent database; authenticated behavior was covered by local tests.
- Rollback: stop walletgate.service, restore artifacts/previous-release-dropin.conf to /etc/systemd/system/walletgate.service.d/05-release.conf (which removes the added EnvironmentFile reference), daemon-reload and start. The original runtime.env still selects the old preserved database. Do not restore/delete either database automatically; preserve any newly registered identities/apps and obtain a separate decision before moving data. The new environment file may remain unreferenced.
- Deployment complete. US-001-06 remains QA_PASSED; no PR/CI or merge/acceptance was requested/performed. Record-only updates receive metadata/whitespace/complete-scope checks; no application source changes or repeated application suite are needed.
