# Run the US-001 authentication slice

This is a self-hosted evaluation of wallet sign-in. Application registration,
OIDC consent/token issuance and production deployment are outside US-001.

## Prerequisites and first startup

Use Node.js 22.22 or later in the Node 22 LTS line, npm, and a local filesystem
for SQLite. A compiler toolchain may be needed if your platform has no prebuilt
better-sqlite3 binary. Install dependencies using the committed lockfile:

```bash
npm ci
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `BETTER_AUTH_SECRET` in your local `.env` file.
Do not share or commit it. Keep the same secret and SQLite database across
restarts to preserve sessions. No RPC subscription, funded wallet, private key
in the server configuration, or paid hosted service is required.

Default `.env` configuration:

```dotenv
TRUSTED_ORIGIN=http://localhost:3000
PORT=3000
DATABASE_PATH=./data/walletgate.sqlite
BETTER_AUTH_SECRET=<your locally generated value>
```

```bash
npm run build
node --import tsx scripts/init-database.ts --database "$(pwd)/data/walletgate.sqlite"
npm start
```

Open `http://localhost:3000` in Chrome with MetaMask. The server serves the built
frontend, so rebuild after frontend changes. `npm run dev` starts the same local
server; it also requires an existing build. Run the initialization command once
against the empty database selected by DATABASE_PATH (the command requires its
absolute path and does not load .env). It applies the pinned initial schema;
it refuses an existing or partial schema without changing its tables/data.
Normal startup requires that initialized database and never creates/updates
tables. Restarting the service preserves current users and applications. There
is no automatic schema upgrade. This evaluation starts with a fresh database.
The database, WAL files and `.env` are ignored by Git. Use a test wallet; keep its
keys entirely inside your wallet software.

## Sign in and sign out

1. Select Ethereum Mainnet in MetaMask, or approve the Ethereum Mainnet switch requested when connecting. MetaMask can select a different network for each site.
2. Choose **Connect MetaMask** and approve the connection. Connection alone does
   not authenticate you. If a connection remains on another network, choose **Switch to Ethereum Mainnet**, approve the change in MetaMask, and review the new message.
3. Review the displayed SIWE message: address, trusted host/URI, chain ID 1,
   issued time, nonce and expiration. Choose **Sign message & continue**, then
   approve the signature in the wallet. No transaction or payment is requested.
4. Confirm the verified lowercase address, reload, then choose **Sign out**.
   Reload again to confirm that a fresh SIWE signature is required.
5. Try rejecting a signature, cancelling review, changing accounts while reviewing,
   or selecting an unsupported chain. No session should be created; follow the
   error's recovery action and start a new attempt.

Each challenge is valid for strictly less than 5 minutes and is tied to the
browser attempt. A retry replaces the prior challenge. Verification attempts
consume the challenge before signature verification; a rejected signature needs
a new challenge. Sessions last exactly 1 hour from authentication with no sliding
renewal. Logout revokes only the current browser session server-side. Session
and attempt credentials use HttpOnly cookies; HTTPS also enables Secure cookies.
Server responses expose the verified canonical address as both `userId` and
`address`, plus session expiry; they expose no session token or placeholder email.

## Address-based users and explicit local data reset (US-001-06)

Better Auth SIWE stores `user.id` as the verified lowercase Ethereum address.
One address resolves to one user/owner; repeated sign-ins and browser/QR paths
reuse that user. Different addresses remain separate users even if controlled
by the same person or wallet app. An owner can register multiple independent
applications; their client IDs and credentials remain separate from the user ID.
The public address is never a session secret. Supported wallets, mainnet EOA
scope, challenge validity and absolute session/logout policy remain unchanged.

### Native application ownership (US-001-07)

New registrations use Better Auth/core/provider 1.7.15's default user ownership:
`oauthClient.userId = session.userId = user.id = verified lowercase address`;
`oauthClient.referenceId` is null. Client IDs remain independent of that address.
Owner list/detail queries, submission reconciliation and the 20-client quota all
use this user relationship. SIWE privileges, five registration attempts per fixed
minute, hashed credentials and one-time secret disclosure remain unchanged.

