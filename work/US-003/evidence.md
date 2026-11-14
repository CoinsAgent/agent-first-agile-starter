# Verification evidence — US-003

Status: PASS

## Context and provenance

- Story: US-003 — Sign in to applications with wallet-based OIDC and renewable tokens.
- Human READY: explicit chat approval, CoinsAgent /2026-11-12; subsequent explicit `$deliver-story us-003` invocation. Approval/ACs preserved.
- Branch: `codex/us-003-oidc-renewable-tokens`.
- Base: `1eaa567d959c3e1fc9317f3422deef6a2a1f372b` (merged main), read-only reconfirmed from GitHub during delivery.
- Tested revision: `6d0b18f34aa2fe70875e6d193d058f7f1a1a6007`. The subsequent QA record changes only this evidence, plan and story lifecycle; product/tests remain identical.
- Runtime: Node v22.22.1, npm9.2.0, Better Auth/core/provider1.7.15, better-sqlite3, installed Playwright Chromium1248. Existing tools/dependencies reused; no package/lock change.
- CI workflow URL: Not requested. Human approval of the locally verified finished result is required before PR/CI.

### Previous acceptance recovery

Read-only `gh pr view 10 --json state,mergedBy,mergedAt,mergeCommit,headRefOid,statusCheckRollup` reconfirmed human CoinsAgent (is_bot=false), merge2026-11-12T03:41:31Z, merge SHA1eaa567, reviewed headb564524d3a4bdcc1130b689293d31196b6b2b752. Required Harness and product verification and PR path scope both SUCCESS, completed03:40:37Z and03:38:53Z before merge. Retained acceptance commit041b43f is carried with backlog/US-001-07.md and work/US-001-07/evidence.md explicitly scoped. No acceptance-only PR, host-settings change or agent merge occurred. At entry, all other delivery stories were accepted; US-004/005 remain drafts.

## Acceptance matrix

All rows refer to actual executable checks in the passing final full run. Application checks are in tests/app/oidc.test.ts (53 cases), with the independent process fixture in oidc-worker.ts; browser checks are in tests/e2e/oidc.spec.ts (six cases). Existing regressions run alongside them.

| AC ID | Test command or scenario | Result | Evidence artifact |
|---|---|---|---|
| AC-01 | Real generated-wallet SIWE, two independently registered clients, standard code/form exchange, state/nonce/issuer/audience/subject assertions and independent Node crypto RSA/JWKS verification; actual browser code exchange | PASS | artifacts/final-verify-with-boundaries.log |
| AC-02 | Repeated consent, denial without code, safe rendered owner-supplied script text, wallet/access explanation and keyboard Allow/Deny | PASS | final log; consent-mobile-light.png and consent-mobile-dark.png |
| AC-03 | Cross-browser denial, independent tabs including simultaneous first requests, duplicate approval refusal, five-minute boundary matrix, session-identity change and stale review | PASS | final log |
| AC-04 | Normal and forced SIWE, max_age=0, inclusive positive max_age boundary, age crossing during review/approval and silent consent refusal; forced-login browser continuation | PASS | final log |
| AC-05 | PKCE failure consumes code, replay rejection, concurrent redemption has at most one success, 60-second before/at/after boundaries and originating-session logout/exact-expiry refusal | PASS | final log |
| AC-06 | Independently verified RS256 signature, exact canonical sub across clients/different wallets, required protocol fields, 15-minute expiry/cap, UserInfo only sub and extra claim request rejection | PASS | final log |
| AC-07 | Metadata and live endpoint consistency, public JWKS, keys unchanged across restart, RSA selection retains an older EdDSA key, preserved registered runtime schema check | PASS | final log |
| AC-08 | Access remains usable after wallet logout, refresh after originating-session expiry, concurrent refresh/logout, exact access expiry including valid alternative bearer whitespace and POST body transport | PASS | final log |
| AC-09 | Optional offline_access issuance/consent, no refresh with openid-only, durable seven-day deadline, expired-family restart requires fresh SIWE, deadline before/at/after matrix | PASS | final log |
| AC-10 | Rotating replacement, original auth_time/sub preserved, equal/omitted refresh scopes accepted and changes refused, last-minute access/ID cap, restart persistence and asynchronous minting boundary guards | PASS | final log |
| AC-11 | Recognized used-token replay with invalid scopes revokes one family, other authorization survives, wrong client/authentication does not damage family, same-process and separate Node-process competition | PASS | final log |
| AC-12 | Owning-client access and refresh revocation, all generations' access invalidated, separate family survives, wrong-client and repeated revocation are non-disclosing | PASS | final log |
| AC-13 | Negative client/redirect/scope/prompt/grant/PKCE cases, duplicate/oversized forms, malformed JSON, safe browser origin checks, standard GET/POST authorization and UserInfo, token/revoke form exchange; management/introspection stay hidden | PASS | final log |
| AC-14 | Real wallet UI continuation and denial, fresh-login UI, light/dark mobile axe WCAG checks, keyboard focus/approval, long application name/address, zoom, duplicate-submit and expired-action/error states; existing wallet/QR suite | PASS | final log; mobile screenshots |
| AC-15 | Full local harness/structure/scope/lint/types/228 app tests/build/84 browser tests; docs and complete diff reviewed | PASS | final log |

