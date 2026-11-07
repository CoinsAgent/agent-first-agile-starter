# Delivery plan — US-001-03

## Story and scope

Approved by Forrest on 2026-11-07; explicit conversation decisions Q1–Q8 authorize the criteria in `backlog/US-001-03.md`. Deliver AC-01 through AC-08 only. No application behavior changes, layout migration, host changes, PR publication, merge or release before human finished-result approval.

## Current architecture and approach

Use existing Python lifecycle validation/tests, local verification entry point, two required GitHub jobs and documentation/skill owners. Remove the obsolete state; keep real local checks and required PR checks. CI runs on approved PR creation/code updates/reopening, not pushes/comments/merge events. Opening the PR is the behavioral approval boundary, not authenticated approval enforcement. Preserve required check names.

Post-merge acceptance is recorded locally with observed human merge provenance and carried into the next approved PR. No automatic acceptance writer, new permissions, dedicated acceptance PR or competing status file. Recover the local record from its worktree/commit and verify provenance before WIP evaluation.

## Structure and writable paths

Reference: `docs/PROJECT_STRUCTURE.md`; no production ownership or dependency changes. New files belong to the existing central harness test owner (`tests/test_ci.py`) and execution-artifact owner (`work/US-001-03/{plan.md,evidence.md,scope.json}`). Create only those real files/directories.

The exact allowed files are listed in `scope.json`. Documentation/skills/templates explain lifecycle, test cadence, PR timing and delayed acceptance persistence. `scripts/check_harness.py` and its tests own state/evidence/WIP checks; `.github/workflows/ci.yml` and `tests/test_ci.py` own event selection/regression checks. `scripts/verify.sh` already discovers Python tests, so needs no change.

Prerequisite carry-forward: copy the approved US-001-03 from the original workspace; preserve the existing migration draft by renumbering it US-001-04 with no scope changes. Update map/guide/config references. Carry only US-001-02's already-recorded acceptance and related historical plan/evidence from the existing acceptance worktree, leaving its historical scope manifest unchanged. This avoids a second changed scope manifest in this PR and preserves unrelated dirty files in the original workspace.

Branch: `codex/us-001-03-local-qa`; isolated worktree `/tmp/us-001-03-delivery`; base `04629ff6565e25cd3871af58186d0a5fd8b921d0`. Dependencies reused through an ignored node_modules symlink; application code/package/lock remain unchanged. Baseline `bash scripts/verify.sh` passed against the original workspace before implementation: 33 Python harness, 29 Node structure, 83 unit/integration and 68 browser tests; log `/tmp/us-001-03-delivery-baseline.log`. Local runtime Node v22.22.1/Python 3.14.4. Focused new regression run initially failed as expected (obsolete state still accepted and old CI events/job present); after implementation all 43 Python tests pass. No pre-existing baseline failure.

Live read-only host inspection: main SHA matches the base; protection requires `Harness and product verification` and `PR path scope`, zero approving host reviews, admin enforcement enabled. No protection/permission changes. Required names/routes are compatible with delayed PR publication.

Technical path revisions: none. `.git/info/exclude` ignores the local node_modules symlink; this is local Git housekeeping, not a tracked source/config change. Pause if an approved outcome or other human-owned boundary must change.

## Acceptance tests

| AC | Verification |
|---|---|
| AC-01 | Harness regression tests reject VERIFYING and enforce WIP across remaining active states; process/skill diff review |
| AC-02 | QA evidence negative/positive fixtures; full local verify before status transition |
| AC-03 | Workflow event matrix rejects pre-approval branch pushes, comments and PR-target events |
| AC-04 | Matrix accepts main PR creation; review skills/approval boundary and preserved required names |
| AC-05 | Matrix accepts code updates/reopening, rejects duplicate merge pushes; review fix/review/monitoring instructions |
| AC-06 | Acceptance metadata fixtures plus fresh review of human-merge provenance, delayed persistence and recovery instructions |
| AC-07 | Active guidance search/diff review; preserve historical evidence and approved story criteria |
| AC-08 | Full verify, committed complete-diff scope check, no unrelated application changes |

## Verification commands

- `python3 -m unittest discover -s tests -p 'test_*.py'` (focused harness/workflow checks)
- `bash scripts/verify.sh` (full real local validation)
- `python3 scripts/check_scope.py --base 04629ff6565e25cd3871af58186d0a5fd8b921d0 --head HEAD --discover-scope`
- `git diff --check` and fresh complete-diff review

## Risks / dependency / human decisions

The current default-branch workflow still has old triggers until this change merges; do not push/publish this branch before human finished-result approval. Hosted event behavior/CI will be observed only after that approval. During initial adoption, old default-branch PR-target/comment triggers can remain active until this story merges; report any such transitional legacy diagnostic separately rather than claiming all hosted runs already follow the new policy. Tests validate configuration, not approval authenticity or physical wallet compatibility. Delayed acceptance publication can leave main stale indefinitely; report provenance and local record location for recovery.

## Execution checklist

- [x] Regression tests demonstrate the changed lifecycle and event behavior
- [x] Local checks and fresh complete-diff review pass
- [x] Evidence records actual commands/results and limitations
- [ ] QA_PASSED result presented to the human before PR/CI publication
- [ ] Human merges only after current required CI and review
- [ ] Post-human-merge acceptance recorded locally and carried into next approved PR

## Completion of local engineering

Full verification passed (43 Python, 29 structure, 83 unit/integration, 68 browser tests plus lint/types/build/dependencies/scope). Independent read-only review found no material defect; three prose clarifications were reviewed afterward. Implementation commit a265247605da8cd8afacd660c3c04310a819f3ba; final record commit contains reviewed prose and QA/evidence bookkeeping only. No paths added beyond the original 26-file declaration. Actual paths match the scope manifest. Human result review precedes all publication/PR/CI; no merge or release is authorized.