This version requires a separate fresh database initialized with its current
schema. Startup checks ownership rows and the exact pinned user-based quota guard
without writing schema or user/client data. It refuses reference-owned, unowned,
mixed-owned or orphan clients and missing/older quota guards, including an empty
database initialized by the previous version. Manually customized guard SQL is
also refused. It never converts existing clients or silently serves an empty list
for their owners. Keep the existing database intact, explicitly initialize a
different empty target with the command above, then select that target using
`DATABASE_PATH`. The initializer refuses existing/partial targets.

The identity reset below deletes local development/test data; it does not update
an older quota guard and cannot make an incompatible schema usable. This story
does not authorize resetting or replacing a shared/deployed database. Any live
database switch or release requires separate authorization. No existing-client
conversion procedure is provided.

An incompatible legacy database causes startup to refuse with guidance. Startup
does not automatically delete or migrate it. This story provides no data-preserving
migration: for a **local development/test database only**, inspect the exact target,
stop every server/process using it, and explicitly invoke:

```bash
node --import tsx scripts/reset-local-data.ts \
  --database /absolute/path/to/local-test.sqlite \
  --environment development \
  --confirm DELETE-LOCAL-USER-DATA
```

Use `--environment test` for a disposable test database. There is no default
target, environment-file loading, or implicit confirmation. The command accepts
only the real absolute path of an existing regular database file; it refuses
shared/production environment values and production NODE_ENV. A local-looking
path or a development label does not prove that a database is local: inspect its
actual use before invoking. These checks are guardrails, not filesystem permissions.
Shared/production reset needs separate explicit human authorization and is not
supported by this command/story. No deployed service or database is reset by
installing, building, testing or starting the app.

The reset **permanently deletes all users, sessions, wallet/account associations,
pending SIWE challenges/nonces/QR approvals, registered applications and client
credentials**, including dependent tokens, consents, submission/rate records and
client assertions. Previous credentials and pending proofs stop working. Users
must sign in again and register their applications again; old secrets cannot be
recovered. Source code, server configuration, provider key/resource metadata and
unrelated database records are preserved. Retain an operator-controlled backup
before resetting any local data you may need; the command does not make a backup
or restore one automatically.

Deletion and generation invalidation commit atomically. A failed/busy reset does
not partially delete records; repeating a successful reset is allowed and clears
whatever user data is present in that explicitly selected database. Stop writers
first rather than retrying blindly. Existing server connections are fenced after
reset, including pending writes, and return restart-required errors; restart them
before fresh sign-in. The reset does not grant CLI sign-in: that feature is deferred.

## Android MetaMask check

Android's `localhost` refers to the phone. To test another device, run behind a
TLS reverse proxy on your own reachable test host with a valid trusted HTTPS
certificate. Set `TRUSTED_ORIGIN=https://<your-test-host>` and configure the proxy
to preserve that Host and set `X-Forwarded-Proto: https`. Keep the backend reachable
only by that proxy on the test network. Forwarded headers are not used to choose
trusted SIWE domains: the configured origin remains authoritative. Do not publish
an instance or incur hosting costs without separate authorization.

Open that URL **inside MetaMask's Android in-app browser (Explore)** and repeat the flow
above. The page waits briefly for MetaMask's injected provider and requests Ethereum
Mainnet for this site. Approve a network-switch prompt if shown; selecting Ethereum
in a portfolio view alone may not change the site's network. If needed, use the
page's **Switch to Ethereum Mainnet** action to retry. External Android browsers, handoff/QR flows, other wallets/chains and
smart-contract wallet verification are outside this story's supported scope.

## Verification

```bash
npx playwright install --with-deps chromium
bash scripts/verify.sh
```