## Verification

Baseline `bash scripts/verify.sh` exited0 before product implementation:43 Python harness tests,41 structure fixtures,175 application tests and78 browser tests, plus existing lint/types/build/lockfile/dependency checks. Log: artifacts/baseline.log. No baseline failure was bypassed.

Final command, exit0, with HEAD resolving to6d0b18f34aa2fe70875e6d193d058f7f1a1a6007:

```bash
STRUCTURE_SCOPE_BASE=1eaa567d959c3e1fc9317f3422deef6a2a1f372b \
STRUCTURE_SCOPE_HEAD=HEAD \
STRUCTURE_SCOPE_FILE=work/US-003/scope.json \
bash scripts/verify.sh
```

Observed final output:

- 43 Python harness tests: OK; metadata valid for12 stories.
- 41 Node structure/dependency fixtures: pass.
- Complete committed diff scope: pass. All27 paths, including previous acceptance and authorized backlog renumbering/refinement, are declared.
- Lockfile/dependency checks, lint and type checking: pass. Five existing baselined private imports remain; no new dependency violations or exemptions.
- Application tests:228 passed across eight files, including53 OIDC cases.
- Production build: pass.
- Playwright:84 passed, including six OIDC browser cases. Owned consent checked in both themes with narrow viewport, axe, keyboard, 200% zoom, pending/expiry and actual wallet/code continuation.

Full log: artifacts/final-verify-with-boundaries.log. The earlier complete run ondc93728 passed43/41/215/84 before the additional expiry matrix; artifacts/final-verify.log is historical, not the final tested revision. Focused red/debug logs are also historical; no failing/skipped focused case is represented as final success. Fault-injection and separate-process fixtures use only disposable initialized databases. Browser server uses port3100; the operation-test service/data on port3000 were untouched.

Reproduce focused coverage with `npx vitest run tests/app/oidc.test.ts`; reproduce consent browser coverage with `npm run build` then `npx playwright test tests/e2e/oidc.spec.ts`. Process credentials arrive via stdin and child output contains status only. Credential-bearing browser traces are disabled. Screenshots contain generated fixture public identities, not real user credentials.

## Review

Fresh read-only reviewer: oidc_facts, separate from the primary implementation agent. Primary also reviewed the complete main-to-head diff and actual paths. This is technical review, never human business acceptance.

Findings fixed with executable regressions:

1. Recheck max_age at consent review and approval; remove stale continuation assumptions.
2. Use the provider's public bearer parser and enforce exact access expiry for header variants and POST body tokens.
3. Expose standard GET/POST authorization and UserInfo while preserving browser consent/CSRF and bounded body reading before database locking.
4. Give each pending authorization its own browser-binding cookie, preserving simultaneous first tabs.
5. Validate signed ID expiry, response expiry and current clock against the original family deadline before releasing refresh output. The public child issuance context captures the declared token response before rendering; an unsafe timing result returns5xx and rolls the real outer transaction back. Tests advance time during user lookup and token persistence, prove no partial rotation/token release, and safely retry.
6. Preserve the original configured adapter instance and registered schema checks while installing its public SQLite transaction implementation; add an explicit schema-check regression. Fault injection proves real rollback; separate Node-process refresh competition proves durable family revocation.

