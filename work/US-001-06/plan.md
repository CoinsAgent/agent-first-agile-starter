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

## Human-authorized port-3000 deployment

The human explicitly requested release to existing port 3000 for https://walletgate.beeswarm.dev/. Prepare exact verified source snapshot 469af5021a2957d90e7530f737d2c3bf1fa4ce12 in an isolated release, build and smoke test before switching the existing service. Preserve runtime.env, secret, origin/port, persistent database and TLS/nginx routing. Read-only compatibility preflight precedes any service stop. Explicit deployment authorization does not override the approved prohibition on shared/production data reset; incompatible deployed data requires a separate human decision. No PR/CI, human acceptance or destructive restore is implied. Existing plan/evidence/artifacts paths cover this execution record.

Preparation completed: release build and disposable in-memory startup/auth-boundary smoke passed. Deployed DB has 13 incompatible users and 5 apps, quick_check ok. Current service remains active, public HTTPS200. Await separate human deployed-data decision before switch; recommend preserving old DB and using a new empty database. No runtime data/config or service was changed.

## Human-authorized fresh deployment database

The human explicitly instructed “deploy with a new empty database” after disclosure of the 13 legacy users and 5 existing registered applications. This authorizes switching the requested port-3000 HTTPS site to the prepared release with a new database, preserving the existing database and previous configuration for rollback. Do not invoke the reset command or delete/restore the old data. Keep runtime.env and secrets unchanged; use a dedicated systemd environment-file override for DATABASE_PATH. Save previous drop-in, stop the old process, switch/restart, then verify local/public routes/assets and actual browser rendering. No PR/CI, story acceptance or unrelated permissions are implied.

Fresh deployment completed: user-authorized new persistent DB, old data and consistent private backup preserved, runtime.env/secret/origin/port unchanged, exact release service active on3000. Local/public page/assets/auth boundaries and actual Chromium sign-in/application auth gate passed. Rollback and concrete paths are recorded in evidence. No reset/deployment source changes, PR/CI or acceptance; keep QA_PASSED and finish with focused record checks.

## Human-requested one-time schema initialization revision

The human requested removal of automatic migration code and related story information because authentication runs in a fresh environment, then explicitly selected one-time initialization before normal server startup. This authorizes replacing runtime schema updates with an explicit empty-database initializer; it does not remove previously approved local reset functionality or authorize deployment/data changes. Return QA_PASSED to IN_PROGRESS and preserve approval metadata.

Declare before editing: backend/bootstrap/database.ts and schema.sql own composition of the pinned initial schema; scripts/init-database.ts is an explicit maintenance entry, not CLI authentication. No existing-schema upgrade or deletion. backend/wallet-auth/auth.ts opens initialized storage and registers the connection fence; qr.ts no longer creates tables at startup. identity.ts separates schema installation for explicit reset from runtime fence attachment. tests/app/database-fixture.ts initializes isolated fixture databases explicitly; existing auth/QR/application/identity/reset tests consume that helper without weakening assertions. New database.test.ts covers actual initializer, refusing populated/partial databases without changes, missing-schema startup and schema stability across restart. playwright.config.ts explicitly initializes a private fresh file before backend startup. Update docs/PROJECT_STRUCTURE.md and DEVELOPMENT.md and revised story ACs; keep historical evidence clearly historical. All other existing scope paths remain as declared. No dependency, lockfile, ownership-policy or upstream changes. Final full verify and fresh review before QA_PASSED.

Baseline source/tests remain identical to the previously verified 6fb9c10 until this revision starts; deployed immutable release remains unchanged. Existing local installation is available.

Technical revision before editing schema placement: the dependency checker rejects .sql under configured production roots. Keep checks unchanged; store the fixed SQL snapshot as an exported String.raw constant in backend/bootstrap/schema.ts instead of schema.sql. This is a new, not-yet-committed area; update declared scope and current structure docs to the native TypeScript source path. Initial focused tests 81 passed; all application tests 165 passed. No startup schema updates are retained.

Fresh review found an empty-schema guard edge case: SQL LIKE treats underscore as a wildcard, so a user object named sqliteXfixture could be skipped as if internal. Use NOT GLOB 'sqlite_*' to exclude only actual SQLite internal names, with a regression case for that user table. Interrupted the first full run during browser checks to apply this correction; do not report that run as complete. Rerun full verification on the corrected commit.