The default entry point runs harness tests plus TypeScript checks, signed-message
integration tests, the production frontend build and Chromium browser tests.
Individual commands are `npm run typecheck`, `npm test`, `npm run build`, and
`npm run test:e2e` (build first). The Playwright server uses port 3100, an in-memory
database and an explicitly test-only secret. Test wallets are generated at runtime.
Do not reuse test configuration as a deployment configuration.

The browser suite injects a simulated EIP-1193 provider that makes real EIP-191
signatures. It checks flow, recovery and narrow viewports. It does **not** prove
real MetaMask extension behavior or Android compatibility. Record actual device
observations in [the delivery evidence](../work/US-001/evidence.md), including:

| Required environment | Versions to record | Required observations |
|---|---|---|
| MetaMask + Chrome desktop | OS, Chrome, MetaMask extension | Connect, message review, sign in, canonical address, reload, logout, signature rejection/retry |
| MetaMask in-app browser on Android | Android, MetaMask app / browser version | Same observations on the configured HTTPS origin |

For each environment record the origin, date, result and any failure details.
Never include seed phrases, private keys, session cookies or secrets in evidence.
Until both real environments are observed, AC-09 remains incomplete and the
story cannot be reported as QA_PASSED. Successful local checks also do not
establish CI success for a future commit or human business acceptance.

## Delivery verification cadence

Use focused checks during development and the full `bash scripts/verify.sh`
before every agent transition to `QA_PASSED`. Keep ordinary debugging
`IN_PROGRESS`; `BLOCKED` means progress cannot continue. Human approval of the
finished local result starts PR/CI; required checks still precede human merge.
PR creation/code updates trigger CI, without duplicate full verification on
pushes or merge. Human merge means acceptance, recorded locally with observed
merge provenance and included in the next approved PR. Main may show the earlier
QA status until that later merge; recover local records before the next WIP
check. See [PROCESS](PROCESS.md) for the full review and recovery rules.

## Implementation references

