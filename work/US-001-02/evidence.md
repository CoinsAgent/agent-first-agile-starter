# Evidence — US-001-02

Status: PASS

Current result: revised local engineering checks passed; published-commit CI is pending. Earlier observations below are historical and superseded where explicitly identified.

## Scope and environment

Implement only the approved structure/scope harness plan. Existing application source remains in place. Human approval of the plan and paths is recorded in the conversation and plan; no host approval is inferred from local metadata.

Starting commit: `c165e43`. Initial dirty context changes and unrelated untracked skill files are preserved. No push, merge, deployment or host settings change is authorized/performed by this record.

## Observations before implementation

- GitHub connector reports repository ID 1443930837, public repository, default branch main; CoinsAgent has admin permission.
- `gh api repos/CoinsAgent/agent-first-agile-starter/branches/main/protection`: HTTP 404, “Branch not protected”.
- `gh api repos/CoinsAgent/agent-first-agile-starter/rulesets`: empty list.
- Therefore live protected merging is not configured. Local fixtures cannot establish AC-11. Human-reviewed bootstrap and external setup remain required; no host setting has been changed.
- Installed TypeScript is 7.0.2. Its standard module exports version data only; parser access exists through its installed `typescript/unstable/sync` and AST APIs. No dependency upgrade is proposed.

## Acceptance and verification

Local implementation completed and checked as below. The story is BLOCKED on the live host gate, not QA_PASSED or ACCEPTED. Local fixtures cannot substitute for authenticated production-host review/merge controls.

## Implemented scope

- `config/project-structure.json`: configurable owners/runtimes, named feature roots, explicit public interfaces, aliases and repository-area/root-file inventory; current layout plus differently named fixture.
- `config/dependency-baseline.json`: five exact existing private-feature edges, each with a legacy rationale; no wildcard exemption or auto-update command. Initial policy still needs bootstrap human review.
- `scripts/check_scope.py`: complete explicit base/head diff, rename endpoints, added/removed files, path/schema validation, symlink/submodule rejection and non-ancestor-base failure with branch-update guidance.
- `scripts/check_dependencies.mjs`: native TypeScript AST analysis of first-party modules; public/private and shared/app/runtime rules, typed imports/re-exports/aliases, literal dynamic/CommonJS forms and finite baseline checking. Candidate Git modules are parsed from safe regular blobs, never imported or checked out.
- `scripts/verify_scope_approval.py` and `.github/scope-policy.json`: read-only host identity/comment/review retrieval; exact scope/governance binding; separate scope authorization from final current-head review. The CI trusted job uses base/default-branch code and read-only permissions. It is deliberately diagnostic, not a head-bound merge authorization.
- Scope/approval/dependency fixtures and default verification integration, including optional actual-diff environment inputs. Context guidance documents actual controls and remaining limits.
- `src/`, `server/`, package manifests/lockfile and application tests were not changed. `git diff --name-only -- src server package.json package-lock.json` produced no paths. Unrelated untracked grill-me skill and skills-lock file were preserved and excluded from the source proposal.

## Actual observed commands and outcomes

Environment: Node v22.22.1, Python 3.14.4, installed TypeScript 7.0.2; existing dependency installation reused. This is not a fresh-install or hosted-CI result.

| Command/check | Observed result |
|---|---|
| Initial `python3 -m unittest discover -s tests -p 'test_scope*.py'` before checker implementation | Exit 1: missing checker modules, establishing the fixtures did not pass without implementation. |
| Final `python3 -m unittest discover -s tests -p 'test_*.py'` | Exit 0: 31 tests (11 existing harness + 20 new scope/approval cases). |
| `node --test tests/structure/*.test.mjs` | Exit 0: 25 fixtures, including a second layout, backend/public/private rules, type-only/alias/re-export cases, finite baseline, source symlinks and nonexecuted Git snapshots. |
| `node scripts/check_dependencies.mjs` | Exit 0: 16 production modules, 33 first-party/builtin edges, five exact existing violations, zero new errors and zero stale baseline entries. |
| Final `bash scripts/verify.sh` after code/review fixes | Exit 0: the 31 Python tests and 25 dependency fixtures above, ownership/dependency analysis, lock-source check, lint, TypeScript, 83 Vitest application tests, build and 68 Playwright tests. Browser suite reported 68 passed in 52.1s. |
| `python3 scripts/verify_scope_approval.py --pr 0` | Expected exit 1: positive PR number required; no approval inferred and no network request needed. |
| `python3 -m py_compile scripts/check_scope.py scripts/verify_scope_approval.py` | Exit 0. |
| YAML parsing of `.github/workflows/ci.yml` with PyYAML BaseLoader | Exit 0; syntax parsed, not evidence that GitHub ran it. |
| `python3 .../skill-creator/scripts/quick_validate.py .agents/skills/shape-story` and corresponding deliver-story invocation | Exit 0 for each; “Skill is valid!” No behavioral/human approval inferred. |
| `git diff --check` | Exit 0. |