One-time initialization revision complete at d1320079149b4b43aadc662707c37b44d42dfadb: full verify exited0 with 43 harness, 41 structure, 167 application and 78 browser tests plus all required checks. Fresh review has no unresolved findings; missing/empty/partial DB, refusal of existing schema/data, atomic creation rollback and stable schema across normal startup/restart have executable coverage. No runtime schema migration/table creation remains. Restore QA_PASSED; only record changes follow the tested source. Deployment and database unchanged; no PR/CI or acceptance.

## Human-requested deployment refresh for explicit initialization revision

The human requested “refresh the deployment env and relase to the port 3000” for https://walletgate.beeswarm.dev/ after the one-time initialization revision passed local QA. Deploy exact reviewed snapshot 1bf0e6f1d78d1d5bbb5ffa65f5fa7d8629c07bee (product/tests identical to fully verified d132007). Refresh the isolated release/dependency/build environment and existing service drop-in; preserve the current initialized persistent database, runtime.env, secret, trusted origin/port and HTTPS routing. “Refresh deployment env” does not by itself request another data reset; no initializer/reset runs against the existing database. Prepare release build and isolated fresh-init smoke plus read-only compatibility checks before stopping the service. Retain private configuration/database backup and previous release for rollback. No PR/CI, human acceptance or unrelated settings are implied. Existing execution record/artifact paths cover these operations.

Refresh deployment completed: exact 1bf0e6f release on port3000, initialized current database/schema/users/apps/config/secret preserved. New release build, explicit-init disposable smoke, read-only preflight, consistent private backup, local/public boundaries/assets and actual Chromium rendering all passed. Concrete operational/rollback paths and results are in evidence. No real init/reset, PR/CI or acceptance; final updates are record-only.

## Human-requested minimal session-hook revision

The human instructed “simplify the session hook, according to the Minimum invasion policy” after analysis established that Better Auth already passes user.id to session.userId and supplies createdAt/expiresAt from session.expiresIn. This is an implementation simplification within unchanged approved ACs. Exact edit paths: backend/wallet-auth/auth.ts (remove timestamp overrides and return only custom metadata through Better Auth's supported merge), backlog/US-001-06.md (IN_PROGRESS/QA record and technical note), this plan/evidence, ignored artifacts. Existing declared scope already covers them. No schema, database, dependency, UI, registration, identity or session-policy changes. No deployment or PR/CI.

Keep existing SIWE-path, verified-proof/address/user binding and final proof-expiry guards; keep authMethod and walletAddress because protected-session/provider checks rely on them. Let Better Auth merge custom fields into its existing session data and manage userId, token, createdAt, expiresAt and other native fields. Baseline product/tests are identical to fully verified d132007; later commits are deployment/evidence records only. Use existing real-signature auth/QR/identity tests (including exact expiry/provenance/returning-user/logout cases), then full verify and fresh diff review before QA_PASSED. No new tests that duplicate the implementation are needed.

Minimal hook revision complete at ee311ba06a56ffb55e162bcba6572b228c12ee84: focused84 and full43 harness/41 structure/167 app/78 browser checks passed, including exact expiry and provenance regressions. Fresh four-path diff review has no unresolved finding; no approved AC/policy/schema/dependency changed. Restore QA_PASSED, record-only final checks and handoff; no deployment or PR/CI.

## User-requested session/client CRUD diagnostic

The human requested using the session to test client CRUD. Test current source through a real loopback HTTP server using disposable initialized in-memory SQLite, generated fixture wallets and actual SIWE signatures/session cookies. No deployed session credential or live client/database is used. Create/read should succeed; current approved API intentionally does not expose update/delete (US-003 remains DRAFT and provider privileges allow create/read/list only), so verify actual-client mutation requests return404 and preserve the record. Include unauthenticated/other-owner/logged-out access and secret-redaction checks. Store reproducible probe/result/log only under existing work/US-001-06/artifacts and append actual results to plan/evidence. Existing applications.test.ts covers broader session/owner/validation/limit/concurrency regressions. This request does not authorize implementing new CRUD endpoints or changing approved scope. No product/test code change or QA transition is needed for diagnostic execution; no full-suite repeat or PR/CI.

Diagnostic completed: real local HTTP/SIWE/session probe exited0 with 17 expected checks; Create201 and Read200, Update/Delete404 with client unchanged, owner isolation and post-logout401 verified. Existing client regression suite47 passed. No live/user data or source changed. Record the limitations (Update/Delete unavailable) instead of claiming full CRUD success. Detailed actual commands/results in evidence.
