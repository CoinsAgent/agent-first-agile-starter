# Verification evidence — US-001

Status: PASS

Local automated verification passed, and the user confirmed real MetaMask sign-in,
signed-in reload persistence, and logout followed by sign-in-required reload on
both approved environments. Versions are recorded below as supplied. US-001 is
QA_PASSED. Published implementation commit
`ac0294259cc14d37e25dfe4e83bdb8c358685d9d` passed the required GitHub CI run
linked below. Human business acceptance is pending. Dated history below describes
earlier blockers and is superseded by the final verification/publication records.

## Context and provenance

- Story: [US-001](../../backlog/US-001.md).
- Verification date: 2026-11-03.
- Git base commit: `9cfada76214872e8f24e3a0a87923389d81a3222`.
- Published implementation commit: `ac0294259cc14d37e25dfe4e83bdb8c358685d9d` on origin/main. The base SHA identifies only the starting point. The publication commit contains the tested implementation and approval updates. [Source hashes](artifacts/source-manifest.sha256) identify tested application, test, setup and workflow inputs; run `sha256sum -c work/US-001/artifacts/source-manifest.sha256` to check them.
- Environment: Linux 7.0.0-30-generic; Node v22.22.1; npm 9.2.0; TypeScript 7.0.2; Better Auth 1.7.15; better-sqlite3 13.0.3; wagmi 3.7.11; viem 2.57.15; React 19.3.1; Vite 8.3.5; Vitest 5.1.0; Playwright 1.64.1.
- Automated browser: Playwright Chrome for Testing / headless Chromium 156.0.8078.4, browser revision 1248, on Linux. This is not the approved real MetaMask Chrome/Android matrix.
- Required implementation CI: [Harness and product verification — run 41649017643](https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/41649017643), push event, completed SUCCESS for `ac0294259cc14d37e25dfe4e83bdb8c358685d9d`. [Observed run metadata](artifacts/ci-implementation-run.json) and [required-check output](artifacts/ci-implementation-checks.log). Protected PR review has not been performed; user explicitly authorized the direct commit/push.

## Acceptance matrix

