# Delivery plan — US-001-01

## Story and scope

Approved scope: backlog/US-001-01.md AC-01–AC-16. Preserve approval metadata and US-001 local SIWE guarantees. No vendor wallet UI kit/relay, OIDC features, production deployment or business acceptance.

## Architecture and approach

- Preserve the current React/Vite, wagmi 3, viem 2 and Better Auth SIWE integration.
- Build local shadcn/ui primitives over Radix Dialog, Tailwind v4 semantic CSS tokens and a compact supplied logo. Discover wallet connectors using EIP-6963; keep view, connector and authenticated-session state distinct.
- Server-owned SQLite QR requests: separate random request reference, HttpOnly desktop capability and HttpOnly phone attempt capability. Phone reviews matching confirmation context and signs a server-generated SIWE message. Exact message/signature are verified before approval. Only the original browser can atomically redeem approval; redemption calls the existing Better Auth SIWE verification/session path with a server-held local attempt binding. No session is issued to the phone and no signature/cookie is transported in a URL.
- Five-minute absolute QR expiry; cap SIWE expiry at request deadline. Atomic conditional updates arbitrate cancel/replacement/approval/completion. Bound request creation/status/challenge attempts, enforce same-origin JSON mutation checks, no sensitive logging, no external resources on approval screens.

## Acceptance tests

| AC | Executable verification | Layer |
|---|---|---|
| 01,14,15 | Dialog open/close, two-column/mobile list/detail/back, accurate no-wallet alternatives | Playwright |
| 02,03 | Simulated EIP-6963 MetaMask/Rabby and delayed provider discovery; network switch/rejection; handoff link; actual devices separately | Playwright + manual |
| 04,05 | Separate browser contexts: phone proof, desktop completion, phone remains unauthenticated, no desktop connector | API + Playwright |
| 06,07 | Existing rejection/boundary/reload/logout and stale async regressions; account/network changes | Vitest + Playwright |
| 08,16 | Light/dark and live changes, keyboard/focus, narrow/zoom, contrast/accessibility audit, logo loading and captures | Playwright + review |
| 09,10,11 | Expiry boundaries, cross-request/browser proof/capability substitution, malformed signatures, replay/concurrency, cancellation and replacement, provenance and phone session absence | Vitest/API integration |
| 12 | Same-origin network inventory; no UI-kit/relay/analytics calls; missing configuration and source review | Playwright + review |
| 13 | Document configuration, actual commands/versions, manual device checklist and limits | verify.sh + evidence |

## Verification commands

- bash scripts/verify.sh (baseline and final)
- npm run typecheck; npm test; npm run build; npm run test:e2e
- Independent read-only review after implementation and focused reruns for corrections.

## Risks / evidence limits

Real MetaMask/Rabby extensions and a physical Android phone are not available in the automated runner. Do all implementable work, provide a reproducible checklist, and mark the story BLOCKED if required device verification cannot complete; never report simulations as device compatibility or QA_PASSED. Phone tests need an operator-controlled reachable HTTPS origin; no new tunnel/deployment is authorized. Existing unrelated dirty files and US-001 evidence artifacts must be preserved.

## Observed outcome

Implementation and automated verification completed. Final `bash scripts/verify.sh` exit 0: 11 harness tests, Oxlint, TypeScript, 73 API tests, production build and 30 Playwright tests passed. Independent read-only review found no remaining material issue after fixes. The story is BLOCKED on required actual MetaMask/Rabby/Android compatibility, camera/handoff and manual accessibility/device checks. See evidence.md; no QA_PASSED, CI success or acceptance is claimed.

## Review corrections

