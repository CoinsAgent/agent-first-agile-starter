# Delivery plan — US-001

## Story and scope

- Story: backlog/US-001.md; AC-01 through AC-10. Entry gate: accepted product documents, READY story with explicit human approval, no other WIP stories, no prerequisite product stories.
- Scope: SIWE-only session authentication, MetaMask connection/recovery, canonical wallet display, absolute session expiry/logout, runnable local evaluation setup.
- Non-goals: OIDC/token issuance, client registration/management, other authentication methods, production release, additional wallets/chains.

## Current architecture and approach

- Repository has only the delivery harness; no existing product implementation.
- Node 22, TypeScript, React/Vite UI, wagmi injected MetaMask connector, viem signature recovery and SIWE message utilities. Express serves one configured origin, assets and Better Auth endpoints; SQLite persists Better Auth state and browser-bound challenges.
- Reuse Better Auth SIWE plugin and database-backed sessions with refresh/cache disabled. Inspect installed source and use supported hooks to enforce stricter story policy, browser attempt binding, atomic nonce consumption and session authentication provenance. Do not modify upstream code.
- Configure trusted origin explicitly. Permit only required authentication routes; disable alternative authentication paths. No RPC provider/private keys are needed for EOA signature recovery.
- Alternative: custom authentication/session service. Rejected because supported Better Auth integration better preserves the contract and future OIDC integration.

## Acceptance tests

| AC ID | Executable verification | Layer |
|---|---|---|
| AC-01 | HTTP signed-wallet login plus browser connect/review/sign/authenticated flow | Integration + browser E2E |
| AC-02 | Wrong address/domain/URI/chain and hostile Origin rejected | Integration |
| AC-03 | Exact nonce deadline, browser binding, consumed nonce and concurrent replay | Integration |
| AC-04 | Malformed messages, signatures, nonce substitution and validity boundaries using controllable clock | Integration |
| AC-05 | Mock EIP-1193 rejection, disconnect/account change and retry | Browser E2E |
| AC-06 | Mixed/checksummed address canonicalization and distinct accounts | Integration |
| AC-07 | Reload, exact absolute expiry, no extension, revoked token and session isolation | Integration + browser E2E |
| AC-08 | Missing/tampered credentials, provenance-free session and alternative auth routes | Integration |
| AC-09 | Browser no-wallet/unsupported cases automated; actual MetaMask Chrome desktop and Android in-app demonstrations separately required | Browser E2E + real-device manual |
| AC-10 | Build/type checks, start-from-config smoke and documented repeatable commands | Build + integration + walkthrough |

## Verification commands

- npm run typecheck
- npm run test
- npm run build
- npm run test:e2e
- bash scripts/verify.sh (all of the above via scripts/project-verify.sh plus harness checks)
- Independent read-only review after implementation; repeat impacted checks after corrections.

## Risks / dependency / human decisions

- Approved wallets/platform scope and numeric policy are in the story, which is authoritative over the older proposal map.
- Installed Better Auth support and hooks must be verified; library defaults alone do not prove nonce/session requirements.
- Real desktop MetaMask and Android wallet access may not exist in this environment. Never claim AC-09 based on injected mocks. If actual device demonstrations cannot complete, mark BLOCKED with exact next action despite green automated checks.
- Required CI passed for published implementation SHA ac0294259cc14d37e25dfe4e83bdb8c358685d9d. Protected PR review has not been performed; user explicitly authorized direct commit/push. Public HTTPS evaluation testing was authorized; no production release is authorized.
- Current Git HEAD at entry: 9cfada7; approved story has local edits. Evidence must distinguish base commit from uncommitted implementation.

## Execution checklist

- [x] Tests define observable behavior
- [x] Feature works end-to-end in automated tests and user-reported real MetaMask desktop/Android Explore demonstrations, including reload and logout checks
- [x] Regression checks run: 9 harness, 51 integration/HTTP, 18 browser tests; types and build passed
- [x] Independent review completed; both findings fixed and re-reviewed
- [x] Evidence records actual verification, user-reported device outcomes and successful implementation CI provenance

## Remaining delivery gate

- User reports real MetaMask Chrome desktop works; supplied versions are recorded in evidence.md. The user now reports Android Explore connection/sign-in succeeds after the correction. The user confirmed both signed-in reload persistence and logout/reload requiring sign-in on both environments. Manual AC-09 observations are complete and implementation CI passed; the remaining product gate is formal human acceptance. See evidence.md for exact next actions. All approved ACs and human metadata are preserved.

## Android manual-test correction — 2026-11-03

- User reports real MetaMask Chrome desktop sign-in works; exact desktop versions remain unreported. Android MetaMask Explore reports wrong-network guidance; Android Chrome handoff fails and remains outside approved scope.
- Preserve mainnet-only server validation. Request chain 1 during initial wallet connection and provide an explicit mainnet switch/retry for an existing wrong-network connection. Allow only the expected same-account mainnet-change event during preparation; all account changes and unexpected chain changes still invalidate attempts.
- Wait briefly for delayed injected MetaMask availability. If Android has no injected provider, direct the user to Explore without adding SDK, handoff, QR or external-browser authentication.
- Browser regressions: wrong-network approved switch through sign-in, rejected switch with no session/retry, already-connected switch without stale-attempt cancellation, delayed provider injection, and Android Chrome guidance. Initial three regressions failed against the previous build; see artifacts/android-before-fix.log.
- Confirm automated checks, independently review the correction, refresh the public build and request actual Android retest. A real-device success is not inferred from simulation.

## Final QA verification — 2026-11-03

- User-confirmed desktop and Android session checks recorded. Final scripts/verify.sh run passed 9 harness, 51 integration/HTTP and 18 browser tests plus types/build.
- QA_PASSED is local only; changes are uncommitted and required CI on the implementation SHA remains pending. No final human acceptance was recorded.

## Publication — 2026-11-03

- User authorized commit/push with evidence and CI verification. Published implementation ac0294259cc14d37e25dfe4e83bdb8c358685d9d; required CI run 41649017643 succeeded on that SHA.
- Follow-up evidence records the actual SHA/run and required-check logs. No product/test inputs change. Verify final-head CI after publishing this provenance update; human acceptance remains pending.