Earlier integrated verification also passed; the final run above supersedes earlier intermediate fixture failures. A temporary circular AST-serialization error was corrected by passing the parser API a filename rather than a remote source object; a wrong relative path in the runtime-boundary fixture was corrected. The initial repository inventory correctly failed on undeclared existing `.vscode/`, then the declaration/guide were updated to classify it. No required check was disabled to make these pass.

The default local verification run explicitly reports no selected actual Git diff unless all `STRUCTURE_SCOPE_BASE`, `STRUCTURE_SCOPE_HEAD` and `STRUCTURE_SCOPE_FILE` inputs are supplied. It always runs scope/authorization fixtures and the real production dependency check. Actual diff coverage was separately exercised against the complete isolated proposal below.

## Complete proposed source-diff audit

Constructed an isolated local clone from the current committed base and overlaid only the approved scope paths (including existing requested context changes and the explicitly supplied story metadata). Created a **temporary review-fixture commit**, not a commit/branch in the source repository; no push/publication occurred.

- Local review checkout: `/tmp/us-001-02-source-review-ihj72w8m`.
- Base: `c165e4319b6a122c23c211b1160aba9cc3fa6472`.
- Candidate review-fixture head: `6625af1bf7ad0f18d311fd1522b53494efc8bcec`.
- Complete diff: 27 files, all covered by `work/US-001-02/scope.json`; unrelated untracked skill files excluded.
- `python3 scripts/check_scope.py --root /tmp/us-001-02-source-review-ihj72w8m --base c165e4319b6a122c23c211b1160aba9cc3fa6472 --head 6625af1bf7ad0f18d311fd1522b53494efc8bcec --scope work/US-001-02/scope.json`: exit 0. Scope authentication remains a separate gate.
- `node scripts/check_dependencies.mjs --root /tmp/us-001-02-source-review-ihj72w8m --ref 6625af1bf7ad0f18d311fd1522b53494efc8bcec --config config/project-structure.json --baseline config/dependency-baseline.json`: exit 0; 16 modules/33 edges, five baseline violations, no new errors.

The audit used checker/configuration paths from the current implementation to test the complete proposal, not an already-installed trusted host revision. Temporary Git objects remain local to that checkout; they are not implementation CI provenance. Subsequent edits only record this evidence, the plan checklist and BLOCKED lifecycle; code/config/test contents remain those checked above. Reproduce by cloning the base locally, overlaying only scope-listed source paths, making a temporary fixture commit and running those two commands; the resulting commit identity may differ with metadata.

## AC coverage and remaining gaps

| AC | Evidence / limitation |
|---|---|
| AC-01 | Guide/current-path mapping and executable area/owner inventory checked; production inventory above. Manual placement examples cover component/helper/endpoint/API client/shared UI/tests. |
| AC-02 | Current layout and differently named frontend/backend/shared fixture pass; ambiguous ownership/overlapping roots or aliases fail. No application relocation. |
| AC-03 | Pre-edit bootstrap plan/paths approved by the user in conversation. Host-shaped fixtures reject missing/wrong actor/revision. Real PR comment authorization and initial installed trust remain unverified. |
| AC-04 | Complete proposal audit passes; real temporary Git fixtures cover additions, deletes, multi-commit diffs, rename endpoints/spaces, prefixes, symlinks, missing refs and diverged-base recovery. |
| AC-05 | Scope fixtures reject unrelated files even though product behavior remains passing. No common-file exemption. |
| AC-06 | 25 AST dependency fixtures plus real source analysis pass; limitations below apply. |
| AC-07 | Five exact legacy exceptions; new edges/wildcards/duplicates reject and removed edges need not recur. Initial baseline/policy is not installed human-reviewed trust yet. |
| AC-08 | Local governance-tampering/identity fixtures pass, including checker/workflow/baseline/package/config/tests/nested instructions. **Incomplete live gate**: no unspoofable exact-head merge binding or authenticated live PR evidence. |
| AC-09 | Guidance and diagnostics explain ownership/scope and failure recovery. No competing lifecycle file or fabricated GitHub approval. |
| AC-10 | Actual local command results and isolated full-diff check above; no hosted exact-commit CI for this implementation. |
| AC-11 | Scope vs final-current-head review fixtures pass. **Blocked**: main unprotected, rulesets empty, trusted exact-head merge gate not installed; no host settings changed. |
| AC-12 | Context documents route to one structure guide; plan includes placement/scoped paths. New files are actual harness work, not empty product roadmap directories. |