Reviewer confirmed exported minting/adapter APIs, the corrected original findings and the final fail-closed deadline approach. Final focused53 and full228/84 results come from actual parent runs after fixes. No unresolved material technical findings. Generic libraries, upstream source, product contracts, CI/host protection, initial schema and package dependencies were not changed.

## Known limitations

- This is evaluation functionality, not OIDC certification. The initial QA handoff did not deploy it; the subsequent human-authorized operation-test release is recorded below. No real-device compatibility expansion, hosted CI or standalone US-005 RP example is claimed.
- Refresh policy requires supported integration over pinned provider behavior; upgrading it requires rerunning lifecycle, persistence and concurrency checks. A near-deadline mint whose signed output would exceed the family cap fails safely with server_error and transaction rollback; the client can retry the retained current refresh token or restart sign-in.
- Browser logout intentionally does not revoke issued tokens or terminate RP sessions. Revocation/reuse cannot retract independently held ID tokens. Clients must serialize refreshes; retrying a used token can revoke that authorization's entire family.
- Client management, management-token authorization and disabled-client policy remain US-004. Ordinary RP tokens cannot manage clients.
- Execution artifacts/logs/screenshots are retained locally under ignored artifacts/. The tracked tests, docs and commands reproduce checks; no repository data was published to a new endpoint.

## Human acceptance

PENDING. This is QA_PASSED local engineering, not ACCEPTED. Human review and explicit approval of this finished result are required before opening a PR and starting unchanged required CI. The human then merges after required current-head CI succeeds. No PR, hosted CI, reset or production permission change has been performed. The separately human-authorized operation-test deployment below does not imply PR/CI approval or human merge acceptance.

## Human-authorized port-3000 operation-test release

