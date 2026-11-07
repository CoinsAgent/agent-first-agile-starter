# Verification evidence — US-001-04

Status: PASS

Local QA candidate; CI pending. PASS records observed local results, not CI success, business acceptance or merge authorization.

## Context and provenance

- Branch: `codex/us-001-04-layout`; worktree `/home/ubuntu/us-001-04-delivery`.
- Base: `c2e3da6757b2c3dc37a801892705754f286b7fa6`, a local snapshot of the pre-existing dirty checkout at original HEAD c165e43. Earlier changes are in this parent, excluded from the migration diff. Original checkout/index preserved.
- Implementation commit: `4a27d6eea228e74a0b33eb2cc456a05ec2387383`. The QA candidate commit adds this evidence, plan completion notes and QA_PASSED metadata only. Obtain its exact SHA with `git rev-parse HEAD`; final validation uses that SHA.
- Environment: Node v22.22.1, Python 3.14.4; installed dependencies reused through an ignored node_modules symlink. Lockfile unchanged; no fresh npm ci claimed. No local secrets/database copied.
- CI: no run for this unpublished branch. No push, PR, host-setting change, merge or deployment performed. The local integration snapshot includes prerequisite process/harness work that needs separate review before publication; it is not a clean migration-only diff against main.
- Scope: 25 source/HTML/asset move pairs in `mapping.json`; exact original allowlist and recorded technical additions in `scope.json`/`plan.md`. Current complete diff has no undeclared paths.

## Acceptance matrix

| AC | Actual local verification | Result |
|---|---|---|
| 01 | Mapping, skeleton and exact scope recorded before source edits; follow-up test/artifact paths declared before editing | PASS |
| 02 | Git/filesystem inventory: no active root src/server, one root package/lockfile, no empty production directories | PASS |
| 03 | Lockfile source check, lint, tsc, Vite production build, SDK hash generation and root-started Playwright backend | PASS; installed dependency set reused |
| 04 | 83 application tests plus 68 browser regressions cover SIWE, QR, expiry, replay, session/reload/logout and recovery | PASS; simulated providers/relay, not physical-device proof |
| 05 | Existing light/dark, keyboard/focus, responsive and axe assertions pass; eight style/asset/attribution files byte-identical | PASS |
| 06 | Working tree and committed-source dependency checks: 19 modules, 36 edges, five exact legacy exceptions, no errors/stale entries; 36 structure cases pass | PASS |
| 07 | Current structure/setup paths updated; historical stories/evidence unchanged; old locations labeled historical | PASS |
| 08 | Full verify.sh and complete committed-diff scope check pass; fresh diff review completed | PASS locally; exact-commit hosted CI pending |
| 09 | Backend entry/bootstrap/wallet-auth/infrastructure classified; new infrastructure→domain/bootstrap and browser→backend negatives fail as intended | PASS |
| 10 | main/bootstrap/pages extraction retains all component bodies and preload/nonce sequence; domain→composition and generic→domain negatives fail as intended | PASS |
| 11 | Guide/config/inventory agree; future domains remain uncreated; no generic app/features containers; tests/app retained | PASS |

## Verification

Observed baseline `bash scripts/verify.sh` exit 0: 33 Python tests, 29 structure tests, 83 application tests, 68 browser tests (51.6s), plus lockfile/lint/typecheck/build. Log: `artifacts/baseline.log`.

Observed final implementation `bash scripts/verify.sh` exit 0: 33 Python tests, 36 structure tests, 83 application tests, 68 browser tests (51.9s), plus lockfile/lint/typecheck/build. Log: `artifacts/implementation-verification.log`.

Additional observed checks:

