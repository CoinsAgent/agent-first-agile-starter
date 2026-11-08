# Verification evidence — US-002

Status: PASS

## Context and provenance

- Branch: codex/us-002-registration; READY base 915e3eb; complete PR base eaca15f.
- Human explicitly approved READY and delivery, web-only scope. Accepted US-001-05 record retained from 0e78698.
- Initial checkout lacked node_modules. bash scripts/verify.sh exited 1 during structure fixtures (TypeScript dependency unavailable); baseline log artifacts/baseline-initial.log. Independent local copy of existing dependencies is being prepared; baseline will be rerun.
- Runtime: Node v22.22.1, npm 9.2.0.
- CI: not requested; no PR or release authorized by this delivery.

## Acceptance matrix

| AC | Actual executable coverage | Result |
|---|---|---|
| AC-01 | applications.test.ts independent client/persistent logout+login; applications.spec.ts full SIWE→register twice→return journey; existing auth/QR regressions | PASS |
| AC-02 | missing/unproven/expired session at exact boundary, owner override, foreign owner and CSRF tests; same/other-wallet browser reauthentication | PASS |
| AC-03 | real provider persisted fixed scopes/grant/auth method, strict override rejection and blocked provider/protocol/mutation routes | PASS |
| AC-04 | trimmed/empty/Unicode 1/100/101 names, duplicate names; 0/1/10/11 and duplicate redirects; untrusted name browser rendering | PASS |
| AC-05 | authorized HTTPS/non-loopback policy; HTTP/local/loopback/fragment/credentials/wildcard/malformed rejection matrix and exact query/port/path preservation | PASS |
| AC-06 | actual generated secret hash vs response, distinct credentials, list/read/replay non-disclosure; copy, memory-only result, navigation/reload and redacted screenshots | PASS |
| AC-07 | owner-only list/detail and foreign guessed IDs; unauthenticated denial; disabled mutation routes; persistent owner-list browser checks | PASS |
| AC-08 | five-attempt fixed-window boundary including invalid attempts, independent wallets; 20/21 cap, concurrent separate connections and persistence after restart | PASS |
| AC-09 | same-key concurrent/retry, lost response, injected post-provider rollback, independent connections and independent Node process; browser double-click and lost-response→429→same-ID recovery | PASS |
| AC-10 | actual server-session logout/expiry rejection, same-wallet retained memory draft/no autosubmit and other-wallet clearing; network/field error recovery | PASS |
| AC-11 | light/dark form/list/result axe checks (WCAG 2.2 AA tags), 320px/no overflow, page scale 200%, reduced motion, keyboard/focus, theme override/system changes; existing responsive regressions | PASS |
| AC-12 | real 1.7.15 provider/core integration and migrations on disposable/restarted SQLite; unchanged resolved dependencies, root build/start via browser server and documented setup/limits | PASS |
| AC-13 | full verify on exact implementation SHA, complete committed scope, dependency graph, independent review and this reproducible record | PASS |

## Verification

Final command: `STRUCTURE_SCOPE_BASE=eaca15f STRUCTURE_SCOPE_HEAD=HEAD STRUCTURE_SCOPE_FILE=work/US-002/scope.json bash scripts/verify.sh`.

- Tested implementation SHA: `da188d79027120ab7668420e8dc6763b0bcce0ee` on `codex/us-002-registration`.
- Exit code: 0. Log: `artifacts/final-qa.log`.
- 43 Python/harness tests, 41 structure fixtures, 130 application tests (including 47 registration tests), and 78 Playwright tests passed. Zero required checks were skipped. Lint, TypeScript, build/SDK hashes, public-registry lockfile validation, actual dependency graph and complete main-to-head scope also passed.
- Existing auth/QR/browser assertions were preserved; failures from earlier revisions are recorded below with fixes rather than represented as passing runs.
- `python3 scripts/check_scope.py --base eaca15f --head HEAD --scope work/US-002/scope.json` exited 0 for the tested committed diff. Complete diff reviewed: 25 changed source/document/record endpoints, all declared. Ignored capture output is separately declared.
- Parent audit confirmed only explicitly authorized AC-05 changed from READY; all other AC lines and original approval metadata are preserved, acceptance remains empty. Existing resolved package versions are unchanged.
- Final QA record commit updates only story status/result, this evidence and plan completion. It is not represented as another full-suite-tested code SHA; focused metadata/whitespace/scope validation checks that record separately.

## Review

Read-only reviewer `registration_facts` independently inspected the complete scope and execution-critical revisions. Material findings and their regression fixes are documented below: transaction isolation with existing QR, independent-connection replay, uncertain-request identity after 429, and preserving the existing cancel/approval race. Final verdict: no remaining blocking findings. Reviewer ran application+QR tests (70/70) and whitespace checks; parent ran the full final suite and inspected redacted mobile/desktop captures. The final adjacent navigation change was independently inspected and its 14 focused browser checks and full suite passed. This is technical review, not human acceptance.

## Known limitations

