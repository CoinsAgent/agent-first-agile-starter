---
name: shape-story
description: Map user journeys, propose a minimal end-to-end release, split it into draft stories, and detail the next story for human approval. Use for product discovery and backlog grooming, without implementing code.
---

# Shape Story

Use for discovery and refinement. Use `deliver-story` to execute one READY story.

## Context and boundaries

Read the relevant human-provided intent, `docs/VISION.md`, `docs/PRODUCT_CONTRACT.md`, existing story map and relevant stories. If product documents are missing or their approval is unresolved, label all proposals provisional DRAFT and identify the approval needed before READY. Never silently change human-owned product documents.

A bare `$shape-story` starts with the broader map, not an isolated first story. For a request to refine a specific story, reuse the existing map and update only the relevant context; do not regenerate the backlog. For discussion-only requests, discuss proposals without changing files.

When shaping work that adds or changes code, consult `docs/PROJECT_STRUCTURE.md` if present. Identify existing owners and propose the intended skeleton for a new area before delivery. Record placement/ownership conflicts and the expected areas for scope planning; do not create empty directories, migrate code or treat a placement proposal as implementation authorization. In a starter without a structure guide, propose one as harness work rather than inventing ownership implicitly during product implementation.

For UI journeys or stories, also read `docs/UI_DESIGN_CONTRACT.md`. Use its relevant design, interaction and accessibility requirements to shape proposed scope and measurable ACs. Identify gaps or conflicts for human decision; the design contract does not authorize extra features or changes to approved story scope.

## Shape breadth before detail

1. **Map journeys.** Identify actors, goals, expected value and ordered user activities. Create or refine `backlog/STORY_MAP.md` using `backlog/STORY_MAP_TEMPLATE.md`. Organize capabilities by journey and release slice, not technical layers.
2. **Propose a minimal end-to-end release.** Describe the smallest usable outcome spanning the necessary journey steps, its observable success signal, exclusions and dependencies. A foundational sign-in slice may be one story without being a usable release of the whole product. Treat priorities and release boundaries as proposals until the human decides.
3. **Split into stories.** Identify independently testable vertical capabilities, their value, dependencies and suggested order. Assign unused IDs and create DRAFT files from `backlog/STORY_TEMPLATE.md` for the proposed minimal release; keep later capabilities at map level unless more detail is requested. Preserve existing IDs and approved scope. Multiple draft stories are allowed; one-story-at-a-time governs delivery, not discovery.
4. **Detail the next story.** Recommend the next story and explain why. Give it observable positive, negative and boundary ACs, explicit non-goals and dependencies. Other draft stories may retain explicitly provisional AC outlines and unresolved decisions; they are not READY. Avoid implementation-specific criteria unless required by the contract.
5. **Expose decisions.** Ask about material business ambiguity. Do not silently select policy durations, supported audiences/wallets/platforms, release priorities or security boundaries. If proposing defaults, label them as unapproved assumptions and show their impact. Identify any mismatch with product documents.

## Artifacts and review

Keep story `status: DRAFT` and approval/acceptance fields empty in newly created files. The map links to stories for status and ACs; it is not a competing approval or delivery tracker. Revising a map never changes an approved story's scope or authorizes implementation.

Present a concise review packet: journey map, proposed minimal release, story list/order, detailed next story, assumptions and smallest set of human decisions. Do not self-approve or start product implementation. Run `bash scripts/verify.sh` after file changes and report its structural scope accurately.

After explicit human approval, instruct the human to record approval metadata and set the selected story to READY through the protected PR flow. Map/release approval does not make every linked story READY. A human—not Codex—must perform the approval transition.

Output: a proposed story map, DRAFT stories for the minimal release, detailed ACs for the next story, and open human decisions. For targeted refinement, output only the relevant updates. Never report DRAFT as READY.