- Intentional connector disconnection was initially mistaken for an external disconnect; added a scoped guard and same-page MetaMask→Rabby regression.
- Initial/stale authenticated-session fetches now check lifecycle/generation before assigning state; delayed-response regression added.
- Pre-challenge phone dismissal no longer claims server cancellation; server rejection remains capability-bound after challenge.
- Serialized QR creation prevents overlapping initial responses from overwriting the active owner cookie within a page; delayed-create/reopen regression added. Cross-tab simultaneous first creation remains a documented retry/availability edge.
- Corrected rendered link contrast on muted background, approved-phone expiry copy and mobile focus movement. Preserved strict CSP with per-response style nonces rather than enabling unrestricted inline style.
- Added Oxlint because TypeScript-ESLint's available peer range excludes the repository's TypeScript 7. No peer dependency override or TypeScript downgrade was used.

## Authorized preview runtime

The user subsequently authorized serving the evaluation build on port 3000 at https://walletgate.beeswarm.dev. The public page, wallet dialog, logo and secure-cookie QR create/status/cancel flow were smoke-tested successfully. Actual physical wallet/device checks remain outstanding.

## Approved five-icon entry revision

Replace the original action in place with MetaMask, Rabby, Rainbow, Coinbase Wallet and Trust Wallet icon controls. Probe only the selected connector: installed provider → existing connect/review/sign flow; absent provider → existing custom desktop QR approval. Keep the approved phone wallet guidance and local assets. Preserve focus restoration to the originating icon and prevent stale provider probes after close/switch.

Completed current full verification: `bash scripts/verify.sh` exit 0, 11 harness/74 API/46 browser checks plus lint, typecheck and build. The expanded tests also exposed and now cover first-time QR rate-limit fairness while retaining the global creation ceiling. Physical wallet/device evidence remains outstanding; no human acceptance is claimed.

## Requested wallet-SDK QR revision — proposal pending relay decision

The latest user request replaces icon-triggered WalletGate phone-approval QR with the selected wallet's supported SDK connection QR when its extension is absent. The previous implementation and verification totals remain the current deployed behavior; this section is research/proposed implementation, not evidence of an implemented SDK integration. Preserve the existing explicit “Use your phone” custom approval route separately unless the user requests its removal.

### Verified connection options (2026-11-04)

| Icon | Missing-extension connection option | Configuration / verified limit |
|---|---|---|
| MetaMask | Official `@metamask/connect-evm` 2.1.1, via wagmi 3 `metaMask` connector; SDK QR/deep link and wallet-owned relay | RPC URL mapping required by SDK. Official wagmi guide uses Infura key; package supports own RPC URL instead. No WalletConnect project ID for this SDK. Installed wagmi 3.7.11 meets documented >=3.6 integration. |
| Coinbase Wallet | Official `@coinbase/wallet-sdk` 4.4.0, via wagmi connector | Published npm package documents desktop QR/mobile deep link. Use EOA wallet mode; do not silently introduce passkey/smart-wallet authentication or assume current GitHub main API matches release. Basic SDK setup has no project-ID parameter; audit relay/RPC calls and CSP against installed release. |
| Rainbow | WalletConnect SDK via wagmi, named QR view/deep link | Rainbow-maintained wallet adapter uses WalletConnect when injected provider is absent. Requires operator-owned WalletConnect project ID; installing RainbowKit is unnecessary. |
| Trust Wallet | WalletConnect Sign API / wagmi, named QR view/deep link | Official Trust documentation specifies WalletConnect v2 and project ID. Wallet Core is not a dapp QR connection SDK. |
| Rabby | Existing EIP-6963 extension; absent-extension recovery pending a documented Rabby-specific mobile connection option | Official integration guide documents injected providers. RabbyKit uses WalletConnect for its supported mobile wallets, but that is not evidence that the Rabby mobile app accepts a Rabby-specific QR. Do not fabricate that capability or route to another wallet. Offer official installation guidance unless a verified mobile SDK route is established. |

Observed local configuration: `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_MAINNET_RPC_URL` and `VITE_INFURA_API_KEY` are absent (checked names only; no credential values logged). Do not use example project IDs, register accounts, incur costs or invent a working QR without operator configuration.

### Concrete implementation / verification plan

