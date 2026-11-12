# Verification evidence — US-001-07

Status: PASS

## Context and provenance

Story: US-001-07. Branch: codex/us-001-07-user-client-ownership. Human approval: CoinsAgent, 2026-11-12. Previous acceptance retained from a396aa2; PR9 merge and required CI reconfirmed read-only. Initial QA performed no live database/deployment operations; the subsequently authorized operation-test release is recorded below.

## Baseline

Command: bash scripts/verify.sh. Exit 0 before product edits: 43 harness tests, 41 structure fixtures, 167 application tests and 78 browser tests, plus dependency/lockfile/lint/types/build. Log: artifacts/baseline.log. Node v22.22.1; pinned Better Auth/core/provider1.7.15; SQLite via better-sqlite3; existing Playwright Chromium.

## Focused checks

- Red-to-green: npx vitest run tests/app/applications.test.ts tests/app/database.test.ts tests/app/reset.test.ts exited 1 before product edits, with 9 expected failures / 72 passes: native ownership/reset assertions and six incompatible-storage refusal cases. artifacts/red-tests.log.
- Same command after implementation exited 0: 81 tests passed. artifacts/focused-tests.log.
- npm run typecheck, node scripts/check_dependencies.mjs and npm run lint exited 0; dependency output retains five existing baselined private-feature edges and no new errors/stale exceptions.
- Startup-order review found older identity data could mask fresh-schema guidance. Application readiness now runs before identity-data validation, after initialization/fence attachment and before journal/configuration writes. The reset legacy fixture now keeps native client links consistent with its intentionally legacy user. Added older-guard-plus-legacy-identity refusal regression. npx vitest run tests/app/database.test.ts tests/app/reset.test.ts exited 0: 34 tests passed. artifacts/readiness-review-tests.log.

## Acceptance matrix

All results below are from actual full verification of implementation f957d0b1dab4f92d7400270486ef1c5cc82c2b97. No product/test changes follow that run.

| AC | Executed checks and observed outcome | Result |
|---|---|---|
| AC-01 | applications.test.ts real-provider creation: two unique clients/secrets, user/session address join, native userId, null referenceId and hashed secret | PASS |
| AC-02 | applications.test.ts two-client restart + logout/reauthentication, owner list/detail, retry without secret; browser persistent-list flow | PASS |
| AC-03 | applications.test.ts wrong-owner guessed reads, anonymous/expired/unproven/mismatched sessions, strict owner/userId/referenceId override refusal, blocked generic routes | PASS |
| AC-04 | applications.test.ts twentieth/21st client, separate-owner allowance, direct SQL guard, independent connections/restart and separate Node-process cap race | PASS |
| AC-05 | applications.test.ts fixed-window exact boundary/invalid attempts, concurrent replay with one secret, submission rollback, post-reauth/restart reconciliation and independent-process retry | PASS |
| AC-06 | database.test.ts real one-time initializer, seven refusal cases with complete schema/all-table-row snapshots unchanged (old empty guard, old guard + legacy identity, missing guard, reference/mixed/unowned/orphan clients); current restart does not change schema | PASS |
| AC-07 | Full auth/QR/identity/reset suite; native client FK reset and rollback; hash and no repeat-secret assertions; existing one-hour expiry/logout boundaries | PASS |
| AC-08 | 78 Playwright tests including registration/list/result, reauthentication/recovery, keyboard/focus, responsive/light/dark/axe, QR and authentication regressions | PASS |
| AC-09 | Full verify, docs/structure review and complete committed scope; all required local checks executed | PASS |

## Verification

Command (exit 0):

```bash
STRUCTURE_SCOPE_BASE=2583a5f8a78cba5b9bcbece7bacf54adefc143f8 \
STRUCTURE_SCOPE_HEAD=f957d0b1dab4f92d7400270486ef1c5cc82c2b97 \
STRUCTURE_SCOPE_FILE=work/US-001-07/scope.json bash scripts/verify.sh
```

The actual invocation used HEAD, which resolved to the exact SHA above. Log: artifacts/final-verify.log. Observed 43 Python harness tests, 41 Node structure fixtures, 175 application tests across seven files, 78 Playwright tests; lockfile, dependency, scope, lint, types and production build passed. Dependency output preserves the five existing baselined private imports without new violations. Browser tests initialize a separate disposable database on port3100; port3000 and deployed data are untouched.

GitHub main was read-only reconfirmed as2583a5f8a78cba5b9bcbece7bacf54adefc143f8. All 19 changed paths are declared. Previous acceptance story/evidence are carried from a396aa2 unchanged. The final lifecycle/evidence commit changes only this story and its plan/evidence; focused metadata, whitespace and complete-scope checks are run afterward. No full-suite repetition for record-only changes.

