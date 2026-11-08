# Verification evidence — US-001-05

Status: PASS

## Context and provenance

- Story: backlog/US-001-05.md; approved in chat by "make 05 ready" after the grilling decisions, then explicit "$deliver-story 05".
- Branch/worktree: codex/us-001-05-layout in /home/ubuntu/us-001-05-delivery.
- Approved shaping base: ca2c864; initial implementation 84642ba; final reviewed/tested implementation: 96dcc353e36199d4a70fdf0da89fe683555f5094. Complete PR-diff base: fetched main 0d5dde0125d5175b455854aa6e3b6458cfb12437.
- Runtime: Node v22.22.1, npm 9.2.0, Python 3.14.4; existing ignored dependency installation reused. No fresh npm install is claimed.
- CI: not requested; no push/PR/host mutation/merge performed. Local-first PROCESS/AC-08 governs; VERIFYING is not a supported state.
- Retained US-001-04 acceptance record carried forward on this branch through d70b40d/7947450, with its three exact paths declared. Its human PR #6 merge/check provenance is preserved, not a new approval claim.

## Acceptance matrix

| AC | Observed result | Reproducible evidence |
|---|---|---|
| AC-01 | PASS: all 27 tracked source/assets relocated once, byte-identical; no retired folders, missing/duplicate files or changed branding/CSS/attribution | mapping.json; python3 work/US-001-05/check-preservation.py; artifacts/preservation.log |
| AC-02 | PASS: root tooling/aliases translated; dev/start both serve built HTML/JS/CSS, nonce/hash CSP and existing unauthenticated API; root dist retained | full suite; node work/US-001-05/smoke.mjs; artifacts/smoke.log and root-dev.log/root-start.log |
| AC-03 | PASS: same owners/interfaces after prefix translation plus precise HTML owner; same five legacy edges, no new errors/stale entries | preservation helper; node scripts/check_dependencies.mjs; committed-source --ref full-SHA check |
| AC-04 | PASS: 41 structure fixtures, including retired src prefixes, unknown TS/HTML, runtime/shared/domain negatives, aliases/type-only cases | node --test tests/structure/*.test.mjs; artifacts/structure.log |
| AC-05 | PASS: 83 application and 68 browser tests; assertions unchanged except source imports and screenshot output paths | artifacts/verify.log; Android dark-390 and desktop light review captures visually inspected |
| AC-06 | PASS: active guide/setup/tools use new locations; remaining old prefixes are explicit history/baseline provenance or negative inputs | complete diff and targeted rg search; prior story/evidence records preserved |
| AC-07 | PASS: dependency manifest/lockfile versions unchanged; all source bytes unchanged; dev/start use isolated in-memory databases; no existing .env/data altered | preservation helper; root command smoke logs |
| AC-08 | PASS: full final exact-implementation suite, complete scope and independent review passed after smoke-helper correction | artifacts/final-verification.log; independent review below |

## Verification

1. Baseline: bash scripts/verify.sh on approved shaping base exited 0: 43 Python, 36 structure, 83 application and 68 browser tests (51.4s), lock-source validation/lint/types/build. Log artifacts/baseline.log (copied from /tmp/us-001-05-baseline.log).
2. Red-to-green: new intended-layout fixtures before relocation exited 1 with 16 expected failures against old declarations; artifacts/red.log. After migration, all 41 structure fixtures passed, zero skipped; artifacts/structure.log.
3. First full post-move run: bash scripts/verify.sh exited 0 on implementation 84642ba: 43 Python, 41 structure, 83 application and 68 browser tests (54.0s), plus real lock-source/lint/types/build/project checks. Log artifacts/verify.log. No required check skipped or weakened.
4. python3 work/US-001-05/check-preservation.py exited 0. All source/asset bytes and dependency versions preserved; exact translated config and five baseline relationships checked. Log artifacts/preservation.log.
5. node work/US-001-05/smoke.mjs exited 0 after review fix for both npm run dev and npm start from repository root. Explicit test environment, no RPC/network wallet call, in-memory database; temporary ignored .env comment file created only if absent and removed afterward. Validated HTML entry/assets, security headers, per-response nonce and SDK style hashes, /index.html 200 and /api/session 401.
6. Port-conflict negative scenario: start an unrelated local HTTP server on 0.0.0.0:3215, run the smoke helper as a child, assert nonzero exit and EADDRINUSE, then close the unrelated fixture. Final scenario passed; artifacts/smoke-port-conflict.log. Initial assertion failed because a startup-log-only check did not prevent reaching the unrelated listener; fixed by exclusive-bind preflight and repeated both positive commands. This is a verification-helper fix; product startup code remains identical.
7. python3 scripts/check_scope.py --base 0d5dde0125d5175b455854aa6e3b6458cfb12437 --head HEAD --discover-scope exited 0 for implementation. Only the selected story's scope manifest changes; all complete-diff endpoints, planning/shaping and retained predecessor record paths declared.
8. node scripts/check_dependencies.mjs --ref <full implementation SHA> exited 0: 19 code modules, 36 edges, same five legacy violations, zero errors and zero stale entries. HTML is owned/classified data, not parsed code; unknown HTML is rejected by a fixture.
9. python3 scripts/check_harness.py and git diff --check exited 0. Final QA metadata checks and complete committed-diff scope are repeated after the status/evidence-only record update.

Reproduce required final checks from this worktree:

```bash
STRUCTURE_SCOPE_BASE=0d5dde0125d5175b455854aa6e3b6458cfb12437 \
STRUCTURE_SCOPE_HEAD="$(git rev-parse HEAD)" \
STRUCTURE_SCOPE_FILE=work/US-001-05/scope.json bash scripts/verify.sh
python3 work/US-001-05/check-preservation.py
node work/US-001-05/smoke.mjs
node scripts/check_dependencies.mjs --ref "$(git rev-parse HEAD)"
```

## Review

Independent read-only reviewer review_us00105 inspected the full main-to-branch diff, approved ACs, source moves, root configuration, HTML classification, ownership/baseline, fixtures, helpers and docs. Independently ran preservation, 16 focused layout cases, scope and whitespace checks; no server, full suite or host action. Source/tooling/policy review found no migration defect.

Resolved findings: stale story/map narrative; possible smoke false positive on occupied fixed ports. Reviewer rechecked final exclusive-bind preflight plus child-log/live-process checks and cleanup, found no remaining material issue. Parent ran actual positive/negative smoke scenarios and full suite. Technical review is not human acceptance.

All 27 moves are 100% Git renames. Application tests retain assertions; seven browser files change only capture destinations so previous evidence is not overwritten. Parent inspected fresh mobile dark and desktop light captures. Scope review covers all paths including carried-forward US-001-04 record; original dirty checkout and older worktrees preserved.

## Known limitations

- QA_PASSED records local engineering verification only. Hosted CI and human acceptance remain pending explicit finished-result approval and actual human merge.
- Existing dependencies reused; local results do not prove fresh installation or hosted execution. CI starts only after explicit approval of the finished result.
- Browser wallets/relays are simulated. Physical-device retesting is not required for this migration absent a relevant regression; no new compatibility claim.
- Local smoke reserves/checks each fixed port before launch but releases it to let the app bind. A small bind-close/spawn race remains against concurrent external launches; it is not an exclusive process-ownership proof.
- Static checker coverage limits in PROJECT_STRUCTURE remain; HTML is classified data and CSS/HTML dependency graphs are not parsed. Existing five exceptions retain provenance, not broader exemptions.
- User approval of this finished result authorizes PR/CI. Human merge after required current checks establishes acceptance; this story's acceptance fields remain empty.

## Human acceptance

PENDING human finished-result review and PR/CI authorization, then required checks and actual human merge. No approval/acceptance identity or merge is invented.

## Final local engineering result

Final reviewed/tested implementation: 96dcc353e36199d4a70fdf0da89fe683555f5094. The exact-revision command above with full-diff scope selected exited 0: 43 Python/harness tests, 41 structure fixtures, 83 application tests and 68 Playwright tests (50.8s), plus lockfile-source validation, lint, types, build/SDK hashes, actual dependency graph and complete committed scope. Log: artifacts/final-verification.log. All required local checks completed; zero skipped structure cases and no weakened assertions. Earlier first-run results remain accurately labeled above.

Post-review positive smoke checks passed both root commands, and the exclusive-port-conflict negative scenario passed. Independent reviewer confirmed the final helper and narrative corrections; no unresolved material finding. Parent audit confirmed all eight approved AC lines byte-identical to READY base ca2c864, and all application/browser assertions unchanged after normalizing only approved import and screenshot destination changes. All 88 complete-diff file endpoints are declared, with zero unused file declarations; the ignored artifact directory is separately declared.

Record QA_PASSED only after these actual results. The final record commit changes only this evidence, the plan completion notes and story status; it is not falsely described as another full-suite-tested SHA. Focused metadata/whitespace/complete-scope checks validate that record commit separately. No code, dependency, approved scope, CI workflow, host protection, publication or acceptance changes follow the tested implementation.