1. Preserve matching EIP-6963 extension priority and the existing compatibility-flag guard. Lazy-initialize only the selected wallet's SDK fallback; no unselected SDK relay contacts on page load.
2. MetaMask/Coinbase use official native SDK connectors. Rainbow/Trust use the underlying WalletConnect SDK behind custom shadcn/ui, without reintroducing AppKit or RainbowKit. Rabby gets truthful recovery unless official mobile support is verified.
3. Connection completion only prepares the existing server-bound desktop SIWE challenge. Connecting/scanning never creates a Better Auth session; review, explicit signature, existing nonce/origin validation and server verification remain required.
4. Model SDK loading, connecting/QR, cancellation, rejection, expiry, configuration/network errors, stale callback suppression and connector switching independently of auth/session state. Never substitute a generic custom QR or another wallet under a selected wallet label.
5. Inventory exact runtime relay/RPC/assets endpoints and disclosures per SDK; disable optional telemetry and use a narrow CSP. Configure browser-public project IDs/RPC credentials with origin restrictions where supported. Never expose backend auth secrets.
6. Add meaningful tests for installed-provider precedence, actual SDK invocation, real SDK-generated QR URI/display events, absent configuration, SDK rejection/network failure, close/reopen/switch races, wrong-wallet selection and SIWE-required sessions. Run full verify, independent review and the named real-wallet/device matrix before claiming compatibility.

Decision gate: existing approved story explicitly excludes WalletConnect connectors/project IDs/remote-wallet relay; the user has now requested wallet SDK QR behavior, but has not yet resolved the WalletConnect dependency for Rainbow/Trust. A clarification is pending. This is a material external-service/approved-AC boundary under AGENTS.md (“Pause for decisions that affect product outcomes, contract, privacy/security posture…”). No SDK runtime change or public deployment is made before that answer/configuration.

Primary sources:
- MetaMask overview: https://docs.metamask.io/metamask-connect/
- MetaMask/wagmi: https://docs.metamask.io/metamask-connect/evm/quickstart/wagmi/
- Coinbase published package: https://www.npmjs.com/package/@coinbase/wallet-sdk/v/4.4.0 (tarball README and exported API inspected; no package installed)
- Rainbow adapter: https://github.com/rainbow-me/rainbowkit/blob/main/packages/rainbowkit/src/wallets/walletConnectors/rainbowWallet/rainbowWallet.ts
- Trust mobile integration: https://developer.trustwallet.com/developer/develop-for-trust/mobile
- Rabby integration: https://rabby.io/docs/integrating-rabby-wallet
- RabbyKit dependencies: https://rabbykit.rabby.io/docs/install

## Direct native wallet entry revision

The user explicitly requested removing the chooser and opening native SDK QR UI directly from desktop homepage wallet icons. Resume this existing IN_PROGRESS story; preserve human approval metadata. Remove the list/detail/back chooser, retain individual matching-extension selection on the homepage, enable MetaMask native UI (analytics disabled) and preserve Coinbase native popup. Hide WalletGate dialogs during native SDK connection; show SIWE review only after connection. Keep custom phone approval as its own homepage action. Use the existing response nonce through MetaMask/Stencil's supported csp-nonce meta tag; do not weaken CSP. Verify extension precedence, no chooser, cancellation/focus, signing, stale attempts, custom QR regressions, and the full verification entry point. Native wallet app pairing still needs physical devices.


## Theme control and adaptive desktop refinement — 2026-11-05

User requested a visible light/dark control and larger adaptive desktop content. Implement AC-17 within this existing approved story, leaving its existing device-verification blocker recorded. Use accessible pressed buttons for System / Light / Dark; default to system and keep choice in page memory (no new storage/privacy policy). Theme state belongs to the control, so auth controllers and active attempts remain mounted. Grow card width from 440 to 600px with viewport-based typography, padding and wallet targets; retain mobile gutters and reflow. This explicit user request supersedes typical narrow-card design guidance. Verify live system changes, explicit override, keyboard operation, active SIWE preservation, desktop growth, 320px and zoom-equivalent reflow, both-theme accessibility, then run full verify.sh. Review the final diff in a fresh pass; retain BLOCKED until existing physical-device requirements are met.