- `python3 scripts/check_scope.py --base c2e3da6757b2c3dc37a801892705754f286b7fa6 --head HEAD --scope work/US-001-04/scope.json`: exit 0 on implementation commit, complete diff passed.
- `node scripts/check_dependencies.mjs --ref "$(git rev-parse HEAD)"`: exit 0 on implementation commit, 19 files/36 edges, zero errors/stale entries.
- `python3 work/US-001-04/artifacts/check-preservation.py`: exit 0. Eight style/assets/attribution files and lockfile identical; 15 relocated module bodies and all three original component bodies unchanged after import/export separation; preload/nonce startup retained. See `artifacts/preservation.log`.
- Branding SHA256: `755af121dc3a98a8f8eb2e84898f7e89570c66581a547bda04a1b16f7c7af3d8`.
- `git diff --cached --check`: exit 0 before implementation commit; no whitespace errors.

Reproduce final complete-diff checks from this worktree:

```bash
STRUCTURE_SCOPE_BASE=c2e3da6757b2c3dc37a801892705754f286b7fa6 \
STRUCTURE_SCOPE_HEAD="$(git rev-parse HEAD)" \
STRUCTURE_SCOPE_FILE=work/US-001-04/scope.json \
bash scripts/verify.sh
node scripts/check_dependencies.mjs --ref "$(git rev-parse HEAD)"
```

A final rerun on the QA candidate is captured in ignored `artifacts/final-verification.log`; its exit result is reported in the delivery response. Logs/captures are local reproducible artifacts, not committed source.

## Baseline provenance

All five entries retain `private-feature-import` and their original target meaning:

| Historical edge | Adopted edge |
|---|---|
| src/main.tsx → src/hooks/use-wallet-auth.ts | frontend/src/pages/sign-in.tsx → frontend/src/wallet-auth/hooks/use-wallet-auth.ts |
| src/main.tsx → src/components/wallet/wallet-flow.tsx | frontend/src/pages/sign-in.tsx → frontend/src/wallet-auth/components/wallet-flow.tsx |
| src/main.tsx → src/components/wallet/mobile-approval.tsx | frontend/src/bootstrap/app.tsx → frontend/src/wallet-auth/components/mobile-approval.tsx |
| src/main.tsx → src/wallet-sdk.ts | frontend/src/bootstrap/app.tsx → frontend/src/wallet-auth/wallet-sdk.ts |
| server/index.ts → server/auth.ts | backend/src/bootstrap/server.ts → backend/src/wallet-auth/auth.ts |

No new barrel/public API, reverse dependency, wildcard exemption, package upgrade or security-policy change was introduced.

## Review

Fresh single-agent review of the entire migration diff, all import/tool changes, initialization/extraction, declaration/baseline and AC coverage; mechanical comparisons supplement the reading. No separate reviewer or human approval is claimed.

Findings resolved: new negative-fixture setup initially lacked Git initialization; fixed. Existing transition-layout assertion expected old owner/alias; updated to adopted owners and added retired-path rejection. Dependency checker initially saw staged-deletion inventory until moves were staged; no checker weakened. Committed-source CLI requires a full SHA, so an initial `--ref HEAD` invocation was corrected to the full hash. Final successful runs supersede those failures.

Seven browser test files change only screenshot destinations, preserving all assertions. Twenty-nine fresh PNG captures are under this story's ignored `artifacts/` directory; dark Android 390px capture was visually inspected. Historical evidence/captures in the original checkout were preserved.

## Known limitations

- Hosted CI on the exact QA candidate remains pending; G2 is not yet complete. Current PROCESS applies; the separate US-001-03 proposal is not implemented.
- Browser tests use simulated EIP-1193 providers and SDK relay responses. Real extension/mobile device compatibility remains subject to existing documented limitations.
- Dependencies were reused, not freshly installed. Root npm commands require the documented .env/build prerequisites; Playwright started the migrated backend from root with its in-memory test configuration. Runtime environment names, origin/ports, root dist/CSP/hash behavior and database path logic are unchanged.
- Snapshot ancestry preserves earlier unpublished work. Review the migration as base..HEAD; review prerequisite changes separately before publication/integration.
- No business acceptance, merge authorization or production readiness is implied. Acceptance fields remain blank.

## Publication integration in progress — 2026-11-07

