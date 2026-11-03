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

**G1 — Ready:** Value, user, measurable positive/negative ACs, scope boundaries and dependencies are explicit. Human sets `status: READY`, `approved_by` and `approved_at` in the story metadata. The harness checker checks formatting, not whether approval is authentic. Enforce authenticity with protected branch PR review.

**G2 — Engineering:** Relevant ACs are covered by executable tests, regressions run, review findings are addressed, and evidence records actual outcomes. The agent may commit `QA_PASSED` **after actual successful local checks**, enabling CI to evaluate that same commit. However, G2 is satisfied only when the required project checks subsequently pass **in CI for that commit**. While CI is pending, report "QA candidate; CI pending" and do not request final acceptance. If CI fails, fix and re-verify. The Python checker validates structure, not semantics or authenticity.

**G3 — Human acceptance:** Human directly inspects the result (demo or usable feature), approves the user behavior, and updates `accepted_by`, `accepted_at`, `status: ACCEPTED`. Merging or deploying is a separate permission decision unless your governance explicitly couples it to acceptance.

## Persistent artifacts

- One story map: `backlog/STORY_MAP.md` (copy `backlog/STORY_MAP_TEMPLATE.md`); proposed journeys, release slices, story links and open decisions.

- One story: `backlog/US-001.md` (copy `backlog/STORY_TEMPLATE.md`). Its front matter is the **single source of truth for status**.
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