## Compact theme toggle revision — 2026-11-05

User explicitly replaced the System/Light/Dark choices with one sun-icon button, matching the network badge’s visible height and toggling light/dark. This supersedes the three-choice UI-contract guidance. Keep system following until the first manual choice, page-memory-only preference, shared tokens and isolated auth state. Use a dynamic accessible action label and native keyboard behavior; retain a 44px invisible hit area around the compact visible button. Update existing theme regressions for the new approved interaction, verify matching badge dimensions at desktop/mobile sizes, preserve auth/QR regressions, run verify.sh and fresh self-review. Broader physical-device blocker remains.


## Text W branding revision — 2026-11-05

User explicitly requested replacing the website’s PNG icon with “W” while keeping walletgate.png. Update the header mark and its existing light/dark browser assertions; preserve the adjacent WalletGate accessible name and existing responsive footprint. AC-16 records the approved revision; historical logo notes describe previous scope. Check the source PNG checksum before/after, run verify.sh, inspect the built preview and review the narrow diff. Retain the broader story’s existing physical-device blocker.


## Human review update — 2026-11-05

Manual accessibility checks are now completed by user report, and the user explicitly gave business acceptance. Do not ask for that acceptance again. Remaining closure work is to collect the separately required real-wallet/Android/QR results and versions, resolve any reported failures, and obtain successful CI for the corresponding implementation commit. Keep BLOCKED until those engineering facts are available; do not infer device-test success from acceptance. See evidence.md and the story's human review update.


## Revised desktop verification scope — 2026-11-05

User confirmed desktop MetaMask/Coinbase connect/sign/reload/logout pass and explicitly excluded the other three wallets from required physical verification. Update AC-02 and the current matrix/checklist; keep their icons, existing behavior and automated regressions. No WalletConnect project ID or new runtime work is needed. Earlier Rabby physical-test requirements are superseded; Android/custom QR and corresponding-commit CI remain outstanding. Record user-reported results separately from agent-executed checks and do not invent Coinbase version/connection path.


## Wallet ordering revision — 2026-11-05

User requested Coinbase second, immediately after MetaMask. Reorder the shared shortcut array to MetaMask → Coinbase Wallet → Rabby → Rainbow → Trust Wallet, preserving connector IDs and remaining relative order. Update the existing test fixture order and AC-01. Run default verify.sh and smoke-check rendered preview order. No new behavior or verification scope change; existing Android/CI gaps remain.


## Android Coinbase connection recovery — 2026-11-05

User confirmed the native SDK's Chrome popup opens Coinbase but no connection occurs. Do not misclassify this as a missing signature approval. Under existing connection-recovery AC-06/14, offer an explicit Android-only in-app-browser recovery link during pending native Coinbase connection. Use Coinbase's documented `https://go.cb-w.com/dapp?cb_url=<encoded page URL>`; retain SDK direct connection as the initial attempt and desktop behavior. Explain that the in-app session completes inside Coinbase, cancel stale SDK attempts when leaving, and retain explicit SIWE review/sign. Do not patch SDK internals, transfer cookies or enable smart-wallet/passkey login. Verify correct encoded destination, no session/challenge merely from handoff, desktop absence, installed-provider precedence/signing, cancellation and full verify.sh. Real Android app-link behavior remains a required manual retest; no device-success claim from browser emulation.

Source: Coinbase's archived official developer page https://main.d39g7xymw2r1c0.amplifyapp.com/wallet-sdk/docs/deep-link (dapp-browser Universal link section, last updated 2024-03-26), cross-checked with current same-device app-explorer support guidance. Current docs redirect older deep-link URLs to the SDK overview. The app-browser link remains a candidate recovery pending physical test, not a guaranteed Chrome remote-connection fix. Link navigation discloses the current page URL to Coinbase's app-link service as the existing approved wallet-owned service boundary; current sign-in URL carries no credentials.


