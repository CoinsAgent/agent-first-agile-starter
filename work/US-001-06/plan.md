# Delivery plan — US-001-06

## Story and authorization

- Story: backlog/US-001-06.md, AC-01–AC-11; human explicitly approved READY and requested delivery, then supplied approved_by Forrest and approved_at today. Clock: 2026-11-11 03:00:53 UTC, same date in Asia/Shanghai.
- Included: address-based stored Better Auth user IDs through existing browser/QR SIWE, consistent sessions/owner isolation, incompatible-data refusal, explicit local development/test reset of identity and dependent application records.
- Excluded: CLI sign-in, data migration, automatic resets, shared/production operations, new OIDC functionality, deployments and dependency upgrades.
- Branch: codex/us-001-06-address-identity. Starting commit 7c62060; complete PR diff base ad5ed3442f1b8661da5b98a3935c14842e4c8b31.
- Pending acceptance recovered before WIP: commit 7c62060 retains US-002 ACCEPTED story/evidence. GitHub plugin confirmed PR8 merged at ad5ed34 and required jobs succeeded in run 42493715715; gh metadata fallback confirmed merger CoinsAgent (User), timestamp 2026-11-08T15:16:47Z, published head d1583a350b8d26e1bd9abe42566bd201324b5c5a. Carry those two record paths in this approved story's eventual PR. No other delivery WIP.

## Architecture and declared paths

The exact file allowlist is scope.json; all 23 complete-diff paths are within it. Read PROJECT_STRUCTURE and UI_DESIGN_CONTRACT before edits. The skeleton was documented before creating modules. No owner/dependency policy, baseline or required check was weakened.

- backend/wallet-auth/auth.ts: supported SIWE hook assigns user.id only after cryptographic verification; per-request proof context; transaction adapter passed via before hook; non-success endpoint responses roll back user/wallet/account/session creation. Browser attempt consumption occurs outside the rollback boundary. Verify/QR completion use the existing per-database exclusive writer queue, while phone approval/cancellation can remain concurrent.
- backend/wallet-auth/identity.ts: canonical checks, read-only incompatible-data preflight, uniqueness/binding constraints and persisted reset-generation guards for writes across connections/processes/awaits.
- backend/wallet-auth/reset.ts and index.ts: atomic local identity/proof reset public interface, explicit target/environment/acknowledgement, rollback and generation invalidation. Old schemas receive guards so older writers without the function fail closed.
- backend/applications/reset.ts and index.ts: dependent application/client/token/consent/submission/rate deletion, preserving provider resource/key metadata.
- backend/oidc/index.ts: existing verified-session predicate additionally requires userId equality to walletAddress. No endpoint/grant additions.
- scripts/reset-local-data.ts: maintenance composition through feature public interfaces; no env-file/default target and no invocation at startup. This is not CLI sign-in.
- frontend/wallet-auth/api.ts: Session adds userId only, with no UI/layout changes.
- tests/app/auth.test.ts and qr.test.ts: updated exact additive API shape and persisted QR identity assertion. New identity-fixture.ts, identity.test.ts and reset.test.ts exercise real proofs, server/SQLite, independent connections/processes and actual maintenance command subprocesses.
- docs/DEVELOPMENT.md and PROJECT_STRUCTURE.md: address semantics, reset instructions/placement and limits; backlog story/map: human decisions and lifecycle; work/US-001-06 plan/evidence/scope and ignored artifacts; previous backlog/US-002.md/work/US-002/evidence.md acceptance carry-forward.

Technical revisions were declared before edits: shared test fixture avoids duplicated browser/session setup; existing OIDC provider predicate closes the consistency check across owner authorization. No additional production paths were needed.

## Acceptance verification mapping