The user authorized prerequisite integration and hosted CI. Fetched main is 78c848047ced99104127d595e1aaef420121e593, which already includes structure controls and the newer accepted US-001-03 workflow. Its retained acceptance-only record f8d9698 is carried forward under the declared scope after confirming GitHub PR #5 merge provenance. The new publication branch codex/us-001-04-ci applies only the reviewed migration onto current main; the original local QA branch/worktree remains preserved. The old snapshot commit and unrelated skill installation files are excluded. Earlier statements that US-001-03 was not implemented and that CI was required for local QA describe stale local context; current main PROCESS is preserved.

Integration status is temporarily IN_PROGRESS until the full updated local suite passes. Original local results above remain historical; no new hosted result is yet claimed. Required host checks are Harness and product verification and PR path scope; admin enforcement remains enabled. No protection changes, agent merge or US-001-04 acceptance is authorized.

## Integrated local QA result

`STRUCTURE_SCOPE_BASE=78c848047ced99104127d595e1aaef420121e593 STRUCTURE_SCOPE_HEAD=c233f98 STRUCTURE_SCOPE_FILE=work/US-001-04/scope.json bash scripts/verify.sh` exited 0 on integrated implementation c233f98: 43 Python/harness tests, 36 structure tests, 83 application tests and 68 browser tests (51.7s), plus lockfile sources, lint, type checking, build/SDK hashes and the complete declared diff. Log: `artifacts/integrated-local-verification.log`. The final QA commit changes only status and evidence/plan completion notes.

Fresh integration review confirmed no diff to current main's CI workflow, lifecycle/process, harness checker/tests or installed skills. All migrated module/HTML/style/asset contents match the prior reviewed f298464, and assets/lockfile match current main. The only story-content conflict was approval/status metadata, resolved using explicit chat approval; no AC revision. `node scripts/check_dependencies.mjs --ref <full integrated SHA>` and `git diff --check origin/main HEAD` passed. US-001-03 acceptance provenance is unchanged from retained f8d9698 and its three paths are explicitly declared. Status restored to QA_PASSED after this full run, in accordance with current main PROCESS.

The user authorized publication and hosted CI in this conversation. Publish branch codex/us-001-04-ci against main and verify both required jobs for its exact head. Hosted CI is pending at this checkpoint. Original QA branches and working changes remain preserved; no merge, host-protection change or US-001-04 acceptance performed.

## Hosted CI passed on the exact published candidate

Published authorized [PR #6](https://github.com/CoinsAgent/agent-first-agile-starter/pull/6), branch `codex/us-001-04-ci`, exact head `f7f5bc78eb2287969f6a6582ab177b9b6a931730`, base main `78c848047ced99104127d595e1aaef420121e593`. [Hosted PR workflow 42383540729](https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/42383540729) completed successfully on 2026-11-07T14:53:10Z. Read-only run metadata confirms `head_sha` is exactly that candidate and event is pull_request.

Both required jobs passed: `Harness and product verification` (128436014514) and `PR path scope` (128436014683). Hosted logs show fresh npm ci and Chromium installation succeeded, then 43 harness tests, 36 structure cases, 83 application tests and 68 browser tests (56.1s), alongside lint, type checking, build/SDK hashes, lockfile sources and complete PR-diff path scope. Local saved log: `artifacts/hosted-ci.log`. This supersedes earlier CI-pending and no-fresh-install limitations for this published candidate.

GitHub confirms PR #6 remains open/unmerged, head unchanged, mergeable true and mergeable_state clean. Current protection still requires both named checks; no host settings changed. US-001-04 remains QA_PASSED, with acceptance metadata blank. The next step is human review and human merge under current main PROCESS; no agent merge or business-acceptance claim is made.

Retain this CI-outcome appendix locally on `codex/us-001-04-ci-evidence` in `/home/ubuntu/us-001-04-ci`, separate from the unchanged published/tested head, to avoid a redundant CI run solely for evidence. The original delivery and original dirty checkout are preserved.