## Official-source trust correction — 2026-11-05

User explicitly requires official, trusted SDKs/documentation. Current docs.cdp.coinbase.com deep-link URL redirects to its overview; help.coinbase.com documents same-device app opening but not the exact custom-link syntax. The AWS-hosted preview's ownership/current support was not independently established, so it must not justify runtime behavior. Remove the just-added custom app-browser link and URL construction; replace with manual in-app recovery guidance from current official help. Keep the official Coinbase package and existing desktop/injected behavior; do not migrate to smart-wallet/passkey SDKs without approved scope. Update browser tests to verify no custom link, no unauthenticated session/challenge, cancellation/focus and retained installed-provider SIWE. Run verify.sh and public smoke. Earlier app-link plan/evidence is historical and superseded by this correction; no claim that the preview is malicious or that the official legacy SDK is counterfeit.


## Official Coinbase repository/demo SDK revision — investigation, 2026-11-05

User explicitly requests using https://github.com/coinbase/coinbase-wallet-sdk and its official demo for connect/sign when no Coinbase extension exists on desktop or Android Chrome, without custom app links. Research found latest published npm release is 4.4.0 (already installed and used for fallback). Repository HEAD eaca0ce913a1ea14aff0dbfae414825a31fc7a3c declares development 5.0.0; official demo uses HEAD and sdk.evm.getProvider(), not the published 4.4.0 sdk.getProvider(). Do not blindly substitute APIs or claim an SDK integration absent when it already exists.

Concrete prospective adapter: initialize the explicitly selected official SDK; use its EIP-1193 provider for eth_requestAccounts; preserve wagmi connector/account handling; request a server-bound SIWE challenge only after connection/mainnet checks; use personal_sign with UTF-8 hex message and chosen address; verify server-side and issue a session only on valid proof. Keep injected Coinbase priority, cancellation/stale-attempt guards and custom-link removal. For a development SDK build, pin the reviewed upstream commit, disable telemetry explicitly, document source/build/reproducibility and inspect runtime endpoint/CSP changes; do not use moving master as a dependency.

Decision gate: the development demo's default connection is an account popup, not evidence of Android native EOA app signing. Its typed Preference has no documented eoaOnly option; transport factory unconditionally uses popup transport, while walletlink2/index.ts is a placeholder. The current story AC-07/non-goals require mainnet EOA-only authentication; server verifyMessage uses local EOA cryptographic recovery and does not implement contract-wallet verification. Asked whether to preserve EOA-only or expand scope for Coinbase smart wallets. Do not change verifier/account policy, install an unreleased dependency as a supposed mobile fix, enable passkey-independent login, or claim Android support before resolving that scope boundary. Current runtime remains unchanged during this investigation. If smart-wallet support is explicitly approved, detail server SIWE contract-wallet verification and RPC/chain policy separately before coding it.


## Stable Coinbase SDK execution — 2026-11-05

User selected EOA-only and latest stable SDK, resolving the previous scope gate. Confirm registry release/integrity/repository; pin @coinbase/wallet-sdk exactly 4.4.0 with lockfile integrity preserved. Retain official 4.4.0 getProvider API, eoaOnly and mainnet, extension-first selection, SDK eth_requestAccounts plus reviewed personal_sign. Improve Coinbase-specific failure recovery text (do not direct Coinbase failures to MetaMask). Add browser tests using the actual published/bundled SDK, intercepting only Coinbase popup/relay transport with simulated wallet responses and real ephemeral EOA signatures. Cover desktop and Android no-extension authentication, pre-sign session absence, rejected/invalid proof and cancelled/stale attempts where relevant. No custom app links, dev SDK or upstream patches. Run focused and full verify.sh, fresh review and public native-popup smoke. Physical Android route remains unverified even if the simulated-transport suite passes.


## Isolated official SDK 5.0.0 trial — 2026-11-05

