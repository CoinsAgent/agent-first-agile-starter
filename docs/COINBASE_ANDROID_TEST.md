# Coinbase Wallet Android test procedure

This is a manual test procedure for the current WalletGate build. On 2026-11-05 the user reported the Coinbase Android in-app browser test passed; Android/app versions and detailed negative-case outcomes were not supplied. The user subsequently reported Android Chrome SDK app opening without establishing a connection; that real-device issue remains unsuccessful. In the latest update, the user confirmed Android wallet-browser success and the desktop phone-QR test passed, and explicitly deferred Android Chrome → Coinbase app work while waiting for Coinbase SDK 5.0.0 release. Keep the runtime at 4.4.0; this does not claim a release is available or that it will fix the route. Exact Android wallet/device/version details were not provided. Coinbase Android is not automatically added to US-001-01's required device matrix by this guide.

## Compatibility context

Checked official sources on 2026-11-05:

- Coinbase's [Connect or sign in to an app with the Base app](https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued) says connections from a different device, including the previous QR workflow, are no longer supported. It directs users to the app explorer or supported same-device handoff.
- Coinbase's [SDK overview](https://docs.cdp.coinbase.com/coinbase-wallet/overview) now recommends Base Account SDK while a next-generation Coinbase Wallet SDK is pending. This differs from this repository's installed `@coinbase/wallet-sdk` 4.4.0.
- WalletGate currently requests `eoaOnly`, Ethereum mainnet, and a server-verified SIWE signature. Passkey/smart-wallet login is outside the current contract. Do not change account type or treat a passkey prompt as a passing EOA test.

The app may be labeled Coinbase Wallet or Base depending on the version. Record the actual installed name/version and account mode. An explorer/injected provider usable by this build is not guaranteed in every version.

## Stable SDK selected for this build

The user explicitly selected **EOA signatures only** and the latest stable Coinbase Wallet SDK. As checked on 2026-11-05, npm's latest stable is **4.4.0**, now pinned exactly in package.json/package-lock.json. Do not copy development 5.0.0's `sdk.evm.getProvider()` into this stable integration.

The stable integration uses the official package API:

```ts
const sdk = createCoinbaseWalletSDK({
  appName: 'WalletGate',
  appChainIds: [1],
  preference: { options: 'eoaOnly' },
});
const provider = sdk.getProvider();
await provider.request({ method: 'eth_requestAccounts' });
// After the user reviews the server-generated SIWE challenge, wagmi calls
// personal_sign through this same provider, with [hexMessage, selectedAddress].
```

A detected Coinbase extension takes priority. Without one, both desktop and Android Chrome use this SDK's connection UI, then explicit SIWE signing. No custom app link or smart-wallet/passkey flow is added. Server verification is still required before authentication. The official repository is https://github.com/coinbase/coinbase-wallet-sdk ; the HEAD demo runs development code and is not the stable package API reference.

Automated integration checks run the unmodified 4.4.0 SDK with simulated popup/relay/wallet endpoints, real ephemeral EOA signatures and the real local WalletGate server. They cover desktop/Android user agents, session absence before signing, connect/sign/reload/logout and signature rejection. They do not test an installed Android wallet or prove that Coinbase's live relay/app returns the connection result.

## Account lookup versus interactive connection

Live demo comparison on 2026-11-05 used a clean, extension-free desktop headless Chromium context:

- Official demo **eth_accounts**: returned `[]`, no popup observed.
- Official demo **eth_requestAccounts**: opened `https://keys.coinbase.com` with **Sign In / Create Account**, without an extension. No account login or signature was attempted.
- Published stable **4.4.0**, EOA-only, before connection: `eth_accounts` rejected with code **4100**, requiring `eth_requestAccounts` first.

WalletGate correctly uses `eth_requestAccounts` for interactive connection and `eth_accounts` for already authorized account lookup. Its existing button already opens the stable SDK popup without an extension. The demo runs development SDK code and its different login screen is not proof of a supported stable EOA-native mobile route. Do not change EOA-only policy or substitute the passive lookup method to imitate the demo's screen.