- Human instruction: “please refresh the deployment env and relase to the port3000 which I will access from https://walletgate.beeswarm.dev/”. This explicitly authorizes this deployment; it does not authorize resetting/converting data, publishing a PR/CI or merge acceptance. Story stays QA_PASSED.
- Immutable released snapshot: **92204eac17044aa6776eb3fed65ae2e6a75d463a**, product/tests identical to full-suite-tested6d0b18f. Prepared with git archive, installed locked dependencies with `npm ci --offline` in the release (exit0; zero lockfile changes), compared lockfile bytes, and ran `npm run build` in that actual release (exit0). artifacts/release-install.log and release-build.log. Existing runtime tools suffice; managed environment status tool is unavailable in this executor.
- Read-only preflight confirmed active previous release0d024d4, correct trusted origin/port, valid SQLite integrity/foreign keys and one user/two clients. A consistent private copy passed candidate startup and the registered schema check with those user/client counts intact. This compatibility copy was removed after testing; the live database was never initialized or reset. artifacts/deploy-preflight.json and compatibility-result.json.
- `node --import tsx work/US-003/artifacts/release-smoke.mjs` exited0 against the actual release on3107 with a disposable explicitly initialized database and generated fixture wallet. It verified native SIWE/session/client ownership, standard consent/code/PKCE exchange, independent Node RSA/JWKS validation, correct issuer/audience/nonce/subject, discovery, access after browser logout, refresh rotation and client-authenticated family revocation. The smoke server and disposable database were removed. No real wallet/session/client credential was used. artifacts/release-smoke.log and release-smoke-result.json.
- `sudo -n python3 work/US-003/artifacts/deploy-release.py` exited0. It stopped the old service briefly, saved a consistent private SQLite backup and previous systemd drop-in, changed only the release working directory/description, and restarted walletgate.service on3000. Existing runtime.env, database override, BETTER_AUTH_SECRET, trusted origin, database path, port and NODE_ENV were verified unchanged without printing values. Schema and all existing user/client/wallet/account row snapshots were unchanged, one user/two clients remained, quick_check was ok and no foreign-key violation was found. Existing protection/settings were preserved; no nginx change was needed. Automatic failure rollback was prepared inside the deployment script.
- Current release: `/home/ubuntu/walletgate-releases/92204eac17044aa6776eb3fed65ae2e6a75d463a`. Current database retained: `/home/ubuntu/walletgate-data/us-001-07-20261112T032353Z/walletgate.sqlite`. Previous release: `/home/ubuntu/walletgate-releases/0d024d4086a327c6304dbd3bb0e278e388132810`. Consistent backup: `/home/ubuntu/walletgate-backups/us-003-20261112T102921Z/walletgate.sqlite` (0600, private0700 directory). Rollback drop-in: `/home/ubuntu/walletgate-backups/us-003-20261112T102921Z/previous-release.conf`. Actual sanitized deployment result: artifacts/deployment-result.json.
- Initial public-key readiness found the retained older EdDSA key while metadata correctly advertised the new RS256 profile. The provider provisions RSA during first token exchange; before handoff, `provision-rsa.mjs` used the exported supported resolveSigningKey API under the existing service user/environment in a SQLite transaction to provision it. Old key row hashes remained unchanged; there are now two keys, with RSA ready. No old key, user or client was removed or overwritten. Actual service secret stayed private. artifacts/signing-key-readiness.json.
- Final `node work/US-003/artifacts/public-check.mjs` exited0. Public HTTPS/TLS, home200, three served asset hashes matching the immutable build, CSP, anonymous session/applications/UserInfo401, blocked generic session/token-GET404, discovery/JWKS200, exact public issuer/endpoints, openid/offline_access, RS256 metadata and public RSA keys passed. Invalid Basic client credentials received401 invalid_client at token and revocation endpoints. Early probe assumptions were corrected: requests missing client identity return invalid_request, while invalid Basic credentials return401; these were probe expectations, not product changes. artifacts/public-check.log and public-check-result.json.
- Actual Chromium opened the public site and /#applications, rendered sign-in and anonymous application gating, captured artifacts/deployed-sign-in.png and observed zero page errors. No live SIWE signing or token issuance was performed by the agent; the human performs their wallet operation test.
- Rollback: stop walletgate.service, restore the saved previous-release.conf to /etc/systemd/system/walletgate.service.d/05-release.conf, daemon-reload and start. This selects the retained old release with the same existing database/config. Do not restore/overwrite the database merely to roll back application code. Rollback was prepared, not executed because deployment passed.
- Human test entry: reload https://walletgate.beeswarm.dev/, sign in with the existing wallet and verify My applications still lists its two clients. OIDC relying parties use issuer https://walletgate.beeswarm.dev/api/auth and discovery https://walletgate.beeswarm.dev/api/auth/.well-known/openid-configuration; request openid offline_access for consented renewal. The normal homepage does not initiate third-party consent by itself.
- Product/test source is unchanged by deployment or evidence recording. No new QA transition/full-suite repeat is required; focused metadata, whitespace and complete committed scope checks validate this record-only update. PR/CI and human merge acceptance remain separate, unrequested gates.

## Human finished-result approval to publish PR and run CI

After the deployed operation-test handoff and the human's report “Synapse and Element works now”, the human explicitly instructed “open its PR and run CI.” This authorizes publication of the finished US-003 branch and its unchanged required PR checks. Reviewed local head before this approval record is07993e2; product/tests are identical to full-local-verified6d0b18f and deployed92204ea. Matrix integration itself was not independently observed by this agent; the quoted human report is not fabricated automated evidence.

Main was read-only reconfirmed as1eaa567d959c3e1fc9317f3422deef6a2a1f372b and no existing story PR was found. Scope, metadata/harness and whitespace checks precede publication. This authorization record changes only plan/evidence; approved ACs, product/tests and existing protections are unchanged. Opening the approved PR starts Harness and product verification and PR path scope; do not dispatch a duplicate run. Save actual host PR/head/CI snapshots under ignored artifacts/approved-pr-status.json and approved-pr-ci-result.json. Story remains QA_PASSED with empty acceptance metadata until confirmed human merge after passing required current-head CI. Earlier pending-approval statements are historical checkpoints.
