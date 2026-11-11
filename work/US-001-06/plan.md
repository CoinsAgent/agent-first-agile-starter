# Delivery plan — US-001-06

## Story and scope

- Story reference: `backlog/US-001-06.md`
- Approved acceptance criteria: [list IDs]
- Explicit non-goals: [list]

## Current architecture and approach

- Relevant components / files:
- Smallest viable implementation:
- Alternative considered / trade-off:

## Structure and writable paths

- Structure reference: `docs/PROJECT_STRUCTURE.md` (or identify a missing guide)
- Existing owners and current paths:
- Intended skeleton for any new area (document first; create only needed directories):
- Proposed added/updated/deleted paths and rationale (include tests, shared/config and plan/evidence files):
- Dependency directions and public interfaces affected:
- Human story approval reference: [cite the actual decision; never invent approval metadata]
- Branch and base commit:
- Baseline check results and existing failures:
- Technical path revisions and reasons: [record before affected edits; no separate path approval]
- Decisions changing approved outcomes or other human-owned boundaries: [pause for the human]
- Available executable controls and remaining gaps:

## Acceptance tests

| AC ID | Executable test | Layer (unit/integration/E2E) |
|---|---|---|
| AC-01 | TODO | E2E |

## Verification commands

- Focused relevant checks during development; ordinary debugging remains IN_PROGRESS
- `bash scripts/verify.sh` before every QA_PASSED transition (requires real stack-specific checks)
- No pre-approval PR/CI or duplicate post-merge full run; monitor published CI without continuous polling

## Risks / dependency / human decisions

- None identified / documented blockers

## Execution checklist

- [ ] Tests define observable behavior
- [ ] Feature works end-to-end
- [ ] Regression checks run
- [ ] Independent review performed if appropriate
- [ ] Evidence is recorded for current commit
- [ ] Complete branch diff and actual paths are presented for human review
- [ ] Human finished-result approval precedes PR/CI publication
- [ ] Required current PR checks and renewed human review precede human merge
- [ ] Confirmed human merge is recorded as local acceptance with provenance
- [ ] Local acceptance record is preserved for recovery and the next approved PR

## Concrete delivery declaration

Human approval: explicit READY instruction, deliver-story invocation, then Forrest / today (clock confirms 2026-11-11 Asia/Shanghai). Branch codex/us-001-06-address-identity starts at 7c62060; complete PR scope base ad5ed3442f1b8661da5b98a3935c14842e4c8b31 includes already-observed US-002 acceptance-only commit 7c62060. Live plugin reads confirm PR8 merged at ad5ed34 and both jobs of run 42493715715 succeeded. No other delivery is WIP.

Exact permitted files are in scope.json: wallet-auth identity/transaction/session/startup checks and reset public interface; applications reset owns application tables; scripts/reset-local-data.ts composes the explicit maintenance command; frontend API Session adds userId only; focused auth/QR expectations and new identity/reset integration tests; structure/setup docs; selected story/map; previous US-002 acceptance story/evidence; this plan/evidence/scope and ignored artifacts. No dependency/config/checker changes or UI redesign proposed. Existing feature owners/public interfaces remain in force.

Proposed skeleton: backend/wallet-auth/identity.ts owns canonical identity/preflight and reset fencing; reset.ts owns auth data reset; index.ts exposes maintenance public interfaces; backend/applications/reset.ts owns dependent app deletion; scripts/reset-local-data.ts composes via public interfaces. Document this in PROJECT_STRUCTURE before implementing. User create hook receives address only from successful signature verification in per-request AsyncLocalStorage. Supported runWithTransaction encloses user/wallet/account/session creation and rolls back non-success responses; consumed browser attempt remains consumed outside this transaction. Verification requests serialize per database while ordinary QR approval/cancel remain concurrent. Persistent reset generation fences old live connections/requests after atomic deletion; fixtures verify races and rollback.

Verification mapping: AC01 persisted IDs/FKs/API and real signatures; AC02 repeat/case/restart/local+QR; AC03 distinct wallets/account switch/no linking; AC04 independent attempts/connections/processes and injected persistence failure; AC05 existing malformed/binding/replay/deadline cases plus no users on invalid proof; AC06 mismatch/provenance/logout/expiry; AC07 existing registration tests and post-reset registration; AC08 legacy/fresh/compatible preflight; AC09 reset all dependent tables, revoke credentials/proofs, idempotence/rollback/fencing; AC10 actual maintenance subprocess argument/target/env refusal and fixture execution; AC11 documentation review and full verify.

Baseline: bash scripts/verify.sh running; output artifacts/baseline.log. No product edits until observed result. CI not requested. No real database reset/deployment; reset tests use disposable fixtures only. Fresh technical diff review after final checks; full suite and committed scope before QA_PASSED.

Technical revision before edit: add tests/app/identity-fixture.ts for shared disposable gate/browser fixture used by identity/reset integration tests; no production ownership change. Baseline exited 0: 43 harness tests, 41 structure fixtures, 130 app tests, 78 browser tests, lint/types/build/lock/dependencies. Initial transaction experiment timed out because HTTP handler resets adapter context; direct supported API plus before-hook transaction-adapter context is being verified. No required check is disabled.

Technical revision before edit: include backend/oidc/index.ts to strengthen its existing verified-owner predicate with session.userId equality to walletAddress; keeps provider registration authorization consistent with the new canonical stored identity. No new protocol endpoints or grants.

Implementation observations: supported direct auth.api.verifySiweMessage is used inside runWithTransaction; hooks.before supplies its transaction adapter to SIWE direct adapter calls. Both account/session insertion failure tests prove rollback while browser attempt remains consumed. Identity creation/QR completion join the existing per-database exclusive writer queue; phone approval/cancellation remains concurrent. Reset installs SQLite generation guards even on a legacy schema, atomically deletes auth/application dependents and advances the generation. Old/new connections cannot recreate data after reset without restart.

Focused observations: auth+QR 74 passed; identity+registration 56 passed; identity+reset 23 passed; all application tests at that checkpoint 153 passed. One reset test initially failed because Vitest it.each spread an empty array, not due to application behavior; corrected to labeled object cases and strengthened exact missing/unsafe-argument coverage. Final reset-focused result and final full-suite results will be recorded in evidence. No real data reset was run; actual command coverage uses mkdtemp fixtures.
