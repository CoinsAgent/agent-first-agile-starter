# Humans steer. Agents execute.

WalletGate product work is now in this repository. See [the local setup and verification guide](docs/DEVELOPMENT.md) for the US-001 SIWE authentication slice. Delivery status and approval remain authoritative in [US-001](backlog/US-001.md); automated checks do not establish real MetaMask device compatibility.

**Human-led decisions → Agent execution → Automated verification → Human acceptance**

A technology-neutral **Codex-first agile starter**. A human owns the product direction and business acceptance; Codex prepares stories and delivers one approved, end-to-end vertical slice at a time. The repository stores the context and evidence needed to resume work in a new conversation.

## What's included

- `AGENTS.md`: always-on repository guardrails, not a giant process manual.
- `.agents/skills/shape-story/SKILL.md`: map journeys, propose a minimal release, split draft stories and detail the next story for human approval.
- `.agents/skills/deliver-story/SKILL.md`: plan, implement, test, review and report *one approved* story.
- `docs/PROCESS.md`: state transitions, ownership and quality gates.
- [docs/UI_DESIGN_CONTRACT.md](docs/UI_DESIGN_CONTRACT.md): UI design principles, visual tokens, interaction and accessibility requirements. Read it when shaping, implementing or reviewing UI stories; apply relevant requirements within approved scope and record deviations in story evidence.
- `backlog/STORY_MAP_TEMPLATE.md`: journeys, release slices, story links and open decisions.
- `backlog/STORY_TEMPLATE.md`: story structure, map context and approval metadata.
- `work/{PLAN_TEMPLATE,EVIDENCE_TEMPLATE}.md`: implementation and verification records.
- `scripts/check_harness.py`: standard-library-only structural checks.
- `scripts/verify.sh` and `.github/workflows/ci.yml`: CI entry point.
- `scripts/project-verify.sh.example`: intentionally **not** an application test suite.

## Start here

1. Copy the contents of this starter into a **new or existing Git repository** (including hidden `.agents/` and `.github/` directories). Review existing files before overwriting.
2. Run `bash scripts/verify.sh`. It should validate the harness; **it does not claim any application is tested**.
3. **You** create and approve `docs/VISION.md` and `docs/PRODUCT_CONTRACT.md`. They are deliberately absent from the starter. See `docs/README.md`.
4. Start Codex in the repository: `codex`. Ask it to use `$shape-story`. Codex maps journeys in `backlog/STORY_MAP.md`, proposes a minimal end-to-end release, splits it into DRAFT stories, and details the next story’s acceptance criteria. Later capabilities remain at map level until needed.
5. Review the map, proposed release and open product decisions, then the next story’s value, scope and measurable positive, negative and boundary acceptance criteria. Map approval does not make every story READY. **You** edit `approved_by`, `approved_at` and `status: READY` (or approve through a protected PR). Read `docs/PROCESS.md` for requirements.
6. Ask Codex: `$deliver-story US-001`. Codex determines the stack-specific commands and creates `scripts/project-verify.sh` with **real** validation. The CI job runs these commands whenever a story reaches `IN_PROGRESS` or later.
7. Review the actual application, acceptance matrix, commands and CI outcome. **You** set `status: ACCEPTED`, `accepted_by`, and `accepted_at` when the user behavior is satisfactory.
8. Refine the map and detail the next story as needed; repeat delivery one vertical slice at a time. Multiple draft stories are allowed; the one-story WIP limit applies to delivery. To recover progress in a new session ask Codex to inspect the repository and summarize the statuses and evidence.

## Run the checks

```bash
bash scripts/verify.sh
python3 scripts/check_harness.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

The first command is the same entry point CI uses. Before the first approved implementation begins, it runs **harness tests only**. Once implementation starts, it **fails closed** if `scripts/project-verify.sh` does not exist, fails, or is still the example placeholder. Build meaningful lint, type, unit, integration and E2E checks into that project-specific script as appropriate; a successful exit is meaningful only if its checks truly cover the acceptance criteria.

## Trust boundaries

- `AGENTS.md` and Skills are **behavioral instructions**, not security enforcement.
- Python harness checks validate record structure, **not** the truth of approvals or test results.
- Protect the default branch: require a pull request, your own review, and the CI status `Harness and product verification`. Configure CODEOWNERS if appropriate (`.github/CODEOWNERS.example`). Treat metadata as an audit aid, **never** proof of human authorization.
- Limit Codex's credentials and operating permissions. Never give it permission to approve its own PR, alter branch protections or deploy to production without explicit consent.
- Do not confuse `QA_PASSED` (agent-reported local quality; **CI must independently confirm its commit**) with `ACCEPTED` (human business acceptance).

## Minimal operating commands

| Purpose | Request to Codex |
|---|---|
| Map and shape | `$shape-story` followed by product intent; map journeys, propose a minimal release, split stories and detail the next |
| Refine a story | `$shape-story US-001` with the desired refinement; reuse existing map context |
| Deliver story | `$deliver-story US-001` |
| Resume | `Read AGENTS.md and docs/PROCESS.md, inspect Git/backlog/work; report current state, missing evidence, and next action. Read-only.` |
| Diagnose | `For US-001, report failing acceptance criteria and actual test evidence. Do not change product scope.` |

## Sources / conventions

Codex recognizes `AGENTS.md` and repository-local `.agents/skills/*/SKILL.md`. All other filenames in this repository are **our conventions**, not Codex built-ins.

- https://developers.openai.com/codex/skills/
- https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

<!-- US-001-02 temporary negative scope probe: deliberately outside the proposed paths; revert after CI rejects it. -->
