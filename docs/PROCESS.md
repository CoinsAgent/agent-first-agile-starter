# Story-based delivery process

**Topic:** Humans steer. Agents execute. (Human-led decisions → Agent execution → Automated verification → Human acceptance.)

## Decision rights

| Decision or action | Owner |
|---|---|
| Vision, Contract, priority, user value | Human |
| Draft acceptance criteria and suggest stories | Agent proposes; Human approves |
| Architecture and implementation details within approved boundaries | Agent |
| Routine tests, fixes, technical review, evidence | Agent + CI |
| Changes to approved scope, significant risk/cost or elevated privileges | Human |
| Business acceptance and authorization to release | Human |

## Shaping before delivery

Use `shape-story` to map journeys → propose a minimal end-to-end release → split it into stories → detail the next story’s acceptance criteria.

- Map actors and their ordered activities in `backlog/STORY_MAP.md`, using `backlog/STORY_MAP_TEMPLATE.md`. Group capabilities into a proposed minimal usable release and later slices. Explain the release outcome, exclusions, dependencies and success signal.
- Create DRAFT stories for that release; keep later capabilities in the map until needed. Give each draft an actor, value, scope and provisional AC outline. Detail positive, negative and boundary ACs for the next recommended story before asking for READY approval.
- A small foundation story can be delivered first, but the map must show how it contributes to the end-to-end release. Do not equate an isolated foundation with the full product outcome.
- Human decisions own release priorities, product policy and scope. Label proposed defaults and unresolved decisions; map approval alone does not authorize implementation or make linked stories READY.
- The map supplies breadth and links; story files own status, approved scope and ACs. Do not copy lifecycle statuses or approval metadata into the map. Changes to a map cannot override approved story scope.
- Multiple DRAFT and READY stories may exist. Deliver one approved story at a time. For targeted refinement, reuse the map and update the relevant story without rebuilding the entire backlog.

## Approved delivery workflow

The human approved the US-001-03 refinement on 2026-11-07: verify locally before human review, defer PR/CI until approval of the finished result, and treat human merge as acceptance:

1. **Human approves a story.** The approved outcomes and acceptance criteria authorize implementation within that story. Preserve the human's actual decision and metadata; never invent approval.
2. **Codex runs checks.** Inspect relevant context, existing changes and ownership, then run the applicable baseline checks. Record existing failures before making changes; resolve them within scope or report a blocker.
3. **Codex proposes allowed files on a new branch and verifies locally.** Create a story branch from the intended base, preserving unrelated local changes. Record narrow allowed paths and reasons in the plan/scope manifest before implementation. Implement there and rerun scope, dependency and product checks on the complete diff. Use focused checks while developing; run the full `bash scripts/verify.sh` and complete required checks/review before every transition to `QA_PASSED`. After success, Codex directly records `QA_PASSED` with evidence. CI is not required for this local engineering outcome. Do not open a PR or start hosted CI during pre-approval iterations. A separate human file-scope approval is not required. Codex may refine technical paths needed for the approved story, recording the reason and reviewing the full diff; changes to approved outcomes, security/privacy, cost, permissions or destructive operations still require a human decision.
4. **Human reviews the locally verified result and authorizes PR/CI.** Present the complete branch diff/demo, proposed versus actual paths, local checks, evidence and limitations at `QA_PASSED`. Explicit human approval of this finished result authorizes opening the story PR; story READY approval alone does not. Opening the approved PR starts required CI. Review applies to the presented revision: in-scope fixes need no extra permission request, but require renewed checks and human review before merge. Chat approval does not impersonate a GitHub approving review or override host rules.
5. **The human merges the reviewed PR.** Required CI must pass for the current PR revision before human merge. Human merge explicitly constitutes business acceptance of that story. After confirming the actual human merge, Codex records `ACCEPTED` locally with the observed human identity, date, PR URL and merge commit. No second business-acceptance request is needed. Preserve the local record and publish it in the next approved PR as described below. Codex does not merge on behalf of the human. Merge does not authorize deployment, release or a host-settings change.

No custom GitHub App, `/approve-scope` comment, independent publisher or separate pre-edit path approval is required by this workflow. Scope checks detect differences from the declared paths; they do not authenticate approval or prevent local filesystem writes. Human review includes changes to scope, policy, baseline and verification code. This accepts reliance on agent discipline and human review rather than claiming an independently enforced authorization boundary.