| AC | Verification |
|---|---|
| AC-01 | Real SIWE stores canonical primary key, account/wallet/session user refs, and equal API userId/address; technical IDs remain separate |
| AC-02 | Repeat/logout/case/restart identity tests, existing session tests and QR persisted-user assertion |
| AC-03 | Account switch/owner application isolation, distinct addresses, caller-ID rejection and hidden generic linking routes |
| AC-04 | Independent attempts/connections/process race; injected account/session insertion failures roll back all partial identity state |
| AC-05 | Existing malformed/domain/URI/chain/nonce/replay/cross-attempt/deadline suites and no-user-on-invalid-proof tests |
| AC-06 | ID/address/wallet tampering rejection, SIWE provenance, absolute session boundaries and local logout regression tests |
| AC-07 | Existing registration suite and two-app owner/account-switch test; fresh post-reset registration |
| AC-08 | Fresh/compatible startup/restart; legacy refusal with row inventory unchanged until explicit reset |
| AC-09 | Seeded dependent tables/FKs, atomic deletion, secret/proof invalidation, rollback/busy failure, repeat reset, unrelated-data preservation and stale/pending writer fencing |
| AC-10 | Real command missing/relative/duplicate/unknown/ack/env failures; production NODE_ENV refusal; unrelated target refusal; disposable legacy reset |
| AC-11 | Setup/structure diff review plus full harness, structure/scope, lint, types, application, build and browser checks |

## Observed checks and debugging

- Baseline bash scripts/verify.sh exit 0: 43 harness, 41 structure, 130 app, 78 browser tests plus lint/types/build/lock/dependencies; artifacts/baseline.log. No product edits preceded completion.
- Initial transaction experiment timed out: HTTP handler reset adapter context and SIWE direct context.adapter calls bypassed the transaction adapter. Corrected using supported direct API and hook context override; no upstream patch or disabled validation.
- One provisional reset test failed because Vitest expanded array arguments (empty case undefined). Fixed labeled object cases and strengthened real argument-boundary coverage.
- Focused auth/QR: 74 pass; focused identity/registration: 56 pass; identity/reset checkpoint: 23 pass; final reset-focused: 18 pass, including populated provider-dependent data.
- First complete candidate verification exit 0 on b15bba3: 43 harness, 41 structure, 158 app, 78 browser; artifacts/full-verify.log. A test-only strengthening added nonempty provider dependencies after that app stage, so final full verification is rerun on the final committed test revision rather than attributed to the earlier run.
- Fresh technical review reread the complete base-to-head production/test/docs/approval/carry-forward diff and checked declared paths. Findings: strengthen reset tests for nonempty provider dependency rows; install guards on legacy schemas too; reject unrelated user databases; all addressed before final checks. This was the primary agent's fresh review pass, not human business acceptance.

## Handoff and limits

Final full verification and AC outcomes are recorded in evidence.md. No real database reset, deployment, PR or hosted CI occurred. Reset tests use isolated mkdtemp databases. Wallets are simulated with actual signatures; no new physical-device compatibility claim or production-readiness claim. Environment labels do not authenticate deployment classification; inspect actual targets and stop writers. External SQLite writers need the registered generation function and server connections restart after reset. SQLite contention may safely fail a losing sign-in; a fresh attempt resolves correctly. Human review of the final result precedes PR/CI; human merge is acceptance.

## Local QA completion

Full verification on 3db9e253a95a6e5e9afe8d4c780e1b91d880f7eb exited 0: 43 harness, 41 structure, 158 application and 78 browser tests plus scope/dependencies/lock/lint/types/build. Final fresh review has no unresolved material findings; evidence maps every AC to actual checks. Record QA_PASSED and present the finished result. Only lifecycle/plan/evidence records follow the tested revision, with focused metadata/whitespace/scope validation. CI and human acceptance remain pending; no PR, deployment or real reset was performed.

Final evidence-format correction: metadata validation rejected renamed template section titles (Acceptance matrix, Verification, Review missing). Correct exact headings rather than weaken the checker. Return IN_PROGRESS, rerun full verification on the record-corrected commit, then restore QA_PASSED. Product/test code unchanged.

Record-corrected final verification on 6fb9c10029ef18dc8d8d50d7dc988b30e34b58af exited 0 with 43 harness, 41 structure, 158 app and 78 browser tests plus all required checks; metadata format resolved. Standalone maintenance command strict TypeScript and oxlint checks also pass. QA_PASSED restored; final changes limited to story/plan/evidence records. Await human finished-result review before PR/CI.