CI has not been requested. Human approval of the locally verified finished result is required before a PR/CI. This is QA_PASSED, not ACCEPTED.

## Review

Method: primary agent performed a separate fresh read-only review pass of the complete diff against merged main, approved ACs, provider source, owning interfaces and tests. No external reviewer or human approval is claimed.

- Found and fixed startup error ordering; the added old-guard-plus-legacy-identity test passes in the full run. Application readiness runs before any WAL/configuration/user/client writes and before legacy identity guidance can mask schema incompatibility.
- Verified supported native provider assignment: removing clientReference lets createOAuthClientEndpoint use session.session.userId; privilege checks and external route restrictions stay intact. No owner patch, session hook change or upstream modification.
- Verified all owner queries/counts/reconciliation use userId, the initial guard counts userId, the post-create check rejects reference ownership, and submission/rate keys remain canonical addresses.
- Reviewed compatibility refusal, reset FK ordering, independent-process cap/replay tests, secret handling and unchanged UI. Exact guard comparison is conservative and documented; SQL identifiers are fixed, not request input.
- Complete 19-path diff contains only scoped product/tests/docs, authorized shaping/READY-default records and confirmed prior acceptance. No dependency/protection/workflow changes or extra product behavior. No unresolved material findings.

## Known limitations

Fresh databases only; no conversion. The separate human-authorized operation-test deployment is recorded below. Older or manually customized quota guards are refused, even for empty databases; deployment will need a separately authorized fresh target. Automated browser wallets do not establish new physical-device compatibility; no UI/wallet support was added. Runtime tools already installed; cloud environment status tool is unavailable in this executor. Tests use disposable local databases and existing Playwright.

## Human acceptance

ACCEPTED through confirmed human merge after passing required current-head CI. Actual merge/check provenance is recorded below; earlier pending checkpoints remain historical.

## Human-authorized port-3000 operation-test release

- Human instruction: “release to port 3000 for human operation test”, after disclosure that US-001-07 requires fresh storage. The standing explicit fresh-database deployment instruction and confirmed fresh-only story scope apply. This authorizes this operation-test deployment; it does not authorize conversion, deletion, PR/CI or merge acceptance.
- Immutable deployed snapshot: **0d024d4086a327c6304dbd3bb0e278e388132810**, source/tests identical to full-suite-tested f957d0b. Copied committed snapshot and installed locked dependencies to an isolated release; lockfile bytes matched. `npm run build` in the actual release exited0 (artifacts/release-build.log).
- `node --import tsx work/US-001-07/artifacts/release-smoke.mjs` exited0. The actual release ran on3107 against a disposable explicitly initialized database. Generated fixture wallet signed real SIWE; native user/session/client address match, null referenceId, client list/detail and no repeated secret, foreign keys, exact3600000ms session expiry, stable reread and logout revocation passed. No real wallet/session credential was used or recorded. Results: artifacts/release-smoke-result.json; disposable fixture was removed.
- Read-only preflight confirmed previous release51521c2, trusted public origin/port, SQLite quick_check ok and three existing users/clients. `sudo -n python3 work/US-001-07/artifacts/deploy.py` exited0 after preparation. It explicitly initialized a separate empty database as ubuntu before stopping the old service, saved the previous drop-in and a consistent SQLite backup, switched only release/database override, and started walletgate.service. Failure handling restores the previous drop-in/release/database. It did not run an initializer/reset against the previous database.
- Current release: `/home/ubuntu/walletgate-releases/0d024d4086a327c6304dbd3bb0e278e388132810`. Current database: `/home/ubuntu/walletgate-data/us-001-07-20261112T032353Z/walletgate.sqlite`. Database override: `/etc/walletgate/us-001-07-database.env`. Previous database: `/home/ubuntu/walletgate-data/us-001-06-20261111T041832Z/walletgate.sqlite`. Backup: `/home/ubuntu/walletgate-backups/us-001-07-20261112T032353Z/walletgate.sqlite`; rollback drop-in: `/home/ubuntu/walletgate-backups/us-001-07-20261112T032353Z/previous-release.conf`. Previous release: `/home/ubuntu/walletgate-releases/51521c26fe93b7e2472d5839b4dc52a10e2196b4`.
- Service active on3000, process cwd matches the immutable release. Runtime secret, trusted origin, port, NODE_ENV and runtime.env were checked unchanged without printing values. Previous database file SHA256 was unchanged after the switch; all three previous users and three clients remain there. New database contained zero users/clients at deployment verification, quick_check ok and no foreign-key violations. New data directory mode700, database/backup mode600 owned by ubuntu; override600 owned by root. artifacts/deployment-result.json records sanitized operational results.
- Actual local and public checks: home200, anonymous session/applications401, generic get-session/token routes404. Public TLS verification remained enabled; all three HTML-referenced assets returned200 and matched deployed file hashes; CSP header present. Chromium opened public home and /#applications, verified sign-in and actual application sign-in gate, captured artifacts/deployed-sign-in.png, and observed zero page errors. Final `node work/US-001-07/artifacts/public-check.mjs` exited0; artifacts/public-check-result.json. The initial browser probe used an unused query route; it was corrected to the actual #applications route and rerun successfully before reporting that gate as verified.
- Rollback if needed: stop walletgate.service, copy the saved previous-release.conf back to /etc/systemd/system/walletgate.service.d/05-release.conf, daemon-reload and start. This selects the retained old release/database through its unchanged prior environment file; do not overwrite either database. Rollback was prepared, not executed because deployment passed.
- Human operation test: reload https://walletgate.beeswarm.dev/, sign in with a supported wallet, open My applications and register a new client. In the same signed-in browser, /api/session should report userId equal to address and an absolute one-hour expiry. After the human registers, inspect only nonsecret client ownership columns to confirm userId equals that address and referenceId is null. Do not reuse a user's session token or sign for them. Existing clients remain in the preserved previous database and are intentionally absent from this new test database.
- Product source/tests remain unchanged, so no QA transition/full-suite repeat is needed for deployment records. Run focused metadata, whitespace and complete committed scope checks. Story stays QA_PASSED, not ACCEPTED. No PR or hosted CI has been requested; human finished-result authorization and merge remain separate gates.

