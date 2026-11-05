# Verification evidence — US-001-01

Status: PASS

Scope: local clean-install verification passed. Story is a QA candidate; replacement same-commit CI is still pending.

Latest: local automated checks passed (11 harness, 83 API/SDK, 68 browser tests). The user now reports Android wallet-browser and desktop phone-QR PASS; Android Chrome → Coinbase app remains failed and explicitly deferred pending a future SDK release. Exact Android wallet/device/version metadata is not supplied. Original CI failed during installation; the registry repair passed fresh-install local verification and is a local QA candidate awaiting replacement CI; prior human business acceptance is recorded. Historical sections below retain their original observations and are superseded by the latest updates where stated.

## Context and provenance

- Story: [US-001-01](../../backlog/US-001-01.md), approved AC-01–AC-16. Human approval and empty acceptance fields preserved. The later explicit five-icon UI request updates AC-01 and the UI contract within this story.
- Base Git commit: `754233cf21d71420857b06db6ed4c51fa083b192`.
- Commands tested the modified working tree, not a committed/CI-verified SHA. `artifacts/source-files.sha256` identifies implementation/test inputs. Existing shaping/harness changes were already dirty at entry and were not reset.
- Environment: Linux, Node v22.22.1, npm 9.2.0; Playwright 1.64.1/headless Chromium, TypeScript 7.0.2, wagmi 3.7.11, viem 2.57.15, Better Auth 1.7.15, Tailwind 4.3.4, Radix Dialog 1.3.1, Oxlint 1.91.0. See `artifacts/versions.json` and `artifacts/dependencies.json`.
- CI URL/result: none observed for this working tree; CI pending. No PR, merge, production release, paid account or new tunnel was performed. The user subsequently authorized the evaluation preview on port 3000; see the runtime smoke checks below.

## Implementation scope

- Custom two-column/mobile shadcn/ui dialog composed over Radix, local Tailwind semantic CSS tokens, supplied main-frame logo, system light/dark and explicit empty/retry/recovery states.
- EIP-6963 wallet choice with legacy MetaMask fallback; independent connector and Better Auth session state; stale-attempt, account/network change and duplicate-submission guards.
- SQLite custom QR requests with five-minute deadline, matching context, separate HttpOnly initiator/phone capabilities, exact-message EOA signature approval, conditional one-time completion and server-only SIWE attempt binding. Better Auth remains the sole session authority; no new phone session is issued.
- Strict same-origin JSON mutation checks, bounded QR endpoint rates, no-store responses and per-response CSP style nonces. No vendor UI kit, WalletConnect relay, optional analytics, balance/ENS enrichment or remote wallet icons.

## Acceptance matrix

| AC | Actual verification | Result / limit |
|---|---|---|
| 01 | Five local wallet icons in original action slot; each selected provider connects, each missing provider opens QR; no substitution with another installed wallet; close/focus restoration, narrow reflow | PASS automated |
| 02 | Simulated EIP-6963 MetaMask/Rabby choices, connector switch, untrusted metadata text rendering | PASS automated; actual extensions PENDING |
| 03 | Simulated MetaMask-style provider, delayed injection, chain/rejection/retry, existing reload/logout regressions; documented MetaMask handoff | PASS automated; actual desktop/Android and handoff PENDING |
| 04 | QR PNG decoded by jsQR, independent phone/browser contexts, real test-wallet EIP-191 signature, initiating desktop receives canonical session, phone/stranger remain unauthenticated | PASS automated; real camera/phone/wallet PENDING |
| 05 | Separate state, unauthenticated before proof, signature/verifying progress, desktop QR session without connector | PASS automated + source review |
| 06 | Rejection, expiry, account/network change, disconnect, stale signatures/session fetch, switching connectors | PASS automated |
| 07 | Existing local SIWE security/session tests remain passing; QR completed through SIWE plugin, reload/logout, session provenance and lowercase address | PASS automated |
| 08 | Axe WCAG tags on rendered light/dark dialog and QR views, 320px reflow, focus trapping/restoration/back navigation, theme changes preserving challenge/QR | PASS automated; screen reader and actual 200% browser zoom/device review PENDING |
| 09 | Unknown/wrong browser capability, old phone capability, proof/message/account/context substitution and local endpoint misuse rejected; QR contains request reference only | PASS API + decoded-image tests |
| 10 | Approval/redemption just before/exactly/after deadline, capped challenge validity, replay/concurrent completion, cancel/replace/reject, cancel-vs-complete session count, request rate and origin checks | PASS API tests |
| 11 | Matching context and explicit phone checkbox/sign action, desktop-only cookie/session, correct provenance and absolute expiry | PASS automated; actual consent/handoff usability PENDING |
| 12 | Application HTTP requests scoped to self, CSP audit, local images/QR and unused explicit unconfigured RPC; no ENS/analytics/relay | PASS automated + source review; wallet-owned network traffic unobservable here |
| 13 | Runtime/dependency records, setup/network inventory and manual checklist in docs/DEVELOPMENT.md; final verify command executed | PARTIAL: CI and actual device/version evidence PENDING |
| 14 | Desktop split layout, mobile list/detail/Back, selection/focus and both-theme captures | PASS automated; original uploaded reference image not directly inspected |
| 15 | Recovery instead of fabricated wallet URI; functional custom SIWE QR decoded and exercised | PASS automated; real MetaMask fragment/deep-link behavior PENDING |
| 16 | Supplied logo preserved/bundled locally; image-load/naturalWidth assertion and viewport captures | PASS automated; physical-device visual inspection PENDING |

## Verification

- Baseline: `bash scripts/verify.sh > work/US-001-01/artifacts/baseline-verify.log 2>&1` — exit 0; 11 harness, 51 API and 18 pre-change browser tests passed.
- Initial focused `npx vitest run tests/app/qr.test.ts` found a first-create rate-counter issue (19 passed, 1 failed); corrected counter initialization. Early browser regressions found delayed provider recovery/copy issues and a 4.48:1 link contrast failure; fixed implementation, did not suppress the checks. Historical logs `qr-api-tests.log`, `browser-regression.log` and `browser-tests.log` are superseded by the final result below.
- Final: `bash scripts/verify.sh > work/US-001-01/artifacts/verify.log 2>&1` — **exit 0**. Harness: **11 passed**; `npm run lint`/Oxlint: exit 0 with warnings denied; `npm run typecheck`: exit 0; Vitest: **73 passed** across 2 files; Vite build: exit 0; Playwright: **30 passed**. Includes all 18 adapted legacy behavioral regressions plus new dialog/QR/security/browser cases. No required tests were skipped.
- `git diff --check` — exit 0. `npm ls --depth=0 --json` — exit 0. Dependency install audit reported zero known vulnerabilities at install time; no broader security certification is implied.
- Builds retain the existing viem/ox browser externalization warning for node:worker_threads; Playwright emits NO_COLOR/FORCE_COLOR notices. Neither failed these commands.

## Artifacts

- Full command output: [verify.log](artifacts/verify.log).
- Light/dark desktop dialog: [light](artifacts/dialog-light.png), [dark](artifacts/dialog-dark.png).
- Light/dark mobile reflow simulation: [light](artifacts/dialog-mobile-light.png), [dark](artifacts/dialog-mobile-dark.png).
- Additional main-screen/review captures: `artifacts/desktop.png`, `artifacts/mobile-simulation.png`.
- These use ephemeral simulated wallet/sign-in requests. QR references are not desktop completion capabilities, expire after five minutes and are cancelled when tests close their dialogs. Do not use them as live login links.

## Review

Independent read-only reviewer `/root/review_us00101` found no remaining material issue after corrections; see [review.md](artifacts/review.md). Independently ran the focused QR API suite: **22 passed, exit 0**. Review did not establish device compatibility or human acceptance.

Corrections included intentional connector-switch handling, lifecycle/generation checks before session assignment, truthful pre-challenge dismissal, serialized QR creation, expiry-aware phone status, and a negative cancellation/completion race test. Primary-agent visual inspection of both dialog captures and mobile reflow also completed. The light accent/border palette was adjusted where rendered contrast required it, as permitted by the UI design contract.

## Known limitations

- **Delivery blocker:** real MetaMask and Rabby on desktop Chrome, MetaMask Android, actual camera scan/deep-link return, screen-reader use and real 200% browser zoom have not been tested. No physical phone or installed wallet extensions were available. The user subsequently supplied an HTTPS preview origin, smoke-tested below; actual Android access and wallet behavior remain unverified. Automated provider/viewport/browser-clock simulation is not proof of compatibility.
- Run the **Real-device verification checklist** in [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md) and report exact versions, observed outcomes and failures. The user must supply this missing evidence before the story can finish technical QA; this is not a request for business acceptance yet.
- Browser-wide cookies mean simultaneous first-ever creation in different tabs can produce a 410/retry. Creation is serialized within one page (including StrictMode and rapid reopen) and covered by a delayed-response regression. No unauthorized redemption was found from this edge.
- The application network audit cannot inspect traffic initiated internally by installed extensions or phone wallets. Required RPC/ENS/asset/wallet-owned categories are documented separately; none of those optional RPC/ENS enrichments are active in this UI.
- The shared reference text was incorporated, but the original uploaded reference image was not directly accessible. No pixel-level visual-match claim is made.
- The baseline script regenerated `work/US-001/artifacts/mobile-simulation.png`, which was already modified at entry. Its pre-turn binary was not snapshotted and was not reset to HEAD, which would discard pre-existing changes. Subsequent browser captures were redirected to US-001-01 so accepted-story evidence is not overwritten again. This incidental binary diff is separate from implementation source.
- Results describe the local dirty working tree only; no same-SHA CI success, production readiness, QA_PASSED or acceptance is claimed.

## Human acceptance

The user explicitly reported completing manual accessibility checks and accepted the story on 2026-11-05. See the latest human review update below. This records their business decision; lifecycle acceptance metadata remains unfinalized while required physical-wallet/device evidence and corresponding-commit CI are outstanding. Do not request a repeat acceptance decision.

## Authorized evaluation preview

At the user's explicit request, the app was built and started on `0.0.0.0:3000` with `TRUSTED_ORIGIN=https://walletgate.beeswarm.dev`. Existing backend secret and database configuration were preserved; no credentials are recorded here. Local runtime configuration is in the ignored, mode-0600 `.env`.

Observed smoke checks through the public HTTPS origin: page 200; unauthenticated `/api/session` 401; QR creation 200 with the correct origin; owner-cookie-bound QR status 200; cancellation 200; subsequent status 410. The smoke-test request was cancelled. This verifies routing and Secure-cookie handling, not real wallet/device compatibility or production readiness. A generic Python urllib request received a non-JSON intermediary response; curl requests succeeded. Headless Chromium also loaded the public page (200), opened the wallet dialog, confirmed the logo loaded and observed zero page script errors. Capture: [public-preview.png](artifacts/public-preview.png).

## Five-icon entry revision — current verification

The user explicitly requested replacing the “Continue with wallet” button in its existing location with five wallet icons, connecting the selected installed Chrome extension or opening QR when absent. Implemented MetaMask, Rabby, Rainbow, Coinbase Wallet and Trust Wallet shortcuts. Wallet labels are accessible names/tooltips; local SVGs retain upstream MIT attribution in `src/assets/wallets/NOTICE.md`. This adds no RainbowKit dependency or remote image requests. Selection uses EIP-6963 IDs (plus legacy MetaMask fallback), probes the matching provider and never silently chooses another installed wallet. QR retains the approved MetaMask Android phone path and says which desktop extension was absent; five icons do not imply five verified mobile scanner integrations.

