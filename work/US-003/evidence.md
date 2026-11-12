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

- This is locally verified evaluation functionality, not OIDC certification or a production release. No deployment, real-device compatibility expansion, hosted CI or standalone US-005 RP example is claimed.
- Refresh policy requires supported integration over pinned provider behavior; upgrading it requires rerunning lifecycle, persistence and concurrency checks. A near-deadline mint whose signed output would exceed the family cap fails safely with server_error and transaction rollback; the client can retry the retained current refresh token or restart sign-in.
- Browser logout intentionally does not revoke issued tokens or terminate RP sessions. Revocation/reuse cannot retract independently held ID tokens. Clients must serialize refreshes; retrying a used token can revoke that authorization's entire family.
- Client management, management-token authorization and disabled-client policy remain US-004. Ordinary RP tokens cannot manage clients.
- Execution artifacts/logs/screenshots are retained locally under ignored artifacts/. The tracked tests, docs and commands reproduce checks; no repository data was published to a new endpoint.

## Human acceptance

PENDING. This is QA_PASSED local engineering, not ACCEPTED. Human review and explicit approval of this finished result are required before opening a PR and starting unchanged required CI. The human then merges after required current-head CI succeeds. No PR, hosted CI, deployment, reset or production permission change has been performed in this story delivery.
