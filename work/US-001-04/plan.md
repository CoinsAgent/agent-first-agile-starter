# Delivery plan — US-001-04

Approved in chat: “approve us -001-04”; delivery requested explicitly. Approved ACs 01–11 unchanged. No auth, security, visual, package-version or roadmap feature changes.

## Branch and baseline

Branch `codex/us-001-04-layout`, isolated worktree `/home/ubuntu/us-001-04-delivery`.
Base `c2e3da6757b2c3dc37a801892705754f286b7fa6` is a local integration snapshot of the initial dirty checkout (original HEAD c165e43). Earlier process/harness/shaping work is in that parent, not the migration diff. Original checkout/index preserved. Publishing this snapshot ancestry requires separately reviewing the prerequisite changes; no push/merge planned here.
Baseline `bash scripts/verify.sh` exited 0: 33 Python tests, 29 structure tests, 83 application tests and 68 browser tests, plus lockfile/lint/typecheck/build. Log `/tmp/us-001-04-baseline.log`. Prerequisite US-001-02 is ACCEPTED in authoritative story metadata; its historical host limitations are not waived.

## Structure and writable paths

`docs/PROJECT_STRUCTURE.md` is the structure authority. `mapping.json` inventories every source/HTML/asset move, both endpoints, before implementation. `scope.json` declares exact file paths including tests/config/docs and these execution artifacts. No directory-wide write grants.

Frontend skeleton: main mounts React; bootstrap/app keeps theme and existing hash dispatch; pages/sign-in keeps sign-in component and its hooks unchanged; wallet-auth owns components/hooks/API/SDK/wallet setup; ui/lib remain generic; assets/styles retain bytes. Backend skeleton: thin index imports bootstrap/server; wallet-auth retains auth/QR logic; infrastructure owns config. No empty future domains or public API refactor. Existing central tests stay in tests/app and tests/e2e.

Resolve relative imports using the complete mapping; update root package scripts, Vite root/output/alias, TS roots/alias, shadcn paths and Playwright startup. Root dist, SQLite/env paths and SDK hash processing remain root-relative as before; root npm commands retain that working directory. Dependencies/lockfile remain untouched. Update only current guidance, preserving historical records.

Five baseline edges translate one-for-one: main→controller/view becomes pages/sign-in→wallet-auth; main→phone view/SDK becomes bootstrap/app→wallet-auth; server/index→auth becomes bootstrap/server→wallet-auth. Retain exact private-feature-import rule and feature identity. No exemptions broadened.

## AC verification matrix

| AC | Verification |
|---|---|
| 01 | Pre-edit mapping.json/scope.json and plan; review complete committed diff |
| 02 | Source inventory, no legacy roots, no empty domains, unchanged package-lock hash |
| 03 | Existing lint/typecheck/build/E2E via scripts/verify.sh; root dist and SDK hash availability |
| 04 | Unchanged auth/QR unit/integration and browser suites; simulated provider/device limits retained |
| 05 | Existing light/dark, narrow layout, keyboard/focus, axe tests; byte comparison for styles/branding/icons/NOTICE |
| 06 | Updated production checker; exact baseline translation and new-layout negative fixtures |
| 07 | Read current guide/development and search current references; historical files untouched |
| 08 | Full verify.sh, committed scope check, fresh diff review and reproducible evidence |
| 09 | Backend ownership and negative infrastructure/browser imports |
| 10 | Mechanical component extraction diff; negative domain→composition/shared→domain cases |
| 11 | Guide/config/inventory consistency; preserve tests/app; no app/features scaffolding |

## Risks and review

Initialization order, CSS discovery and relative runtime paths are the migration risks. Preserve component bodies/state/effects and preload/nonce-before-render sequencing. No separate path approval under current PROCESS; no approved outcome revisions needed. Review full diff in a fresh pass after checks. CI on the exact commit remains required by current PROCESS; the separate US-001-03 workflow proposal is not implemented here. Business acceptance and merge authorization remain separate human decisions.

## Technical path revisions before follow-up edits

Final verification found an existing layout assertion still expecting the transition alias/legacy owners. Add `tests/structure/project-layout.test.mjs` to assert adopted owners/alias and rejection of retired paths, retaining negative destination tests. Also declare the seven existing browser files that write screenshots, changing only their output paths to `work/US-001-04/artifacts/` so migration captures do not overwrite historical artifacts. Declare that ignored artifact directory for actual test logs/captures. No test behavior or approved outcome changes.

## Completed verification and review

Full local suite passed: 33 harness, 36 structure (including seven added negative cases), 83 application and 68 browser tests. Fresh review compared all relocation bodies, component extraction, imports/config changes, baseline edges and whole diff; no unresolved material findings. Original baseline also had 33 Python tests (the earlier progress count of 31 was incorrect). No product/security decisions changed. Final complete-diff verification is repeated on the QA candidate commit. Human review, CI and merge remain pending.

## Authorized publication integration — 2026-11-07

The user explicitly requested integrating prerequisites and running hosted CI on the exact candidate commit. Fetch revealed main already contains US-001-02 controls and US-001-03's newer workflow. Publication branch `codex/us-001-04-ci` in `/home/ubuntu/us-001-04-ci` starts from actual main `78c848047ced99104127d595e1aaef420121e593`, not the obsolete local snapshot. Apply only the migration diff from c2e3da6..f298464 onto that base; preserve newer lifecycle, CI trigger matrix, harness tests and historical records from main. Do not publish unrelated local grill-me/skills-lock changes or the broader snapshot ancestry.

Before carrying forward the retained f8d9698 acceptance record, add exact `backlog/US-001-03.md`, `work/US-001-03/plan.md` and `work/US-001-03/evidence.md` paths to this scope. GitHub read-only inspection confirms PR #5 merged by CoinsAgent (User) at 2026-11-07T13:58:30Z with merge 78c848047ced99104127d595e1aaef420121e593; preserve the recorded hosted check provenance. This is the existing delayed acceptance procedure, not a new acceptance decision. US-001-02 is already ACCEPTED on main. Resolve only US-001-04's metadata conflict using the explicit chat approval; ACs unchanged.

Rerun full local verification after integration, then publish a PR targeting main and await both required current-revision checks. Main protection requires `Harness and product verification` and `PR path scope`, enforced for admins; change no host protection. Current main PROCESS governs acceptance after confirmed human merge; no agent merge or acceptance of US-001-04 is authorized. Earlier plan references to the older CI-dependent QA workflow and unpublished prerequisites are historical and superseded by these observed main facts.

Integration full verification exited 0 on c233f98 with 43 harness, 36 structure, 83 application and 68 browser cases (51.7s); whole-diff scope, source equality and dependency review passed. Restore QA_PASSED and publish the authorized PR on the final commit, then inspect required hosted checks on that exact head. No change to CI event cadence or host protection is needed.