- Browser wallets/signatures are simulated with real EIP-191 proofs; no new physical-wallet compatibility claim.
- No fresh `npm ci` was performed: baseline dependencies were copied independently from the existing local installation, and matching provider/core dependencies were installed using the public registry/committed lockfile. Installation audit reported zero findings; no production security/readiness claim.
- Registration requires HTTPS non-loopback callbacks, including development, per the explicit human revision. Working OIDC endpoints, CLI and management mutations remain future scope.
- New readers can enter while an exclusive registration waits: sustained ordinary traffic may delay registration. This is an evaluation throughput/fairness limit; production abuse protection is not claimed.
- Lost secrets require a replacement registration and consume the permanent 20-application allowance; no recovery/reset/rotation is implemented.
- Automated axe, keyboard, narrow CSS viewport and Chromium page-scale checks do not constitute a complete human screen-reader or every-browser accessibility audit.
- Hosted CI, finished-result PR/CI approval and merge/business acceptance remain pending. Deployment was subsequently authorized separately; see the release record below.

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

Full run at 6394873 passed 43 harness tests, 41 structure fixtures and 130 application tests, then failed two existing light/dark 320px success-card height checks (76/78 browser tests passed). New navigation added a vertical row; corrected its layout beside Sign out. Existing assertions are preserved. This run is not passing QA. Final rerun follows the navigation correction.

Navigation correction verified: focused application+inline-sign-in browser run exited 0, 14/14 passed (20.5s). Reviewer inspected the layout-only change and reported no new concern; prior security verdict remains unchanged. Log artifacts/navigation-regressions.log. The final full run will use a new log rather than overwrite the earlier failed-run evidence.

## Final local engineering result (before release authorization)

All approved criteria passed the required local engineering checks and independent review at the tested SHA above. Record QA_PASSED for human finished-result review. No PR, hosted CI, merge or deployment was performed. Historical blocked/failing checkpoints below the primary matrix remain provenance, not the current result.

## Explicitly authorized deployment — 2026-11-08

After local QA, the human instructed "stop the old server and deploy again" for the existing port-3000 service and https://walletgate.beeswarm.dev/. This explicitly authorizes this deployment and supersedes the earlier pre-authorization no-deployment checkpoint; it does not authorize PR/CI, merge or ACCEPTED. Story remains QA_PASSED.

- Released exact verified source snapshot e94bb2eff6b650f05efeb6dcebdc3b0a645c6ba9 to /home/ubuntu/walletgate-releases/e94bb2eff6b650f05efeb6dcebdc3b0a645c6ba9 via git archive. Copied the local verified dependency installation independently into the release; no production dependency symlink to the development checkout. npm run build exited 0 (artifacts/release-build.log).
- Isolated startup smoke on temporary port 3107 and disposable in-memory DB passed: page 200, unauthenticated session/applications 401, generic provider registration/token routes 404. Smoke process stopped afterward (artifacts/release-smoke.log).
- Stopped the old walletgate.service process (PID 2839970), made a consistent SQLite backup at /home/ubuntu/walletgate-backups/us-002-20261108T120158Z/walletgate.sqlite with private directory/file permissions and successful quick_check, then replaced only the existing 05-release.conf drop-in with the new release path and unchanged Node backend/index.ts entry. Previous drop-in is retained in artifacts/previous-release-dropin.conf; previous release remains at /home/ubuntu/walletgate-releases/fa6cd29b4f91e78b17eac03fa1368e811fb68498.
- Preserved /etc/walletgate/runtime.env, session secret, trusted HTTPS origin, port 3000 and persistent DATABASE_PATH. Secret/config equality was checked in memory without printing values; no runtime secret was copied into source or artifacts. Original runtime.env is protected: the initial fingerprint read failed before stopping the service; corrected to privileged fingerprint comparison without displaying its output.
- Additive provider/application migrations completed on the existing DB; original user/session/wallet/QR tables remain and database quick_check passed. No database restore/delete, secret rotation, DNS/certificate change or nginx routing edit occurred. nginx -t passed.
- New service active with PID 2881658, /proc cwd matches the exact release and local trusted-Host page returns 200. Detailed result artifacts/deployment-result.json at 2026-11-08T12:02:00.278627+00:00.
- Public HTTPS returned 200 with valid TLS verification, and all three referenced JS/CSS asset fingerprints match the new release. Public /api/session and /api/applications return 401 without authentication; hidden provider registration/token routes remain 404. artifacts/public-release-check.json at 2026-11-08T12:02:43.836360+00:00. Python urllib's default request received an edge 403; standard curl and actual Chromium independently succeeded, without changing security settings.
- Headless Chromium loaded https://walletgate.beeswarm.dev/#applications, confirmed the registration sign-in context, sign-in heading and MetaMask action. Screenshot artifacts/deployed-registration-auth-gate.png; machine result artifacts/deployed-browser-check.json at 2026-11-08T12:02:45.220Z. No real wallet sign-in or client creation was performed against the persistent deployment; authenticated functionality is covered by local tests.
- Rollback: stop the service, restore the retained previous 05-release.conf, daemon-reload and restart. No automatic database restore was performed or is implied; keep the consistent backup for operator recovery.

Deployment succeeded. The separate human review/PR/CI/merge/acceptance workflow remains pending.
