# Delivery plan — US-001-02

## Story and scope

- Story: `backlog/US-001-02.md`; AC-01–AC-12.
- The human supplied exact READY metadata for this story and ACCEPTED metadata for US-001-01 in the latest message. Those values are transcribed as explicitly instructed, not invented agent approvals. No repeat story approval is requested.
- The user approved this plan and its writable paths with “yes, then continue US-001-02”. Implementation may proceed within those paths; host permissions and final review remain separate gates.
- Non-goals: application migration/behavior changes, new wallet/OIDC features, dependency upgrades, production deployment, automatic host-permission changes or bypassing required checks.

## Current architecture and approach

Current owners and placement rules are in `docs/PROJECT_STRUCTURE.md`. Existing frontend/backend code remains at its current paths. Existing verification runs Python harness checks, lint, TypeScript, Vitest, build and Playwright. Current CI runs PR source; it does not establish trusted scope approval or host protection.

Proposed approach:

1. Add a project structure declaration matching current paths, named logical feature ownership, permitted public interfaces and frontend/backend/shared classification. Include legacy modules explicitly without moving them. Cover a differently named layout in fixtures.
2. Add a Git-diff scope checker covering added/modified/deleted/renamed files, both rename endpoints, full PR base/head comparison and unsafe/ambiguous path handling. Machine-readable scope is a proposal, not an approval record.
3. Add TypeScript/JavaScript static dependency analysis using the installed TypeScript parser/resolution where supported. Explicitly cover relative imports, the existing `@/*` alias, re-exports and type-only imports; document unsupported dynamic resolution. Use a finite importer/target/rule baseline. No blind regeneration or wildcard exemption.
4. Separate trusted authorization verification from untrusted product tests. Propose a maintainer-authored scope-approval comment on the same draft PR, binding a proposal commit and digest of scope/policy contents. Validate the host-provided repository/PR identity, actor against a trusted human-maintainer policy, proposal ancestry, current scope contents and policy revision. Do not trust branch-written approval text or a CI payload supplied by the PR author. Implementation commits may reuse an unchanged authorized scope; final human merge review must still cover the current head.
5. The trusted host job must run only verifier code/configuration from a trusted base revision, read candidate Git objects as data, and never execute PR code with privileged permissions. Product tests remain separate with minimal permissions and no secrets. Retrieve scope comments/reviews through read-only host APIs; validate actual capabilities before declaring this operational. Policy/checker changes cannot authorize themselves.
6. Bootstrap requires human review of the initial verifier/policy installation because the trusted base does not yet contain it. Document the installation/update sequence; prove tampering rejection in fixtures. Do not describe simulated results or a branch-controlled job as a live protected gate.
7. Reconcile the already-requested context guidance with implemented capabilities only after actual checks exist. Provide exact host setup steps and read-only verification evidence; do not change host permissions/settings without separate explicit authorization.

Alternative considered: a separate merged scope PR. The human selected one draft PR with scope approval first and final code review afterward. Keep that decision.

## Structure and proposed writable paths

No application source directories are created. Proposed new automation/configuration files have these owners:

| Proposed paths | Purpose |
|---|---|
| `config/project-structure.json`, `config/dependency-baseline.json` | New configuration area for ownership/dependency rules and finite existing violations. |
| `.github/scope-policy.json` | Trusted maintainer identities and approval policy; initial values require human review and host identity verification. |
| `scripts/check_scope.py`, `scripts/verify_scope_approval.py`, `scripts/check_dependencies.mjs` | Scope, authenticated-approval and static-dependency verifiers. |
| `tests/test_scope.py`, `tests/test_scope_approval.py`, `tests/structure/` | Negative/positive/tampering fixtures and dependency-check tests, including alternative layout. |
| `work/US-001-02/plan.md`, `work/US-001-02/evidence.md`, `work/US-001-02/scope.json` | Existing single plan/evidence convention plus machine-readable proposed writable paths. No duplicate lifecycle/approval authority. |

Additional exact existing files proposed for update:

- `scripts/verify.sh`, `.github/workflows/ci.yml`: integrate checks and separate trusted evaluation from product execution.
- `AGENTS.md`, `docs/PROJECT_STRUCTURE.md`, `docs/PROCESS.md`, `docs/README.md`, `docs/PRODUCT_CONTRACT.md`, `docs/UI_DESIGN_CONTRACT.md`: the human-requested context changes already in the working tree and accurate documentation of implemented controls. No product-policy changes.
- `.agents/skills/shape-story/SKILL.md`, `.agents/skills/deliver-story/SKILL.md`, `work/PLAN_TEMPLATE.md`: already-requested workflow guidance and any narrow adjustments needed to use real checks.
- `backlog/US-001-02.md`, `backlog/STORY_MAP.md`: story lifecycle/evidence pointers and existing shaping changes; no approved AC edits without renewed human decision.
- `backlog/US-001-01.md`, `work/US-001-01/evidence.md`: include only the explicitly supplied acceptance metadata and previously requested acceptance record so the complete PR diff remains covered. No predecessor implementation changes.

The working tree already contains context/story changes and unrelated untracked `.agents/skills/grill-me/` and `skills-lock.json`. Preserve those unrelated files and exclude them from this story's commits/PR. Never stage the entire working tree. Before publishing, construct/review an isolated story diff so its complete contents match approved paths. No commit, push, PR publication or host configuration has been performed by this plan.