| AC ID | Test command or scenario | Observed result | Evidence artifact |
|---|---|---|---|
| AC-01 | `npm test`; `npm run test:e2e`: trusted message, real signature, ordered connect/review/sign flow, canonical authenticated view | PASS in integration and simulated-provider browser environment | [Full log](artifacts/qa-verify.log), tests/app/auth.test.ts, tests/e2e/login.spec.ts |
| AC-02 | Altered domain/URI/address/chain/version and hostile Origin rejection | PASS automated | Full log; signed negative cases in auth.test.ts |
| AC-03 | Browser binding, prior-challenge replacement, exact 5-minute boundary, simultaneous submissions and replay | PASS automated | Full log; challenge binding/boundary tests |
| AC-04 | Malformed messages/signatures, substituted/missing nonces/dates, future issued-at/not-before, invalid/extended expiry; frozen server Date at boundaries | PASS automated | Full log; altered-message table and exact-boundary tests |
| AC-05 | Connection/signature rejection, cancellation, account changes, disconnection during signing, new review surviving late old signature completion | PASS automated for rejection/recovery; real sign-in/session observations recorded under AC-09 | Full log; browser tests including delayed-response regression |
| AC-06 | Case-equivalent inputs resolve to one canonical identity; distinct wallets remain distinct | PASS automated | Full log; canonicalization test and verified-address browser assertion |
| AC-07 | Reload and SQLite restart; session deadline at -1/0/+1 ms; no sliding refresh; logout revocation and unaffected concurrent session | PASS automated | Full log; session and persistence tests |
| AC-08 | Missing/forged cookies, provenance-free session and generic alternative login/account/registration paths | PASS automated | Full log; session provenance and route-denial tests |
| AC-09 | Actual MetaMask + Chrome desktop and actual MetaMask in-app browser on Android | PASS, user-reported: desktop and Android Explore sign-in, signed-in reload persistence, and logout/reload requiring sign-in; supplied versions recorded below | [Required checklist](../../docs/DEVELOPMENT.md#verification); screenshots below are simulations only |
| AC-10 | Clean dependency install, TypeScript checks, build, HTTP startup through Playwright, documented setup and repeatable failure cases | PASS for automated/local setup; user-reported real-device checks recorded under AC-09 | Full log; docs/DEVELOPMENT.md |

## Verification

Final command:

```bash
bash scripts/verify.sh > work/US-001/artifacts/qa-verify.log 2>&1
```

- Exit code: **0**.
- Harness: **9 tests passed**; structural validation of **5 story files** passed.
- `npm run typecheck`: exit **0**.
- `npm run test`: exit **0**, **51 integration/configuration/HTTP transport tests passed**.
- `npm run build`: exit **0**, production assets generated successfully.
- `npm run test:e2e`: exit **0**, **18 Chromium browser tests passed**.
- [Observed complete output](artifacts/qa-verify.log).
- `npm ci --registry=https://registry.npmjs.org`: exit **0**, 177 packages installed, 178 audited, **0 vulnerabilities reported by npm** at execution time. This is not a comprehensive dependency-security assessment.
- `npx playwright install chromium`: exit **0**; installed Chromium revision 1248 and supporting browser artifacts.
- `git diff --check`: exit **0** at final review.

Earlier failures were resolved, not ignored: the initial verification ran before
TypeScript was installed (exit 127); an initial build rejected an unnecessary
CSS import, which was removed. Review then found and corrected the two defects
below. The final log supersedes earlier pre-fix runs.

Non-fatal observed warnings: Vite externalized the unused Node worker module
from the transitive ox Tempo import tree; build and browser checks passed. The
browser runner also reported NO_COLOR/FORCE_COLOR environment warnings.

## Review

- Method: independent read-only agent review (`/root/review_us001`) of implementation, AC coverage, dependencies, nonce/session boundaries and UI state. The reviewer did not implement changes or act as human business approver. Final re-review identified no remaining material defects within the reviewed scope.
- Finding 1: Content-Length-only validation allowed unbounded chunked input. Fixed with an 8 KiB bounded reader. A subsequent wire reproduction found cancelling the reader destroyed the Node socket before HTTP 413 was returned; fixed by releasing the reader and closing the connection after the error response. A real Node HTTP/chunked request regression now observes HTTP 413, rather than only testing an in-memory Request.
- Finding 2: A delayed old wallet operation could clear a new review after account change. Fixed with generation guards on asynchronous results/error/cleanup. Browser regression defers the original signature, prepares a new account review and waits for the old signature's explicit completion marker before checking the new review persists.
- Final `bash scripts/verify.sh` was run after these fixes and regressions.
- Visual inspection: [desktop](artifacts/desktop.png) and [narrow viewport with simulated provider](artifacts/mobile-simulation.png). Neither screenshot proves actual wallet/device compatibility.

## Known limitations

- Real-device outcomes are user-reported rather than independently observed. Supplied versions: Windows 11 / Chrome 148.0.7778.215 / MetaMask OTA 8.15; Android 16 / MetaMask OTA 8.15 in Explore. Android Chrome 148.0.7778.215 was supplied separately, not treated as the embedded browser engine version. No additional MetaMask package/build information is inferred.
- Android external Chrome handoff remains outside the approved story scope. The successful Android path is MetaMask Explore.
- No application registration, OIDC issuance, public `sub` behavior, production deployment or production-readiness validation is part of this story. The public HTTPS instance is authorized for evaluation testing only.
- Required commit-specific CI passed for implementation SHA ac0294259cc14d37e25dfe4e83bdb8c358685d9d. The provenance-only follow-up commit recording this result is checked separately before completion. No protected PR review or human business acceptance is claimed.

## Human acceptance

- Outcome: PENDING. No delivered behavior has been accepted on the human's behalf.
- The story retains its existing approved_by/approved_at and empty acceptance fields. It is QA_PASSED as a local technical candidate after successful automated checks and explicit user-reported device checks; Required implementation CI has now passed; human business acceptance remains pending.

## Manual-test service startup — 2026-11-03

- User requested the service on port 3000 for manual AC-09 testing.
- An older Next.js development server from /home/ubuntu/WalletGate occupied port 3000. Stopped its parent/worker processes (93372/609072) and started this repository's service with `npm start`.
- Created an ignored, mode-0600 local `.env` containing a freshly generated secret, `TRUSTED_ORIGIN=http://localhost:3000`, `PORT=3000`, and a persistent database at `./data/walletgate.sqlite`. Secret values are not recorded.
- Service observed listening on `0.0.0.0:3000` (Node PID 826521, tool session 38322).
- `curl` against `http://localhost:3000/`: HTTP **200**.
- `curl` against `http://localhost:3000/api/session` without credentials: HTTP **401**, expected sign-in-required response.
- Browser testing URL confirmation requested. Remote/Android testing needs the exact reachable HTTPS origin configured before SIWE signatures can be accepted there.
- Manual wallet results remain pending; startup checks do not complete AC-09.

## Public HTTPS test origin — 2026-11-03

- User authorized mapping walletgate.beeswarm.dev through host nginx to port 3000 for manual testing.
- Inspected /etc/nginx/sites-available/walletgate: the existing TLS virtual host already proxies to http://127.0.0.1:3000 and preserves Host plus X-Forwarded-Proto. No nginx configuration change was necessary. `sudo -n nginx -t` passed.
- The observed public HTTP 403 was caused by the application's previous localhost-only origin. Updated the ignored local `.env` to `TRUSTED_ORIGIN=https://walletgate.beeswarm.dev`, preserving the secret/database, and restarted with `npm start` (Node PID 828690, tool session 92701).
- Public HTTP redirects to HTTPS: HTTP **301** to https://walletgate.beeswarm.dev/.
- Real headless Chromium navigated the public HTTPS URL with normal certificate validation: homepage **200**, expected WalletGate title and visible Connect MetaMask button, zero page errors.
- Browser same-origin checks: unauthenticated session **401**; challenge creation **200**; generated SIWE domain is walletgate.beeswarm.dev and URI is https://walletgate.beeswarm.dev. No signatures, session credentials or keys were logged.
- [Public HTTPS screenshot](artifacts/public-https.png). This is a Chromium page/startup check without a wallet, not a real MetaMask or Android compatibility result. AC-09 remains pending manual results.


## Android connection correction — 2026-11-03

- User observation: real Chrome desktop/MetaMask works. MetaMask Explore on Android reports “Select Ethereum Mainnet in MetaMask, then try again.” Android Chrome launches MetaMask but fails connection. Exact Android/MetaMask versions and WalletGate-specific network selection were requested and remain unknown.
- Diagnosis: the old app called connect without a target chain, then refused a non-mainnet connection without providing a switch action. MetaMask documents per-site network selection, which can differ from the portfolio display. This reproduces the missing-recovery path, but the exact device-side network state was not observed.
- Changes: request chain 1 on the initial wallet connection; add explicit “Switch to Ethereum Mainnet” recovery for existing wrong-network connections; wait up to 3 seconds for delayed targeted provider injection; give Android Chrome a clear Explore instruction when no provider is available. No SDK, QR, external-browser handoff or additional supported chain was added.
- State safety: expected same-account transitions to mainnet during preparation are allowed; account changes, disconnections and unexpected network changes still invalidate the pending attempt. Signature-time checks and server-side chain restrictions remain unchanged.
- Red/green evidence: three new focused browser cases failed against the old build (exit 1, [before-fix log](artifacts/android-before-fix.log)); after correction the focused run passed all three (exit 0). Five total new browser regressions cover approved switch through sign-in, denied switch/retry, already-connected recovery, delayed injection, and Android missing-provider guidance.
- Final full command: `bash scripts/verify.sh > work/US-001/artifacts/android-verify.log 2>&1`, exit **0**: 9 harness tests, 51 integration/configuration/HTTP tests, 18 browser tests, TypeScript and production build all passed. Previously passing tests remain enabled.
- Independent read-only reviewer /root/review_us001 reviewed the correction and reported no material findings. It preserves mainnet-only policy and approved scope; review is not real-device verification or human acceptance.
- Existing port-3000 service now serves the rebuilt frontend. A public HTTPS Chromium smoke check confirmed **200**, current built script, no page errors, and the new Android missing-provider guidance ([observed output](artifacts/android-public-smoke.log), [screenshot](artifacts/android-browser-guidance.png)). No wallet was used in that public smoke check.
- Next action: reload https://walletgate.beeswarm.dev/ inside MetaMask Explore, approve the Ethereum Mainnet request (or choose Switch to Ethereum Mainnet), and repeat sign-in/reload/logout/rejection-retry. Record Android and MetaMask versions plus outcomes. The corrected Android path is not claimed to pass on a real device until retested. Story remains BLOCKED; CI and final business acceptance remain pending.


## User-reported Android sign-in success — 2026-11-03

- User report: “reload inside MetaMask → Explore, connect, and sign in done”. Recorded as successful real Android MetaMask Explore connection and sign-in at https://walletgate.beeswarm.dev/ after the correction.
- This confirms recovery of the previously reported connection/sign-in failure. The earlier report also says real MetaMask with Chrome desktop works.
- The reported reload occurred before connecting/signing in; it does not explicitly demonstrate that a signed-in session survives reload. Logout behavior and exact wallet/browser/OS versions have not been reported. Do not infer these results from the successful sign-in report.
- Remaining AC-09 observations: reload while already signed in, verify the session persists, sign out, reload and verify sign-in is required again on both approved environments; record desktop OS/Chrome/MetaMask extension versions and Android/MetaMask app versions.
- No code or approved acceptance criteria changed for this evidence update. Story remains BLOCKED solely for the remaining required manual observations/details; acceptance metadata remains empty. Existing successful automated checks remain recorded separately.


## User-reported device versions — 2026-11-03

| Environment | OS | Browser | MetaMask version as supplied | User-reported observations |
|---|---|---|---|---|
| Desktop | Windows 11 | Chrome 148.0.7778.215 | MetaMask OTA 8.15 | Desktop MetaMask demonstration reported working; signed-in reload/logout outcomes not explicitly reported |
| Android MetaMask Explore | Android 16 | MetaMask in-app browser; separate installed Chrome version supplied as 148.0.7778.215 | MetaMask OTA 8.15 | Explore connect/sign-in reported successful after correction; signed-in reload/logout outcomes not explicitly reported |

- These versions are user-reported, not independently detected. “MetaMask OTA 8.15” is recorded as supplied; no separate extension package/build or embedded browser engine version is inferred.
- The Android Chrome version does not establish that external Chrome handoff passed; that route remains outside this story's scope. The successful supported Android test was in MetaMask Explore.
- Remaining AC-09 confirmation on both environments: signed-in reload preserves the session; signing out and reloading requires fresh sign-in. No acceptance decision or passing observation is inferred from version information alone.


## User-confirmed session checks — 2026-11-03

- Asked whether both checks passed on desktop and Android: (1) reload while signed in preserves the session; (2) sign out, then reload requires sign-in. User replied “yes”. Recorded as PASS on both approved environments, based on the explicit user report rather than automated observation.
- Alongside the preceding successful sign-in reports and supplied versions, this completes the real-device observations required by AC-09. No product acceptance or release approval is inferred from confirmation of these test outcomes.
- Reopening verification to record a local QA candidate. Existing approved acceptance criteria and human metadata remain unchanged; acceptance fields remain empty. CI for the eventual implementation commit remains pending.


## Final local QA candidate — 2026-11-03

- User explicitly confirmed that signed-in reload persistence and sign-out/reload requiring sign-in passed on both desktop and Android, completing the remaining manual AC-09 observations. This is confirmation of test outcomes, not an explicit decision to accept the delivered story.
- Re-ran `bash scripts/verify.sh > work/US-001/artifacts/qa-verify.log 2>&1`: exit **0**. Observed **9 harness tests**, **51 integration/configuration/HTTP tests**, and **18 Chromium browser tests** passed, along with TypeScript checking and the production frontend build.
- Application/test/setup input hashes were unchanged from the independently reviewed Android correction; no new product code was introduced in this confirmation turn. Updated source-manifest.sha256 for final story metadata.
- Transitioned the story to QA_PASSED as a local QA candidate. All approved scope and human approval metadata are preserved; accepted_by and accepted_at remain empty.
- Next gate: commit/push the reviewed implementation and obtain successful required CI for that same SHA. Until then report **QA candidate; CI pending**, and do not request final human acceptance. No CI result is claimed from this local run.


## Publication preparation — 2026-11-03

- User explicitly authorized committing US-001 with evidence artifacts, pushing, and checking CI. Included the referenced screenshots, observed test logs, red/green regression record and source manifest; excluded local secrets, SQLite data, dependencies and generated builds.
- The artifact ignore rule had been removed to include evidence. Refreshed the manifest for .gitignore; application/test inputs are unchanged from the reviewed successful local QA run.
- Removed trailing whitespace from the archived before-fix log to satisfy the staged diff check; substantive output, failures and command text are preserved. No logs were rewritten to change test outcomes.
- Checked publishable files against the real local BETTER_AUTH_SECRET without printing it; no matches. Staged diff whitespace/structure checks are required before commit.
- CI remains pending at implementation-commit creation. The observed commit SHA and CI URL/result will be recorded after publication; no successful run is inferred from local verification.


## Published implementation and observed CI — 2026-11-03

- Committed and pushed US-001 plus evidence artifacts to origin/main as `ac0294259cc14d37e25dfe4e83bdb8c358685d9d` (`feat: deliver US-001 SIWE wallet authentication with verification evidence`), 34 files. `.env`, SQLite data, dependencies and generated builds were excluded.
- `gh run watch 41649017643 --repo CoinsAgent/agent-first-agile-starter --exit-status --interval 10`: exit **0**. GitHub reported the required Harness and product verification job SUCCESS for that same full SHA; all setup, install, project checks and post-job steps succeeded.
- The observed required-check log confirms **9 harness**, **51 integration/configuration/HTTP**, **18 browser tests**, TypeScript and build passed on GitHub, not just locally. Sources: ci-implementation-run.json and ci-implementation-checks.log above.
- Non-blocking runner annotations reported action-runtime deprecation and the ubuntu-latest image migration. No checks were bypassed, disabled or weakened.
- This follow-up records observed CI provenance without changing application, test, workflow, or approved story inputs. The source manifest remains valid. Its own final-head CI is checked separately after push; the implementation run is not represented as a run for a different SHA.
- US-001 remains QA_PASSED, with accepted_by/accepted_at empty. Formal human business acceptance is the next product gate.