Current full command: `bash scripts/verify.sh > work/US-001-01/artifacts/icon-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 74 API tests, build and 46 browser tests passed**. This supersedes the earlier 73/30 totals. Sixteen additional browser cases exercise the five icons with/without simulated providers, accessibility names and touch sizes, 320px reflow, correct provider authentication, and no cross-wallet substitution. All existing browser regressions remain passing.

The first expanded browser run exposed a shared empty-cookie rate bucket that limited independent first-time visitors together. Fixed creation rate keys to use the newly generated owner capability before counting. Existing per-owner 10/min and global 120/min ceilings remain; an added API regression checks 120 independent first-time browsers succeed and request 121 receives 429. No rate-limit checks were disabled.

Visual review: [320px icon row](artifacts/wallet-icons-mobile.png). Physical extensions/devices and manual accessibility checks remain pending as above. The icon tests use simulated EIP-6963 providers with real ephemeral signatures, not installed wallet extensions.

Independent review of the icon revision found and confirmed the correction of a legacy MetaMask compatibility-flag routing defect. The shortcut now rejects a fallback provider already announced as another wallet; four reverse-routing regressions cover Rainbow/Rabby/Coinbase/Trust exposing `isMetaMask`. The wallet-metadata injection test was scoped to the wallet list (no injected images/event attributes) because the correct QR fallback now legitimately renders a separate QR image. Reviewer independently ran **23 QR API tests, exit 0**; see [review.md](artifacts/review.md).

Authorized public preview refreshed on port 3000. Chromium observed HTTP 200, five loaded wallet icons, missing Trust extension → QR, successful close, and zero page-script errors. Capture: [icon-public-preview.png](artifacts/icon-public-preview.png). A separate HTTPS cookie-bound smoke observed session 401, QR create/status/cancel 200 and cancelled status 410. Two early smoke-script attempts used incorrect test locator text; corrected locators completed successfully. These were script errors, not successful checks or application failures.

## Wallet-SDK QR request — research only

The user subsequently requested each icon use its wallet SDK QR when the selected extension is absent. Added the concrete connector/configuration/verification proposal to plan.md. Official sources show Rainbow/Trust QR connections depend on WalletConnect, while MetaMask/Coinbase offer native SDKs. Rabby's documented injected integration does not establish a Rabby-mobile QR SDK. Published npm versions inspected: MetaMask Connect EVM 2.1.1 and Coinbase Wallet SDK 4.4.0. An exploratory lookup of `@trustwallet/connect` returned registry 404; no dependency was installed or modified. Required WalletConnect/RPC configuration names are absent locally; no secrets were printed. Relay-scope clarification remains pending. Runtime source, approved ACs, human metadata and deployed behavior were not changed by this research. Prior automated results verify the previous custom-QR fallback, not the proposed SDK fallback.

## Direct native SDK entry — 2026-11-04

The user explicitly requested removing the choose-wallet page and directly opening native SDK QR UI from desktop homepage wallet icons. This supersedes AC-14's chooser/list/detail presentation; human approval and acceptance metadata were preserved. The initial two-column UI-contract presentation is intentionally superseded within this requested story revision. MetaMask now uses its native modal (headless false, analytics disabled); Coinbase retains its native popup. Matching injected extensions still take priority. Rabby/Rainbow/Trust remain extension-only. The separate homepage Use your phone action opens the existing custom approval flow directly. Native connection hides the WalletGate modal; SIWE review follows connection. MetaMask/Stencil uses the response's csp-nonce metadata, retaining strict CSP. Native vendor UI controls its own installation/help content.

Verification of the dirty working tree based on `754233cf21d71420857b06db6ed4c51fa083b192`:

- `bash scripts/verify.sh` — exit 0: 11 harness tests, repository validation, Oxlint, TypeScript, **83 API/SDK tests**, production build, **46 Playwright tests**. Log: [direct-sdk-verify.log](artifacts/direct-sdk-verify.log). Changed-input hashes: [direct-sdk-source.sha256](artifacts/direct-sdk-source.sha256).
- Native SDK unit checks assert MetaMask UI settings and Coinbase EOA-only settings, no initialization during preload, initialization retry, and suppression of cancelled/stale connections. Browser checks cover all five matching extensions, missing-wallet recovery, no chooser, cancellation/focus, theme/320px accessibility, SIWE/session regressions and decoded custom phone approval.
- Initial browser verification failed assertions for removed chooser controls. Updated assertions to the approved direct flow. The delayed-provider case originally retried through a chooser button; now it cancels the initial SDK attempt and retries through its homepage icon after injection. `npx playwright test tests/e2e/login.spec.ts -g 'homepage retry'` — exit 0, one passed; subsequent full verification above passed. Interrupted superseded runs are not represented as passing.
- Fresh source review checked matching-wallet precedence, stale generation guards, SDK cancellation/unmount cleanup, focus restoration, absence of custom SDK QR rendering, strict nonce handling, and preservation of server-verified SIWE. No remaining material issue found in this change; this was a fresh self-review, not human acceptance.

The broader story remains BLOCKED on the previously required physical wallet/phone and manual accessibility observations. Automated simulations and native QR rendering do not establish actual phone pairing/signing or CI success. No QA_PASSED or ACCEPTED status is claimed.

Public evaluation preview was restarted with the existing `.env`/database and `npm start` after the successful build. Chromium against `https://walletgate.beeswarm.dev/` observed HTTP 200, the SDK nonce metadata, a visible `mm-install-modal .qrCode svg`, zero “Choose your wallet” headings, session HTTP 401 before signing, and a native Coinbase popup. Capture: [direct-native-metamask.png](artifacts/direct-native-metamask.png), with the pairing QR masked. Reproduce with a clean desktop browser: open the HTTPS URL, click MetaMask without its extension, inspect the native modal; open a second clean page and click Coinbase. This confirms presentation, not phone pairing. The first smoke script stopped at a relative `/api/session` URL lacking Playwright baseURL; rerunning with the absolute URL completed successfully (exit 0).

Public console observation: Cloudflare's injected `static.cloudflareinsights.com` beacon is blocked by the existing strict `script-src 'self'` policy. No policy relaxation was made. No page-script exceptions or native UI CSP failures were observed. The local accessibility/network tests passed; the external beacon warning is specific to the public proxy response. `python3 scripts/check_harness.py` after recording BLOCKED — exit 0, six story files checked. Human acceptance and CI remain outstanding.


## Visible themes and adaptive desktop sizing — 2026-11-05

User requested the missing light/dark button and larger adaptive desktop content; recorded as AC-17. The previous UI followed only OS preference and capped the sign-in card at 420px. Added accessible System / Light / Dark pressed buttons in the shared header. Default is System; explicit choice lasts for the current page, without new local-storage/cookie persistence. OS changes apply only in System. A component-local theme state updates the shared root tokens without rerendering auth controllers or replacing their attempts. Desktop card width now grows from 440 to 600px; typography, padding and wallet targets scale with it. Mobile header wraps, the desktop-only line break disappears and the steps align in three columns. The user request supersedes the UI contract’s usual 400–440px card guideline; no authentication policy changed.

Verification applies to the dirty tree based on `754233cf21d71420857b06db6ed4c51fa083b192`; source hashes: [theme-layout-source.sha256](artifacts/theme-layout-source.sha256).

- `npm run build > /tmp/walletgate-theme-build.log 2>&1` — exit 0.
- Initial `npx playwright test tests/e2e/theme-layout.spec.ts` — exit 1: layout passed; the new test incorrectly expected an identical SIWE nonce after cancelling and opening a new attempt. Corrected the test to check preservation during a live theme change, then verify the authenticated session survives a manual choice. Cancellation must continue to create a fresh challenge.
- Repeated focused command — exit 0, **2 passed**. Covers System default/live updates, explicit overrides, keyboard activation, unchanged active SIWE message, retained authenticated address, one wallet connection, desktop growth, 960/768/640/375/320px reflow and both-theme automated WCAG checks.
- `bash scripts/verify.sh > work/US-001-01/artifacts/theme-layout-verify.log 2>&1` — exit 0: **11 harness tests, lint, typecheck, 83 API/SDK tests, build, 48 browser tests**. Visual review then improved mobile line wrapping/step labels.
- Final `bash scripts/verify.sh > work/US-001-01/artifacts/theme-layout-final-verify.log 2>&1` — **exit 0**, same **11 / 83 / 48** totals plus lint, typecheck and production build, including the final mobile CSS. [Full final log](artifacts/theme-layout-final-verify.log).
- Existing evaluation server serves the rebuilt assets. An initial smoke against localhost:3000 received the expected untrusted-host 403 and timed out waiting for UI; reran using its configured origin. Playwright at `https://walletgate.beeswarm.dev/` — exit 0: HTTP 200, visible theme controls, Dark selection applied, card measured **547.1875px at a 1440px viewport**, zero page-script errors. [Public preview](artifacts/adaptive-public-preview.png). No server configuration, credentials, deployment or permissions changed.

AC-17 automated results passed; AC-06/08 theme-state and accessibility regressions passed. Existing QR/phone, connector selection and SIWE/session regressions passed. A fresh primary-agent review inspected theme state ownership, listener cleanup, shared token application, focus/pressed states, responsive bounds and preservation of previous dirty changes; no material issue found. This is self-review, not independent human approval. Visually inspected the 1920px light desktop and final 320px dark mobile captures. Evidence: [desktop light](artifacts/adaptive-desktop-light.png), [desktop dark](artifacts/adaptive-desktop-dark.png), [mobile light](artifacts/adaptive-mobile-light.png), [mobile dark](artifacts/adaptive-mobile-dark.png).

Existing build worker_threads externalization and NO_COLOR/FORCE_COLOR notices did not fail verification. Viewport simulation is not physical-device or actual browser-zoom evidence. The broader story remains **BLOCKED** on previously required real wallet/Android/manual-accessibility checks; no QA_PASSED, same-SHA CI success, ACCEPTED status or human acceptance is claimed. No acceptance decision is requested until that existing technical gate is met.


## Compact sun theme toggle — 2026-11-05

The user explicitly requested replacing System / Light / Dark buttons with one small sun icon, matching the Ethereum Mainnet badge, and toggling light/dark on click. Updated AC-17 to reflect this instruction; it supersedes the UI contract’s three-choice control. The sun remains the only visible icon in both themes. A dynamic accessible name/title describes the next action; native keyboard activation and visible focus remain. The control follows OS preference until manually toggled, then retains the choice for the current page. Theme state remains isolated from authentication. Visible height is approximately 29.19px on desktop and 26px on mobile; a centered 44px invisible hit area preserves touch usability. Desktop content scaling is retained.

- `bash scripts/verify.sh > work/US-001-01/artifacts/sun-toggle-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, production build and 48 browser tests passed**. [Full log](artifacts/sun-toggle-verify.log).
- Updated browser tests cover a single accessible sun icon, click/keyboard toggling in both directions, initial system following, manual override, reload behavior, active SIWE/session preservation, matching badge/control height and mobile reflow. Both-theme accessibility and auth/QR regressions passed.
- Playwright smoke of `https://walletgate.beeswarm.dev/` — exit 0, HTTP 200; click switched light to dark. At 1440px, toggle and network badge both measured **29.1875px high**, with matching vertical position. [Preview](artifacts/sun-toggle-preview.png). Existing server serves the rebuilt assets; no runtime configuration or permission changes.
- Fresh primary-agent source review checked theme listener cleanup, resolved-theme toggling, dynamic labels, keyboard/focus behavior, hit-area geometry, shared tokens and unchanged auth mounting. Visually inspected the public dark screenshot; no material issue found. This was self-review, not human approval.

