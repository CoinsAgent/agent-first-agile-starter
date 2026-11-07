# Delivery plan — US-XXX

## Story and scope

- Story reference: `backlog/US-XXX.md`
- Approved acceptance criteria: [list IDs]
- Explicit non-goals: [list]

## Current architecture and approach

- Relevant components / files:
- Smallest viable implementation:
- Alternative considered / trade-off:

## Structure and writable paths

- Structure reference: `docs/PROJECT_STRUCTURE.md` (or identify a missing guide)
- Existing owners and current paths:
- Intended skeleton for any new area (document first; create only needed directories):
- Proposed added/updated/deleted paths and rationale (include tests, shared/config and plan/evidence files):
- Dependency directions and public interfaces affected:
- Human story approval reference: [cite the actual decision; never invent approval metadata]
- Branch and base commit:
- Baseline check results and existing failures:
- Technical path revisions and reasons: [record before affected edits; no separate path approval]
- Decisions changing approved outcomes or other human-owned boundaries: [pause for the human]
- Available executable controls and remaining gaps:

## Acceptance tests

| AC ID | Executable test | Layer (unit/integration/E2E) |
|---|---|---|
| AC-01 | TODO | E2E |

## Verification commands

- Focused relevant checks during development; ordinary debugging remains IN_PROGRESS
- `bash scripts/verify.sh` before every QA_PASSED transition (requires real stack-specific checks)
- No pre-approval PR/CI or duplicate post-merge full run; monitor published CI without continuous polling

## Risks / dependency / human decisions

- None identified / documented blockers

## Execution checklist

- [ ] Tests define observable behavior
- [ ] Feature works end-to-end
- [ ] Regression checks run
- [ ] Independent review performed if appropriate
- [ ] Evidence is recorded for current commit
- [ ] Complete branch diff and actual paths are presented for human review
- [ ] Human finished-result approval precedes PR/CI publication
- [ ] Required current PR checks and renewed human review precede human merge
- [ ] Confirmed human merge is recorded as local acceptance with provenance
- [ ] Local acceptance record is preserved for recovery and the next approved PR