Existing GitHub protection remains effective until explicitly changed. If it requires a PR or a different reviewer, follow it or report the mismatch; never bypass it or claim a chat decision satisfies GitHub's review requirement.

## Structure and file-scope planning

Read [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md), identify existing owners and document the intended skeleton before implementing a new area. Create directories only for files needed by the approved story. Include tests, shared/config files, dependencies and execution artifacts in the branch's declared paths; there are no always-writable common files. Avoid unrelated edits and record technical scope revisions before affected edits. Ask the human when a revision changes approved story outcomes or another human-owned decision.

Use `scripts/check_scope.py --base <base> --head <head> --scope work/<story>/scope.json` for a complete committed diff. Inspect uncommitted changes as well. Local checks and CI provide evidence, not human acceptance. The optional legacy approval verifier is not a delivery gate under this process.

## Story states

- `DRAFT` — agent may draft and refine. No product work.
- `READY` — human has explicitly approved Story + ACs; product documents exist.
- `IN_PROGRESS` — agent implementation has begun; work plan and stack-specific checks are required.
- `BLOCKED` — progress cannot continue because of missing information, an unavailable dependency or a required human decision. Report the concrete impediment; ordinary failing tests remain `IN_PROGRESS` while Codex can debug them.
- `QA_PASSED` — all required local checks and technical review passed with evidence; ready for human review. No PR/CI is required to reach this status.
- `ACCEPTED` — the human merged the reviewed story PR after required CI passed; the agent records that observed acceptance locally, then carries the record into the next approved PR.

Allowed default flow: `DRAFT → READY → IN_PROGRESS → QA_PASSED → ACCEPTED`.
For an impediment: `IN_PROGRESS → BLOCKED → IN_PROGRESS`; for a failed QA check, CI failure or human-requested correction: `QA_PASSED → IN_PROGRESS`. Debug ordinary failures in `IN_PROGRESS`; only use `BLOCKED` when progress cannot continue. Any change to approved acceptance criteria requires renewed human approval and a reviewable Git diff.

**WIP limit:** at most one story in `IN_PROGRESS`, `BLOCKED`, or `QA_PASSED`. `ACCEPTED` stories are completed and do not count toward WIP. This first version favors reliable one-story-at-a-time delivery.

## Gating criteria

**G0 — Contract:** Story must not contradict the two human-approved product documents.

For UI stories, read `docs/UI_DESIGN_CONTRACT.md` during shaping, implementation and review. Apply relevant design and accessibility requirements within approved scope; product/security rules and protocol correctness take precedence, followed by accessibility, then aesthetic preferences. Record applicable UI checks, actual results and deviations in the story plan/evidence. Resolve conflicts that require scope or product decisions with the human; the design contract does not authorize scope expansion or replace G3 human acceptance.

**G1 — Ready:** Value, user, measurable positive/negative ACs, scope boundaries and dependencies are explicit. The human authorizes READY and supplies `approved_by` and `approved_at`; record that decision in story metadata, by the human or an agent explicitly authorized to transcribe the supplied values. The harness checker checks formatting, not whether approval is authentic. Retain the explicit human decision; a PR is not required to approve a story.

**G2 — Local engineering:** Relevant ACs are covered by real executable checks, regressions run, technical review findings are addressed, and evidence records actual outcomes and the tested revision. Run focused checks while developing and the full `bash scripts/verify.sh` before every transition to `QA_PASSED`. Codex sets that status directly when required local checks/review pass. Missing, skipped, incomplete or failing required checks prevent QA. This gate is complete locally; CI has not been requested until the human approves the finished result. The Python checker validates record structure, not evidence authenticity or test semantics.

**G3 — Human review, CI and acceptance:** Human approval of the finished local result authorizes opening the PR and starting CI. Required CI must succeed for the current revision and the human must review subsequent changes before merging. In-scope corrections and automatic PR CI reruns do not need separate permission requests. Human merge means business acceptance; Codex records the observed merge afterward, preserving provenance and never inventing identity or approval. CI success or an unmerged PR alone cannot establish acceptance.

## Hosted verification cadence