Dirty-tree base remains `754233cf21d71420857b06db6ed4c51fa083b192`; [source hashes](artifacts/sun-toggle-source.sha256). The earlier three-button evidence describes the prior revision, superseded here. Existing physical-wallet/Android/manual-accessibility requirements keep the broader story **BLOCKED**; no QA_PASSED, CI success or acceptance is claimed. No new acceptance decision is needed for this requested adjustment.


## Text W header icon — 2026-11-05

User requested replacing the website PNG icon with “W” while retaining the original file. Updated AC-16 to this explicit revision. Removed the PNG import/render from the header and added a text W in the existing responsive icon footprint; the adjacent WalletGate name remains the accessible link name and the decorative W is aria-hidden. Existing light/dark browser assertions now check W branding and absence of a header image. Historical PNG-rendering evidence describes superseded behavior.

- `bash scripts/verify.sh > work/US-001-01/artifacts/w-mark-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 48 browser tests passed**. [Log](artifacts/w-mark-verify.log).
- `sha256sum src/walletgate.png > /tmp/walletgate-logo-before.sha256` before editing, then `sha256sum -c /tmp/walletgate-logo-before.sha256` afterward — exit 0, `src/walletgate.png: OK`. Original file preserved byte-for-byte.
- Playwright smoke of `https://walletgate.beeswarm.dev/` — exit 0: HTTP 200, header text W, zero header images. [Preview](artifacts/w-mark-preview.png), visually inspected. Existing preview serves the rebuilt assets; no configuration or permissions changed.
- Fresh self-review checked removal of the image import, accessible branding, theme tokens and desktop/mobile sizing. No material issue found. Existing theme/contrast/mobile reflow and wallet/SIWE/QR regressions passed.

Results apply to the dirty working tree based on `754233cf21d71420857b06db6ed4c51fa083b192`. The broader story remains **BLOCKED** on existing physical wallet/Android/manual checks; no CI success, QA_PASSED or human acceptance is claimed. No new acceptance decision is requested for this adjustment.


## Human manual review and acceptance decision — 2026-11-05

User statement: “I have Complete manual accessibility checks and accept the story.” Manual accessibility completion is **user-reported**, not an agent-executed test. Record the explicit business acceptance decision without inventing reviewer identity, browser/device/assistive-technology versions, or individual test results. No further acceptance confirmation is requested.

Remaining technical gaps: actual MetaMask/Rabby desktop and MetaMask Android sign-in/QR camera/handoff results and versions; successful CI for a commit containing the implementation. The current implementation remains uncommitted, so historical CI for HEAD would not cover it. Asked for the missing device results separately. Story status remains **BLOCKED**, not QA_PASSED or lifecycle ACCEPTED, consistent with docs/PROCESS.md G2/G3. Prior completed local automated checks remain the latest observed results; no application tests were rerun for this documentation-only update.


## User-supplied desktop environment — 2026-11-05

The user supplied **Chrome 154.0.8037.97 (Official Build), x86_64** and **MetaMask 13.55.0**. These are user-reported versions, recorded without external verification. Desktop OS and individual wallet-flow pass/fail outcomes were not stated. This update does not imply completion of Rabby desktop or MetaMask Android/QR checks. Prior manual accessibility completion and explicit business acceptance remain recorded. Technical status stays BLOCKED on the remaining device outcomes and corresponding-commit CI; no application tests rerun for this documentation update.


## Desktop wallet results and explicit scope revision — 2026-11-05

The user answered yes to the connect → sign → reload → logout question and stated “MetaMask and Coinbase pass in the desktop.” Record **MetaMask desktop: PASS (user-reported)** and **Coinbase Wallet desktop: PASS (user-reported)**. Known versions: Chrome 154.0.8037.97 (Official Build), x86_64; MetaMask 13.55.0. Coinbase version, exact connection path (injected extension versus native SDK) and individual recovery cases were not supplied; no additional compatibility claims are made.

The user explicitly requested bypassing the other three wallets. AC-02/current required desktop matrix now uses MetaMask + Coinbase Wallet. Required physical verification of Rabby/Rainbow/Trust is excluded by human scope decision, **not a PASS and not a disabled failing test**. Existing icons, extension-only support and automated routing/security checks are retained; no runtime changes or WalletConnect project IDs added. Rainbow/Trust remote QR requires WalletConnect; Rabby injected extension support does not.

Manual accessibility completion and business acceptance are already recorded. Remaining technical gates are MetaMask Android/custom QR real-device outcomes and successful CI for the implementation commit. Story stays BLOCKED; historical references to missing Rabby physical verification are superseded. This documentation-only scope/evidence update reran the harness validator; application tests were not rerun. Latest observed application verification remains 83 API/SDK and 48 browser tests, lint/types/build passing in w-mark-verify.log.


## Coinbase second in wallet row — 2026-11-05

At the user’s explicit request, reordered the shared wallet shortcut array to **MetaMask → Coinbase Wallet → Rabby → Rainbow → Trust Wallet**. Connector IDs, wallet connection/signing behavior, and remaining relative order are unchanged. AC-01, the development guide and existing browser-test fixture reflect the requested order. Fresh source review found no routing or auth change.

- `bash scripts/verify.sh > work/US-001-01/artifacts/wallet-order-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 48 browser tests passed**. [Log](artifacts/wallet-order-verify.log).
- Playwright smoke against `https://walletgate.beeswarm.dev/` — exit 0, HTTP 200; rendered accessible wallet names were MetaMask, Coinbase Wallet, Rabby, Rainbow, Trust Wallet. Explicitly asserted the first two positions. Existing preview serves the rebuilt assets.

Dirty-tree base remains `754233cf21d71420857b06db6ed4c51fa083b192`. This ordering-only change adds no new scope or blockers. Desktop MetaMask/Coinbase user-reported passes, accessibility completion and explicit business acceptance remain recorded. Broader story status stays BLOCKED on outstanding Android/custom QR evidence and corresponding-commit CI; no additional acceptance confirmation is requested.


## Coinbase Android test guidance research — 2026-11-05

User asked how to test Coinbase on Android and for documentation. Added docs/COINBASE_ANDROID_TEST.md and linked it from DEVELOPMENT.md. This is an unverified test procedure, not expanded approved wallet support or a passing device test. Official Coinbase help at https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued explicitly discontinues cross-device Base-app QR connection and describes in-app explorer/same-device routes. Current SDK overview at https://docs.cdp.coinbase.com/coinbase-wallet/overview recommends Base Account SDK, while this repository uses Coinbase Wallet SDK 4.4.0 with eoaOnly. Earlier SDK QR-rendering evidence remains presentation evidence only; it does not establish pairing/signing compatibility with current Android releases. Older general help pages still describe QR; the explicit discontinuation notice is the basis of the current guidance.

Proposed first test: app browser/explorer → WalletGate → Coinbase icon → connect → SIWE review/sign → verified address → reload/logout; negative cases and optional Chrome handoff are separately documented. Do not substitute passkey/smart-wallet login for the approved EOA/SIWE flow. No runtime changes, dependency migration or device compatibility claims made. Story remains BLOCKED on its existing outstanding Android/custom QR evidence and corresponding-commit CI; desktop user-reported passes and acceptance remain recorded. Documentation-only update; application checks were not rerun.


## Coinbase Android in-app result and Chrome handoff investigation — 2026-11-05

User reported the Coinbase Android in-app browser test passed. Record **Coinbase Android in-app browser: PASS (user-reported)** for the preceding documented procedure; Android/app versions and individual negative-case observations were not supplied. This does not establish Android Chrome handoff, a Chrome-owned session or MetaMask/custom phone-approval results.

Investigated the existing Coinbase button path and installed @coinbase/wallet-sdk 4.4.0. Without an injected Coinbase provider, the button already invokes the native EOA SDK. Its mobile relay detects Android user agents and includes app opening via https://go.cb-w.com/walletlink with redirect_url; signing requests can reopen the app. Initial account connection remains SDK-owned UI. This source inspection establishes intended SDK behavior, not physical handoff success with the current app release. Coinbase’s current official help documents same-device browser → Mobile app → app explorer handoff, while discontinuing cross-device QR: https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued . The supported current route may move the web page/session into the app explorer; a Chrome-originating request does not prove that Chrome receives the session. Keep explicit SIWE review/sign after connection. No WalletConnect project ID, new API key, runtime code or scope migration added.

Updated Android test guide with the user-reported in-app result and the distinction between opening the wallet browser and remote signing back into Chrome. Required MetaMask/custom QR evidence and corresponding-commit CI remain outstanding; story status is unchanged. Documentation-only update; application checks were not rerun.


## Android Chrome Coinbase app opens without SIWE prompt — 2026-11-05

User observed: Coinbase icon → SDK page in Android Chrome → Open Coinbase Wallet → wallet app starts, but no SIWE signature approval appears. Record this observation without claiming successful connection, handoff signing or a confirmed defect cause. Asked which app screen opens, what the original WalletGate Chrome tab shows on return, and Android/wallet versions. Earlier in-app browser PASS remains a distinct user-reported result.

Source trace: WalletDialog invokes useWalletAuth.prepare; prepare awaits wagmi connect/SDK eth_requestAccounts and chain checks, then requests the server challenge. SignatureReview requires a separate explicit Sign message & continue before authenticate invokes signMessage. Thus initial app launch is a connection action, not a SIWE signature request. The SDK's Coinbase-owned selection popup/WalletLink handshake must finish first.

Found an open, directly relevant upstream report: https://github.com/coinbase/coinbase-wallet-sdk/issues/1883 . The reporter describes Android Chrome EOA approval remaining pending across browser backgrounding and suggests internal SDK visibility/WebSocket changes. This is a possible cause only, not reproduced or confirmed here; no upstream internals patched. Current official same-device guidance remains https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued . Added the two-approval workflow and diagnostic distinctions to docs/COINBASE_ANDROID_TEST.md. No runtime source change or passing Android Chrome claim. Documentation-only validator ran; application tests were not rerun. Existing story technical status remains BLOCKED.


## Android Coinbase app opens without connection — recovery implementation, 2026-11-05

User clarified that the wallet app starts from the SDK popup but **no connection happens**. Record Android Chrome native-SDK handoff as **unsuccessful at connection (user-reported)**. No SIWE prompt is expected before that connection resolves. The earlier Coinbase Android in-app browser PASS remains separate. The upstream approval-event report is not a confirmed diagnosis because this user reports no connection approval at all.

Under existing AC-06/14 connection recovery, the pending native Coinbase connection now offers **Open WalletGate in Coinbase** on Android. It uses the percent-encoded current page URL in Coinbase's documented app-browser universal link, cancels/invalidates the original pending attempt, and explains that sign-in completes inside Coinbase. SDK remote connection remains the first attempt; desktop/installed-provider behavior is preserved. No wallet SDK internals, authentication policy, cookies/session transfer, WalletConnect credentials or passkey/smart-wallet routes changed. This recovery does **not** fix or claim a Chrome-owned remote-signing session.

Source: Coinbase's archived official developer page https://main.d39g7xymw2r1c0.amplifyapp.com/wallet-sdk/docs/deep-link , dapp-browser Universal link section (updated 2024-03-26), checked alongside current same-device app-explorer guidance https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued . Older docs URLs now redirect to the newer SDK overview. The physical deep-link behavior with the user's installed app still needs retesting. The explicit app link discloses the current page URL to Coinbase's wallet-owned link service; current login URLs contain no credentials.

