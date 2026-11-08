# Delivery plan — US-001-05

## Story and scope

Approved story: backlog/US-001-05.md, AC-01–AC-08. Human decisions: "yes to all", "yes" to ongoing retired-prefix checks, and "make 05 ready" on 2026-11-08; then explicit "$deliver-story 05". Preserve all approval/acceptance metadata. Non-goals: product/UI/security changes, new libraries, packaging changes, refactoring, host mutation and early PR/CI.

## Current architecture and approach

Read AGENTS, PROCESS, Vision, Product Contract, UI Design Contract, story map, approved story, structure guide and current code/tooling. Current owners map source under frontend/src and backend/src. Lift all 27 tracked source/assets one level without modifying their bytes. Internal relative imports retain the same relationships. Keep frontend/index.html, updating only its module path. Update root tool/alias and test references. Retain one root package/lockfile and root dist/tests, runtime config, CSP, initialization, providers and all behavior.

## Structure and writable paths

- Branch: codex/us-001-05-layout; approved shaping base: ca2c864472d207aa4365249d3cfe2c33292beaa0; eventual PR/full-diff base: 0d5dde0125d5175b455854aa6e3b6458cfb12437 (fetched main).
- Structure target was documented before implementation in docs/PROJECT_STRUCTURE.md, proposed follow-up section: frontend/main.tsx, bootstrap/, pages/, wallet-auth/, ui/, lib/, assets/, styles/; backend/index.ts, bootstrap/, wallet-auth/, infrastructure/. Future domains remain documentation-only. No new domain/skeleton.
- Exact writable files and both move endpoints are declared in scope.json BEFORE source edits; mapping.json records all bytes/paths from the approved base.
- Source/destination paths: mechanical moves. HTML/root tools/tests: path resolution and real root-command smoke checks. Structure declaration/baseline/docs: translate owners and five exact baseline edges with provenance. Browser files: only screenshot destinations switch to this story, retaining every assertion and preserving historical artifacts.
- Work files: plan/evidence/scope, mapping, reproducible preservation and root-command smoke helpers, ignored artifacts for logs/screenshots. Temporary ignored .env containing only test configuration may be created by smoke checks if absent, then removed; never modify an existing .env or data. Generated node_modules link, dist, test-results are verification setup/output, not source moves.
- Carry-forward: original main still has US-001-04 QA metadata; verified human merge PR #6 by CoinsAgent at 2026-11-08T06:01:29Z, merge 0d5dde0, both required jobs passed in 42383540729 for f7f5bc7. Acceptance-only commits d70b40d/7947450 are already ancestors. The three existing record paths are explicitly declared for the next approved PR; no new approval/acceptance decision is invented.
- Prerequisites: US-001-03 and US-001-04 implementations present on fetched main. US-001-04 retained acceptance recovered; no other story WIP. Original dirty checkout and other worktrees preserved.
- Checker detail: widening source roots to frontend/backend includes frontend/index.html. Declare its precise app/browser file owner; add .html to supported data extensions (not parsed as code). Check unknown files remain rejected. No checker exclusion or broad owner added; retired src paths remain unowned within scanned roots.
- Technical path revisions: none yet; record before affected edits. No scope/product conflicts identified. Current story AC-08 and PROCESS govern local QA, no VERIFYING/early CI; stale supplied skill steps cannot override approved workflow.

## Acceptance tests

| AC | Verification |
|---|---|
| AC-01 | check-preservation.py: exact before/after inventory, checksums, no retired dirs/collisions or duplicate files |
| AC-02 | full lint/types/build/unit/browser suite and smoke.mjs for npm run dev and npm start from root: HTML/assets/CSP/API; root aliases/outputs checked |
| AC-03 | Node dependency fixtures, actual and committed-source analysis; preservation helper checks exact translated config/baseline with five existing edges |
| AC-04 | updated layout fixtures plus retired-prefix/unowned-source and owned/unowned HTML cases, runtime/shared/domain negatives including aliases/type-only |
| AC-05 | unchanged application/browser assertions; immutable 27 relocated files/assets; screenshot output changes only; light/dark/mobile/keyboard regressions |
| AC-06 | active-path search and updated structure/development/map guidance; historical records unchanged except authorized predecessor acceptance carry-forward |
| AC-07 | preservation helper verifies lockfile/dependency/runtime script invariants; root smoke uses isolated in-memory DB and explicit test config; no data/secrets moved |
| AC-08 | full bash scripts/verify.sh, actual committed diff scope, preservation/smoke, fresh complete diff review, evidence with real revisions/results |

## Baseline checks

Full bash scripts/verify.sh running on approved shaping base; log /tmp/us-001-05-baseline.log. Record final observed outcome before source implementation. Versions: Node v22.22.1, npm 9.2.0, Python 3.14.4. Installed dependencies reused through ignored node_modules symlink; no fresh installation is claimed.

## Verification commands

- node --test tests/structure/*.test.mjs; node scripts/check_dependencies.mjs (focused)
- python3 work/US-001-05/check-preservation.py
- node work/US-001-05/smoke.mjs (after build)
- STRUCTURE_SCOPE_BASE=0d5dde0125d5175b455854aa6e3b6458cfb12437 STRUCTURE_SCOPE_HEAD=<full-sha> STRUCTURE_SCOPE_FILE=work/US-001-05/scope.json bash scripts/verify.sh
- node scripts/check_dependencies.mjs --ref <full-sha>; git diff --check

## Risks and review

Review complete diff, actual vs declared paths, exact source bytes/owners/baseline, root tool resolution and any historical path changes. Main risk is partial tooling/relative path update; full source comparison plus real root startup/build/browser tests address it. Browser providers are simulated; no new physical-wallet support is claimed. Hosted checks and human review/merge follow explicit approval of finished result; no push/PR/CI/merge is authorized now.

## Execution checklist

- [x] Baseline observed
- [x] Relocation and controls complete
- [ ] All required checks pass
- [x] Fresh technical review complete
- [ ] Current evidence and local QA status recorded
- [ ] Present full branch for human finished-result review before PR/CI

Baseline observed: exit 0; 43 Python, 36 structure, 83 application and 68 browser tests, plus lock sources/lint/types/build. No baseline failures.

## Review and verification follow-up

First post-move full suite passed on implementation 84642ba: 43 Python, 41 structure, 83 application, 68 browser tests (54.0s), plus lint/types/build and dependency checks. Red layout checks intentionally failed 16/16 before the move; green fixture suite passes 41/41. First red log was initially redirected to a work-root filename then immediately moved into the declared ignored artifacts directory; no undeclared path remains in the diff.

Independent read-only reviewer review_us00105 found no source/tooling/policy defect; corrected two stale story/map narrative statements without changing ACs. Reviewer found possible smoke false positive with existing listeners. Own-log readiness plus live-child check added; the first port-conflict negative check then revealed Express can invoke the existing listen callback on EADDRINUSE. Added exclusive-bind preflight, preserving product code. Negative fixture now exits nonzero with EADDRINUSE; positive dev/start smoke reruns pass. Reviewer rechecked final helper and narrative fixes, no remaining material finding. The bind-close/spawn interval remains a local concurrency limitation, documented in evidence.

No technical scope expansion was needed; all helper/test/log paths were predeclared. Final exact-implementation full verification with complete-diff scope follows the review correction before QA.