The installed versions are pinned by package-lock.json. The integration uses
[Better Auth SIWE](https://better-auth.com/docs/plugins/siwe),
[supported hooks](https://better-auth.com/docs/concepts/hooks),
[session configuration](https://better-auth.com/docs/concepts/session-management),
[wagmi injected connectors](https://wagmi.sh/react/api/connectors/injected), and
[viem SIWE utilities](https://viem.sh/docs/siwe/utilities/createSiweMessage).
The installed plugin's source was also inspected; its default nonce lifetime
alone does not satisfy the approved five-minute, browser-bound policy.

MetaMask documents its [per-site network selection](https://support.metamask.io/configure/networks/how-to-change-networks). Android Chrome-to-app handoff remains outside US-001; without an injected provider the page directs users to Explore.

## US-001-01: wallet choice and custom SIWE phone approval

This slice uses the existing React/Vite + wagmi 3 + viem + Better Auth application, with local shadcn/ui components (Radix Dialog variant), Tailwind v4 tokens, and the supplied `frontend/assets/walletgate.png`. Install with `npm ci`; run the existing `npm run build` and `npm start` commands. No wallet-connection vendor account or project ID is needed. Neither a vendor wallet UI kit nor WalletConnect is configured.

### Supported journeys and state

- Desktop Chrome: choose the discovered MetaMask or Rabby EIP-6963 provider using the main-page wallet-icon shortcuts or the dialog wallet list. A legacy MetaMask fallback is labeled as an extension check, not a detected-wallet claim. Discovery may show additional providers without asserting tested compatibility.
- Android: open the site inside MetaMask's browser. Android Chrome provides a documented **Open in MetaMask** link on HTTPS approval pages; manual copy/open instructions remain available if the OS does not hand off. The link uses MetaMask's documented `https://link.metamask.io/dapp/{url}` format ([MetaMask documentation](https://github.com/MetaMask/metamask-docs/blob/main/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks.md)). Physical handling of the fragment/request reference must be tested on the actual device.
- Desktop without an extension: choose **Use your phone**, scan the QR with the Android camera, open the page in MetaMask, compare the displayed confirmation with the originating desktop, connect, review the SIWE message, then explicitly sign/approve. The desktop polls its server-held request and redeems the approved proof for a Better Auth session. The phone receives no new session. This is login approval, not a remote desktop-to-phone wallet connection.

Wallet connector/account/network state belongs to wagmi. Application challenge, approval and verification state is separate; the authoritative authenticated identity comes only from `/api/session`. A phone-approved desktop may remain locally disconnected. Connecting another wallet does not silently replace an established WalletGate session.

QR requests expire exactly five minutes after server creation; phone approval and desktop completion must occur before that deadline. Local SIWE/challenge and absolute one-hour session policies remain unchanged. A new QR request replaces the old request for that initiating browser capability. The request reference is in the approval URL fragment, not the HTTP request path/query. The separate initiating-browser and phone-attempt capabilities are HttpOnly, SameSite=Strict and Secure on HTTPS. Browser-wide cookies mean another tab may replace the same pending attempt; recover by creating a fresh request. QR creation is serialized per page to prevent overlapping first responses from replacing the owner cookie.

The server issues normal SIWE nonces for phone challenges, verifies the exact expected proof before approval and atomically consumes approved requests at desktop redemption. Redemption constructs a server-only local attempt binding and invokes the supported Better Auth SIWE verification path, including its nonce consumption, provenance hook and session-cookie handling. It does not copy a phone cookie or enable a generic login endpoint. Cancel, replace and complete use conditional SQLite operations; an already-consumed request cannot be revived. Invalid signatures do not authenticate. Request/status/challenge APIs have bounded request rates and no-store responses; handle 429 by waiting before retrying. Sensitive proof data stays in server storage only until completion, cancellation, replacement or expiry cleanup on the next QR request.

### Theme and network configuration

- `frontend/styles/style.css` owns CSS variables for both themes and maps them to shadcn/Tailwind semantic utilities. The light accent is adjusted from the initial contract palette to `#5c50e8` because the original accent on the muted QR panel failed 4.5:1 text contrast. The dark accent remains `#8b85ff`. Borders were strengthened to meet rendered-control contrast requirements. System changes update the page/dialog without recreating challenges or QR requests.
- The server retains a strict same-origin CSP; per-response style nonces permit only the trusted Radix runtime style sheets. No `unsafe-inline` is enabled. The HTML is non-cacheable so the nonce in its metadata matches its CSP header.
- **RPC:** the EOA-only SIWE flow uses the selected wallet for signing/network selection and local cryptographic proof verification on the server. It requests no balances, ENS or other chain reads. wagmi's unused transport is an explicit same-origin unconfigured endpoint rather than a public RPC fallback. A later onchain feature must configure its own RPC endpoint, credentials and CSP explicitly; `/api/rpc-not-configured` is not a functioning RPC.
- **ENS:** no name/avatar enrichment is enabled. The verified lowercase address remains the identity.
- **Images:** logo is bundled locally; QR PNGs are generated locally. Wallet rows use text/initial avatars, so self-reported provider SVGs/remote icon URLs are never inserted as executable markup or fetched.
- **Wallet-owned services:** injected providers may make their own network calls outside the application page. The app's request capture cannot prove what an extension or phone wallet contacts. Get/install and MetaMask handoff links are explicit user navigations, not background analytics. No optional analytics are enabled.

### Real-device verification checklist

Automated browser tests use simulated EIP-1193/EIP-6963 providers with real ephemeral test signatures. They do **not** establish physical wallet compatibility, camera scanning or Android handoff. The user revised the required desktop matrix to MetaMask and Coinbase Wallet; Rabby, Rainbow and Trust Wallet physical verification is excluded for this story. Existing automated checks and extension-only shortcuts remain.

For physical-phone checks, use an operator-controlled HTTPS origin reachable by both desktop and phone. Set `TRUSTED_ORIGIN` to that exact origin and terminate TLS through your existing trusted local/evaluation setup. A desktop `localhost` origin is not reachable as that desktop from a phone. This story does not provision a public tunnel, production release, TLS service or paid account.

Record browser/extension/wallet/Android versions, date, exact origin, each observed result and failures (never seed phrases, signatures, cookies or private keys):

1. Install/unlock both MetaMask and Coinbase Wallet on desktop Chrome. Verify both choices appear once, choose each, review/sign, reload, log out and confirm a fresh proof is required. Change wallet/account/network during an attempt and confirm recovery.
2. With no desktop wallet extension (clean Chrome profile), create a QR request. Camera-scan it on Android, open WalletGate in MetaMask, compare confirmation context and explicitly sign. Verify only the originating desktop receives the correct address/session; phone `/api/session` remains unauthenticated unless it had an independent pre-existing session.
3. Repeat handoff from Android Chrome, including app-missing/refused/interrupted return cases and the manual open/copy alternative. Confirm the request fragment survives the actual handoff. Cancel or expire a request and confirm neither old phone links nor late signatures can sign in. Request the five-minute boundary without extending the deadline.
4. Inspect dialog/phone screens in both themes, keyboard tab/Shift-Tab/Escape, visible focus and screen-reader status, 320 CSS-pixel reflow and actual 200% browser zoom. Change system theme during connection, review and QR waiting; confirm no reconnect/new signature/request.
5. Verify the logo and QR remain legible/scannable, and check browser network records for the separately documented categories. Redact request capabilities when sharing evidence. Report unobservable wallet-owned traffic as a limitation.

Full verification: `bash scripts/verify.sh` (Oxlint, TypeScript, API tests, production build and Playwright). Automated logs/screenshots and AC results are recorded in `work/US-001-01/evidence.md`. CI and real-device outcomes must be supplied independently; local checks do not establish business acceptance.

### Wallet-icon shortcuts

The former Continue with wallet button is replaced in the same card position by five locally bundled brand icons in order: MetaMask, Coinbase Wallet, Rabby, Rainbow and Trust Wallet. Each accessible icon probes only its corresponding injected connector. A detected provider connects and enters SIWE review; absence opens the existing custom QR approval dialog. Another installed wallet is never silently selected. The QR screen continues to identify MetaMask Android as its approved phone route; these shortcuts do not establish new mobile-wallet compatibility. Static icon provenance/license is in `frontend/assets/wallets/NOTICE.md`; no wallet UI-kit runtime is included.

## Native wallet SDK icon fallbacks

For current Coinbase Android test steps and upstream QR compatibility limits, see [Coinbase Android test procedure](COINBASE_ANDROID_TEST.md). Coinbase now documents discontinuation of cross-device QR connections in its Base app; existing SDK popup rendering is not evidence of phone pairing support.

MetaMask Connect EVM 2.1.1 and Coinbase Wallet SDK 4.4.0 code is preloaded on page load. Coinbase is pinned to the exact latest stable release 4.4.0 (checked 2026-11-05), preserving EOA-only/mainnet authentication; the official development demo uses a different 5.0.0 API and is not installed. Homepage wallet icons bypass wallet selection: the matching extension connects directly, otherwise the supported native SDK opens its own connection UI. The separate Use your phone action opens custom WalletGate approval directly. Matching injected providers take priority. Absent MetaMask uses its native relay and SDK-generated URI in the native MetaMask QR modal (analytics disabled); absent Coinbase uses its native `keys.coinbase.com` scan popup with `eoaOnly` preference. Coinbase controls that popup's content, including any optional vendor download links; WalletGate shows no installation guide. A connection still requires the existing desktop SIWE challenge/review/sign/verification before Better Auth creates a session. Rainbow/Trust/Rabby remain extension-only; no WalletConnect project ID is needed or used. The separate custom “Use your phone” route is retained.

Use `npm ci` with repository `.npmrc` (`omit=peer`) so unselected optional wallet peer dependencies are resolved but not installed. MetaMask/Coinbase are explicit runtime dependencies. A scoped `@metamask/utils` → uuid 11.1.1 override fixes GHSA-w5hq-g745-h8pq; consumed v4 API is unchanged and SDK regressions run. Do not use `npm audit fix --force` or downgrade wagmi as suggested by automatic dependency traversal.

Network inventory for native fallback (new external services are wallet-owned):

| Endpoint | Purpose / disclosed data | Credentials / placement / failure |
|---|---|---|
| `wss://mm-sdk-relay.api.cx.metamask.io` | MetaMask encrypted pairing/signing coordination; client network metadata, relay identifiers/ciphertext | No dapp project ID in configured SDK; browser. Failure cannot authenticate. Optional analytics disabled. |
| `https://keys.coinbase.com` | Vendor-owned QR popup, app name/origin/chain and wallet pairing context | No project ID for EOA SDK setup; separate browser window. Vendor controls its CSP/content. Popup/service failure cannot authenticate. |
| `https://www.walletlink.org`, `wss://www.walletlink.org` | Coinbase wallet-owned relay, encrypted wallet session communication/network metadata | No configured API key; browser/vendor popup. SDK may retain wallet connection data in its own local storage, distinct from auth session. |
| `https://rpc.wallet.coinbase.com` | Coinbase SDK RPC when required by wallet; request-dependent network data | SDK-owned endpoint; browser. No independent auth proof. |
| `/api/wallet-rpc` → optional `WALLET_RPC_URL` | Explicit server-side HTTPS Ethereum Mainnet RPC; allows only `eth_chainId`, no address/signature forwarding | Optional server-only URL/key, never bundled. Missing → 503; wrong origin → 403; other methods → 400; upstream failure/wrong chain → 502. No default public RPC provider. Current QR rendering was observed without this configured endpoint. |

SDK chunks, wallet icons and generated MetaMask QR images remain local. No ENS/balance/remote asset enrichment or optional telemetry is enabled. MetaMask native UI uses the response-specific csp-nonce metadata for its trusted styles. Native MetaMask UI may show its vendor-owned extension installation option. Exact Coinbase static style hashes are generated during build for its relay UI; CSP permits these hashes and the Radix nonce without `unsafe-inline`. Vendor popup internals and installed-wallet traffic cannot be completely audited from the originating page. Physical MetaMask/Coinbase phone scan → connection → signed SIWE still requires real devices.


Stable Coinbase SDK regression coverage also includes `tests/e2e/coinbase-sdk.spec.ts`: the unmodified published SDK performs its actual popup and encrypted WalletLink request/response sequence against simulated wallet-owned services, then signs the real server SIWE challenge using an ephemeral EOA. Desktop and Android user-agent variants cover successful connection/sign-in/reload/logout and rejected signatures. These are integration simulations, not proof of installed-app compatibility or Coinbase live-relay availability. No custom app link or SDK-internal patch is used.


### Direct wallet entry without a Continue-with screen

MetaMask and Coinbase icon clicks no longer show a WalletGate “Continue with XX” connection screen. Pending extension/SDK connection and challenge preparation use an inline status/cancel action on the homepage. The SDK/extension supplies its own connection prompt. Once the server-generated message is ready, WalletGate opens **Review and sign** directly, with a single heading and explicit signature action. Error recovery and the separate phone QR route remain available; cancellation invalidates late connection/challenge results and restores focus. This presentation change retains stable Coinbase SDK 4.4.0 and server-verified SIWE.

## Adopted source layout (US-001-04)

Run all npm commands above from the repository root. React mounts from
`frontend/main.tsx`; composition is in `bootstrap/` and `pages/`, wallet
behavior in `wallet-auth/`, generic primitives/helpers in `ui/` and `lib/`,
and theme/assets in `styles/` and `assets/`. Node starts at
`backend/index.ts` → `bootstrap/server.ts`, with wallet behavior in
`wallet-auth/` and configuration in `infrastructure/`. See the single
[structure guide](PROJECT_STRUCTURE.md) for ownership and future destinations.

Vite reads `frontend/index.html` and writes the same root `dist/`; the SDK hash
step also writes to root `dist/`. `npm start` and `npm run dev` still run from
root and read the same `.env`, `DATABASE_PATH` and built static files. Build
before starting the server or browser tests. Dependency versions, supported
Node versions, environment names, ports, origin binding, CSP and SQLite path
policy are unchanged. Historical evidence references root `src/` and `server/`;
those paths describe the pre-migration layout.

## US-002 — Register web applications

After SIWE sign-in, choose **My applications**, or open `/#applications` on this instance and sign in. Register a name (1–100 characters) and 1–10 distinct redirect URIs, one per line. Callbacks must use HTTPS on non-loopback hostnames, including development: `http://localhost`, `https://localhost`, loopback IPs and `.localhost` hosts are rejected. Use your own HTTPS development hostname; registration does not contact or verify the callback. The WalletGate server itself may still run at the existing local HTTP origin for evaluation; that server-origin exception does not apply to registered callbacks.

The fixed client profile is confidential server-side web, authorization code with PKCE S256, `openid` only and `client_secret_basic`. No refresh tokens, CLI or dynamic registration is available. These registrations prepare later OIDC work; discovery, keys, authorization/consent and token exchange are not published by US-002. Names are owner-supplied and imply no WalletGate endorsement.

Save the generated client secret immediately using the creation result. It is shown only once and stored only as a hash on the server. Leaving/refreshing the result, signing out or losing the session removes the displayed secret; the owner list retains configuration but never recovers secrets. Raw secrets are not written to browser storage, logs or URLs. If it is lost, register a replacement, which uses another slot. Clipboard contents are controlled by the user; copy only to a trusted destination.

Each verified wallet has at most 20 registrations and five authenticated registration attempts per fixed one-minute window starting at its first attempt; invalid submissions count too. All interfaces use the same server checks. The cap and rate state persist across restarts. At the cap, deletion/rotation/reset are unavailable in this slice. On network uncertainty, use **Check registration**; if absent, retry the same submission identity. Existing registrations never reveal their secret again. Draft values are kept only in current-tab memory during reauthentication as the same wallet; a different verified owner clears them.

Dependencies: Better Auth/core 1.7.15 and the matching `@better-auth/oauth-provider` 1.7.15, with internal `jwt()` support for hashed secrets. The one-time initial schema includes provider/application, SIWE and QR tables, indexes, identity guards and the client-cap trigger. Provision an empty database with the command above before startup; the server does not create or update schema. Existing users/applications in a correctly initialized current database survive ordinary restarts. Delivery tests initialize disposable databases explicitly. No new runtime secret, paid service or endpoint permission is required.

The HTTP facade exposes same-origin JSON `POST /api/applications` (name, redirectUris, requestId), owner-only `GET /api/applications` and `GET /api/applications/:clientId`. It continues to block generic Better Auth/provider mutation and protocol routes. Creation uses supported core/provider transactions for client+submission atomicity, with a SQLite cap constraint. Registration holds exclusive access per SQLite file inside the process so synchronous auth/QR writes cannot become part of another request's transaction; ordinary requests may overlap to preserve in-flight QR cancellation. Bodies are read with the existing 8 KiB bound before joining this queue. Cross-process SQLite busy conflicts are retried a bounded number of times; exhaustion yields a retryable error and the same submission can be reconciled safely. This is an evaluation design, not a production throughput or abuse-resistance claim.

Run `npm test -- --run tests/app/applications.test.ts` and `npx playwright test tests/e2e/applications.spec.ts` for focused checks, or `bash scripts/verify.sh` for full local verification. Credential-bearing browser checks disable network traces/automatic DOM error snapshots and mask secrets in screenshots. Wallet signing remains simulated in automated tests.

## OIDC sign-in and renewable tokens (US-003)

The issuer is exactly `TRUSTED_ORIGIN/api/auth`. Configure a stable HTTPS trusted origin for integrations; preserve the initialized database and Better Auth secret across ordinary restarts. Discovery is at `<issuer>/.well-known/openid-configuration`, public signing keys at `<issuer>/jwks`, authorization at `<issuer>/oauth2/authorize`, token exchange at `<issuer>/oauth2/token`, UserInfo at `<issuer>/oauth2/userinfo`, and token revocation at `<issuer>/oauth2/revoke`. Public metadata describes the exposed profile; introspection and generic client management remain unavailable. RS256 keys are persisted using the provider; public JWKS never includes private key material. Changing origin, database or secret can break existing integrations and needs operational planning.

Use a registered confidential server-side web client and its saved one-time secret. Keep the secret and tokens on that application's server, outside browser storage, URLs, logs and analytics. Existing US-002 exact HTTPS redirect rules apply, including development. Generate a fresh PKCE verifier and S256 challenge, state and nonce in the relying party; send an authorization request with `response_type=code`, client ID, exact redirect URI and `scope=openid` (or `openid offline_access`). Authenticate token and revocation requests with `client_secret_basic` and `application/x-www-form-urlencoded`; these are server-to-server endpoints. Browser wallet and consent mutations retain same-origin JSON/CSRF protection. The IdP sign-in UI uses existing SIWE/QR coverage and always asks for consent, explaining wallet-address linkability and optional continued access.

Redeem the code once with `grant_type=authorization_code`, code, verifier and the same redirect URI within 60 seconds while the originating SIWE session is valid. Validate the signed ID token's permitted algorithm, signature via JWKS, exact issuer, client audience, expiry and original nonce; validate the authorization response's state before accepting sign-in. `sub` is the canonical lowercase wallet address. Call UserInfo with the opaque access token in the Bearer header to obtain only that `sub`. Access and ID tokens last at most 15 minutes. Pending browser authorization expires after five minutes; login never extends that deadline. Fresh-auth requests (`prompt=login`, `max_age`, including 0) require appropriate SIWE; `prompt=none` cannot silently obtain consent.

Refresh tokens require explicit `offline_access` consent. Each original authorization creates its own refresh family with a seven-day absolute deadline. Send `grant_type=refresh_token` and the current refresh token using the owning client's Basic credentials; omit `scope` or repeat the granted set. Scope narrowing/enlargement requires new authorization in this profile. Every successful exchange returns replacement refresh/access/ID tokens. Save the replacement atomically on the RP server and serialize refresh attempts: an accidental retry or concurrent refresh can be treated as token reuse and revoke the entire family and its active access tokens. Rotation never extends the seven-day deadline. Near that deadline, access/ID token lifetimes are shortened to end at it. The refreshed ID token retains original `auth_time`; it does not indicate a new wallet signature.

WalletGate logout ends the browser's wallet session. Issued tokens survive that logout/session expiry until their own expiry or applicable revocation. An RP controls its own login session; WalletGate does not promise coordinated logout. Explicitly revoke an access token to stop its UserInfo access. Revoke a refresh token to end that original-authorization family and every active access token in its lineage; separate authorizations are unaffected. Owning-client-authenticated reuse of a recognized used refresh token also ends that family, including when invalid scopes accompany the reuse. Revocation cannot retract independently held signed ID tokens. Code replay may invalidate tokens issued from that code. Restart sign-in after expiry/revocation; an exhausted offline family requires fresh SIWE and consent.

Reproducible checks: `npx vitest run tests/app/oidc.test.ts` exercises real provider issuance, independent RSA verification, lifecycle/expiry, restart, rollback and separate-process refresh competition on disposable databases. `npm run build` followed by `npx playwright test tests/e2e/oidc.spec.ts` exercises browser wallet continuation, consent, denial, keyboard interaction, zoom and light/dark accessibility. The full entry point remains `bash scripts/verify.sh`. These are local engineering checks; US-005 supplies the complete standalone RP walkthrough, and certification/production release are separate.