Observed checks on dirty tree based on `754233cf21d71420857b06db6ed4c51fa083b192`:

- `npm run build > /tmp/coinbase-recovery-build.log 2>&1 && npx playwright test tests/e2e/coinbase-android.spec.ts` — exit 0, **2 browser tests passed**. Simulated Android tests verify correct URL encoding, explicit in-app-session copy, no challenge/session solely from handoff, and installed Coinbase provider connection plus explicit SIWE signing. Link navigation is intercepted by the test; no Android OS launch is simulated as passing.
- `npm run typecheck` — exit 0. A defensive optional-chain adjustment was then included in the full rebuilt verification.
- `bash scripts/verify.sh > work/US-001-01/artifacts/coinbase-android-recovery-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 50 browser tests passed**. [Full log](artifacts/coinbase-android-recovery-verify.log). Desktop SDK cases assert absence of the Android recovery action; existing wallet-selection, cancellation, auth and custom-QR regressions passed.
- Public preview Playwright with an Android user agent — exit 0, HTTP 200, visible recovery link to `https://go.cb-w.com/dapp` encoding `https://walletgate.beeswarm.dev/`, session 401 before signing. [Capture](artifacts/coinbase-android-recovery.png), visually inspected. This verifies presentation/link construction, not app launch or in-app navigation. Initial source-inspection smoke reproduced the Coinbase popup origin `https://keys.coinbase.com`; no pairing URL/capability was logged.

Fresh self-review inspected Android/Coinbase scoping, URL encoding and fixed link origin, explicit destination/session wording, synchronous attempt invalidation before navigation, retained connector precedence, and no session issuance without server-verified SIWE. No material issue found. [Source hashes](artifacts/coinbase-android-recovery-source.sha256). Guide docs/COINBASE_ANDROID_TEST.md contains the updated retest steps. Broader story remains **BLOCKED** on existing physical-device/CI gaps; user acceptance remains recorded, no repeat acceptance confirmation requested. Android recovery-link physical behavior is unverified and must not be reported as fixed remote connection.


## Official-source constraint: custom Coinbase app link removed — 2026-11-05

User explicitly asked for official browser-to-app documentation and prohibited untrusted SDKs/docs. Rechecked current sources on Coinbase-owned domains: https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued describes same-device browser/app-explorer handoff; https://docs.cdp.coinbase.com/wallet-sdk/docs/deep-link redirects to https://docs.cdp.coinbase.com/coinbase-wallet/overview and no longer provides the exact custom app-link syntax. Searches did not verify that syntax in current official docs. An AWS-hosted preview's official ownership/current support was not independently established, so the earlier attribution as an authoritative archived official page was too strong. No claim is made that the preview is malicious or that the go.cb-w.com domain itself is counterfeit.

Removed the recently added custom app-browser link and URL construction. Android pending connection now offers only manual in-app recovery guidance backed by current official help. Updated the new browser regression to assert absence of the custom link, no challenge/session while connecting, cancel/focus recovery and retained installed-provider signing. This is removal of the unverified implementation under the user's trust constraint, not bypass of a failing security check. Previous recovery-link plan/evidence captures are historical and superseded; docs/COINBASE_ANDROID_TEST.md now makes this explicit.

The installed @coinbase/wallet-sdk 4.4.0 remains the official package identified by the Coinbase-owned source repository https://github.com/coinbase/coinbase-wallet-sdk . Package authenticity does not prove current Android compatibility. No unofficial SDK, internal patch, new dependency, credential, or smart-wallet/passkey migration added.

- `bash scripts/verify.sh > work/US-001-01/artifacts/coinbase-official-source-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 50 browser tests passed**. [Log](artifacts/coinbase-official-source-verify.log).
- Public Android-user-agent Playwright smoke — exit 0, HTTP 200, manual recovery guidance visible, **zero custom go.cb-w.com links**, session 401 before signing. [Capture](artifacts/coinbase-official-source-preview.png).
- Fresh source review confirmed no custom link/URL construction remains in src, cancellation/focus unchanged, official package/API unchanged, and physical in-app PASS remains separate from unsuccessful Android Chrome connection. No material issue found in this correction. Actual Android Chrome connection remains unresolved; the broader story stays BLOCKED with existing device/CI gaps. User acceptance remains recorded.

Results apply to the dirty tree based on `754233cf21d71420857b06db6ed4c51fa083b192`. This correction does not establish physical device compatibility or CI success.


## Official repository/demo connect-and-sign request — source comparison, 2026-11-05

User requested official Coinbase SDK connection/signing fallback for absent extensions on desktop and Android Chrome, referencing https://github.com/coinbase/coinbase-wallet-sdk and https://coinbase.github.io/coinbase-wallet-sdk/ . No custom app link is requested or restored.

Observed research (not passing wallet/device tests):

- `npm view @coinbase/wallet-sdk version dist-tags repository --json` returned latest **4.4.0**, canary **4.0.0-canary.20250708193645**, and the Coinbase GitHub repository URL. WalletGate already installs 4.4.0 and its absent-extension fallback invokes that official SDK. The first batch ended exit 22 because an assumed example file path SDKProvider.tsx returned 404; the valid files were subsequently discovered using GitHub's recursive tree API and read successfully. No package was installed or updated.
- Official repo HEAD from GitHub API: **eaca0ce913a1ea14aff0dbfae414825a31fc7a3c**. Its packages/wallet-sdk/package.json declares development **5.0.0**, and its official demo source imports workspace HEAD and obtains **sdk.evm.getProvider()**. Published 4.4.0 obtains **sdk.getProvider()**. Sources: package.json, examples/testapp/src/context/EIP1193ProviderContextProvider.tsx and store/config.ts at that pinned commit.
- Reviewed interface/builder/createCoinbaseWalletSDK.ts, createTransport.ts, storage/schema.ts and core/transport/walletlink2/index.ts at that official commit. Development preferences include telemetry/walletUrl/attribution; no documented typed eoaOnly switch. Transport factory uses popup transport. WalletLink 2.0 app transport is only a placeholder export. This does not establish native Android EOA connection/signing support.
- Playwright with Android user agent opened the **official demo**, selected eth_requestAccounts Submit and inspected its popup without signing in or creating an account. Command exit 0: popup origin **https://keys.coinbase.com**, body showed Coinbase Wallet account Sign In / Create Account. No credentials, signature, account creation or wallet pairing took place. This is UI observation, not authentication/device compatibility evidence.
- Official demo personal_sign source formats UTF-8 message as hex and then address, consistent with EIP-1193/wagmi signing. Existing WalletGate runtime already connects via SDK eth_requestAccounts and signs the server challenge via its same SDK provider. This source comparison does not reproduce or fix the reported Android app connection failure.

Gate: story AC-07 and non-goals specify EOA-only; the server's local verifyMessage path does not validate smart-contract wallet signatures. Asked the human whether to preserve EOA-only or explicitly expand Coinbase smart-wallet scope before changing dependency/account-verification behavior. No source/runtime/dependency/product-policy change, no SDK migration, and no new passing test claim made. Story remains BLOCKED; prior user acceptance and manual desktop/in-app results remain recorded. Current local application checks remain the previously observed 83 API/SDK and 50 browser passes; only documentation validation is rerun for this investigation.


## Latest stable Coinbase SDK, EOA-only — 2026-11-05

User explicitly selected **EOA signatures only** and requested trying the latest stable Coinbase SDK. This resolves the prior account-scope decision; development 5.0.0/smart-wallet support is not authorized. Registry latest is **4.4.0**, already installed. Pinned package.json and the lockfile root dependency from a version range to exact **4.4.0**; retained its registry integrity `sha512-smqgHEefN+ERH+WJ5W4BpnHSKydmoyM441PkzmeKEpPVaVHYHIwt2JnHEL+2ZDIEuEvNaCqBf5xq/pBAmZ2Rhg==`. **The runtime SDK version did not upgrade**, and pinning alone does not fix the reported Android live-app connection failure.

Stable provider integration retains official `createCoinbaseWalletSDK({ appName: 'WalletGate', appChainIds: [1], preference: { options: 'eoaOnly' } }).getProvider()`. A matching injected Coinbase extension takes priority; without one, desktop and Android Chrome use this native SDK. Connection uses `eth_requestAccounts`; after explicit review, wagmi routes `personal_sign` through the same provider. Server-validated SIWE remains mandatory for authentication. Improved failed Coinbase connection text to identify Coinbase and retry instead of directing it to MetaMask. No custom app links, development SDK, SDK-internal patches, smart-wallet/passkey verification or new credentials added.

Added **tests/e2e/coinbase-sdk.spec.ts** and a simulated-service fixture. These execute the **unmodified published SDK bundled by Vite**, with no SDK import/provider mock and no injected wallet. The test replaces only the external Coinbase popup/relay/wallet: it follows stable SDK popup selection/session setup, AES-GCM encrypted WalletLink requests/responses and real ephemeral EOA message signatures. The real local WalletGate server issues/verifies the SIWE challenge and session. Both desktop and Android browser profiles test connect → review → sign → correct address → reload → logout, and signature rejection without authentication. Checks assert SDK 4.4.0/eoaOnly and absence of session/signing before explicit review. This is **simulated Coinbase service/wallet integration**, not a live relay, installed extension or Android app compatibility test. No real user account, credential or pairing data was used or logged.

Actual commands/results:

- `npm view @coinbase/wallet-sdk version dist-tags dist.integrity repository --json` — exit 0, stable latest 4.4.0, canary 4.0.0-canary.20250708193645, integrity above, Coinbase-owned GitHub source. Attempts to open a guessed v4.4.0 GitHub tag returned 404/restricted fetch; that tag is not treated as evidence. API compatibility was checked against the installed published package/runtime/types.
- `npm install --package-lock-only --ignore-scripts --save-exact @coinbase/wallet-sdk@4.4.0 > /tmp/coinbase-stable-pin.log 2>&1` — exit 0, up to date; npm reported 654 packages audited and zero vulnerabilities. No source-build/lifecycle script was run by this command.
- `npm run build > /tmp/coinbase-stable-build.log 2>&1 && npx playwright test tests/e2e/coinbase-sdk.spec.ts` — exit 0, **4 passed**.
- `npm run typecheck` — exit 0.
- `bash scripts/verify.sh > work/US-001-01/artifacts/coinbase-stable-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, production build and 54 browser tests passed**. [Full log](artifacts/coinbase-stable-verify.log).
- `npm ls @coinbase/wallet-sdk --depth=0` — exit 0, @coinbase/wallet-sdk@4.4.0.
- Public preview smoke, desktop and Android user-agent profiles — exit 0, both HTTP 200, Coinbase-owned `https://keys.coinbase.com` popup advertising sdkVersion **4.4.0**, zero custom go.cb-w.com links, session HTTP 401 before proof. This verifies SDK presentation/version only; no phone pairing or signing was performed against the live service.

Fresh self-review checked exact version/integrity, stable API versus development API, eoaOnly/mainnet settings, provider identity across connect/sign, unchanged verification rules, Coinbase-specific failure recovery, isolated test-service interception, cancellation/auth regressions, and absence of credentials in artifacts. No material issue found. [Source hashes](artifacts/coinbase-stable-source.sha256); dirty-tree base `754233cf21d71420857b06db6ed4c51fa083b192`. Updated DEVELOPMENT.md and COINBASE_ANDROID_TEST.md with stable configuration, test scope and physical-test limits.

