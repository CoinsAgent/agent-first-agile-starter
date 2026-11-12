# Verification evidence — US-003

Status: NOT_RUN

## Context and provenance

- Story: US-003
- Git commit SHA: NOT_RUN
- Runtime / versions: Node v22.22.1; npm9.2.0; pinned Better Auth/provider1.7.15; SQLite via better-sqlite3; Chromium Playwright1248
- CI workflow URL: Not requested until human approval of the finished result

## Acceptance matrix

| AC ID | Test command or scenario | Result | Evidence artifact |
|---|---|---|---|
| AC-01 | NOT_RUN | NOT_RUN | NOT_RUN |

## Verification

- Command: `bash scripts/verify.sh`
- Exit code: NOT_RUN
- Output / link: NOT_RUN

## Review

- Reviewer or independent review method: NOT_RUN
- Findings and resolution: NOT_RUN

## Known limitations

- NOT_RUN

## Human acceptance

- Outcome: PENDING human merge
- After confirmed human merge, record the observed PR URL, reviewed head/check results, merge SHA, human merger and merge timestamp here.
- Record ACCEPTED and observed human identity/date in story front matter locally afterward; preserve the record for recovery and include it in the next approved PR. Main retains earlier QA metadata until that later merge.
- No acceptance-only PR or second business-acceptance request; never invent merge facts.

<!--
Write `Status: PASS` only after the current commit has actually passed all
required local project checks and review. Record the tested revision and actual
results; CI is not required for local QA and starts only after human result
approval. The structural checker cannot validate honesty or merge provenance.
-->

## Entry observations

Human READY and delivery invocation confirmed in this chat. PR10 state MERGED, human CoinsAgent at 2026-11-12T03:41:31Z, merge1eaa567; both required checks SUCCESS on head b564524. Retained acceptance041b43f is carried; baseline currently running in artifacts/baseline.log. No product result claimed.

## Baseline and focused observations

- Baseline `bash scripts/verify.sh` exited0, artifacts/baseline.log:43 harness tests,41 structure fixtures,175 application tests and78 browser tests, with lint/types/build/lockfile/dependency checks. No hosted CI or deployed data operation.
- `npx vitest run tests/app/oidc.test.ts`:40 passed, artifacts/oidc-time-race.log, including independent RSA validation, seven-day deadline, logout independence, rotation/reuse/revocation, real separate-process race, restart, rollback and reviewer regressions. A later async typing-only renderer correction is covered by final verification still pending.
- `npm run test`:213 passed in artifacts/app-reviewed.log before the final two timing tests. `npm run typecheck` passed after the renderer typing correction; artifacts/typecheck.log.
- `npm run build` and `npx playwright test tests/e2e/oidc.spec.ts`:6 passed, artifacts/build-reviewed.log and browser-reviewed.log before the final Deny-secondary presentation adjustment. Generated mobile light/dark consent screenshots are under artifacts/; they contain disposable fixture public identities only.
- Fresh read-only reviewer found max_age continuation, bearer parsing expiry, POST transport, concurrent first-tab binding and asynchronous family-cap bugs. All were fixed with regressions; review is technical evidence, not human acceptance. Earlier red/debug logs remain historical. Final full verification/complete committed scope is pending, so Status stays NOT_RUN.
