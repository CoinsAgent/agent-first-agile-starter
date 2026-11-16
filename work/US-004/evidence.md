# Verification evidence — US-004

Status: PASS

## Context and provenance

- Human-approved story: `backlog/US-004.md`, approved_by CoinsAgent, approved_at2026-11-16 Asia/Shanghai, followed by explicit deliver-story invocation. Approved ACs/Q1–Q28 remain unchanged.
- Branch: `codex/us-004-cli-management`.
- Full-diff base: `c224199b3da4333f73cbf09d320f97c1d0774082` (main), read-only reconfirmed from GitHub after implementation.
- Tested revision: `3d4ad9816d3c0c92326d4e2023d38c1cf0da52e0`. Product source is identical to independently reviewed5fd2e35171abb8edde7f57ca9d7826397cc521f3; the later commit adds nine explicit ownership/profile override regression cases. The subsequent QA commit changes only story/plan/evidence records.
- Environment: Linux, Node v22.22.1, npm9.2.0, Python3.14.4, installed Better Auth/core/OAuth provider1.7.15, better-sqlite3 and Playwright Chromium. Installed locked dependencies reused; no dependency/lock change or new download.
- No US-004 PR or hosted CI requested or started. No deployment, existing-data conversion/reset, host protection or permission change performed.

### Previous acceptance recovery

Read-only `gh pr view 11 --json state,mergedAt,mergedBy,mergeCommit,headRefOid,statusCheckRollup,url` and `gh run view 43551002730 --json conclusion,headSha,jobs` confirmed PR11 was merged by human CoinsAgent (is_bot=false) at2026-11-14T03:22:29Z, merge SHA c224199, after both required current-head checks passed on307d3a1. Retained acceptance commit09d4594 is an ancestor of this branch. `backlog/US-003.md` and `work/US-003/evidence.md` are explicitly declared and included. No duplicate acceptance PR/CI created.

## Implementation and actual paths

Changes cover applications/OIDC/wallet composition, fixed fresh schema/system CLI initialization, new Linux `cli/`, owner consent/authorization list/revoke UI, CLI guidance replacing web registration/list, tests, setup/structure docs, structure declarations and `.agents/skills/walletgate-cli/SKILL.md`. Obtain all actual paths with `git diff --name-only c224199b3da4333f73cbf09d320f97c1d0774082 HEAD`; proposed paths are in scope.json. Some proposed files needed no change (including init-database.ts, oidc/policy.ts and oidc-worker.ts). No undeclared changes, new dependency exceptions or check removals.

Two supported Better Auth configurations share storage/transaction integration. RP registration retains hashed client secrets/JWT ID signing. The management-only configuration disables JWT access issuance, handles the initialized public CLI and cannot register clients. Its required encrypted-secret option stores no secret because this sole client is public. Native code/PKCE/client/session validation remains intact. No upstream patches or shared per-request provider-option mutation. Management scopes do not broaden RP permissions.

## Acceptance matrix

These PASS results refer to observed executable verification, not plans or generated story text.