**Remaining limits:** the user-reported live Android Chrome app-opening-without-connection issue has not been shown fixed; stable 4.4.0 was already the runtime version. Required real-device/MetaMask/custom QR evidence and corresponding-commit CI are still outstanding. Story remains **BLOCKED**, not QA_PASSED/lifecycle ACCEPTED. Existing user business acceptance and completed manual/in-app/desktop reports remain recorded; no repeat acceptance decision is requested.


## Official demo account-method UX comparison — 2026-11-05

User asked to try the official demo's eth_accounts submission without an extension and noted its login-popup UX. Performed read-only live browser investigation; no production source/config/account-policy changes made.

- First Playwright script incorrectly expected eth_accounts to open a popup and ended **exit 1**, with a 15-second popup-event timeout. It logged window.ethereum as an object; source inspection confirms the demo creates that object from its SDK, not from an installed extension. Do not interpret that object as provider discovery evidence.
- Corrected comparison script — **exit 0**, using separate clean desktop headless Chromium contexts without installed extensions. Clicked Submit in the exact eth_accounts section, also requested that method directly from the demo's SDK provider: result **[]**, **zero popups**, coinbaseWalletExtension undefined. [Main-page capture](artifacts/demo-eth-accounts-result.png).
- In a fresh context, clicked Submit in the exact eth_requestAccounts section: **https://keys.coinbase.com** popup displayed Coinbase Wallet account **Sign In / Create Account**. [Popup capture](artifacts/demo-request-accounts-login.png). No login, account creation, wallet pairing or signing occurred.
- In a separate clean context on WalletGate, imported the actual stable 4.4.0 built SDK chunk and instantiated its public EOA-only provider API. Before connection, **eth_accounts** rejected with code **4100**, message **Must call 'eth_requestAccounts' before other methods**. No public integration code changed for this isolated comparison.
- Official source at commit eaca0ce913a1ea14aff0dbfae414825a31fc7a3c: core/namespaces/eip155/eip1193/disconnected.ts returns [] for eth_accounts and starts connection for eth_requestAccounts. An initially guessed eth_accounts.ts source path returned 404; discovered/requested the actual request.ts/disconnected.ts paths instead. Stable source was inspected in the installed published package. These findings distinguish method behavior from the demo's development-version login screen; they do not establish that the latter is compatible with stable EOA-native mobile signing.

WalletGate already uses stable SDK eth_requestAccounts to open interactive connection when no extension exists, then reviewed personal_sign and server verification. Do not replace that with eth_accounts or change the approved EOA/stable-version boundary based only on popup appearance. Updated COINBASE_ANDROID_TEST.md with the observed comparison. No application checks rerun for documentation-only work; previous 83 API/SDK and 54 browser passes remain latest. Harness validator rerun separately. The real Android handoff issue, physical-verification/CI gaps and BLOCKED technical status remain; user acceptance remains recorded.


## Built and tried official development SDK 5.0.0 — 2026-11-05

User supplied the official demo popup URL showing sdkVersion=5.0.0 and explicitly requested finding/trying that version. Completed an **isolated source-build/browser experiment**. This supersedes the earlier lack of a local 5.0.0 trial; it does not change the product's EOA-only policy or migrate the main application's stable dependency.

Provenance and reproducibility:

- Official GitHub source commit: **eaca0ce913a1ea14aff0dbfae414825a31fc7a3c**; packages/wallet-sdk/package.json declares **5.0.0**. Source/archive/compiler/bundle metadata: [coinbase5-build-metadata.json](artifacts/coinbase5-build-metadata.json).
- `npm view @coinbase/wallet-sdk@5.0.0 version --json` — exit 1, registry **E404**. That source version is not available as a published npm version in the checked registry. No npm-package or main-app dependency upgrade was made.
- Downloaded official pinned codeload archive and copied its SDK package into an isolated temporary directory. First npm dependency installation failed with ERESOLVE (Vitest/web-worker version mismatch); its shell wrapper misleadingly ended 0 after a final printf, so it is **not** counted as an installation success. A set-e retry aligning web-worker still exited 1 due to old Node types. [First install failure](artifacts/coinbase5-initial-install-failure.log), [second failure](artifacts/coinbase5-second-install-failure.log).
- Aligned isolated build-only metadata to @vitest/web-worker **3.2.7** and @types/node **22.20.5**, without force/legacy-peer-deps. Dependency installation exited 0. SDK runtime source and runtime dependency declarations were not manually changed.
- Initial type/build command exited **2** on upstream WebCrypto typed-array errors under npm-selected TypeScript 5.9.3. [Initial build failure](artifacts/coinbase5-initial-build-failure.log). Used **TypeScript 5.6.2**, matching the official source's yarn.lock. Asset compilation, full SDK TypeScript compilation, alias rewriting and official rolldown browser build then exited **0**. [Successful build](artifacts/coinbase5-build.log). No failing type check was ignored. Build retains Sass deprecation and node:worker_threads browser warnings.
- Added [reproduction instructions](experiments/coinbase5/README.md), build script, locked isolated build metadata, local test page/server and browser smoke script under work/US-001-01/experiments/coinbase5. The page disables SDK telemetry and uses **sdk.evm.getProvider()**, matching 5.0.0. It has no WalletGate session issuance and no custom app link. It can request a plain personal_sign test after a real account connects, with only a local EOA cryptographic verifier; no smart-wallet verification is enabled.
- `bash work/US-001-01/experiments/coinbase5/build.sh > work/US-001-01/artifacts/coinbase5-rebuild.log 2>&1` — exit **0**, clean lockfile-based rebuild. Browser bundle SHA-256 exactly matched the first successful build: **17c26f216b61c5469a762f4625cae74e500154132b3a88bc8eae29ae9b3aad7a**. [Rebuild log](artifacts/coinbase5-rebuild.log).

Observed verification:

- In isolated SDK package: `./node_modules/.bin/vitest run src/interface/builder/createCoinbaseWalletSDK.test.ts src/core/namespaces/eip155/eip1193/request.test.ts src/core/namespaces/eip155/eip1193/disconnected.test.ts src/core/namespaces/eip155/eip1193/connected.test.ts` — exit **0**, **60 upstream tests passed in 4 files**. [Log](artifacts/coinbase5-focused-tests.log). These are supplier unit tests, not WalletGate acceptance or installed-wallet compatibility results.
- Started the isolated server on loopback localhost:3205 using the freshly built SDK bundle. `node work/US-001-01/experiments/coinbase5/try.mjs > work/US-001-01/artifacts/coinbase5-trial.log 2>&1` — exit **0**. [Trial log](artifacts/coinbase5-trial.log).
- Desktop and Android user-agent profiles in headless Chromium **156.0.8078.4**, without installed extensions: eth_accounts returned **[]** with **zero lookup popups**; clicking eth_requestAccounts opened the real **https://keys.coinbase.com/onboarding** page with query **sdkVersion=5.0.0** and **Sign In / Create Account** UI. Both had **zero parent page-script errors**. [Desktop popup](artifacts/coinbase5-desktop-login.png), [Android-profile popup](artifacts/coinbase5-android-login.png). Visually inspected the desktop capture. SDK telemetry was disabled; no Coinbase/analytics network request was observed from the parent trial page before/through popup opening (vendor-popup internal traffic is outside this assertion).
- Signing control stayed disabled before connection. No real account login/creation, pairing or wallet signature was attempted. Separately, the isolated EOA verifier accepted an ephemeral test signature and rejected the wrong address and an invalid extended signature format; these **3 local crypto checks do not prove SDK 5 wallet signing**.
- `sha256sum -c work/US-001-01/artifacts/coinbase-stable-source.sha256` — exit **0**, all six main application/package/stable-test hashes unchanged. Main WalletGate still uses **4.4.0**, EOA-only.
- `node --check` on the isolated serve.mjs/trial.js/try.mjs and `bash -n` on build.sh — exit **0**. Harness metadata validator rerun after recording evidence. Main application tests were not redundantly rerun because product source/dependencies did not change; latest main application results remain 83 API/SDK and 54 browser passes.

Fresh self-review checked fixed official commit/archive hash, locked build tooling without peer/type-check bypasses, telemetry opt-out, correct 5.0.0 provider API, loopback-only isolated server, bounded local proof request, no session issuance, no private-key/signature logging, disabled pre-connection signing, and unchanged main-app hashes. The temporary trial server was stopped after the checks; README commands can restart it. No public deployment, permission, credential or product-account-policy change made.

**Conclusion/limits:** SDK **5.0.0 was actually source-built and tried**, and its no-extension onboarding popup was reproduced locally. EOA connection/personal_sign with a real Coinbase account remains unverified; Android profiles are simulations, not physical-phone tests. There is no claim that 5.0.0 can enforce EOA-only account selection or that the observed SDK 4.4.0 Android issue is fixed. Main-app migration/CSP integration is not part of this experiment. Broader story remains **BLOCKED** on outstanding device/CI gates; prior human business acceptance remains recorded.


## Application migration to SDK 5 superseded by user-requested 4.4.0 restoration — 2026-11-05

User requested applying SDK 5 to WalletGate, then explicitly instructed: “please revert back to the 4.4.0 please”. The latter instruction cancels that migration. Restored the prior stable application rather than continuing SDK 5 fixes.

Superseded SDK 5 attempt: installed a local official-source package at pinned commit eaca0ce913a1ea14aff0dbfae414825a31fc7a3c, changed provider API/telemetry, SDK style hashing/CSP, account-limit copy and tests. Type check initially failed on an optional switchChain invocation/mock return typing and was corrected. Focused SDK 5/Android integration suite then passed **10 tests** with simulated popup services. A subsequently added popup-blocked/CSP regression failed **2 cases** because SDK 5 injects an additional font-face style not yet covered by the whitelist. No full migration QA pass was claimed. The user requested restoration while that fix was being investigated; no unsafe-inline exception, upstream runtime patch or check weakening was applied.

Restoration scope: package.json/package-lock.json restored from pre-migration snapshots (preserving earlier dirty changes); sdk.getProvider(), appChainIds [1], eoaOnly, prior mainnet handling, auth-copy, Android pending guidance, Coinbase relay CSP permissions and style hash generation restored. Stable SDK tests/fixture restored; tests specific to the cancelled SDK 5 migration removed as part of reverting that implementation. SDK 5 vendor directory/dependency removed. Original W branding, theme toggle, adaptive sizing and Coinbase-second order were preserved; the independent SDK 5 experiment remains in work/US-001-01/experiments/coinbase5.

Actual verification:

- `npm install --ignore-scripts > work/US-001-01/artifacts/coinbase44-restore-install.log 2>&1` — exit **0**. Reinstalled the stable dependency without lifecycle scripts.
- `npm ls @coinbase/wallet-sdk --depth=0` — exit **0**, **@coinbase/wallet-sdk@4.4.0**.
- `sha256sum -c work/US-001-01/artifacts/coinbase-stable-source.sha256` — exit **0**, all six pre-migration hashes match: package.json, package-lock.json, src/wallet-sdk.ts, src/hooks/use-wallet-auth.ts, tests/e2e/coinbase-sdk.spec.ts and tests/e2e/coinbase-sdk-fixture.ts. Repeated after installation; all remained matching.
- `npm run build > work/US-001-01/artifacts/coinbase44-restore-build.log 2>&1` — exit **0**, restored the served stable build.
- `bash scripts/verify.sh > work/US-001-01/artifacts/coinbase44-restore-verify.log 2>&1` — exit **0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 54 browser tests passed**. [Full log](artifacts/coinbase44-restore-verify.log).
- Public preview Playwright smoke — exit **0**, HTTP **200**, popup origin https://keys.coinbase.com, **sdkVersion=4.4.0**, session **401** before proof. Existing evaluation server serves the restored assets; no configuration/permissions changed.