Primary source for development behavior: [Coinbase disconnected request handler](https://github.com/coinbase/coinbase-wallet-sdk/blob/eaca0ce913a1ea14aff0dbfae414825a31fc7a3c/packages/wallet-sdk/src/core/namespaces/eip155/eip1193/disconnected.ts). Its eth_accounts branch returns an empty list; eth_requestAccounts starts connection. The demo assigns its own SDK provider to window.ethereum, so that object alone does not demonstrate an installed extension.

## Test on Android itself

1. Record Android version, device model, wallet app name/version, and whether an existing EOA account is available. Use a test account; no funded account is needed for this signature-only flow.
2. Open the wallet app's browser/explorer, if present. Enter `https://walletgate.beeswarm.dev/` directly. Do not use the Coinbase exchange application's trading screen.
3. Tap the **Coinbase Wallet** icon (second, after MetaMask). Approve the wallet connection. If the page opens a remote QR/popup instead of using the app provider, record that observation; do not assume injection worked.
4. Check the selected Ethereum address and SIWE message, then choose **Sign message & continue** and approve the message signature. This flow should not ask for a transaction, payment or token approval.
5. Confirm WalletGate displays the correct lowercase address only after server verification.
6. Reload inside the same wallet browser. Confirm the authenticated session persists. Sign out, reload again and confirm it stays signed out. A new sign-in must require a fresh signed message.
7. Repeat once while declining the signature, and once while cancelling connection. Confirm no session is issued, recovery is clear and retry succeeds.

If there is no browser/explorer, only a smart-wallet/passkey route, or a provider/connection error, record the exact step and error as a compatibility gap. No successful EOA support should be inferred.

## Optional Android Chrome handoff test

The current Coinbase button already uses the native Coinbase SDK when no injected provider is available. Installed SDK 4.4.0 includes Android detection and wallet deep links; this is not proof of compatibility with the current app version. Coinbase’s current same-device documentation describes handing the page into the app explorer. Distinguish:

- **Open in wallet browser:** Chrome opens the page in the wallet app; connection, SIWE review/sign and authentication happen there.
- **Sign for Chrome:** the wallet signs for a pending SDK request and the originating Chrome page completes authentication. This remains separately unverified; browser cookies are not shared automatically.

A Coinbase icon click starts connection. Signature approval remains an explicit later action after reviewing the SIWE message, even if the app opens successfully.

Open the same HTTPS URL in Android Chrome and tap Coinbase Wallet. If the installed SDK offers an app-opening option, test it and repeat the review/sign/verification steps above. Record whether the resulting session belongs to Chrome or the app's browser; cookies are not assumed to transfer between them. This is a separate test from opening the site directly in the wallet app.

Do not use desktop Coinbase QR scanning as the recommended current test route: Coinbase's current support guidance discontinues that connection method. SDK QR rendering and older setup articles are not proof of current phone pairing/signing support.

WalletGate's separate **Use your phone** button implements a different, application-owned approval protocol. Its currently approved phone route is MetaMask; this guide does not claim Coinbase supports it.

## App opens but there is no SIWE signature prompt

The first **Open Coinbase Wallet** action is for connecting the wallet. WalletGate does not issue a signature request at that point.

1. If Coinbase shows a connection approval, approve it.
2. Return to the **original WalletGate Chrome tab**, not just the Coinbase SDK popup.
3. Once connected, WalletGate displays the SIWE message. Review it, then tap **Sign message & continue**.
4. Approve the signature in the wallet app, then return to the original browser tab to check server verification.

If Coinbase only opens its home screen without connecting, return to the original WalletGate tab and cancel the pending attempt. Open the wallet app's browser/explorer manually and enter the WalletGate URL, then use the in-app flow above. This manual route is supported by [Coinbase's current official help](https://help.coinbase.com/en/wallet/other-topics/mobile-app-sign-in-discontinued) and already passed by user report.

No custom app-opening link is offered by WalletGate. The previously added `go.cb-w.com/dapp` link was removed because its precise syntax could not be verified in current documentation on Coinbase's official domains. An AWS-hosted documentation preview is not sufficient authority for implementing that route. Coinbase's old [official deep-link documentation URL](https://docs.cdp.coinbase.com/wallet-sdk/docs/deep-link) now redirects to its SDK overview, which does not document that custom URL. The official same-device help flow does not itself specify the URL parameters to implement it.

If WalletGate remains connecting after an approved connection, record the app screen and Chrome status separately. The installed SDK waits for `eth_requestAccounts` before WalletGate creates the challenge; opening the app alone cannot advance the flow.

Coinbase SDK [issue #1883](https://github.com/coinbase/coinbase-wallet-sdk/issues/1883) reports Android Chrome EOA connections remaining pending after approval when the browser is backgrounded. It is an open third-party report, not a confirmed diagnosis of this deployment; the reporter's proposed internal SDK patches are not applied here. Obtain Android/Chrome/wallet versions and original-tab status before selecting a fix. The already user-tested in-app browser route remains an alternative.

## Results to report

- Android/device, wallet name/version/account mode; Chrome version if testing handoff.
- Exact route: in-app browser or Android Chrome handoff.
- Connect / SIWE review / sign / correct address / reload / logout / decline / cancel: pass or fail individually.
- Any error text, failing step and final browser where the session appears.

Do not share seed phrases, private keys, signatures, session cookies or QR pairing data. Append actual outcomes to `work/US-001-01/evidence.md`; documentation and SDK UI rendering are not test results.


## Authorized development 5.0.0 experiment

The user subsequently requested a separate trial of the demo's 5.0.0 version. A pinned official-source build and an isolated local page now exist in [the experiment directory](../work/US-001-01/experiments/coinbase5/README.md). Desktop and Android user-agent trials reproduced the real Coinbase onboarding popup with sdkVersion=5.0.0. Disconnected eth_accounts returned [] without opening it. No real account was connected or signed; EOA-native compatibility remains unverified. WalletGate's main app is still pinned to stable 4.4.0 with EOA-only server verification. The trial does not authorize smart-wallet support or a production dependency upgrade.


The user later requested an SDK 5 application migration, then explicitly reverted it. The current application is restored to **4.4.0** with `sdk.getProvider()` and `eoaOnly`; the SDK 5 experiment remains separate historical research.
