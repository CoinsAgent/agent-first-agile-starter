# Repository instructions — Humans steer. Agents execute.

## Operating principle

Human-led product decisions → Codex execution → automated verification → human acceptance.

- A human owns Vision, Product Contract, business scope, priorities, approved acceptance criteria and acceptance. Codex owns implementation approach and routine engineering decisions within those boundaries.
- This repository is **product-uninitialized** until BOTH `docs/VISION.md` and `docs/PRODUCT_CONTRACT.md` exist and have human-approved content. Until then, work only on harness, research or clearly labeled DRAFT stories. Do **not** implement product functionality.
- Shape work in this order: map user journeys → propose a end-to-end release → split it into stories → detail the next story’s acceptance criteria. A story map provides breadth; individual stories provide delivery detail. Multiple DRAFT stories are allowed; the one-story WIP limit applies to delivery.
- Implement only a **READY** story, one end-to-end vertical slice at a time. Do not silently add functionality outside approved acceptance criteria.
- Do not represent plans, self-reported checks or generated evidence as passing tests. Report actual commands, output and limitations.

## Source of truth and ownership

- `docs/VISION.md` — human-owned product purpose and outcomes.
- `docs/PRODUCT_CONTRACT.md` — human-owned rules, constraints and non-goals.
- `docs/UI_DESIGN_CONTRACT.md` — UI design principles, visual tokens, interaction and accessibility guidance for UI work.
- `docs/PROJECT_STRUCTURE.md` — authoritative directory skeleton, current ownership mapping, dependency directions and code-placement examples.
- `backlog/STORY_MAP.md` — proposed journeys, release slices, story links and open decisions; no duplicate story statuses or approvals.
- `backlog/US-*.md` — story status, approved scope and acceptance criteria.
- `work/US-*/plan.md` — agent implementation plan.
- `work/US-*/evidence.md` — agent-generated reproducible test/review evidence.
- `docs/PROCESS.md` — workflow rules, statuses and approvals.

Read only relevant documents for the task. For story execution, read the story, the two product documents and the process. Do not create competing status files.

Follow the five-step delivery workflow in `docs/PROCESS.md`: human story approval → baseline checks → proposed paths and implementation on a new branch with final checks → human approval of the locally verified result → PR/CI → human merge and local acceptance recording. Read `docs/PROJECT_STRUCTURE.md`, inspect existing owners and document a new area's skeleton before implementing it. Create only directories needed for real files. Declare narrow paths, including tests/shared/config and execution artifacts, before editing; record technical revisions within the approved story without a separate path-approval gate. Pause for changes to approved outcomes or other human-owned decisions. Keep domain behavior with its owner, generic code independent of domains and assembly in bootstrap/pages; preserve existing paths unless relocation is scoped. Review the complete diff for unrelated edits. Scope checks detect declared-path violations, not human identity or filesystem write restrictions. Open the story PR only after explicit human approval of the finished result; required CI then runs before the human merges. Human merge means acceptance, which Codex records locally and carries into the next approved PR; no custom App or separate trusted scope authorization is required by the process. Never bypass existing host protection.

For UI story shaping, implementation and review, also read `docs/UI_DESIGN_CONTRACT.md` and apply its relevant requirements within approved story scope. Product/security rules and protocol correctness take precedence, followed by accessibility, then aesthetic preferences. Record gaps or deviations; raise conflicts requiring changes to approved scope for human decision. The design contract does not authorize additional features, change story status or establish human acceptance.

## Human authorization and safety

- Only a human can authorize `DRAFT → READY`, modify approved product outcomes/ACs, or authorize `QA_PASSED → ACCEPTED`.
- Standing human instruction for explicit READY approvals: unless the human overrides the values, record `approved_by` as their verified GitHub username and `approved_at` as the date of that READY decision in Asia/Shanghai. Do not ask for those metadata again when available; this default never authorizes READY without an explicit human decision and does not apply to acceptance.
- **Never invent human identity/approval metadata or claim acceptance without an explicit human decision.** Record supplied metadata only when explicitly authorized. Under PROCESS, confirmed human merge of the reviewed story PR constitutes acceptance: record the observed merger/date and merge provenance locally afterward, then publish that record in the next approved PR. Never mark ACCEPTED before merge or infer it from CI alone. File metadata alone does not prove a human decision. Record explicit approval through the agreed review channel; never impersonate a host review.
- Pause for decisions that affect product outcomes, contract, privacy/security posture, destructive data operations, secrets, cost commitments, production releases or permissions.
- Do not bypass, remove or weaken failing checks; fix the underlying defect or report `BLOCKED`.
- Never expose credentials or upload repository data to unapproved endpoints.

## Engineering and evidence

- Prefer the smallest maintainable change satisfying all approved acceptance criteria; add negative cases and regression protection when warranted.
- For each in-progress story, maintain one plan and one evidence file. Record observed commands, pass/fail results, relevant environment and artifact references, unresolved gaps and review findings.
- `bash scripts/verify.sh` is the full verification entry point, required before every agent transition to `QA_PASSED`, with real stack-specific checks in `scripts/project-verify.sh`. Use focused checks during development and for draft-only edits. Keep ordinary test debugging `IN_PROGRESS`; use `BLOCKED` only when progress cannot continue. No hosted CI or early PR before human finished-result approval; preserve required PR checks and avoid duplicate post-merge runs or continuous CI polling. Recover delayed local acceptance records before WIP evaluation.
- Use `.agents/skills/shape-story` for story shaping and `.agents/skills/deliver-story` for an approved story's delivery. One primary agent is enough; delegate only separable research or review tasks, and never let a reviewer approve their own implementation as human.
- If context is incomplete, stop at the relevant gate, mark the blocking facts and ask for the smallest necessary human decision.

## Reporting

On completion, summarize: story ID, implementation scope, actual verification results, evidence path, risks/blockers, and what (if anything) needs human acceptance. Distinguish **READY**, **QA_PASSED** and **ACCEPTED**.