Fresh self-review confirmed the stable package/integrity/API, original CSP/style sources and eoaOnly setting, removal of the vendor dependency and SDK 5-specific application changes, and unchanged prior UI work. Results apply to dirty-tree base 754233cf21d71420857b06db6ed4c51fa083b192. No claim that stable 4.4.0 fixes the earlier Android live-app handoff issue. Broader story remains BLOCKED on outstanding device/CI evidence; prior user business acceptance remains recorded, no repeat acceptance decision requested.


## Removed Continue-with-wallet connection screen — 2026-11-05

User explicitly requested removing the Continue with XX page after clicking MetaMask/Coinbase icons. Updated AC-14 within this existing story. WalletGate now suppresses the connection modal for **both injected extensions and native SDKs** while connecting/preparing the server challenge. It shows an inline progress/cancel action on the homepage, delegates wallet connection prompts to the extension/SDK, and opens **Review and sign** directly only when the server-generated SIWE message exists. Removed the Continue-with title and duplicate review heading. Explicit signature approval, error/retry behavior, phone approval, focus restoration and attempt invalidation remain. Coinbase stays **4.4.0**; no dependency/auth-policy change.

Observed commands/results on dirty-tree base `754233cf21d71420857b06db6ed4c51fa083b192`:

- Initial `npm run build > /tmp/walletgate-direct-review-build.log 2>&1 && npx playwright test tests/e2e/direct-wallet-review.spec.ts tests/e2e/coinbase-sdk.spec.ts` — exit **1**: 6 assertions failed because the initial dialog title “Review your sign-in message” made existing non-exact getByLabel('Sign-in message') locators match both the dialog and its message field. Changed the dialog's visible/accessibility title to the concise **Review and sign**. No assertion was removed or authentication check weakened.
- Repeated focused command — exit **0**, **6 passed** (two new delayed-challenge/cancel/retry checks plus four actual stable SDK/simulated relay checks). New checks cover MetaMask/Coinbase injected providers, no intermediary dialog during a held challenge, cancel/focus restoration, ignored late response, direct review on retry, no premature signing/session, and successful explicit SIWE verification.
- `bash scripts/verify.sh > work/US-001-01/artifacts/direct-review-verify.log 2>&1` — **exit 0: 11 harness tests, lint, typecheck, 83 API/SDK tests, build and 56 browser tests passed**. [Full log](artifacts/direct-review-verify.log).
- `npm ls @coinbase/wallet-sdk --depth=0` — exit **0**, **4.4.0**.
- Public preview Playwright with simulated EIP-6963 MetaMask and Coinbase providers — exit **0**: both HTTP **200**, dialog title **Review and sign**, **zero Continue with headings**, and session **401** before signing. [Capture](artifacts/direct-review-public.png), visually inspected. These are simulated providers, not physical extensions or wallet apps. No real signature/account was used; ephemeral browser-bound challenges were not authenticated.

Fresh self-review checked pending-state coverage across connector types, genuine error/retry access, explicit review/sign semantics, shared phone SignatureReview heading behavior, asynchronous attempt guards, inline cancellation, focus restoration and unchanged SDK/provider/server-verification behavior. No material issue found. [Source hashes](artifacts/direct-review-source.sha256). DEVELOPMENT.md records the updated entry flow.

The broader story remains **BLOCKED** on existing real-device/CI gaps; no QA_PASSED, corresponding-commit CI or final lifecycle acceptance is claimed. Prior business acceptance remains recorded; no repeat acceptance decision requested.

## Single centered card revision — 2026-11-05

User explicitly requested no WalletGate review popup/page, exact step headings `2 Review and sign` and `3 Signed in`, all necessary details/actions in the same card, and consistent card size. This supersedes the earlier dialog presentation/focus trap in AC-08/14; approval metadata and overall BLOCKED status are unchanged.

Implementation: `src/components/wallet/wallet-flow.tsx` replaces the former WalletDialog; main SignIn keeps one responsive card across choose/review/server-verified-success, with active/completed progress, step-heading focus, scrollable full SIWE message, sign/cancel/status/error/recovery, verified address/session expiry and signout. Phone QR approval also renders inline and retains unmount cancellation/initiator-binding. Cancellation restores the remounted originating button by accessible name. Fixed responsive height and existing adaptive width prevent stage resizing; narrow-screen scrollbar handling preserves 44px wallet targets. Coinbase remains exactly 4.4.0, EOA-only; wallet-owned SDK/extension prompts are preserved. Original walletgate.png remains present and unrendered.

Actual verification on working tree based on HEAD `754233cf21d71420857b06db6ed4c51fa083b192`:

- Initial focused browser run: 48 passed / 4 failed. Found duplicate QR heading, detached trigger focus restoration and wallet targets narrower than 44px at 320px; fixed underlying markup/refocus/layout. Historical initial output was `/tmp/inline-tests.log`; final reproducible verification below covers all those tests.
- `bash scripts/verify.sh`: exit 0. **11 harness tests, 83 API/SDK tests, 60 Playwright tests passed**; lint, TypeScript and production build passed. Log: `artifacts/inline-card-verify.log`. Existing Vite node:worker_threads externalization and NO_COLOR/FORCE_COLOR warnings remain; no failing checks.
- New `tests/e2e/inline-sign-in.spec.ts`: light/dark × 320/1440px verifies exact headings, heading focus, constant card width/height, no WalletGate dialog/navigation, explicit sign required and session absent before proof, server-verified success/address/signout, no horizontal overflow and axe WCAG A/AA checks during review/success. Retained real-signature simulated-provider, SDK, rejection, stale response, account/chain change, phone QR, cancellation/focus and privacy/security regressions.
- Fresh code review: inspected flow cleanup, attempt-generation guards, QR stable callback/unmount handling, cancellation during signing/verification, heading focus and scrolling. Existing auth hook/server verification unchanged. Resolved the focus and narrow-target findings; no additional material findings. This was a primary-agent fresh review, not independent human acceptance.
- Visually inspected `artifacts/card-review-light-1440.png`, `artifacts/card-review-dark-320.png`, and `artifacts/card-success-light-1440.png`. Review/success captures exist for both themes at both widths. Desktop card is approximately 547×640px at 1440px; message scrolls inside the card and actions remain usable.
- `npx tsx work/US-001-01/artifacts/inline-card-smoke.ts`: exit 0 against the existing authorized public preview. Simulated injected provider with an ephemeral real EOA signature; `/api/challenge`, `/api/verify`, `/api/session` and `/api/logout` all returned 200 after initial unauthenticated session 401. All three stages at exactly the same x/y/547.1875×640px, zero WalletGate dialogs and zero application page errors. Log: `artifacts/inline-card-smoke.log`; capture: `artifacts/public-inline-success.png`. The initial standalone smoke fixture failed because tsx serialized its `__name` helper into browser code; the reproduction now installs that helper before the fixture. This was a test-runner issue, not a product change.
- Public edge injects a Cloudflare Insights beacon which the unchanged strict CSP blocks. This console CSP rejection is separately recorded in smoke output; it does not prevent sign-in and is not counted as a clean CSP smoke. Local full-suite CSP tests passed. No CSP weakening or edge configuration change made.
- `git diff --check`: exit 0.

AC coverage for this revision: AC-01/02/14 direct wallet entry and inline review; AC-05/06/07 explicit proof, verified-only success and stale-attempt safety; AC-08 stable responsive card, themes, focus, keyboard, readable scrolling and automated a11y; AC-04/09/10 custom QR behavior/regressions. Earlier device-test limitations remain: simulation is not physical Android/extension compatibility evidence. Required MetaMask Android/custom QR and corresponding-commit CI evidence remain outstanding; story stays **BLOCKED**, not QA_PASSED or ACCEPTED. Prior explicit business acceptance is already recorded; no repeat acceptance requested.

## Intentional signout disconnect warning fixed — 2026-11-05

User reported the initial card displaying “Wallet account or network changed. Connect and review a new sign-in message.” after signout. Root cause: logout ends the server session, resets auth state, then disconnects the wagmi connector; its connection watcher classified that deliberate disconnection as an unexpected wallet change. Reuse the existing generation-bound expectedDisconnect marker around logout's disconnect, clear it in finally, and rename the watcher's local switchingConnector flag to intentionalDisconnect. Genuine unexpected account/network/disconnect handling remains intact. No server/session policy, SDK, UI scope or acceptance metadata change.

Regression evidence: the existing reload-before-logout case did not reproduce because reload loses the active connector. Added assertions to the no-reload four-theme/viewport inline cases: server session 401 and no alert after immediate logout. Before the fix, `npx playwright test tests/e2e/inline-sign-in.spec.ts -g 'light 1440px'` failed (exit 1) with one unexpected alert, recorded in `artifacts/logout-regression-before.log`. The reload/logout case also now verifies no alert and a fresh successful explicit connect/review/sign cycle.

After fix: `bash scripts/verify.sh` exit 0; 11 harness, 83 API/SDK and 60 browser tests passed, plus lint/typecheck/build. Log: `artifacts/logout-fix-verify.log`. This includes genuine change/disconnect during signing and stale-signature/account regressions, and the four immediate-logout cases. `git diff --check` exit 0. Fresh primary-agent review confirmed suppression applies only to generation-matching intentional disconnects and marker cleanup executes on failure; unexpected changes still invalidate attempts.

Public preview smoke: `npx tsx work/US-001-01/artifacts/inline-card-smoke.ts` exit 0, with simulated injected provider and ephemeral real signature, no application page errors, logoutAlerts=[], and logoutSessionStatus=401. Log: `artifacts/logout-fix-smoke.log`. The standalone request assertion initially used a relative URL without Playwright baseURL and was corrected to an absolute same-origin URL; this was test infrastructure only. The previously recorded edge-injected Cloudflare Insights beacon remains blocked by unchanged CSP and is separately logged. No physical-wallet claim or clean-edge-CSP claim is made.

Working-tree base remains `754233cf21d71420857b06db6ed4c51fa083b192`. AC-06/07/14 regression fixed; story remains BLOCKED on previously documented device/CI evidence, not this bug. Human business acceptance already recorded; no repeat acceptance request.

## Phone icon popup and compact Step 1 — 2026-11-05

Latest explicit user revision: remove Trust Wallet icon, replace the separate “Use your phone” button with a phone icon in the fifth slot, open the “Use your phone” page as a popup on click, and place Step 1 buttons beneath the icons in one horizontal row with no scrollbar. This supersedes only the previous inline custom QR presentation; review/success remain inside the centered card with their approved headings.

Implementation: four wallet shortcuts (MetaMask, Coinbase, Rabby, Rainbow) plus a local SVG phone outline; Trust shortcut removed without deleting its asset. The phone icon uses the existing Radix primitive with accessible title/description/modal semantics, trapped focus, close/Escape/cancel and trigger focus restoration. QR creation/polling/approval/cancellation and all session policy remain unchanged. Step 1 retry/network/back/cancel actions use a compact flex row with short visible labels and full accessible action names. No separate phone text button. Step 1 has no inner scrollbar; ordinary initial/review/success dimensions remain stable, while unusually long Step 1 error/recovery content may grow the card instead of clipping controls. Browser page scrolling remains available on short viewports, and the phone popup retains bounded scrolling for long content on narrow screens. No scrollbar is cosmetically hidden or essential content removed. Coinbase SDK remains 4.4.0.

