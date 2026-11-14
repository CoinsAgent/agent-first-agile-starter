# Delivery plan — US-003

## Story and scope

Human explicitly approved READY (CoinsAgent, 2026-11-12) and invoked deliver-story. Implement AC-01–AC-15 in backlog/US-003.md; preserve all approved policy. No management features, deployed data operations, PR/CI or release.

## Current architecture and approach

Use pinned Better Auth OAuth/JWT provider; supported plugin/adapter extension for consent, browser continuation, session-independent tokens, absolute family expiry and per-authorization revocation. Keep protocol validation/signing in the provider. Inspect feasibility before implementing adaptations; report unsupported boundaries rather than silently changing policy.

## Structure and writable paths

Structure: docs/PROJECT_STRUCTURE.md. New backend oidc/protocol.ts owns HTTP continuation and policy.ts owns provider token/family integration, exposed by oidc/index.ts. frontend/authorization/consent.tsx/style.css owns consent UI, index.ts public export; pages/consent.tsx assembles wallet and consent; bootstrap only dispatches. No empty scaffolds, domain imports through public interfaces only.

Exact allowed paths: scope.json. Existing backlog renumbering/READY decisions are retained; acceptance-only backlog/US-001-07.md and work/US-001-07/evidence.md are carried from 041b43f. Previous accepted-story references change only administratively. Docs structure records new owners; development docs explain standard integration. Backend wallet-auth/auth.ts composes provider and facade without moving SIWE logic. Tests use existing app/e2e areas. work/US-003 includes ignored logs/scripts/artifacts and this plan/evidence/scope. Any further technical path revisions will be recorded before editing.

Branch: codex/us-003-oidc-renewable-tokens. Base: 1eaa567d959c3e1fc9317f3422deef6a2a1f372b (merged main). Host read reconfirmed PR10 human merge by CoinsAgent at 2026-11-12T03:41:31Z after both required checks passed on b564524; retained acceptance commit041b43f. No other WIP.

## Acceptance tests

| AC | Planned actual verification |
|---|---|
| 01 | Real SIWE, two registered clients, independent JWT validation and code exchange |
| 02–04 | Browser consent/denial/identity/pending isolation; API prompt/max_age/expiry/CSRF negatives |
| 05 | Code 60s boundaries, client/PKCE/redirect failures and redemption races |
| 06–07 | Signature/issuer/aud/nonce/sub/claim filtering; metadata and keys across restart |
| 08 | Issuance before logout vs UserInfo after logout/session expiry |
| 09–10 | Offline consent, refresh rotation, absolute deadline/restart/near-expiry cap |
| 11–12 | Independent families, wrong client, reuse/scope/concurrency, family/access revocation |
| 13 | Protocol form endpoints, strict redirect and preserved wallet/browser boundaries |
| 14 | Playwright light/dark/mobile/keyboard/focus/axe and wallet regressions |
| 15 | Full verify plus current complete scope and technical review; docs |

## Verification commands

Baseline bash scripts/verify.sh running; output artifacts/baseline.log. Focused Vitest/Playwright/type/lint checks during development. Full bash scripts/verify.sh with committed complete-diff scope before QA_PASSED. No hosted CI until human finished-result approval.

## Risks / dependency / human decisions

Native refresh family/sliding expiry and session token hooks differ from approved policy. Must prove supported adaptations, durable deadlines and atomicity; unknowns are not passing checks.

## Execution checklist

- [x] Baseline and focused feasibility checks
- [x] All approved ACs implemented and verified
- [x] Full verification and complete-diff technical review
- [x] QA_PASSED evidence prepared; human review pending; PR/CI not requested

## Technical revisions

- Baseline completed exit0: 43 harness tests, 41 structure fixtures, 175 application tests, 78 browser tests plus lint/types/build/lockfile. artifacts/baseline.log.
- Add tests/app/applications.test.ts to scope before revising obsolete US-002 assertions that protocol routes are unavailable. Keep management/DCR route negatives.
- Public Better Auth getAdapter factory supplies the configured adapter; its transaction wrapper joins explicitly serialized SQLite transactions even when native HTTP handlers establish a new adapter context. Native token creation/validation/signing remains provider-owned. No dependency/schema change.

- Add tests/app/oidc-worker.ts before creation: minimal stdin-driven disposable-database process fixture for real separate-process refresh competition, with sanitized stdout status only.

## Review and current verification

Fresh read-only reviewer oidc_facts identified and rechecked fixes for: max_age crossing during consent; exact-expiry bearer whitespace; standard POST authorization/UserInfo; concurrent first-tab binding cookies; ID-token/response expiry crossing the absolute family deadline during async minting. Targeted regressions cover each. Schema checks remain attached to the original configured adapter instance; no checker/host protection is disabled. Child public minting context captures the declared token response before HTTP rendering, verifies signed/response expiry and current deadline, then uses the original renderer. Unsafe time-boundary output returns5xx and outer transaction rolls issuance/rotation back; clients may retry safely.

Observed current focused checks:40 OIDC tests pass in artifacts/oidc-time-race.log (before the json renderer's async typing-only correction);213 app tests passed before the two added async-race tests;6 consent browser tests passed before Deny's secondary presentation adjustment. Types pass after async typing correction. These historical focused results are not final full verification. Full verify against a committed current head is next.

## Final local outcome

Full verification on6d0b18f34aa2fe70875e6d193d058f7f1a1a6007 exited0:43 harness tests,41 structure fixtures,228 application tests (53 OIDC),84 browser tests, scope/dependencies/lockfile/lint/types/build. artifacts/final-verify-with-boundaries.log. Every AC maps to actual passing evidence. Fresh review findings are resolved; full main-to-head27-path diff is scoped and reviewed. No product dependencies, schema, host protections or upstream source changed. The lifecycle/evidence commit changes only this plan, evidence and status; product/tests are identical to the full-tested revision. Status QA_PASSED is local engineering; explicit human finished-result approval is next before PR/CI. No release/deployment or acceptance is claimed.

## Separately authorized operation-test deployment

The human explicitly requested refreshing the environment and releasing on port3000 for https://walletgate.beeswarm.dev/. Prepared immutable92204ea with offline locked install/build, a private existing-storage compatibility check and actual-release disposable HTTP SIWE/OIDC/refresh/revocation smoke; all passed. Switched only the release drop-in, preserving existing secret/origin/database/port/runtime files and one user/two clients, with consistent private backup and rollback. Provisioned RSA via the supported resolver while preserving the old key, then passed public TLS/assets/metadata/client-auth boundaries and actual Chromium rendering. Exact release/database/backup/rollback provenance and artifacts are in evidence.md. No code/AC/dependency/schema change, data reset, PR/CI or acceptance. Status remains QA_PASSED; human operation testing and finished-result PR approval remain next.

## Human authorization for PR/CI publication

The human explicitly requested “open its PR and run CI.” Publish the reviewed result after focused record validation and complete scope check. Product/tests remain identical to6d0b18f; existing main is1eaa567. Do not start a second dispatch or change checks/protection. Inspect actual required checks at useful completion checkpoints; fix in-scope failures under PROCESS. Human merge remains acceptance and is never performed by the agent.
