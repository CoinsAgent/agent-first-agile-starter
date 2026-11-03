# Repository instructions — Humans steer. Agents execute.

## Operating principle

Human-led product decisions → Codex execution → automated verification → human acceptance.

- A human owns Vision, Product Contract, business scope, priorities, approved acceptance criteria and acceptance. Codex owns implementation approach and routine engineering decisions within those boundaries.
- This repository is **product-uninitialized** until BOTH `docs/VISION.md` and `docs/PRODUCT_CONTRACT.md` exist and have human-approved content. Until then, work only on harness, research or clearly labeled DRAFT stories. Do **not** implement product functionality.
- Implement only a **READY** story, one end-to-end vertical slice at a time. Do not silently add functionality outside approved acceptance criteria.
- Do not represent plans, self-reported checks or generated evidence as passing tests. Report actual commands, output and limitations.

## Source of truth and ownership

- `docs/VISION.md` — human-owned product purpose and outcomes.
- `docs/PRODUCT_CONTRACT.md` — human-owned rules, constraints and non-goals.
- `backlog/US-*.md` — story status, approved scope and acceptance criteria.
- `work/US-*/plan.md` — agent implementation plan.
- `work/US-*/evidence.md` — agent-generated reproducible test/review evidence.
- `docs/PROCESS.md` — workflow rules, statuses and approvals.

Read only relevant documents for the task. For story execution, read the story, the two product documents and the process. Do not create competing status files.

## Human authorization and safety

- Only a human can authorize `DRAFT → READY`, modify approved product outcomes/ACs, or authorize `QA_PASSED → ACCEPTED`.
- **Never write human identity/approval metadata on behalf of the human or claim a user accepted something without an explicit user decision.** File metadata alone is not an enforcement mechanism: prefer protected PR review.
- Pause for decisions that affect product outcomes, contract, privacy/security posture, destructive data operations, secrets, cost commitments, production releases or permissions.
- Do not bypass, remove or weaken failing checks; fix the underlying defect or report `BLOCKED`.
- Never expose credentials or upload repository data to unapproved endpoints.

## Engineering and evidence

- Prefer the smallest maintainable change satisfying all approved acceptance criteria; add negative cases and regression protection when warranted.
- For each in-progress story, maintain one plan and one evidence file. Record observed commands, pass/fail results, relevant environment and artifact references, unresolved gaps and review findings.
- `bash scripts/verify.sh` is the default verification entry point. During implementation it requires real stack-specific checks in `scripts/project-verify.sh`.
- Use `.agents/skills/shape-story` for story shaping and `.agents/skills/deliver-story` for an approved story's delivery. One primary agent is enough; delegate only separable research or review tasks, and never let a reviewer approve their own implementation as human.
- If context is incomplete, stop at the relevant gate, mark the blocking facts and ask for the smallest necessary human decision.

## Reporting

On completion, summarize: story ID, implementation scope, actual verification results, evidence path, risks/blockers, and what (if anything) needs human acceptance. Distinguish **READY**, **QA_PASSED** and **ACCEPTED**.
