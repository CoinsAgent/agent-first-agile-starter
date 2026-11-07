---
name: deliver-story
description: Implement, test, independently review and produce reproducible evidence for exactly one human-approved READY user story. Use after human approval, not for product discovery.
---

# Deliver Story

Input: exactly one story ID, e.g. `US-001`. Never begin implementation without it.

## Entry gate

1. Read `AGENTS.md`, `docs/PROCESS.md`, `docs/VISION.md`, `docs/PRODUCT_CONTRACT.md`, and `backlog/<id>.md`. Read relevant journey/release context in `backlog/STORY_MAP.md`; linked stories own status and ACs.
2. Recover pending local acceptance records before evaluating WIP: inspect retained worktrees/branches and the previous story/evidence, confirm actual human merge and required-check provenance, and carry that record into the new branch with explicitly declared paths. Main may still show `QA_PASSED` because acceptance is published in the next approved PR. If product documents/approval are missing, selected story is not `READY`, another story is genuinely WIP or a material decision is unresolved, stop and report the concrete gate. Never invent approval or silently alter ACs.
3. Inspect relevant implementation and tests. Create one `work/<id>/plan.md` and one `evidence.md` from the templates, mapping every AC to verification. Verify dependencies are delivered; map order alone is not evidence. Implement only the selected story.

Follow PROCESS's five steps: human story approval → baseline checks → declared paths and implementation/local QA on a new branch → human approval of the finished result followed by PR/CI → human merge and local acceptance recording. Preserve unrelated changes. Read `docs/PROJECT_STRUCTURE.md`, document any new-area skeleton and declare narrow paths including tests/shared/config/execution artifacts before editing. Record technical path revisions without a separate path-approval gate; pause for changed outcomes or other human-owned decisions. Create only needed directories. No custom App, early draft PR or trusted scope-approval comment is required. Do not open a PR or start hosted CI before explicit human approval of the finished result, even if host protection requires a PR for eventual merge.

For UI work, read `docs/UI_DESIGN_CONTRACT.md` before planning/changes. Apply relevant requirements within approved scope; product/security and protocol rules take precedence, followed by accessibility, then aesthetics. Record applicable checks/results/deviations; raise scope conflicts for human decision. The design contract does not authorize features or establish acceptance.

## Implementation and local QA

4. Start implementation by changing only `status` to `IN_PROGRESS`, preserving human metadata. Create real stack-specific `scripts/project-verify.sh` if missing; never use a no-op/always-pass script. Record baseline checks and pre-existing failures.
5. Implement the approved vertical slice. Use meaningful acceptance, regression and negative tests, red-to-green where practical. Run focused checks during development. Ordinary test failures remain `IN_PROGRESS` while you can debug them. Use `BLOCKED` only when progress cannot continue because of missing information, an unavailable dependency or a required human decision; explain the concrete impediment and resume `IN_PROGRESS` after resolution.
6. Before every transition to `QA_PASSED`, run the full `bash scripts/verify.sh`, complete all other required local checks, inspect the complete declared diff and resolve material technical review findings. Use a fresh review pass or read-only reviewer where appropriate; a technical reviewer is not a human business approver. There is no separate verification state. Never skip/disable failing required checks or reduce coverage to pass.
7. Record actual commands, exit codes, tested revision, AC results, review and limitations in evidence. Write `Status: PASS` only after required local checks/review succeed, then directly set story `status: QA_PASSED`. CI is not a prerequisite for local QA. A missing, skipped, incomplete or failing required check prevents QA. Do not fabricate CI results; explicitly state that CI has not been requested.

## Human review and PR/CI

8. Present the locally verified finished diff/demo, actual paths, tested revision, AC matrix, evidence and limitations. Wait for explicit human approval of that result before publishing a PR or starting hosted CI. READY approval is implementation authorization, not finished-result approval.
9. After that approval, open the story PR; existing required CI runs on creation and code updates/reopening. Preserve host protection/check names. Inspect outcomes at useful checkpoints with notifications or bounded/backoff checks; avoid continuous polling and repeated unchanged logs. Read failure details when needed. CI failure or requested corrections return `QA_PASSED → IN_PROGRESS`; fix within approved scope without another permission request, repeat relevant focused checks and full local verification before restoring QA, and let updated PR code rerun required CI automatically. Present the revised result for renewed human review before merge. Do not trigger duplicate push/post-merge verification or bypass required checks.

## Human merge and acceptance recording

10. The human merges the reviewed PR after required CI succeeds for the current revision. Do not merge on their behalf. That human merge explicitly means business acceptance; no second acceptance request is needed. CI alone, an unmerged/closed PR or an agent/bot merge is insufficient.
11. Confirm the actual human merge and required-check provenance. Record its PR URL, merge SHA, human merger and timestamp in existing evidence, then set story `status: ACCEPTED`, `accepted_by` to that observed identity and `accepted_at` to the merge date. This records the authorized human decision; never invent identity or acceptance. If facts are missing, leave status unchanged and report the gap. No release, deployment, destructive operation or elevated permission is authorized by merge.
12. Preserve the acceptance record locally in a named commit/branch or retained worktree and report its recovery location/SHA. Include the record and related evidence in the next approved PR with explicitly declared paths; do not create an acceptance-only PR/CI cycle. Main will retain the earlier QA status until that later PR merges. Recover verified local records before the next WIP check, following PROCESS; do not create another status tracker.

Final response: story/status, scope, branch/reviewed revision, actual verification, evidence, limitations and next human review action. Before PR approval, report local `QA_PASSED`, CI not requested, and wait. After approval, report current required CI truthfully; after human merge, report the local acceptance record and delayed publication.