## Independent review

Read-only reviewer `/root/review_structure_controls` inspected code/config/tests/CI against the story and ran targeted checks. No human business approval was delegated. Findings fixed before final full verification:

1. Protect package/lock/tool configs and verification tests in the governance digest so verification commands cannot change after scope authorization unnoticed.
2. Reject a diff base that is not an ancestor of the candidate, rather than treating independently advanced main files as candidate deletions; add a diverged-branch/update regression.
3. Use `lstat` before optional-root existence handling, rejecting broken symlinks rather than silently skipping them; add regression.
4. Bind any nested `AGENTS.md`/`AGENTS.override.md`, including files inside an approved feature directory.
5. Make each governance-tampering regression authorize its immediate before-state so every single path must independently invalidate authorization, instead of relying on a previously changed digest.

The reviewer confirmed all fixes, 20 scope/approval cases, 25 dependency fixtures, current production analysis and no remaining material local-code finding. Their remaining blockers match the live host gaps below. Test/review results do not establish human acceptance.

## Blocker and next human action

Story remains BLOCKED. Complete human-reviewed bootstrap and select/configure an external host-enforced trusted workflow or separately authorized trusted GitHub App/status publisher that binds the verified PR head and cannot be spoofed by candidate CI. Configure independent human reviews, stale-approval dismissal, required exact-head checks and appropriate bypass policy; verify an actual PR and actual same-commit CI. A simple named status from branch-controlled GitHub Actions or this base-context read-only inspection is insufficient. The guide includes setup/inspection steps and official references.

No permission/settings mutations, new write credentials, external service commitments, source-repository commit/push, PR publication, merge or release were performed. No automatic approval review rejected an action. Decisions to introduce a publisher/App or change host permissions require human authorization under the repository rules. Local filesystem writes and complete runtime/npm/bundler behavior are outside the controls' guarantees; the static-analysis coverage/limits are documented in PROJECT_STRUCTURE.md. Existing user-reported wallet/device results are unaffected and no new physical-device result is claimed.

## Subsequent explicitly requested configuration alignment

The human subsequently requested aligning `config/` with the agreed frontend/backend names and removing generic production `app/`/`features/` directory proposals. This is a local harness configuration update, not application migration or a waiver of the host blocker.

- Removed reserved `src/app`, `src/features`, `server/features` and `server/shared` ownership proposals. The schema's `feature_roots` is now an empty array; role labels `app`, `feature` and `shared` remain logical composition/domain/generic-code classifications, not directory instructions.
- Declared explicit selected `frontend/src/` and `backend/src/` paths, domain public interfaces and repository-area responsibilities. These paths are checked if real files are introduced through approved work; no frontend/backend source directory or future feature was created.
- Retained actual `src/`/`server/` source coverage and the current `@/` alias. The five exact current baseline entries are unchanged. Migration must update actual code/tooling/aliases and translate those entries together, not prematurely rename exceptions to nonexistent paths.
- Added `tests/structure/project-layout.test.mjs`: four real-layout regressions cover the absence of generic directory permission, valid public interfaces at selected destinations, forbidden generic-code→domain imports and forbidden domain→composition/cross-runtime imports.
- Updated the guide's transition explanation to match executable coverage. No checker implementation, application source, package graph, story approval metadata or host setting changed in this follow-up.

Observed verification for this updated revision:

- `node --test tests/structure/project-layout.test.mjs`: exit 0, four tests.
- `node scripts/check_dependencies.mjs`: exit 0, still 16 actual modules/33 edges, five exact baseline entries, no new errors or stale entries.
- `bash scripts/verify.sh`: exit 0; 31 Python tests, **29** dependency/layout fixtures, 83 application tests, 68 browser tests (52.1s), lock-source check, lint, types and build.
- JSON parsing of both config files and `git diff --check`: exit 0.
- `git diff --name-only -- src server package.json package-lock.json`: no paths.

The earlier isolated 27-file snapshot/audit is historical evidence for the earlier revision, not a claim that it contains these subsequent config/test/guide updates or the separately drafted US-001-03 materials. No new hosted exact-commit CI, live scope approval or protected-merge evidence is inferred. US-001-02 remains BLOCKED on its recorded host gates; US-001-03 remains DRAFT and unimplemented.

## Remote completion authorized and underway

The user explicitly asked to complete steps 1–4 automatically and set QA_PASSED only if all required gates pass. This authorizes the scoped source commit/push/PR and protection setup; it does not authorize fabricated human reviews, weak substitutes for App trust, bypasses or release.

Read-only remote observations: `gh api user` identifies CoinsAgent (User, ID 287687015); repository owner type is User; `gh api user/installations` returns HTTP 403 because the credential is not authorized to a GitHub App. Official GitHub ruleset documentation limits required trusted workflows to organization/enterprise scope; Check Run creation requires a GitHub App. The user token cannot supply an independent publisher identity.

Actual remote change: PUT main branch protection succeeded. Required one independent approval, dismissed stale approvals, latest-push approval, administrator enforcement, strict product checks from GitHub Actions App 15368, conversation resolution, no force pushes/deletions. No exception/bypass was added. The ordinary `PR path scope` check is added as a separate PR-only job, avoiding confusion with push verification. It validates exact-commit candidate scope but remains PR-controlled and does not satisfy the trusted-source gate.

Isolated preflight initially failed because a node_modules symlink was not matched by the directory ignore pattern. Fixed executor setup only: used a real node_modules directory with package links to existing dependencies; source ignore/checker policy was not weakened. Full preflight then passed (31 Python, 29 dependency/layout, 83 application, 68 browser tests, lint/types/build). Additional scope discovery/ambiguous proposal regressions pass; final local/remote results will be recorded below.

### Published draft PR and real negative path test

- Draft PR: https://github.com/CoinsAgent/agent-first-agile-starter/pull/2, branch `codex/us-001-02-structure-controls`, base `c165e4319b6a122c23c211b1160aba9cc3fa6472`. Initial published head `ff2131480d15a8d0a9fbc3c3458df109e36775f9`; 28 scoped files. Actual PR metadata confirms the US-001-03 story and unrelated skill files are excluded. No application migration or package graph change.
- Hosted initial positive path check: job 128344399061 in run https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/42352818859 completed successfully. The same exact-head run subsequently completed successfully, including full product verification. This is observed hosted CI success, not an inference from local checks.
- Explicit temporary negative probe: commit `c6839644cb84af70f7f876cdf5b7744ef33749a3` appended a harmless HTML comment to root README.md, deliberately outside the proposed scope. This was an authorized enforcement test, not an expansion of the scope manifest. The same commit also made the skipped non-PR path job's name distinct so it cannot supply a same-named skipped required result.
- Real GitHub PR path job 128344611547 in https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/42352888650 failed at the path checker, with actual downloaded log: `Scope check failed: outside approved scope: README.md; request scope expansion before editing`. Local replay of the exact probe head also exited 1 for README.md. This verifies ordinary live path rejection, not unspoofable source authentication.
- README.md was restored to its pre-probe content before the clean follow-up commit; no unauthorized probe change remains in the final base/head source proposal. No force push or rewritten remote history.
- Relevant publisher capability test: creating only a **queued**, explicitly non-passing Check Run via the available credential returned HTTP 403, `You must authenticate via a GitHub App.` No trusted status or passing review was manufactured. This confirms the independent publisher cannot be installed from this user-token capability alone.
- main protection readback requires `Harness and product verification` and `PR path scope`, both from GitHub Actions App 15368; strict current-base checks, one independent approval, stale approval dismissal, latest-push approval and admin enforcement are enabled. These ordinary checks do not substitute for the missing independently sourced trusted gate.
- PR metadata reports `REVIEW_REQUIRED`; its authenticated author is CoinsAgent, the same account as the available credential. The agent did not attempt to self-approve or impersonate another reviewer. Initial bootstrap remains unmerged; no host check was bypassed.