The workflow runs the existing required product and path-scope jobs for PRs targeting `main` on `opened`, `synchronize` and `reopened`. Create the PR only after explicit human approval of the finished result. There are no push, PR-target, comment or post-merge automatic runs, so branch pushes before a PR and pushes caused by merging do not duplicate full CI. Required check names and read-only permissions remain unchanged. Opening a PR is a behavioral approval boundary, not proof of authenticated human approval; host protection and actual review still apply.

After PR publication, inspect CI outcomes at useful checkpoints, using completion notifications when available and bounded/backoff checks otherwise. Read detailed failure logs when needed, avoid continuous polling/repeated unchanged logs, and fix failures within approved scope. Re-run focused checks during fixes and full local verification before restoring `QA_PASSED`; updated PR code triggers CI automatically. Present the revised result for human review once current required checks pass.

The optional legacy scope-approval diagnostic remains available as a manually invoked CLI, not an automatic job or delivery gate. This story does not weaken required checks or change host settings.

## Post-merge acceptance and recovery

Confirm the story PR is actually merged by a human, its current reviewed revision passed required checks, and record the PR URL, merge SHA, merger and merge timestamp in the existing evidence file. Record `status: ACCEPTED`, `accepted_by` from the observed human merger and `accepted_at` from the merge date in the story front matter. If identity, checks or merge facts cannot be established, leave the status unchanged and report the missing fact. Never infer acceptance from `QA_PASSED`, CI success, closure without merge or an agent/bot merge.

Preserve this acceptance-only change locally in a named commit/branch or retained worktree and report its location/SHA for recovery. Do not push it just to start CI or open a dedicated acceptance-only PR. Include the previous story record and related evidence in the **next approved PR**, explicitly declaring those paths in that story's scope. This carries forward an already-observed acceptance; it does not ask the human to accept the same story again. Required CI still checks the next approved PR normally.

Until that next PR merges, `main` retains the earlier `QA_PASSED` record, potentially indefinitely if there is no next PR. On resuming or preparing the next story, inspect retained worktrees/branches, the local story and evidence, and actual host merge provenance before evaluating WIP. Carry a verified pending acceptance record into the new story branch before starting another story. If local records are missing, reconstruct only from confirmed host facts and report the recovery; never silently treat stale main metadata as current acceptance or invent provenance. Front matter remains the sole status record; no separate acceptance tracker is created.

## Persistent artifacts

- One story map: `backlog/STORY_MAP.md` (copy `backlog/STORY_MAP_TEMPLATE.md`); proposed journeys, release slices, story links and open decisions.

- One story: `backlog/US-001.md` (copy `backlog/STORY_TEMPLATE.md`). Its front matter is the **single source of truth for status**.
- A separately scoped follow-on story may use `backlog/US-001-01.md` (base number of at least three digits, optional suffix of at least two digits). It has its own approvals, plan/evidence and the same lifecycle/WIP gates; the suffix does not inherit approval from its predecessor.
- One execution plan: `work/US-001/plan.md` (copy `work/PLAN_TEMPLATE.md`).
- One evidence record: `work/US-001/evidence.md` (copy `work/EVIDENCE_TEMPLATE.md`).
- Git commits and PR links provide provenance; test logs or CI run URLs provide evidence. Keep stale results clearly distinguished.

## Verification contract

- `bash scripts/verify.sh` always runs harness self-tests and story metadata checks.
- After any story enters `IN_PROGRESS`, `BLOCKED`, `QA_PASSED` or `ACCEPTED`, verification **also** runs `scripts/project-verify.sh`. The agent must create it for the actual tech stack. Local verification and CI fail closed if it is missing or failing.
- Project checks should cover formatting/lint, types/build, unit/integration, acceptance E2E, migrations/security where appropriate. Do not add a dummy `exit 0` to satisfy the gate.
- Until the product begins, green CI means **only that the harness is structurally healthy**.

## Restore after a new session

Read `AGENTS.md`, the relevant product documents if present, story statuses under `backlog/`, current `work/US-*/plan.md` and `evidence.md`, Git status/PR links, and actual CI results. Recover any delayed acceptance record using the post-merge procedure before WIP evaluation. Report known facts, unknowns and the next authorized action. Never assume an earlier conversation is the source of truth.

## Continuous improvement

After material failures, improve the narrowest executable control: tests for defects, scripts/CI for mechanical gates, skills for repeated workflow mistakes, `AGENTS.md` only for durable repo-specific rules. Do not accumulate contradictory prompts.