User identified sdkVersion=5.0.0 in the official demo popup and explicitly requested finding/trying it. This authorizes an isolated development-version experiment, not a smart-wallet policy change or an automatic main-app migration. Build official source at eaca0ce913a1ea14aff0dbfae414825a31fc7a3c in a temporary directory; keep main package/lockfile untouched. Disable telemetry. Test actual browser popup version/origin on desktop and Android profiles, account lookup without a popup, targeted upstream request/provider tests and an isolated EOA-only proof verifier. No account login/creation, private credentials or real signature is available; do not claim real EOA connection/signing from popup rendering or unit simulations. Preserve a source/lockfile-pinned reproduction script, exact build failures/toolchain corrections and screenshots in the existing evidence record. Main story remains BLOCKED on outstanding device/CI evidence.


## User-requested return to Coinbase 4.4.0 — 2026-11-05

User cancelled the application SDK 5 migration and requested 4.4.0. Restore only this migration's package, provider API, mainnet-wrapper change, verification-copy, SDK pending-copy, CSP/style and tests; preserve all pre-existing user/implementation changes and isolated research. Use pre-migration package snapshots and prior stable source hashes as restoration evidence. Remove the just-added SDK 5 vendor package, reinstall stable dependencies without lifecycle scripts, rebuild, run verify.sh, and smoke-test sdkVersion=4.4.0 on the existing public preview. Retain existing story device/CI blocker; do not continue SDK 5 work without a new request.


## Remove Continue-with-wallet connection screen — 2026-11-05

User explicitly requested removing the Continue with XX page on MetaMask/Coinbase icon clicks. Under revised AC-14, suppress the WalletGate modal while any selected connector is connecting/preparing a challenge, not only native SDKs. Keep a small inline status and cancel action, delegate native wallet UI to SDKs, then show a directly named SIWE-review dialog only when its server message exists. Remove Continue-with wording and duplicate review heading; retain error/retry, explicit signature approval, phone QR flow, focus and stale-attempt guards. Add delayed-challenge cancellation/retry tests for MetaMask/Coinbase proving there is no intermediate modal and no authentication/signing from icon click alone; run full verify.sh and public SDK smoke. Stable Coinbase 4.4.0 remains unchanged.


## One-card sign-in revision — 2026-11-05

User explicitly requested replacing the WalletGate review popup with inline stages, exact headings “2 Review and sign” and “3 Signed in”, and stable card dimensions. This supersedes the prior review-dialog presentation and focus trap requirement for this flow. Keep explicit sign/cancel, phase/error/retry, full scrollable SIWE message, verified address/session expiry/signout, and separate wallet SDK prompts. Move custom QR into the card as well. Refactor WalletDialog into WalletFlow, preserve connector/race guards, and focus the heading on stage changes plus the originating trigger on cancellation. Test both themes at 320/1440px for no modal/navigation, constant dimensions, no session before proof, keyboard focus, contrast/a11y and verified success; retain QR cancellation/security and wallet-routing regressions. Run full verify.sh and inspect captured review/success screenshots. No server/auth policy or Coinbase 4.4.0 change. Existing physical-device and CI blockers remain; no renewed human acceptance request.

## Clean intentional logout — 2026-11-05

User reports wallet-change warning after signout. Under existing AC-06/07/14 recovery and logout criteria, distinguish the app's deliberate connector disconnect from an unexpected wallet/account/network change. Reuse the generation-bound expected-disconnect marker around logout, clear it in finally, and preserve unexpected-change invalidation. Regression: sign out directly after authentication without reloading (connector remains connected); assert server session invalidated, initial card shown and zero alerts in both themes/widths. Retain reload/logout/fresh-login and genuine account/network change/stale signature tests. Run default verify.sh, preserve existing story/acceptance metadata and device/CI blockers.


## Phone shortcut and compact Step 1 — 2026-11-05

