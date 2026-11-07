---
name: deliver-story
description: Implement, test, independently review and produce reproducible evidence for exactly one human-approved READY user story. Use after human approval, not for product discovery.
---

# Deliver Story

Input: exactly one story ID, e.g. `US-001`. Never begin implementation without it.

## Entry gate

1. Read `AGENTS.md`, `docs/PROCESS.md`, `docs/VISION.md`, `docs/PRODUCT_CONTRACT.md`, and `backlog/<id>.md`. Read the relevant journey/release context in `backlog/STORY_MAP.md` when present; linked story files remain authoritative for status and approved ACs.
2. If product documents are missing, story status is not `READY`, approval metadata is absent, ACs conflict, another story is WIP, or a material product decision is unresolved, **stop** and report the blocking gate. Do not alter human-owned approvals or approved ACs.
3. Inspect only relevant existing implementation and tests. Create `work/<id>/plan.md` from the plan template, mapping every AC to executable verification. Record risk and dependencies. Verify prerequisite stories or capabilities are available; a proposed map order is not evidence that a dependency is delivered. Implement only the selected story, not the entire mapped release.

Before implementation, read `docs/PROJECT_STRUCTURE.md` if present and map proposed changes to current owners. Show the intended skeleton for a new area and obtain human agreement on structure changes and writable paths, including tests, shared/config files and execution artifacts. Record the proposal in the existing plan; reuse explicit authorization already given for that exact scope. Pause before scope expansion. Create only directories needed for approved real files and do not move/duplicate legacy code by implication. Follow the structure guide's feature/shared/app dependency directions. If the guide is absent, propose the missing structure as harness planning before implementing a new area. Never claim proposed scope/dependency automation is already enforced; use only checks that actually exist and report the gap.

For UI work, also read `docs/UI_DESIGN_CONTRACT.md` before planning or changing code. Apply relevant design, interaction and accessibility requirements within approved scope. Product/security rules and protocol correctness take precedence, followed by accessibility, then aesthetic preferences. Map applicable UI requirements to verification in the plan and record actual results, artifacts and deviations in evidence. Raise conflicts requiring scope changes for human decision; the design contract's checklist does not authorize additional features or establish human acceptance.

## Execution

4. On beginning implementation, change only the story `status` to `IN_PROGRESS` (preserve all human metadata). Create `scripts/project-verify.sh` for the real tech stack if missing; **never** use a no-op or always-pass implementation. Run `bash scripts/verify.sh`; it is allowed to fail while work is unfinished, but failure must be resolved before QA_PASSED.
5. Implement the vertical slice. Write meaningful automated acceptance tests and negative cases, preferably red-to-green when practical. Keep unrelated behavior unchanged.
6. Move status to `VERIFYING`. Run focused tests, regression checks and `bash scripts/verify.sh`; fix code and tests within the approved scope until verification passes or a blocking limit is reached. Do not disable/skip failing required checks, fabricate results, or reduce coverage merely to pass CI.
7. Review the diff independently where practical (read-only subagent or fresh review pass). Inspect security, data handling, regressions, AC coverage and dependency risks; resolve material findings and rerun impacted tests. A reviewer is **not** a human business approver.

## Evidence and exit gate

8. Create `work/<id>/evidence.md` from the evidence template; record exact commands, exit codes, current commit SHA, test output/CI links if available, AC-by-AC results, review and known limits. Do not write `Status: PASS` without actual successful checks. For CI-dependent QA, reference a successful CI run for the relevant commit before claiming CI passed; never invent a CI run or success.
9. If a required test or review cannot complete, change status to `BLOCKED`, explain why and provide the smallest needed human decision or next debugging action; do not claim QA_PASSED.
10. After real **local** project checks pass, mark `status: QA_PASSED` as a proposed technical outcome and prepare a PR if authorized. This commit must then pass required **CI on the same SHA** before G2 is actually satisfied. Until CI finishes, report "QA candidate; CI pending" rather than "CI passed"; on failure return to debugging. Once green, present a demo and request human acceptance.
11. **Never** change `accepted_by`, `accepted_at` or `status: ACCEPTED`; that decision belongs to the human. Do not merge, deploy, delete production data or escalate permissions without authorization.

Final response: scope, relevant files, AC matrix, actual verification outcomes, evidence path, blockers/risks, and next human acceptance action.
