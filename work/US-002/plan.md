# Delivery plan — US-002

## Story and scope

Approved story: backlog/US-002.md, explicit human "us 002 ready" then "$deliver-story us-002" on 2026-11-08. AC-01–13 are unchanged approved outcomes. Web-only registration, one-time credentials and read-only list; no CLI, management mutation, public OIDC endpoints, PR/CI or deployment.

## Current architecture and approach

Existing Better Auth SIWE session, SQLite and strict same-origin JSON facade remain authoritative. Add the matching supported OAuth provider integration internally, retaining the facade allowlist. Wallet-session provenance is checked before application operations. Registration owns validation, limits, request identity and persistence integrity; supported provider functionality owns credential generation/storage.

## Structure and writable paths

Branch codex/us-002-registration, READY base 915e3eb, complete-PR base eaca15f7e01ac31e25c0fe58f48b60d8975f1a62. The branch carries the confirmed US-001-05 acceptance record from 0e78698 and authorized shaping/READY changes from 915e3eb.

The exact initial writable file list is work/US-002/scope.json. Reasons:
- backlog/US-002.md and work/US-002/{plan,evidence,scope}.md/json: lifecycle and execution records; artifacts contains ignored reproducible logs/captures only.
- backlog/STORY_MAP.md and backlog/US-003.md: previously authorized shaping boundary; no new product changes.
- backlog/US-001-05.md and work/US-001-05/evidence.md: confirmed delayed acceptance, carried into this PR.
- package.json/package-lock.json: matching OAuth provider dependency, preserve unrelated versions.
- backend/wallet-auth/auth.ts/index.ts: supported plugin assembly and existing verified-session public boundary, facade routes. No broader auth change.
- backend/applications/{index,registration}.ts: new domain public interface and registration/list/read behavior, validation, idempotency/limits. backend/oidc/index.ts only if real supported provider integration requires a separate owner.
- frontend/applications/{index.ts,applications.tsx}: new domain public interface and form/list/result state; feature-local styles will be declared before adding if needed.
- frontend/pages/applications.tsx, bootstrap/app.tsx and pages/sign-in.tsx: minimal assembly/navigation and session-aware reauthentication composition. Generic UI stays domain-independent.
- docs/PROJECT_STRUCTURE.md: activate real applications owners before implementation; docs/DEVELOPMENT.md: setup/credential/limits documentation.
- tests/app/applications.test.ts and tests/e2e/applications.spec.ts: real boundary/integration and browser acceptance checks.

Proposed new-area skeleton: frontend/applications/index.ts exposes Applications UI; applications.tsx owns feature behavior. frontend/pages/applications.tsx assembles it with the existing sign-in capability. backend/applications/index.ts exposes its registration service; registration.ts owns policy/persistence, while provider/session interfaces are injected by composition. Domains do not import bootstrap/pages; browser code never imports backend. Existing executable ownership already reserves these owners; create no empty future area. Inspect dependency checks before choosing an interface extraction.

Baseline: initial bash scripts/verify.sh failed because this checkout had no node_modules (structure fixtures could not import TypeScript). Log initially /tmp/us-002-baseline-initial.log. Reusing an independent local copy of the existing 1.7.15 dependency installation, then repeat full baseline before code changes. No production process/data touched.

## Acceptance tests

| AC | Planned executable checks | Layer |
|---|---|---|
| 01 | Register two, persistent return/list, existing logout and QR regressions | integration/E2E |
| 02 | Missing/unproven/expired session, owner substitution, second wallet | integration/E2E |
| 03 | Fixed provider configuration and blocked alternate routes/methods | integration |
| 04–05 | Name/URI counts/boundaries, malicious names, redirect rejection matrix and preserved query | integration/E2E |
| 06 | Actual provider secret hash vs raw response, no secret on retry/list/read, ephemeral UI/storage | integration/E2E |
| 07 | Own list/detail, foreign guessed ID and unavailable management routes | integration/E2E |
| 08 | Rate boundary/window, cap boundary/restart, concurrent creates | integration |
| 09 | Same submission concurrent/retry, lost response, database failures, no orphan | integration/E2E |
| 10 | Expiry/reauthentication same vs other wallet, no autosubmit, network recovery | integration/E2E |
| 11 | Both themes/system changes, mobile 320px/200%, keyboard/focus/errors, axe/contrast | E2E |
| 12 | Supported provider real execution, setup/build/start and dependency graph | integration/build |
| 13 | Full verify, committed complete scope, independent technical review | all |

## Verification commands

Focused npm test/typecheck/browser checks during implementation, then full bash scripts/verify.sh before QA_PASSED. Complete committed-diff scope via python3 scripts/check_scope.py --base eaca15f --head HEAD --scope work/US-002/scope.json. Fresh read-only independent review before completion. Capture no real client secrets or session credentials. CI is not requested before human finished-result approval.

## Risks and technical decisions

Investigate supported provider APIs, asynchronous SQLite transactions and atomic retry/cap enforcement before code. Never hold a better-sqlite3 synchronous transaction over an await. Provider absence of an adequate atomic mechanism requires investigation, not weakening AC. Internal JWT setup must not expose discovery/key/token routes. Source research is not an integration test. Five-attempt window algorithm and request IDs are routine technical choices; record their exact observable semantics and tests. Preserve all human approval metadata and approved AC lines. No acceptance or release is inferred.

## Execution checklist

- [ ] Baseline restored and recorded
- [ ] Implementation and meaningful negative/acceptance checks
- [ ] Full local verification and committed scope
- [ ] Independent review findings resolved
- [ ] Evidence and QA_PASSED presented for human review

## Execution checkpoint and blocking decision

Restored baseline passed. Added the exact provider/core 1.7.15 dependencies without altering existing resolved versions. Implemented real provider-backed registration and transactional bookkeeping; 34/35 new integration tests pass, with the approved positive local-HTTP callback case blocked by canonical provider validation. Existing 83 application regressions passed before adding the new suite. No frontend files were created.

The documented intended skeleton remains a plan; currently only backend/applications/{index,registration}.ts and backend/oidc/index.ts are created. Source inspection independently confirms no registration override. Preserve AC-05 and report BLOCKED pending human policy change or further supported-integration direction. No protocol/native-client workaround, plaintext secret, host-setting change or release is authorized.
