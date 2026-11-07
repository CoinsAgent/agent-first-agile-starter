# Verification evidence — US-001-03

Status: PASS

## Context and provenance

- Story: `backlog/US-001-03.md`, approved by Forrest on 2026-11-07 through explicit conversation decisions; approved ACs preserved unchanged.
- Branch/worktree: `codex/us-001-03-local-qa`, `/tmp/us-001-03-delivery`.
- Base: `04629ff6565e25cd3871af58186d0a5fd8b921d0` (main, PR #3 merge).
- Tested implementation commit: `a265247605da8cd8afacd660c3c04310a819f3ba`. Full verification ran on this implementation; during the run, three prose-only corrections were made in PROCESS, story and map and independently reviewed. No executable/test/workflow/application source changed after this commit. The final record commit adds these reviewed prose corrections and plan/evidence/status bookkeeping; focused harness/scope/whitespace checks are repeated afterward. Do not claim the full suite ran on that later record commit's SHA.
- Environment: Linux, Node v22.22.1, Python 3.14.4; reused installed dependencies through an ignored node_modules symlink. CI uses its existing Python 3.11/Node 22 setup. No dependency/lockfile changes.
- CI: not requested; no branch publication or PR before explicit human approval of the finished result. No hosted pass or merge is claimed.

## Acceptance matrix

| AC ID | Test command or scenario | Result | Evidence artifact |
|---|---|---|---|
| AC-01 | Python harness regression fixtures reject obsolete state, accept six current states and exercise WIP across IN_PROGRESS/BLOCKED/QA_PASSED versus ACCEPTED | PASS locally | `tests/test_harness.py`; full verification log |
| AC-02 | Positive local-QA fixture without CI/acceptance metadata, negative missing/incomplete/nonpassing evidence fixtures; full real local suite before QA transition | PASS locally | Harness fixtures, project verification commands below |
| AC-03 | Event matrix rejects branch pushes, PR-target, comments and other automatic events; only PR trigger configured | PASS configuration checks | `tests/test_ci.py`, `.github/workflows/ci.yml`; no hosted behavior claim |
| AC-04 | Matrix accepts main PR creation; both existing required jobs/names and real commands retained; review of explicit human result-approval boundary | PASS locally/review | CI fixtures, PROCESS and delivery skill |
| AC-05 | Matrix accepts PR code updates/reopening, rejects merge pushes; no error suppression/job skipping; fix/review/monitoring instructions reviewed | PASS locally/review | CI fixtures and independent review |
| AC-06 | Acceptance-field positive/negative fixtures; review of confirmed-human-merge recording, observed identity/date/provenance, local preservation and next-PR publication/recovery | PASS implementation review | PROCESS, skills, templates; actual acceptance remains pending human merge |
| AC-07 | Complete active guidance diff reviewed; predecessor ACs preserved, old evidence retained, approved current ACs byte-compared unchanged, migration only renumbered | PASS review | 26-file declared diff; independent reviewer |
| AC-08 | Full verify with explicit complete-diff scope selection, focused regressions, YAML parse, whitespace and independent diff review | PASS locally | Commands/results below |

## Verification

Baseline before implementation:

- `bash scripts/verify.sh`, original workspace, exit 0. Results: 33 Python harness, 29 Node structure, 83 unit/integration and 68 browser tests passed; lint/type/build and dependency checks passed. Log: `/tmp/us-001-03-delivery-baseline.log`.

Regression development:

- `python3 -m unittest discover -s tests -p 'test_*.py'` before implementation, exit 1: 43 tests, two expected failures (obsolete state accepted; legacy CI job present) and one trigger-format parse error (old multiline events fail the new machine-readable trigger contract). Log: `/tmp/us-001-03-red-tests.log`.
- The same command after implementation, exit 0: all 43 Python tests passed. Log: `/tmp/us-001-03-green-tests.log`; later focused repetitions also passed.
- Independent syntax inspection using available PyYAML 6.0.3 BaseLoader parsed the full workflow and confirmed PR types and both required jobs. PyYAML is not a repository test dependency; CI/harness tests use only the standard library. Trigger semantics were checked against [GitHub's event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

Full final local verification:

```bash
STRUCTURE_SCOPE_BASE=04629ff6565e25cd3871af58186d0a5fd8b921d0 STRUCTURE_SCOPE_HEAD=HEAD STRUCTURE_SCOPE_FILE=work/US-001-03/scope.json bash scripts/verify.sh
```

Exit 0; log `/tmp/us-001-03-delivery-final.log`. Observed output includes:

```text
Ran 43 tests in 0.556s
OK
Harness state valid: 9 story file(s) checked. This is not product acceptance.
# tests 29
# pass 29
# fail 0
Scope paths passed for complete diff; approval authenticity is a separate gate.
Test Files  3 passed (3)
Tests  83 passed (83)
68 passed (52.1s)
[product] Application verification completed successfully.
```

The real project script ran lockfile-source validation, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:e2e`. No required check was skipped or disabled.

- `python3 scripts/check_scope.py --base 04629ff6565e25cd3871af58186d0a5fd8b921d0 --head HEAD --discover-scope`, exit 0 for implementation commit and repeated for final record commit. Exactly one changed scope manifest; all 26 changed files declared. Original predecessor scope manifest is preserved unchanged.
- `git diff --check`, exit 0 after removing one trailing blank line.
- `python3 scripts/check_harness.py`, exit 0; QA metadata/evidence structurally valid after status update.
- Programmatic byte comparison confirmed AC-01–AC-08 exactly match the approved original-workspace story; US-001-04 matches the former main US-001-03 byte-for-byte except ID renumbering. No application source/package/lockfile changes.

## Review

Independent read-only reviewer `us00103_review` inspected the complete implementation diff and approved criteria, ran all 43 Python tests and whitespace checks, and found no material defect. Two minor stale statements (implementation not started / READY approval still needed) were corrected. The reviewer inspected those corrections and G1's authorized-transcription clarification in a fresh follow-up and found no new issue. This was technical review, not human business approval.

The final original-versus-actual path inventory matches the declared scope. Prerequisite carry-forward includes the previously explicit US-001-02 acceptance and its existing plan/evidence records, plus the separately requested renumbering. Historical ACs/approval identities/evidence are preserved; no application migration or unrelated original-workspace changes are included.

## Known limitations

- Event tests and YAML inspection validate configuration, not GitHub execution or approval authenticity. The process relies on opening the PR only after explicit human finished-result approval. No claim of an independently enforced approval boundary.
- Read-only live inspection confirmed main requires `Harness and product verification` and `PR path scope`, zero approving host reviews and admin enforcement. Settings remain unchanged. Current configured required names are retained.
- The old default-branch PR-target/comment workflow can still run its legacy diagnostic during initial publication until this story merges. The new branch itself has no push trigger. Report transitional legacy runs separately; no host bypass or setting change is authorized.
- No PR or CI was started and no merge/release occurred. Actual human approval, hosted verification and human merge remain future actions. After human merge, record acceptance locally and carry it into the next approved PR; main can retain stale QA metadata indefinitely without a later PR.
- Existing browser checks use simulated providers/relays where specified and do not establish new physical-wallet/device compatibility. Application behavior and the original workspace's unrelated dirty changes are preserved.

## Human acceptance

Pending human review of finished local result, followed by PR/CI and human merge. Approval/acceptance identities are not invented; story acceptance fields remain empty. On actual human merge, use PROCESS's local acceptance/provenance/recovery procedure without asking for duplicate business acceptance.