Actual checks on working tree based on `754233cf21d71420857b06db6ed4c51fa083b192`:

- Focused run (`npx playwright test tests/e2e/step-one-layout.spec.ts tests/e2e/wallet-shortcuts.spec.ts tests/e2e/wallet-dialog.spec.ts tests/e2e/inline-sign-in.spec.ts`): 31 passed / 1 failed. New explicit modal semantics assertion identified missing aria-modal; added aria-modal=true to the genuinely modal phone content. Log: `artifacts/phone-shortcut-focused.log`.
- First full run: 55 passed / 5 failed browser tests, with lint/typecheck/build/API checks passing. Their substring-based `getByLabel('Sign-in message')` also matched the new retry button's explicit accessible label, even after the actual SIWE message was removed. Updated all message locators to `{exact:true}`; no auth behavior or negative assertion relaxed. Log preserved as `artifacts/phone-shortcut-verify-before-selector-fix.log`.
- Final `bash scripts/verify.sh`: **exit 0, 11 harness, 83 API/SDK and 60 Playwright tests passed**, including lint, TypeScript and production build. Log: `artifacts/phone-shortcut-verify.log`. Existing Vite externalization and terminal color warnings remain non-fatal.
- Trust-specific shortcut presence/missing/connection tests superseded by explicit removal; Trust's MetaMask compatibility-flag anti-substitution test retained. Added two 320/1440px tests for Step 1 no inner overflow, single horizontal action row, phone popup, unauthenticated session and close/focus restoration. Phone popup tests retain both-theme axe WCAG checks, focus trap, Escape, no unapproved external traffic/CSP failures locally, theme-change request preservation, QR decode/sign/cross-browser completion and cancellation/creation races. Review/success stable-size tests and clean logout still pass.
- Public smoke: `npx tsx work/US-001-01/artifacts/phone-shortcut-smoke.ts`, exit 0. Verified exact five-slot order, Trust absence, no Step 1 inner scrollbar, real phone QR generation, popup dismissal and restored phone focus, cancelled request rejected with 410, zero application page errors. Log: `artifacts/phone-shortcut-smoke.log`; captures `artifacts/public-phone-shortcut.png`, `artifacts/public-phone-popup.png`. The existing edge beacon/CSP limitation from the earlier evidence remains; this smoke measures application page errors and does not claim a clean edge console.
- Visually inspected light desktop phone popup, dark mobile popup, and 320px recovery action row. Captures: `artifacts/phone-popup-{light,dark}.png`, `artifacts/phone-popup-mobile-{light,dark}.png`, `artifacts/step-one-recovery-{320,1440}.png`. Small-screen popup can scroll; its close action stays available.
- Fresh primary-agent review: checked controlled dialog mount/unmount, QR cleanup/cancellation, stable callback during themes, focus restoration, background modal isolation, native-SDK cancellation and explicit sign/verified-only success. No material unresolved implementation findings. `git diff --check` exit 0.

AC-01/14 updated directly from this user instruction; AC-05/06/07/08/09/10 security, keyboard/theme and QR regressions remain covered. Story stays BLOCKED on existing physical Android/custom QR and corresponding-commit CI evidence; this revision does not imply real-device pass, QA_PASSED, final ACCEPTED or production release. Prior explicit business acceptance remains recorded; no repeat approval requested.

## Errors below card and closer privacy footer — 2026-11-05

User explicitly requested moving the separate red message box outside the card, showing it only on error, and reducing the excessive gap between content/actions and the card's footer. Updated AC-14 directly from that instruction; no human approval/acceptance metadata changed.

Changes: `src/main.tsx` wraps card and optional error in a responsive sign-in-shell. The error is a sibling alert below the card, shares its width, and is linked through conditional aria-describedby=signin-error. No empty alert/space exists when error is absent; reset/cancel clears it. `src/style.css` stops the initial/success content box from growing to consume spare height and centers the compact stack within the same normal card dimensions. Privacy copy follows content with a 12px margin. Review still uses the available height for the scrollable SIWE message; its buttons and explicit signing remain unchanged. Phone QR/approval errors retain their own popup/phone context. Existing compact recovery row, phone icon popup, theme behavior, SDK 4.4.0, auth policy and clean logout remain.

Observed verification on working tree based on HEAD `754233cf21d71420857b06db6ed4c51fa083b192`:

- `npm run build`, followed by `npx playwright test tests/e2e/step-one-layout.spec.ts tests/e2e/inline-sign-in.spec.ts`: exit 0, all 6 focused tests passed. Log: `artifacts/outside-error-focused.log`.
- Extended Step 1 regressions verify no idle alert, alert outside the card and at matching width, linked description, unchanged card height on error, disappearance after cancellation, retained short horizontal actions and no inner scrolling at 320/1440px. Both themes audited with axe WCAG A/AA during the actual external-error state. Initial/success footer gap assertions and existing stable-dimension review/success tests retained.
- `bash scripts/verify.sh`: exit 0. **11 harness, 83 API/SDK and 60 Playwright tests passed**, plus lint, typecheck and production build. Log: `artifacts/outside-error-verify.log`. Existing terminal color and Vite externalization warnings remain non-fatal.
- `npx tsx work/US-001-01/artifacts/outside-error-smoke.ts`: exit 0 on the existing public preview, using a simulated injected provider on an unsupported chain. The error appeared below the card at identical width, card stayed 547.1875×640px, privacy-footer gap measured 12px, and cancellation removed the alert. Zero application page errors. Log: `artifacts/outside-error-smoke.log`; capture `artifacts/public-outside-error.png`. Shell recenters as the below-card error appears; card dimensions remain unchanged. Prior edge-beacon CSP limitation remains separately recorded, and this smoke does not assert clean edge console or physical wallet compatibility.
- Visually inspected desktop recovery/external-error and verified-success captures; both show the privacy text directly below actions. Error-state captures for both themes/widths: `artifacts/outside-error-{light,dark}-{320,1440}.png`. Fresh primary-agent review checked conditional accessible association, alert announcements, shared responsive width, no clipped recovery controls, preserved popup isolation and unchanged auth lifecycle. No unresolved material findings.
- `git diff --check`: exit 0.

AC-06/08/14 presentation/recovery covered; protocol/security and phone QR regressions also pass. Story remains BLOCKED on previously documented real Android/custom QR and corresponding-commit CI evidence. This is not a QA_PASSED/ACCEPTED or physical-device claim. Prior explicit business acceptance remains recorded; no repeat acceptance request.

## Compact Android Chrome presentation — 2026-11-05

User reported too much margin and white space in Android Chrome. The inherited 640px card minimum, large page/card spacing and centered fixed-height content reserved empty bands on phones. Updated the approved presentation notes (AC-14/17) from this request: mobile initial/success heights now fit content instead of preserving desktop stage height. Width stays consistent, SIWE review keeps a bounded readable area, and desktop sizing stays unchanged. No approval/acceptance metadata modified.

Changes in `src/style.css`: <=767px uses 12px page gutters, 20×18px card padding, 16px header/card spacing, smaller heading/spacing, a single header row at >=360px, and the existing wrapped fallback below 360px. Initial/success cards no longer reserve a fixed height; review height is viewport-responsive 500–560px. Text, five >=44px wallet/phone targets, explicit sign/cancel, external errors, phone popup and both themes remain. No scrollbar hiding, clipped information, auth/SDK or server change. Mainnet EOA-only and Coinbase 4.4.0 retained.

Actual verification on working tree based on HEAD `754233cf21d71420857b06db6ed4c51fa083b192`:

- First fixed-height 500–560px revision: default verification passed (66 browser tests), but visual inspection still showed unnecessary internal blank bands. That version was refined to content-fit initial/success cards. Historical successful log: `artifacts/android-layout-fixed-height-verify.log`. A passing test alone was not treated as satisfying the visual request.
- Final focused run: `npm run build` then `npx playwright test tests/e2e/android-layout.spec.ts tests/e2e/inline-sign-in.spec.ts tests/e2e/step-one-layout.spec.ts`, exit 0, **12 passed**. Log: `artifacts/android-layout-focused.log`.
- New Android touch/mobile UA emulation matrix: 320×740, 390×720 and 412×915 in light/dark, initial card <=460px, top/bottom padding <=22px, 12px gutters, <=20px header/card gap, >=44px wallet targets, no idle horizontal/vertical document overflow and axe WCAG A/AA checks. Captures `artifacts/android-compact-{light,dark}-{320,390,412}.png`.
- Existing stage tests preserve stable desktop dimensions, common widths, bounded mobile review/success sizes and return-to-initial size after logout. Mobile height may grow by its new recovery action row; the error remains outside. External errors, keyboard/theme/security and phone-QR regressions retained. Visually inspected final light 390px and dark narrow presentation and confirmed removal of blank card bands.
- Final `bash scripts/verify.sh`: **exit 0; 11 harness, 83 API/SDK and 66 Playwright tests passed**, plus lint, typecheck and build. Log: `artifacts/android-layout-verify.log`. Existing Vite externalization/terminal-color warnings remain non-fatal.
- `npx tsx work/US-001-01/artifacts/android-layout-smoke.ts`: exit 0 on existing public preview in 390×720 Android emulation. Card measured x=12, y=60, width=366, height=386.71875 (previous minimum was 640px). Header height 32px, header/card gap 16px, no document overflow or application page errors. Log: `artifacts/android-layout-smoke.log`; capture: `artifacts/public-android-compact.png`. Earlier edge-beacon CSP limitation remains; no clean edge-console claim.
- Fresh primary-agent code review checked media-query specificity/breakpoint boundary, correct viewport meta, content growth under errors/enlarged text, review scrolling, target sizes, desktop isolation and unchanged proof/session semantics. `git diff --check` exit 0. No material unresolved implementation findings.

These are browser emulation/visual results, not physical Android Chrome or wallet-device verification. Real browser chrome/keyboard and wallet flows still require the already documented device checks. Story remains BLOCKED on that evidence and corresponding-commit CI; no QA_PASSED/ACCEPTED claim or repeat human acceptance request.

## Signout explanation and pending-connection guard — 2026-11-05

User asks what signout means and whether wallet connections can close cleanly without many pending connections. Current logout ends the Better Auth session and disconnects wagmi. Inspected installed `node_modules/wagmi/node_modules/@wagmi/core/src/connectors/injected.ts`: injected disconnect attempts wallet_revokePermissions for eth_accounts with a bounded 100ms timeout, then marks the connector disconnected. Native adapters already use MetaMask client.disconnect / Coinbase provider.disconnect. Official MetaMask account lifecycle documentation confirms supported disconnect and recommends disabling connection controls while pending: https://docs.metamask.io/metamask-connect/evm/guides/manage-user-accounts/ . No new permission request/revocation API or wallet protocol added.

Found and fixed two UI concurrency gaps under existing AC-05/06/07: wallet/phone shortcuts remained clickable during connection/provider discovery, and logout's reset briefly cleared busy before connector cleanup. `wallet-flow.tsx` now takes a synchronous selection lock (covers same-event-loop double clicks), disables shortcut buttons while selecting/busy, awaits the selected prepare, and releases the lock only for the matching generation. Cancel clears the lock and invalidates old attempts, and connecting/cancel remains available during provider discovery. `use-wallet-auth.ts` holds busy through logout connector cleanup, retaining the existing expected-disconnect marker. Signing/proof/session checks unchanged; no automatic signing or extra prompt introduced.

