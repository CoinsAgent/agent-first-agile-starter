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
npm start
```

Open `http://localhost:3000` in Chrome with MetaMask. The server serves the built
frontend, so rebuild after frontend changes. `npm run dev` starts the same local
server; it also requires an existing build. SQLite schema migrations run on
startup using Better Auth's migration API. This evaluation starts with a fresh
database; back up an existing database before upgrading dependencies/schema.
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
Server responses expose no session token, internal user ID or placeholder email.

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