## Human finished-result approval to publish PR and run CI

The human reviewed the implementation explanation and deployed operation-test result, then explicitly instructed “opening its PR and running CI”. This authorizes publishing this finished story branch and running the unchanged required PR checks. The reviewed local head before this approval record is0510a21f0cf9f0952fe29c616647104e4c02c548; source/tests are identical to full-local-verified f957d0b and the deployed0d024d4 snapshot. Subsequent commit records only this authorization and plan.

Read-only inspection after the human's operation test found two newly registered clients with native userId matching the owner's verified address and referenceId null; real owner/client identifiers and credential hashes are omitted from publication. No live data was changed by that inspection. Full verification remains valid for the unchanged product/tests. Focused metadata, whitespace and complete committed scope checks precede publication. Current main was reconfirmed as2583a5f8a78cba5b9bcbece7bacf54adefc143f8; all 19 paths remain within the declared scope, including retained US-001-06 acceptance.

Opening the PR starts Harness and product verification and PR path scope. Do not dispatch duplicate CI or change host protections. Save actual PR/head/check provenance under ignored artifacts/approved-pr-ci-result.json. Status remains QA_PASSED with acceptance fields empty until confirmed human merge after required current-head checks; no agent merge.

## Hosted CI and confirmed human acceptance

- Published [PR #10](https://github.com/CoinsAgent/agent-first-agile-starter/pull/10), head b564524d3a4bdcc1130b689293d31196b6b2b752, base2583a5f8a78cba5b9bcbece7bacf54adefc143f8, only after the human explicitly authorized opening its PR and running CI. Product/tests remain identical to full-local-verified f957d0b.
- [Workflow43149590296](https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/43149590296) concluded success on that exact published head. Required PR path scope job130955351397 completed success at 2026-11-12T03:38:53Z; required Harness and product verification job130955351151 completed success at 2026-11-12T03:40:37Z. All required job steps succeeded. There was no extra dispatch, record-only source push or check/protection change. Actual host result snapshots are retained in ignored artifacts/approved-pr-ci-result.json and approved-pr-status.json on the delivery workspace.
- After the human stated “the pr merged”, read-only GitHub inspection confirmed state MERGED, mergedBy CoinsAgent (is_bot=false), mergedAt2026-11-12T03:41:31Z and merge commit1eaa567d959c3e1fc9317f3422deef6a2a1f372b. The merge occurred after the required checks passed on current head. The agent performed no merge action.
- Fetched origin/main equals the observed merge commit; git diff --quiet b564524d3a4bdcc1130b689293d31196b6b2b752 origin/main exited0, confirming the merged tree matches the reviewed published head. Under PROCESS this confirmed human merge is acceptance. On codex/accept-us-001-07 based on merged main, record status ACCEPTED, accepted_by CoinsAgent, accepted_at2026-11-12. Preserve this local acceptance commit and include backlog/US-001-07.md and this evidence file in the next approved PR with explicit scope. No acceptance-only PR/push or post-merge full run.
- Only these two lifecycle/evidence files change; approval metadata, approved ACs and product/tests are unchanged. Focused harness metadata/unit, whitespace and complete committed path-scope checks are run for the record-only diff. Main retains its earlier QA_PASSED record until a later approved PR publishes this local acceptance. No additional deployment/data operation is authorized or performed by acceptance recording; the previously authorized operation-test release remains separate.
