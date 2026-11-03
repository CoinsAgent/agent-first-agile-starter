---
name: shape-story
description: Draft and refine one or more user stories with measurable acceptance criteria from a human's product intent, without implementing code. Use for product discovery, backlog grooming, and preparing human approval.
---

# Shape Story

Use when the user asks to discover/refine stories or define what to build. **Do not** use this to execute a READY story; use `deliver-story` instead.

1. Read the relevant human-provided product intent. If `docs/VISION.md` or `docs/PRODUCT_CONTRACT.md` is absent, clearly label any work as provisional **DRAFT** and ask the human to provide/approve these files before a story can be READY.
2. Identify the actor, goal, expected value, explicit non-goals and dependencies.
3. Propose the vertical slice independently testable end-to-end user capability. Ask the human about *material business ambiguity*, not routine engineering decisions.
4. Draft observable acceptance Criteria with positive, negative and boundary behaviors; avoid implementation-specific criteria unless the contract requires them.
5. Identify any mismatch with product documents and namethe open decisions. Never silently change human-owned product documents.
6. Copy `backlog/STORY_TEMPLATE.md` to `backlog/US-NNN.md`, choosing an unused ID. Preserve the metadata fields; set `status: DRAFT` and keep approval/acceptance fields empty.
7. Give a concise review packet: user value, scope, ACs, assumptions, decision(s) needed. **Do not self-approve the story** and do not start product implementation.
8. After the human explicitly approves, instruct the human to record approval in the story and protected PR flow. Run `bash scripts/verify.sh` to check structure. A human—not Codex—must change `status: READY` and approval metadata.

Output: a DRAFT story file and a small set of human decisions. Never report DRAFT as READY.