Actual verification on working tree based on `754233cf21d71420857b06db6ed4c51fa083b192`:

- Focused initial run: existing direct-review tests passed, new duplicate-click tests reached clean logout but their held-revoke observation exceeded the injected connector's intentional 100ms timeout (2 passed, 2 failed). Log: `artifacts/pending-connection-before-clock-fix.log`. Adjusted the test to pause browser time during that observation, then release disconnect/resume; did not remove or extend the production timeout.
- `npx playwright test tests/e2e/pending-connection.spec.ts tests/e2e/direct-wallet-review.spec.ts`: exit 0, 4 passed, recorded in `artifacts/pending-connection-focused.log`. Covers MetaMask/Coinbase simulated injected providers, two synchronous DOM clicks producing only one wallet permission request, pending disabled controls, explicit cancel/retry, real ephemeral EOA signing, session 401 immediately after logout, disabled controls during connector cleanup and enabled/no-alert state after cleanup.
- Final `bash scripts/verify.sh`: exit 0; **11 harness, 83 API/SDK and 68 Playwright tests passed**, plus lint/typecheck/build. Log: `artifacts/pending-connection-verify.log`. Actual stable SDK simulated-relay/cancellation, rejected/stale signatures, account/network changes, QR and compact mobile/desktop/a11y regressions remain green.
- Public preview smoke: `npx tsx work/US-001-01/artifacts/inline-card-smoke.ts` exit 0 with simulated provider and real ephemeral signature. Explicit review/sign/server-verified session/logout completed; logoutAlerts=[], logoutSessionStatus=401, no application page errors or WalletGate dialogs. Log: `artifacts/pending-connection-smoke.log`. The already documented edge-injected Cloudflare beacon remains blocked by unchanged strict CSP and is logged separately.
- Fresh primary-agent review checked lock generation cleanup, cancellation during discovery, stale prepare completion, busy through deliberate disconnect and continued server-session-first logout ordering. `git diff --check` exit 0. No material unresolved implementation findings.

Meaning/limits: signout ends this browser's WalletGate session and requests wallet-connection cleanup; it does not close the wallet app. Duplicate requests from active page clicks are now blocked. Cancellation invalidates local attempts and asks SDKs to clean up, but does not guarantee remotely dismissing every wallet-owned pending approval; an already-open wallet prompt may still need explicit rejection in that wallet. No physical-device cleanup success is claimed. Existing Android/custom QR and corresponding-commit CI evidence remain outstanding, so story stays BLOCKED; no new acceptance request or human metadata written.


## Latest human device results and Coinbase deferral — 2026-11-05

The user reports: “android test success in the wallet explor/browser. failed android chrome > coinbase app, waiting coinbase 5.0.0 release” and “phone QR test passed in desktop.” These answer the preceding request for Android sign-in/reload/signout and desktop-originating phone QR verification. Record both named test outcomes as PASS by user report, not agent-executed physical tests. The exact wallet(s), device model, Android/app versions and individual negative-case results were not supplied in this update; do not invent them or infer that every wallet/mobile route passed. Prior Coinbase in-app-browser PASS and desktop Chrome/MetaMask version reports remain separately recorded.

Android Chrome → Coinbase app remains FAILED at connection by user report. The user explicitly defers further work on that route while waiting for a Coinbase SDK 5.0.0 release. Keep the application pinned to 4.4.0 and EOA-only; no SDK upgrade, custom app link, smart-wallet expansion or claim that 5.0.0 fixes the route is authorized/implied. Revisit released official SDK support and real-device behavior before any future migration; no release availability is asserted here. Coinbase Android Chrome handoff is a documented deferred limitation, not a passing test or an outstanding request to debug now.

The earlier blanket statements that Android wallet-browser and desktop phone-QR outcomes are unreported are superseded by this update. Remaining engineering closure: commit the reviewable implementation and obtain successful CI for that exact SHA; attach more precise Android environment/wallet metadata when available. CI has not run for the current dirty tree, so technical status remains BLOCKED, not QA_PASSED or ACCEPTED. Prior explicit business acceptance remains recorded; no repeat acceptance requested.

Documentation-only recording of the user's results; no runtime/dependency/test code changed and no new physical or automated product test execution is claimed. Previous full application results remain the latest observed checks in artifacts/pending-connection-verify.log.

Validation for this documentation update: `python3 -m unittest discover -s tests -p 'test_*.py'` exit 0 (11 tests); `python3 scripts/check_harness.py` exit 0 (6 story files structurally valid); `git diff --check` exit 0. Full application suite was not rerun because no runtime, dependency or test behavior changed. No CI success or new physical test execution inferred from these documentation checks.

## Necessary-file review without committing — 2026-11-05

User explicitly prohibited committing until scope is clear and requested only necessary files. No commit or staging performed; main index confirmed empty with git diff --cached --stat. No files deleted or restored over user work.

Inventory before cleanup: 202 changed/untracked files, including 139 artifact/experiment paths and 59 PNG files. Artifacts/experiments in this pending set total 4,161,695 bytes; the whole US-001-01 work directory occupies about 4.4MB. These accumulated from visual/test iterations, version experiments, snapshots and verification logs, rather than runtime requirements.

Added only .gitignore rules for /work/*/artifacts/ and /work/*/experiments/; all outputs remain local. Existing tracked historical images are unaffected by ignore rules and are explicitly excluded from the proposed candidate set. The unused original src/walletgate.png remains present with SHA-256 755af121dc3a98a8f8eb2e84898f7e89570c66581a547bda04a1b16f7c7af3d8; it and unused trust.svg are not included. No original PNG removal is proposed.

Concrete proposed set: **56 files** — 21 app-source/asset files (only four required SVG wallet icons plus their license notice), 16 test/fixture files, 11 dependency/build/checker/ignore configuration files, and 8 story/plan/evidence/documentation files. No new PNG, screenshot, test log, saved research output or SDK5 experiment is included. Package-lock.json is required to reproduce the new wallet SDK/build dependencies; its large transitive dependency diff is not a screenshot/output artifact and should not be manually truncated. Story-ID checker/test support remains necessary for CI to recognize US-001-01. Existing unrelated .agents skill/AGENTS/README/docs-index guidance edits and optional component-generator config remain outside this proposed app commit.

Exact local review artifacts (intentionally ignored): artifacts/necessary-files.txt, artifacts/excluded-files.txt, artifacts/commit-scope-audit.json. These are review manifests, not lifecycle/status sources. The list may be used only after rechecking the working tree and respecting the user's no-commit instruction; do not use git add . or bundle all prior changes.

Validated source completeness without a commit: reconstructed HEAD into /tmp/walletgate-commit-review-e2njjgvb, overlaid only the 56 candidate files, reused the current node_modules through a symlink, and ran bash scripts/verify.sh there. **Exit 0: 11 harness, 83 API/SDK and 68 Playwright tests passed**, plus lint, typecheck and build. Log: artifacts/necessary-files-verify.log. No screenshots/logs/experiments or unused PNG/Trust source files were copied from the pending set; tests regenerate local outputs as needed. This validates the selected source set with existing installed dependencies, not a fresh dependency installation or CI run. Plan/evidence subsequently updated only to record this review/result.

Git diff --check exited 0. Git check-ignore confirms generated artifact/experiment paths excluded. The necessary-file proposal preserves prior user-reported device outcomes and deferred Android Coinbase issue; story remains technically BLOCKED on corresponding-commit CI. No human acceptance metadata changed, no commit/push performed, and no release authorized.


## Explicit commit authorization — 2026-11-05

The user subsequently instructed: “please commit your proposed files set.” This supersedes the previous no-commit restriction only for the reviewed 56-file manifest in local artifacts/necessary-files.txt. Verified all selected non-plan/evidence contents are identical to the source set that passed isolated verification (11 harness, 83 API/SDK, 68 browser tests); only these narrative records changed afterward. Stage and commit exactly that set, exclude generated outputs and unrelated changes, and do not push or claim CI success. Existing story BLOCKED/acceptance metadata remains unchanged pending corresponding-commit CI.

Staged-file whitespace check also inspected previously untracked files and found 8 intentional Markdown hard breaks expressed as trailing spaces in docs/UI_DESIGN_CONTRACT.md. Converted those to explicit backslash hard breaks, preserving rendered line breaks and wording; no runtime/test code changed. Staged whitespace validation rerun before committing.


## CI install failure repaired with fresh dependencies — 2026-11-05

Original run: https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/41990581676 on 0c53ea9416c634f8a51d63bf2bb187fbe681c194. It failed at npm ci with “Exit handler never called!”; no product checks ran. Runner reported Node 22.23.4/npm 10.9.9. The npm debug file was not uploaded by that run, so its deeper diagnostic is unavailable. Independently identified a concrete portability defect: 403 package tarball URLs were http://mirrors.tencentyun.com/npm/, which resolves here to link-local 169.254.0.3; other 244 URLs used the public registry. Prior local source verification reused node_modules and did not test fresh installation.

Repair: rewrite only those 403 resolved URLs to https://registry.npmjs.org and explicitly set that registry in .npmrc. Compared entire parsed old/new locks after URL normalization: every package version, integrity hash, dependency edge and other field unchanged. Keep omit=peer and SDK 4.4.0. Added scripts/check-lockfile.mjs, run before npm ci in CI and by project-verify.sh: dependency download URLs must use the public npm registry over HTTPS, with no URL credentials. It reports a count without printing potentially sensitive URLs. No checks skipped/weakened or install scripts disabled.

Observed checks:

- Source checker on original committed lock: exit 1, identifies 403 non-public sources; corrected lock: exit 0.
- First fresh install in /tmp hit local EDQUOT (-122). Moving source/cache to root filesystem still exposed node-gyp's temporary/header extraction quota; reran with local TMPDIR and npm_config_devdir on that filesystem. These are test-runner resource corrections, not CI check bypasses or dependency changes. Preserved diagnostic logs locally; removed only the failed temporary install/cache created during this repair.
- Independent source checkout /home/ubuntu/.cache/walletgate-ci-review-shkyfbji has no shared node_modules. `env TMPDIR=... npm_config_devdir=... npm exec --yes --package=npm@10.9.9 --registry=https://registry.npmjs.org -- npm ci --cache /home/ubuntu/.cache/walletgate-ci-npm-cache`: exit 0, 331 packages installed, lifecycle/native build scripts enabled. Install reported 0 vulnerabilities; this is not a broader security certification. Log: artifacts/ci-fresh-install.log. Local Node was 22.22.1, same major but different patch than CI.
- `env TMPDIR=... bash scripts/verify.sh` in that independently installed source checkout: exit 0; **11 harness, 83 API/SDK and 68 browser tests passed**, plus lock-source check, lint, types and build. Log: artifacts/ci-fresh-verify.log.
- Fresh review confirmed URL-only lock changes, standard CI install preserved, explicit preflight before network install, no new credentials/permissions, app behavior and SDK versions unchanged. git diff --check: exit 0.

Only eight repair files are selected for the follow-up commit: .npmrc, package-lock.json, scripts/check-lockfile.mjs, scripts/project-verify.sh, .github/workflows/ci.yml, backlog/US-001-01.md, this evidence file and the existing plan. Generated outputs, old experiments, unused images and unrelated edits stay excluded. Prior main-push authorization applies to this necessary CI correction. Local status is QA_PASSED candidate; replacement CI must pass on the pushed repair SHA before G2 is satisfied. No claim that original CI passed, no repeated business acceptance request and no accepted_by/accepted_at metadata written.