| AC | Actual scenarios | Result | Source/evidence |
|---|---|---|---|
| AC-01 | Actual SIWE, public native code/S256 exchange without secret, browser/session binding, denial/replay/bad redirect/verifier, continuation expiry and actual CLI callback | PASS | management.test.ts; management.spec.ts; final-verify.log |
| AC-02 | System CLI eligibility, RP access/ID/secret/IAT/cookie substitution denial, scope/resource/grant rejection, blocked aliases and nine explicit owner/profile overrides | PASS | management.test.ts; applications.test.ts; applications.spec.ts |
| AC-03 | Opaque resource-bound tokens, logout-independent refresh, access/idle/absolute deadlines, strict replay family isolation, revoke/replacement, incomplete CLI logout and identity mismatch | PASS | management.test.ts; cli.test.ts; management.spec.ts |
| AC-04 | Native IAT creation/invalid input, exact expiry, single-success retries across connections/processes, issuance/registration limits, original-parent binding/revocation and expired-IAT denial | PASS | applications.test.ts; management.test.ts |
| AC-05 | Native IAT referenceId ownership/null userId, canonical wallet identity, independent IDs, override denial/owner immutability and fresh-only refusal without mutation | PASS | management.test.ts; applications.test.ts; database.test.ts; identity.test.ts |
| AC-06 | Unicode/name/redirect limits, confidential web profile, hashed one-time secrets, fixed rate/quota, rollback, immutable public reconciliation, tombstones/no resurrection and deletion quota recovery | PASS | applications.test.ts; management.test.ts; live CLI browser test |
| AC-07 | Two-wallet/same-owner target isolation, per-target operation map, read filtering, no implicit mutation-read privilege or mutable-config/other-parent reconciliation disclosure | PASS | management.test.ts; identity.test.ts |
| AC-08 | Atomic strict name/redirect updates, invalid updates retain configuration, removed redirect blocks pending/code use while existing families survive | PASS | management.test.ts actual RP protocol |
| AC-09 | Confirmed permanent deletion, pending/code/refresh/UserInfo denial, issuance/delete interleaving, unrelated RP survival and non-disclosing repeat results | PASS | management.test.ts; applications.test.ts; management.spec.ts |
| AC-10 | Token-only API/alias/cookie negatives, old-link guidance, actual consent/list/revoke, axe WCAG checks, keyboard, light/dark, narrow layout/200% zoom, expiry state and wallet/QR/RP regressions | PASS | management.spec.ts; applications.spec.ts; complete browser suite |
| AC-11 | Actual CLI child-process login/create/list/get/update/delete/logout and protected secret output; secure file/permission/symlink/repo-path/raw-argument/confirmation/error tests; companion skill/docs | PASS | management.spec.ts; cli.test.ts; delivered skill |
| AC-12 | Pinned provider/SQLite/CLI/browser tests, process retries, exact before/at/after deadlines across restart, full verification/scope and independent review | PASS | final-verify.log; scope.json; review below |

## Verification

- Baseline `bash scripts/verify.sh` before product edits: exit0;43 Python tests,41 structure fixtures,228 application tests,84 browser tests, lockfile/lint/types/build. Log: artifacts/baseline.log.
- Development used focused Vitest, lint/types/dependency checks, build and Playwright management/guidance/RP tests. Early failures were fixed; they are not represented as passing runs.
- Full verification on5fd2e35: exit0;43 Python tests,41 structure fixtures,278 application/CLI tests and81 browser tests, plus lockfile/lint/types/build and complete-diff scope. Log: artifacts/verification-5fd2e35.log.
- Added ownership/profile negatives: `npx vitest run tests/app/applications.test.ts` exited0 with56 tests. Log: artifacts/registration-final.log.
- Final command: `STRUCTURE_SCOPE_BASE=c224199b3da4333f73cbf09d320f97c1d0774082 STRUCTURE_SCOPE_HEAD=3d4ad9816d3c0c92326d4e2023d38c1cf0da52e0 STRUCTURE_SCOPE_FILE=work/US-004/scope.json bash scripts/verify.sh`.
- Final exit code: **0**. Log: **artifacts/final-verify.log**. Actual totals: **43 Python tests,41 structure fixtures,287 application/CLI tests across10 files,81 Playwright tests**; lockfile, lint, types, build, production dependencies and complete-diff scope passed.
- `python3 scripts/check_scope.py --base c224199b3da4333f73cbf09d320f97c1d0774082 --head HEAD --scope work/US-004/scope.json` passed for the complete branch, including retained acceptance records. `git diff --check` passed. Dependency checking retains exactly the five pre-existing reviewed exceptions and reports no new errors. No check/protection was weakened.
- `git diff --quiet 5fd2e35171abb8edde7f57ca9d7826397cc521f3 3d4ad9816d3c0c92326d4e2023d38c1cf0da52e0 -- backend frontend cli` exited0. The final QA metadata commit is reviewed separately with focused harness/whitespace/scope checks; no product/test change follows full verification.

## Review