Story stays BLOCKED pending a trusted App installation/source-enforced host route and genuine protected human bootstrap review. The user's conditional QA instruction is honored: ordinary CI passing alone cannot move this story to QA_PASSED.

### Final remote state and remaining gates

main protection is now live, superseding the earlier unprotected-main observation. Draft PR #2 and exact-commit hosted CI now exist, superseding the earlier no-publication/CI observations. Initial implementation head `ff2131480d15a8d0a9fbc3c3458df109e36775f9` passed run 42352818859; its product job 128344398823 and path job 128344399061 both succeeded. The deliberate negative head `c6839644cb84af70f7f876cdf5b7744ef33749a3` failed its real PR path check (run 42352888650/job 128344611547), then README was restored in `0e9729325722e7c99e034de22ed262ce09d03e10`. Local exact-head discovery on that clean commit passes and its base/head diff has no README, src, server or package changes. Later documentation-only updates preserve these code/config/test contents; their actual current-head CI results are visible in PR #2 checks, not implied by a prior run.

Read-only collaborator inventory returned only CoinsAgent (admin). That account is also PR #2's author, so independent protected review is not presently available through another existing collaborator. No review was fabricated and no review rule or administrator enforcement was relaxed. A human must supply an independent reviewer/author arrangement and register/install the independently trusted App with the necessary check-publishing identity (or explicitly choose another supported host arrangement). User-token Check Run creation was actually rejected with HTTP 403. No new credential was exposed or stored in source.

Step 1 is complete (scoped draft PR); ordinary branch review/product/path protection is configured; real positive and negative path/CI checks have been executed. Step 2's independent trusted publisher and step 3's genuine human bootstrap review remain unresolved, so the full step 4/AC-08/11 engineering gate cannot be marked passed. Status remains BLOCKED, not QA_PASSED. No merge or production release.

### Observed final published-head CI result

After the final evidence-only commit, GitHub PR run 42353162964 completed successfully on exact head `7563237efc6e5ff08991f47e271da2d04fa2281f`: https://github.com/CoinsAgent/agent-first-agile-starter/actions/runs/42353162964 . Actual product job 128345440385 logs confirm 33 Python tests, 29 structure/layout fixtures, 83 application tests and 68 Playwright tests, plus lint/types/build. PR path job 128345440647 succeeded. The trusted inspection job was skipped in this ordinary PR event; it is not counted as a passing independent trusted gate.

The downloaded negative job log from 128344611547 confirms the out-of-scope README rejection. The final base/head diff contains no README, application source or package changes, and exact-head scope discovery passes. PR #2's description was updated with these actual final-head results and unresolved gates. This final observed-result note is a local evidence supplement after the published commit; it does not claim its own contents were present in that CI-tested commit. No further source changes were made and no passing human review/App gate is claimed.


## Process/context revision — 2026-11-07

Human requested the five-step branch workflow. Updated process, routing/contracts, structure guidance, skills, template and affected backlog wording on `codex/process-branch-review`. No product code, checker implementation, CI workflow or remote host settings changed in this revision. Existing unrelated workspace changes were retained; this branch starts from the local base and does not imply that previously uncommitted delivery work is newly committed or published.

The former App/scope-authorization requirements are superseded by the explicit human decision. Existing main protection remains a merge constraint. No new QA_PASSED or ACCEPTED claim is made, and historical CI results are not attributed to this documentation revision. Initial `python3 scripts/check_harness.py` failed because the revised story omitted the required Out of scope and Dependencies and risks headings; restored those headings before the final check. Final document checks are recorded below. Full product suites were not rerun for these documentation-only changes.

Document verification: `python3 scripts/check_harness.py` exited 0 (8 story files); `git diff --check` exited 0. These are document/format checks, not a new product-suite result.


## Acceptance matrix