User explicitly requested removing Trust Wallet, replacing its fifth icon with a phone icon, and opening the “Use your phone” popup on click. This supersedes only custom QR’s previous inline presentation; review/success stay inline. Reuse the local Radix Dialog primitive with title/description, focus trap, Escape/close/cancel and trigger focus restoration. Keep QR generation/polling/cancellation and session proof unchanged. Place Step 1 retry/network/cancel/back controls in a compact horizontal row, using concise visible text with full accessible action labels. Remove the separate phone text button. Keep initial/review/success card size at normal content lengths; allow Step 1 long recovery to grow rather than hide information or show an inner scrollbar. Preserve assets and Coinbase 4.4.0. Update the visible wallet matrix tests (Trust-specific shortcut tests are superseded, but retain the Trust compatibility-flag anti-substitution case), popup keyboard/theme/QR security tests and no-scrollbar/one-row checks at 320/1440px. Run default verify.sh and visual/public-preview smoke. Existing device/CI blockers and prior human metadata remain unchanged.


## External errors and compact footer spacing — 2026-11-05

User explicitly requested moving the separate red message box outside the card, displaying it only on error, and reducing the excessive content-to-footer space. Move auth.error to an alert sibling directly below the card, sharing its responsive width, and link the card with aria-describedby only when that alert exists. Keep recovery buttons inside their short existing row. Prevent the initial/success content area from stretching; center the compact content stack within the existing normal card dimensions, retaining bounded SIWE review scrolling. Phone-specific QR/approval errors stay with their popup/phone context. Verify absence when idle/cleared, outside placement, matching width, unchanged card height on error, compact footer gap at 320/1440px and both-theme review/success/a11y/security regressions. Run focused tests, visual inspection, verify.sh and public-preview smoke. Existing device/CI blockers and human metadata unchanged.


## Compact Android layout — 2026-11-05

User reports excessive margins/white space in Android Chrome. Under the explicit mobile-presentation revision, reduce <=767px main gutters to 12px, card padding to 20×18px, header/content spacing to 16px, and use a viewport-responsive 500–560px normal card height instead of the desktop 640px minimum. Use one header row where >=360px allows it, while preserving narrow fallback, readable typography, privacy copy, 44px wallet targets and consistent stage dimensions. Desktop scaling unchanged. Verify simulated touch/mobile Android Chrome viewports 320×740, 390×720 and 412×915 in light/dark: no idle document overflow, small header/card gap, compact card, target size, axe and screenshots. Retain stable review/success and external-error tests. Run verify.sh and public responsive smoke; real Android browser chrome/in-app behavior still needs physical verification. Existing lifecycle/device/CI blockers remain.


Visual refinement in the same Android revision: the first 500–560px fixed-height mobile version passed 66 tests but screenshots still showed unnecessary blank bands within the card. To satisfy the user's whitespace request, use content-fit heights for mobile choose/success and bounded height only during SIWE review. This supersedes mobile equal-height assertions, while desktop fixed dimensions and shared widths remain tested. Add checks that top/bottom inner padding stays <=22px and idle mobile card height <=460px, with page fit and target/a11y checks preserved. A recovery action row may add up to 60px to the mobile card; the error text remains outside it.


## Friendly disconnect and duplicate pending requests — 2026-11-05

User asks what signout means and whether wallet connections can close cleanly without accumulating pending connections. Explain server session termination vs connector/wallet permissions. Existing logout already disconnects via wagmi; installed injected connector performs best-effort account-permission revocation, native SDK adapters call their supported disconnect methods. Do not claim wallet-owned approval windows can always be remotely dismissed. Under existing AC-05/06/07, block duplicate wallet selections synchronously during provider discovery/connection, disable all wallet/phone shortcuts while connection/cleanup is busy, retain explicit Cancel, and keep busy true after auth reset until connector disconnect returns. Preserve attempt-generation cancellation/stale-result protection and expected-disconnect warning suppression. Test double-click before React renders, held challenge/cancel/retry, and connector cleanup before buttons re-enable for MetaMask/Coinbase simulated injected providers; retain native SDK regressions. Run full verify.sh. No new token/transaction permissions, wallet API or auth-policy change; existing physical-device/CI blockers remain.