Independent read-only reviewer `/root/us004_security_review` examined current source and legacy test migration. Findings were fixed before the final full gate:

1. Creation/reconciliation had not reset inactivity: both now record successful authorized activity.
2. Registration replay returned later mutable configuration without read permission. The reviewer reproduced this against actual SIWE/provider/SQLite. Reconciliation now returns an immutable creation snapshot.
3. Replay lacked original-parent binding. Submission records now store the original grant ID; that original authority must remain active. Unrelated registration installations cannot reconcile it; expired IATs cannot authenticate replay. Added actual-provider negative regressions.

Reviewer rechecked all fixes and reported no remaining critical finding. Independently selected reconciliation regressions passed (2 tests, remaining cases filtered); the full final suite separately covers all cases. Supplemental live review experiments rejected Basic-auth attempts to route management codes through the RP provider: empty/arbitrary secrets both returned401 invalid_client and created no access/refresh rows. This is a reported review experiment, not CI or an extra full-suite claim.

Root reviewed the complete declared diff, scope, actual paths, test changes, ownership/dependency directions and previous acceptance provenance. Legacy registration/UI checks are intentionally replaced by the approved token/CLI journey rather than preserving removed session authority. RP fixtures use actual SIWE/code/IAT creation and retain RP lifecycle assertions, filtering out system-client fixture rows. No material finding remains open.

Browser failures were corrected with visible link underlines and scoped management-page header wrapping. Light/dark axe checks, keyboard and 200% zoom (320/375 CSS-pixel content widths) pass without changing wallet page behavior. A new test initially mistook the public `client_secret_basic` profile label for a secret; it now checks absent secret fields and the actual one-time secret value. No accessibility rule was disabled.

Local visual evidence: artifacts/management-consent-light.png, management-consent-dark.png, management-authorizations-light.png, management-authorizations-dark.png, cli-guidance-light.png and cli-guidance-dark.png. Root inspected the rendered consent screenshot. Tests disable credential-bearing traces in these suites; generated fixture wallets/credentials are never live deployment credentials.

## Known limitations

- Linux CLI/local callback and real child-process commands are exercised. The documented remote SSH forwarding procedure was not run against an external SSH host; it requires existing authorized SSH access. No Device Authorization or hosted relay.
- Browser tests use generated EOA wallets and established SDK/relay fixtures; no new physical device certification, production-readiness or OIDC certification claim.
- New initialized database/environment required. Existing data/deployments remain untouched. Deployment target/configuration/release execution await the applicable later human gate.
- Credential files are unencrypted and same-OS-user process compromise is outside this protection. macOS/Windows, registry publication, executable attestation and mandatory DPoP are out of scope by human decision.
- Ignored artifacts are local evidence, not tracked test substitutes. Source tests/commands and locked dependencies reproduce outcomes; generated evidence alone is not acceptance.

## Human acceptance

Local engineering is QA_PASSED after successful full verification and technical review. Human finished-result approval is required before PR/CI. No US-004 PR, CI or merge/acceptance has occurred; acceptance fields remain empty. After finished-result approval, publish the reviewed branch and let unchanged required CI run. The human merges, then observed acceptance provenance is recorded under PROCESS. No agent merge or acceptance-only PR.

## Human-authorized port-3000 operation-test deployment — 2026-11-16

The human explicitly requested release to port3000, accessible through https://walletgate.beeswarm.dev/, and self-test instructions. This authorizes the operation-test deployment with the previously selected new environment/database; it does not authorize PR/CI, agent merge or acceptance. Earlier no-deployment statements describe the local QA checkpoint. Story remains QA_PASSED.