Base: `38d85b6ec44f71468fe5200491ae12cb3fa1a204` (merged PR #2). Branch: `codex/us-001-02-process-qa`. This section supersedes the historical App/reviewer blockers above under the human's explicit workflow revision. No human acceptance is asserted.

| Criteria | Evidence and current coverage |
|---|---|
| AC-01/02 | Structure declaration/guide and both-layout ownership fixtures; no application relocation. |
| AC-03/05 | Branch plan and exact 15-file scope manifest; technical revision includes publishing still-DRAFT US-001-03 context because the guide/map link to it. Baseline and final verification recorded; no separate path approval gate. |
| AC-04 | Python scope regression cases cover full diffs, additions/removals/renames, unsafe paths and negative unrelated edits; actual branch diff checked separately after commit. |
| AC-06/07 | 29 dependency/layout fixtures passed; actual source analysis has 16 modules/33 edges, exactly five existing baseline edges, zero new errors and zero stale entries. Baseline unchanged. |
| AC-08/09 | Fresh diff review confirms no changes to application code, CI, checkers, dependency declarations or baseline. Guidance states reliance on human review, not independent tamper resistance; legacy verifier remains optional. |
| AC-10 | Full default verification run and committed full-diff scope check recorded below; previous remote results remain historical. |
| AC-11 | Live protection readback: required product/path checks, zero required approving reviews, latest-push approval false. No host mutation. Finished branch presented for human review; no merge/acceptance. |
| AC-12 | AGENTS, PROCESS, structure/product/UI guidance, skills and plan template consistently route placement through the single directory guide and use the revised workflow. |

Fresh review: checked process/context diff, removed stale App/pre-edit approval gates and corrected stale host-review facts. Scope manifest narrowed to this follow-up. Draft migration remains DRAFT and no source migration is performed. Local dependency setup uses a real ignored node_modules directory with links to installed packages, not a new tracked source root. Limits: static dependency analysis and candidate-controlled checks are not independent enforcement; browser automation does not establish physical-wallet/device compatibility. Existing limitations remain.

Local full-run log: `/tmp/us-001-02-process-qa/work/US-001-02/artifacts/revised-verify.log` (ignored artifact). An initial attempt to redirect output before the artifacts directory existed failed before running the verification command; directory creation fixed the setup without changing checks. CI for the new commit must run before claiming G2 satisfied.

Observed local final result: `bash scripts/verify.sh` exited 0: 33 Python tests, 29 structure fixtures, 83 application tests, 68 Playwright tests (51.6s), plus lock-source validation, lint, types and build. Status is QA_PASSED as a local technical candidate; CI for this revision is pending. Human approval/acceptance metadata is unchanged.


## Verification

The complete local product run passed (33 Python, 29 structure, 83 application, 68 browser tests; lint/types/build). The actual committed scope check passed for base `38d85b6ec44f71468fe5200491ae12cb3fa1a204` to `560278f`. After switching to QA_PASSED, the metadata checker correctly rejected the older evidence format: it lacked Status: PASS and four required sections. This follow-up adds the actual local result and required sections; it does not change checks. Rerun the full verification in QA_PASSED state and require current-commit CI before reporting G2 complete.

## Review

Fresh self-review of the full process/context diff found no application/checker/CI changes and no human metadata edits. Fixed outdated host-protection descriptions and removed pre-edit authorization requirements as explicitly requested. US-001-03 is published only as DRAFT context, not delivered. The branch contains only declared paths. Human review/merge and business acceptance remain pending.

## Known limitations

Static import coverage is bounded as documented in PROJECT_STRUCTURE. Scope manifests and checks may be edited on the branch and rely on human final review. Browser tests use simulated providers/relays where specified, not a claim of physical-device compatibility. Legacy approval diagnostics are optional. Local Status: PASS does not establish CI success, merge approval or human acceptance.


## Explicit human acceptance record

On 2026-11-07 the human instructed “Accept US-001-02”. Recorded ACCEPTED, accepted_by CoinsAgent and accepted_at 2026-11-07 in the story using the established human identity and explicit decision. PR #3 merged as `04629ff6565e25cd3871af58186d0a5fd8b921d0`. This acceptance-only follow-up does not change implementation or invalidate previous technical evidence; local verification is limited to metadata/format and declared diff checks. Hosted required verification will run on publication. US-001-03 remains DRAFT; no release or merge is performed by this record update.