## Human device results / deferred Coinbase route — 2026-11-05

Record the newly reported Android wallet-browser and desktop-originating phone-QR PASS outcomes separately from automated execution. Exact Android wallet/device/version details remain unspecified. Stop treating those flow outcomes as unreported. Android Chrome → Coinbase app is still a user-reported failure and is explicitly deferred pending Coinbase SDK 5.0.0 release; do not upgrade 4.4.0, research a replacement, or claim the release will fix EOA app handoff. Next engineering closure is commit plus green corresponding-commit CI, with environment metadata added when available. Preserve BLOCKED and all human approval/acceptance metadata until technical gates are satisfied; no repeat business acceptance question. Documentation-only update; validate harness/metadata and diff, retain prior full 68-browser-test results.

## Review necessary commit scope; no commit authorized — 2026-11-05

User explicitly says do not commit and asks why so many files/images and whether only necessary files can be included. Do not commit under the current instruction, and do not stage all working-tree changes. Inventory/review only: prepare an explicit 56-file source/test/config/story/doc candidate list in local artifacts/necessary-files.txt, with excluded-files.txt and commit-scope-audit.json. Generated captures/logs/experiments stay local and are ignored via .gitignore. Preserve unused walletgate.png and Trust SVG on disk; exclude them and the modified historical US-001 screenshot from this proposed commit. Leave earlier unrelated AGENTS/skill/README guidance changes and optional components.json out. Include checker/test support for US-001-01 IDs because CI requires it. Verify HEAD plus only selected files in an isolated source checkout with installed dependencies reused. No main-index staging, commit, push, deletion, release or CI success claimed.


## Explicit commit authorization — 2026-11-05

The user subsequently instructed: “please commit your proposed files set.” This supersedes the previous no-commit restriction only for the reviewed 56-file manifest in local artifacts/necessary-files.txt. Verified all selected non-plan/evidence contents are identical to the source set that passed isolated verification (11 harness, 83 API/SDK, 68 browser tests); only these narrative records changed afterward. Stage and commit exactly that set, exclude generated outputs and unrelated changes, and do not push or claim CI success. Existing story BLOCKED/acceptance metadata remains unchanged pending corresponding-commit CI.


## CI clean-install portability failure — 2026-11-05

CI run 41990581676 failed npm ci on implementation SHA 0c53ea9416c634f8a51d63bf2bb187fbe681c194 before product checks, with npm's “Exit handler never called!” message. Runner used Node 22.23.4/npm 10.9.9. Found 403 lockfile tarballs tied to mirrors.tencentyun.com (resolves to link-local 169.254.0.3 here), despite 244 other official registry URLs. Normalize only those resolved fields to HTTPS registry.npmjs.org and set the repo registry explicitly; preserve all versions, integrity hashes and dependency edges. Add pre-install lock-source verification to CI and normal verify.sh so this environment-specific mirror cannot recur silently. Test checker against original/fixed locks, then fresh npm ci with npm 10.9.9, lifecycle scripts enabled, in isolated source checkout with independent node_modules/cache. Prior verification reused dependencies and did not exercise clean installation. Run full suite using the fresh install, commit/push only necessary CI repair files under the existing main-push authorization, and observe actual same-SHA CI. No app behavior or SDK version change; unrelated local edits/generated outputs remain excluded. Keep BLOCKED until the CI gate is actually satisfied; preserve human metadata and prior reported device/acceptance decisions.


CI repair local result: source-only registry correction passed a genuinely fresh npm 10.9.9 install with native scripts and all 11/83/68 checks in an independent checkout. Local /tmp quota was handled through separate temporary/cache/header directories, without changing application/CI semantics. Mark local QA candidate and push only eight necessary repair/evidence files; verify replacement GitHub Actions on that SHA before claiming CI success. Keep human acceptance metadata untouched and Coinbase Android Chrome handoff deferred.