- Release snapshot: `/home/ubuntu/walletgate-releases/de112c63889b8d8d9e26f89e2aea63feacf65743`, prepared with git archive. Product/tests match full-verified3d4ad98. `npm ci --offline` in the actual release exited0 (332 packages; zero vulnerabilities reported); lockfile bytes match the repository. `npm run build` in the actual release exited0. Logs: artifacts/release-install.log and release-build.log. No dependency or product-source change.
- `node work/US-004/artifacts/release-smoke.mjs` exited0 against the actual release on3107 with an explicitly initialized disposable database/generated wallet. It exercised SIWE, public CLI code/PKCE/opaque access, IAT-only registration/native reference ownership, per-target management/replacement/update/deletion, management refresh/revocation, RP code/independent RSA/JWKS verification, UserInfo after browser logout, RP refresh rotation/family revocation. Disposable server/database were removed; no generated wallet/user/client was created in the live database. Results: artifacts/release-smoke-result.json and release-smoke.log.
- `sudo -n python3 work/US-004/artifacts/deploy-release.py` exited0. Read-only preflight confirmed active prior release, expected HTTPS origin/port, existing secret presence, SQLite integrity and foreign-key health. Explicit setup created a separate private new database, initialized the system public CLI/resource and provisioned RS256 through the supported resolveSigningKey API. No existing database was initialized, reset or converted.
- Live database: `/home/ubuntu/walletgate-data/us-004-20261116T053608Z/walletgate.sqlite`, initially zero users and one system client. Database override: `/etc/walletgate/us-004-20261116T053608Z-database.env`. Runtime secret/origin/port/NODE_ENV and existing runtime/old database override files were verified unchanged without printing secrets.
- Previous release: `/home/ubuntu/walletgate-releases/92204eac17044aa6776eb3fed65ae2e6a75d463a`. Previous database: `/home/ubuntu/walletgate-data/us-001-07-20261112T032353Z/walletgate.sqlite`, retaining its actual three users/four clients. A consistent private backup is `/home/ubuntu/walletgate-backups/us-004-20261116T053608Z/previous-walletgate.sqlite` (0600 under0700); rollback drop-in is the adjacent `previous-release.conf`. Old identity/client row snapshots were unchanged after deployment.
- The systemd switch changed only the selected release/description and new database override, preserving existing protections and entry command. Existing nginx/TLS/routes were unchanged. Automatic rollback was prepared and not needed. Deployment result: artifacts/deployment-result.json.
- `node work/US-004/artifacts/public-check.mjs` exited0, including a repeat after switch: public HTTPS/TLS200, all three entry asset hashes matching the release, CSP, discovery issuer/endpoints, RS256 public-only JWKS, invalid-client token/revoke boundaries, anonymous client/session/UserInfo denial and blocked generic aliases. Actual Chromium rendered sign-in, old-link CLI guidance and authorization-owner sign-in, with zero page errors. Results: artifacts/public-check-result.json/public-check.log; screenshots deployed-sign-in.png/deployed-cli-guidance.png. This anonymous check left the fresh live user/client tables unchanged.
- CLI-only test bundle: artifacts/walletgate-us004-cli.tar.gz, SHA256 `dfdfdb08b7b79252feb3cb62490492309af3b453ea0090b856e079fbd74fa5e0`. Contents verified as deployed CLI source/package/lock/skill/readme only, without credentials, environment files, databases or dependencies. Extraction plus `node --import tsx cli/index.ts help` using the release's installed locked dependencies exited0. No public unauthenticated source-download endpoint was added. The bundle is a local artifact for the human.
- Human walkthrough: `work/US-004/manual-test.md`, covering local Linux setup, public wallet consent, registration, explicit new-client permissions, list/get/update/delete, browser revocation/logout, expected empty list before read consent, independent permissions and remote SSH forwarding. Real external SSH/physical-wallet operation remains the human test, not a fabricated automated result.
- Rollback if requested/needed: stop walletgate.service; restore the saved previous-release.conf to `/etc/systemd/system/walletgate.service.d/05-release.conf`; daemon-reload and start. This selects the retained previous release and its original database override. Do not overwrite either database merely to roll application code back. Rollback was prepared, not executed because checks passed.
- Deployment/evidence changes affect execution records only, not product/tests/ACs. Focused metadata/harness, whitespace and full committed scope checks validate the record; no new QA transition or duplicate full suite is required. PR/CI and human merge acceptance remain separate, unrequested gates.