No `src/`, `server/`, package/lockfile, build configuration or product-test changes are proposed. If implementation proves another file/dependency necessary, pause and request a narrow scope expansion first. Structure and policy additions above are proposals requiring scope approval; documenting them does not authorize their creation.

Human file-scope/approach decision: the user explicitly approved the concrete plan and paths in this conversation. No repeat approval is requested. Later bind the machine-readable revision through the selected host workflow once available; bootstrap must not fabricate that evidence.

## Acceptance tests

Planned verification, not passing results:

| AC | Verification |
|---|---|
| AC-01 | Inventory current tracked areas against ownership declaration; reviewer walks placement examples to current/proposed owners. |
| AC-02 | Valid current and alternative layouts; ambiguous/malformed ownership fails. |
| AC-03 | Missing/wrong actor/revision approvals reject; permitted plan-only preparation grants no implementation access. |
| AC-04 | Temporary Git repositories exercise full base/head diffs, additions, deletions, renames, spaces and path normalization attacks. |
| AC-05 | Out-of-scope shared/config/test change rejects even when product checks pass; scope expansion requires fresh authorization. |
| AC-06 | Dependency fixtures cover feature public/private, feature-to-shared, forbidden reverse dependencies, type-only/alias/barrel paths and browser-to-server imports. |
| AC-07 | Exact legacy violation accepted; new violation/baseline widening rejects; removed violations need not recur. |
| AC-08 | Tampered scope/policy/checker/workflow and copied authorization reject under the trusted verifier; bootstrap limitations documented. |
| AC-09 | Review instructions against actual failures and recovery paths; no competing lifecycle or fabricated approval metadata. |
| AC-10 | Run new harness/dependency fixtures and existing full verification; record actual base/head and supported analysis limitations. |
| AC-11 | Fixture checks separate historical scope authorization from current-head final review; actual host evidence verifies required reviews/checks/stale-approval dismissal. Missing host capability remains a blocker. |
| AC-12 | Review context links, examples, logical roles and proposed/existing distinctions; no empty roadmap scaffolding or copied competing tree. |

## Verification commands

- `python3 -m unittest discover -s tests -p 'test_*.py'` — existing and proposed Python cases.
- Dependency-fixture runner and checker commands will be documented after implementation; not yet available.
- `bash scripts/verify.sh` — preserve and run the actual existing project checks, plus new controls once implemented.
- `git diff --check` and a fresh diff review; skill validators if skills change.
- Read-only host inspection and exact-head CI evidence, when authorized/access is available. A local test does not establish host protection.

## Risks and gates

- Initial trusted installation cannot validate itself. Human bootstrap review and a trusted revision are prerequisites for a live trusted check.
- The exact host authentication/API capabilities and ruleset configuration have not been inspected during planning; this approach must be validated before claiming AC-08/11 complete. No host changes authorized by the story approval alone.
- Directory instructions alone do not restrict local writes. Static analysis is bounded by its documented supported forms.
- Legacy file classifications require careful review; no assumptions that a global path is truly shared. Avoid duplicating existing source under a new feature tree.
- Proposed paths and execution approach were approved in the conversation. New paths still require approval. No passing AC claim is made by this plan.

## Execution checklist

- [x] Human approves this plan and writable paths.
- [ ] Bootstrap/trusted authorization design validated against actual host capabilities.
- [x] Observable positive/negative/boundary/tampering tests run.
- [x] Full existing regression verification passes: 31 Python tests, 25 dependency fixtures, 83 application tests and 68 browser tests, plus lint/types/build.
- [x] Fresh review findings resolved; independent read-only review found no remaining material local-code issue.
- [x] Evidence records exact source/CI/host outcomes and gaps. Live trusted head-bound enforcement and bootstrap remain blocked; no QA_PASSED claim.

## Authorized remote completion follow-up

The user explicitly requested automatically completing steps 1–4: publish the scoped draft PR, finish the trusted gate, configure protected reviews/checks, and verify exact-commit CI, moving to QA_PASSED only if all required gates pass. This authorizes source commits/push/PR publication and necessary GitHub protection setup within the agreed scope. It does not authorize impersonating human reviews, bypassing checks, merging without required human review, production release, or claiming a trusted publisher exists without App/host support.

The delivery checkout isolates only scope-listed files and removes links/map entries for the separately drafted US-001-03. Existing future naming guidance and configuration remain as explicitly requested; no migration implementation is included. Unrelated skill installation files stay in the original checkout. Current local verification includes 29 dependency/layout fixtures rather than the earlier 25.

### Remote execution result so far

Published draft PR #2 at https://github.com/CoinsAgent/agent-first-agile-starter/pull/2 and enabled main review/product/path protections without bypasses. Two new discovery tests bring the Python total to 33. The real negative README probe was rejected by the PR path job and restored in the clean follow-up. The existing credential's Check Run publication attempt was rejected by GitHub with HTTP 403 requiring a GitHub App. A genuine independent human review also remains necessary. Do not mark QA_PASSED unless those host requirements and exact-head CI actually pass; do not substitute a user-authored status or automatic self-review.

The initial implementation's hosted PR CI subsequently passed on ff2131480d15a8d0a9fbc3c3458df109e36775f9 (run 42352818859). Current-head results after restoring the negative probe are tracked in PR #2. Only CoinsAgent appears in the collaborator inventory and is the PR author; no genuine independent review was performed by the agent. The source/App and human-review blockers remain, with all protection requirements preserved.
