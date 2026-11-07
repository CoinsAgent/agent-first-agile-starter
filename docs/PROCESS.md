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

The human selected this workflow on 2026-11-07, replacing the earlier two-stage scope-approval PR process:

1. **Human approves a story.** The approved outcomes and acceptance criteria authorize implementation within that story. Preserve the human's actual decision and metadata; never invent approval.
2. **Codex runs checks.** Inspect relevant context, existing changes and ownership, then run the applicable baseline checks. Record existing failures before making changes; resolve them within scope or report a blocker.
3. **Codex proposes allowed files on a new branch.** Create a story branch from the intended base, preserving unrelated local changes. Record narrow allowed paths and reasons in the plan/scope manifest before implementation. Implement there and rerun scope, dependency and product checks on the complete diff. This step includes implementation and final verification; baseline checks alone cannot verify new code. A separate human file-scope approval is not required. Codex may refine technical paths needed for the approved story, recording the reason and reviewing the full diff; changes to approved outcomes, security/privacy, cost, permissions or destructive operations still require a human decision.
4. **Human reviews the finished changes.** Present the complete branch diff, proposed versus actual paths, checks, evidence and limitations. A PR is an optional review interface unless current host settings require it. Review applies to the presented commit; subsequent changes must be checked and presented again. Chat review may record an explicit human decision, but does not impersonate a GitHub approving review or override host rules.
5. **The branch merges into main.** Merge after explicit human approval of the finished changes and passing required checks, using the host's permitted route. A request to update process documents does not authorize a merge, release or host-settings change. Business acceptance remains a separate decision.

No custom GitHub App, `/approve-scope` comment, independent publisher or separate pre-edit path approval is required by this workflow. Scope checks detect differences from the declared paths; they do not authenticate approval or prevent local filesystem writes. Human review includes changes to scope, policy, baseline and verification code. This accepts reliance on agent discipline and human review rather than claiming an independently enforced authorization boundary.

Existing GitHub protection remains effective until explicitly changed. If it requires a PR or a different reviewer, follow it or report the mismatch; never bypass it or claim a chat decision satisfies GitHub's review requirement.

## Structure and file-scope planning

Read [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md), identify existing owners and document the intended skeleton before implementing a new area. Create directories only for files needed by the approved story. Include tests, shared/config files, dependencies and execution artifacts in the branch's declared paths; there are no always-writable common files. Avoid unrelated edits and record technical scope revisions before affected edits. Ask the human when a revision changes approved story outcomes or another human-owned decision.

Use `scripts/check_scope.py --base <base> --head <head> --scope work/<story>/scope.json` for a complete committed diff. Inspect uncommitted changes as well. Local checks and CI provide evidence, not human acceptance. The optional legacy approval verifier is not a delivery gate under this process.

## Story states

- `DRAFT` — agent may draft and refine. No product work.
- `READY` — human has explicitly approved Story + ACs; product documents exist.
- `IN_PROGRESS` — agent implementation has begun; work plan and stack-specific checks are required.
- `VERIFYING` — implementation is being tested and reviewed; failing tests still block delivery.
- `BLOCKED` — unresolved problem or missing human decision; report blocker in the story or plan and do not claim passing quality.
- `QA_PASSED` — agent reports successful local project checks with evidence/review. The engineering gate is NOT authoritative until CI passes for the corresponding commit; awaiting human acceptance.
- `ACCEPTED` — human has verified the business outcome and explicitly approved it.

Allowed default flow: `DRAFT → READY → IN_PROGRESS → VERIFYING → QA_PASSED → ACCEPTED`.
For a failure: `IN_PROGRESS/VERIFYING → BLOCKED → IN_PROGRESS`; for a failed QA or human acceptance: `QA_PASSED → IN_PROGRESS`. Any change to approved acceptance criteria requires renewed human approval and a reviewable Git diff.

**WIP limit:** at most one story in `IN_PROGRESS`, `VERIFYING`, `BLOCKED`, or `QA_PASSED`. `ACCEPTED` stories are completed and do not count toward WIP. This first version favors reliable one-story-at-a-time delivery.

## Gating criteria

**G0 — Contract:** Story must not contradict the two human-approved product documents.

For UI stories, read `docs/UI_DESIGN_CONTRACT.md` during shaping, implementation and review. Apply relevant design and accessibility requirements within approved scope; product/security rules and protocol correctness take precedence, followed by accessibility, then aesthetic preferences. Record applicable UI checks, actual results and deviations in the story plan/evidence. Resolve conflicts that require scope or product decisions with the human; the design contract does not authorize scope expansion or replace G3 human acceptance.

**G1 — Ready:** Value, user, measurable positive/negative ACs, scope boundaries and dependencies are explicit. Human sets `status: READY`, `approved_by` and `approved_at` in the story metadata. The harness checker checks formatting, not whether approval is authentic. Retain the explicit human decision; a PR is not required to approve a story.

**G2 — Engineering:** Relevant ACs are covered by executable tests, regressions run, review findings are addressed, and evidence records actual outcomes. The agent may commit `QA_PASSED` **after actual successful local checks**, enabling CI to evaluate that same commit. However, G2 is satisfied only when the required project checks subsequently pass **in CI for that commit**. While CI is pending, report "QA candidate; CI pending" and do not request final acceptance. If CI fails, fix and re-verify. The Python checker validates structure, not semantics or authenticity.

**G3 — Human acceptance:** Human directly inspects the result (demo or usable feature), approves the user behavior, and updates `accepted_by`, `accepted_at`, `status: ACCEPTED`. Merging or deploying is a separate permission decision unless your governance explicitly couples it to acceptance.

## Persistent artifacts

- One story map: `backlog/STORY_MAP.md` (copy `backlog/STORY_MAP_TEMPLATE.md`); proposed journeys, release slices, story links and open decisions.

- One story: `backlog/US-001.md` (copy `backlog/STORY_TEMPLATE.md`). Its front matter is the **single source of truth for status**.
- A separately scoped follow-on story may use `backlog/US-001-01.md` (base number of at least three digits, optional suffix of at least two digits). It has its own approvals, plan/evidence and the same lifecycle/WIP gates; the suffix does not inherit approval from its predecessor.
- One execution plan: `work/US-001/plan.md` (copy `work/PLAN_TEMPLATE.md`).
- One evidence record: `work/US-001/evidence.md` (copy `work/EVIDENCE_TEMPLATE.md`).
- Git commits and PR links provide provenance; test logs or CI run URLs provide evidence. Keep stale results clearly distinguished.

## Verification contract

- `bash scripts/verify.sh` always runs harness self-tests and story metadata checks.
- After any story enters `IN_PROGRESS`, `VERIFYING`, `BLOCKED`, `QA_PASSED` or `ACCEPTED`, verification **also** runs `scripts/project-verify.sh`. The agent must create it for the actual tech stack. CI fails closed if missing or failing.
- Project checks should cover formatting/lint, types/build, unit/integration, acceptance E2E, migrations/security where appropriate. Do not add a dummy `exit 0` to satisfy the gate.
- Until the product begins, green CI means **only that the harness is structurally healthy**.

## Restore after a new session

Read `AGENTS.md`, the relevant product documents if present, story statuses under `backlog/`, current `work/US-*/plan.md` and `evidence.md`, Git status/PR links, and actual CI results. Report known facts, unknowns and the next authorized action. Never assume an earlier conversation is the source of truth.

## Continuous improvement

After material failures, improve the narrowest executable control: tests for defects, scripts/CI for mechanical gates, skills for repeated workflow mistakes, `AGENTS.md` only for durable repo-specific rules. Do not accumulate contradictory prompts.
