---
name: walletgate-cli
description: Register and manage explicitly authorized wallet-owned WalletGate clients from the Linux CLI after human browser approval.
---

# WalletGate CLI

Run from the repository with its existing Node runtime/dependencies. Installation into an agent environment is user-directed; this skill does not modify external configuration.

Use `npm run cli -- help` and `docs/DEVELOPMENT.md` for commands. Start with `npm run cli -- login --origin https://YOUR-WALLETGATE --label Agent-name --no-open`. Give the authorization URL to the human. Only the human authenticates the wallet and selects permissions. For remote Linux use `--ssh-host HOST` and have the human establish the printed forwarding command before opening the URL. Do not invent unattended login, export browser cookies, ask for wallet keys, or work around denied consent.

Use `list`, `get CLIENT_ID`, `create --name NAME --redirect HTTPS_URI --request-id UUID`, `update CLIENT_ID --name NAME --redirect HTTPS_URI`, `delete CLIENT_ID --yes` and `logout`. Each mutation must be authorized by the user's task and selected grant. Confirmation flags do not expand authority. Registration needs separate consent and an IAT, obtained internally; ongoing management of a new client needs another human consent. A create command saves the one-time client secret to a protected file and returns its path. Never read that file into a model prompt, expose token files, pass credentials in arguments, or copy secrets into logs.

Parse JSON output and nonzero exit codes. Authorization expiry/revocation requires human reauthorization; missing targets/permissions must not trigger a different wallet or broader grant. Preserve the request ID for registration retries. A retry reconciles public results only; it cannot redisclose a lost secret. Lost-secret recovery needs explicitly authorized deletion and replacement, not automatic destructive cleanup. Refresh replay has no grace and can require login again. Incomplete logout retains protected credentials; explain browser revocation rather than claiming success. Browser sessions, public client IDs and local profile metadata are never substitutes for server authorization.

Do not install tools, publish packages, reset/migrate databases, alter host permissions or deploy without the applicable separate authorization.
