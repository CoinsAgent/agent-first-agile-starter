# Project structure and code placement

This is the authoritative human-readable structure guide for this repository. Product behavior remains governed by the Vision, Product Contract and approved stories. Story status and human approvals remain in their existing records.

## Establish the skeleton before code

Document the intended structure and proposed paths on the story branch before implementing a new area. Obtain a human decision if the structure changes approved story outcomes or other human-owned boundaries. Create a directory only when an approved task needs its first real file. Do not scaffold empty features, add placeholder services, or create folders for the entire roadmap. A documented path is a placement rule, not permission to edit it.

The skeleton below defines the selected migration target. The existing-code table separately identifies current locations. Other projects adopting the starter may choose different paths while preserving the responsibilities and dependency rules. Target paths do not exist merely because they appear here; their first use must be included in the task's approved file scope. Changes to ownership or the skeleton need human review before affected implementation.

## Intended skeleton

### Selected future naming — separate migration

The human selected `frontend/src/` for React and `backend/src/` for Node.js, initially with one root `package.json` and lockfile. The separate DRAFT [US-001-03](../backlog/US-001-03.md) proposes the existing→target mapping, tooling/import updates and regression checks. This is a future naming decision, not an instruction to move code during another story. Feature-owned code, shared UI/helpers and app composition retain their logical roles under the new prefixes; `shared/contracts/` remains optional and runtime-neutral.

Until that migration is approved and delivered, current application code, build paths and the active `@/` alias continue to use root `src/` and `server/`, as identified in the existing-code table. The transition ownership declaration checks those existing sources and explicitly declares the selected `frontend/src/` and `backend/src/` destinations, so any approved code introduced there is checked too. It grants no generic `app/` or `features/` directory ownership. Do not drop current-source coverage, switch active imports/build paths, create duplicate implementations, or change US-001-02's approved scope ahead of actual migration. Preserve the five real current baseline edges until their exact migration is reviewed; declaring future public interfaces does not exempt legacy private imports.

For the future frontend, the human selected explicit responsibilities directly under `frontend/src/`, rather than generic `app/` and `features/` containers:

| Selected target | Logical ownership and responsibility |
|---|---|
| `frontend/src/main.tsx` | Thin React mounting entry; preserve initialization order and existing providers. |
| `frontend/src/bootstrap/` | App composition: configure actual providers and existing URL/page dispatch. Introduce no new router library or navigation behavior merely to populate the folder. |
| `frontend/src/pages/` | Page composition: assemble domain public interfaces and generic UI. Existing sign-in assembles here; future consent/application-management pages wait for their own stories. |
| `frontend/src/wallet-auth/` | Feature/domain: wallet choices, SIWE review/signing, QR approval, authentication hooks and browser API calls. |
| `frontend/src/authorization/` | Future feature/domain: display validated requesting-application/scopes context and collect allow/deny actions. Protocol validation and token issuance remain backend-owned. |
| `frontend/src/applications/` | Future feature/domain: owner-facing registration and management interactions. |
| `frontend/src/ui/`, `frontend/src/lib/` | Shared presentation primitives and generic frontend helpers; cannot import domains, pages or bootstrap, even through type-only/public imports. |
| `frontend/src/assets/`, `frontend/src/styles/` | Assets/attribution and theme/global presentation; preserve existing content and behavior during migration. |

Pages/bootstrap have composition ownership, the named domains retain feature ownership, and generic UI/helpers retain shared ownership. Composition consumes domain public interfaces; domains cannot import pages/bootstrap. A sign-in page supplies wallet state/actions to generic buttons rather than letting generic UI import wallet hooks. Any entry/page module extraction during migration must be mechanical and preserve current state ownership, effect timing, SDK preload, CSP nonce setup and mobile-approval dispatch; no auth-controller redesign is authorized.

OIDC Core terminology informs authentication/authorization responsibilities, not React folder names. Discovery is backend-published machine-readable metadata, not a frontend page/domain. Do not create consent/application pages or empty `authorization/`/`applications/` directories as part of migrating the existing sign-in implementation.

For the future backend, the human selected explicit domain names directly under `backend/src/`, rather than generic `app/` and `features/` containers:

| Selected target | Logical ownership and responsibility |
|---|---|
| `backend/src/index.ts` | Thin executable entry into startup/composition. |
| `backend/src/bootstrap/` | App composition: create HTTP server, configure supported auth integrations and mount domain public interfaces. No independent business rules. |
| `backend/src/wallet-auth/` | Feature/domain: SIWE proof and verified wallet-session behavior; preserve existing implementation during migration. |
| `backend/src/oidc/` | Future feature/domain: authorization/token endpoint integrations, consent and claims; discovery metadata and public verification-key publication. |
| `backend/src/applications/` | Future feature/domain: wallet-owner-authorized client registration and management, distinct from end-user authentication and token issuance. |
| `backend/src/infrastructure/` | Shared backend configuration, database and generic technical building blocks; cannot import domain features or bootstrap. |

These names change placement, not dependency principles: bootstrap consumes domain public interfaces and infrastructure; domains consume infrastructure and other domains' explicit public interfaces; infrastructure stays independent of domains/bootstrap. Public browser imports of backend implementation remain forbidden. Configure those logical roles explicitly during migration; the checker need not rely on a literal `features/` directory.

Within future `oidc/`, names such as `discovery.ts`, `authorization.ts`, `token.ts`, `jwks.ts`, `consent.ts` and `claims.ts` express responsibilities aligned with OIDC Core/Discovery. They are implementation conventions, not protocol-mandated filenames or endpoint URLs. Reuse supported Better Auth provider functionality instead of handwritten token/cryptographic implementations. Discovery describes provider capabilities and endpoint/key locations; wallet verification and owner application management keep their own domain ownership. These future capabilities belong to US-002–US-004, not the layout migration. Do not scaffold empty OIDC/application modules or split existing mixed auth responsibilities merely to populate this proposed structure.

### Selected target tree

This is the single intended tree. It replaces earlier proposals for generic production `app/`, `features/` and `shared/ui/` containers. Comments identify the responsibility of each directory. `[future]` means reserve the ownership in documentation only; create no empty directory or placeholder module until an approved story requires real code.

```text
AGENTS.md                         Codex entry instructions and document routing
docs/                             Product, design, structure, process and setup guidance
backlog/                          Story map and authoritative story records
work/<story>/                     One plan and one evidence record for a delivered story
.agents/skills/                   Reusable shaping and delivery workflows
.github/                          CI and review configuration
scripts/                          Repository automation and verification
config/                           Executable ownership declaration and finite legacy baseline
package.json                      One root package for both runtimes initially
package-lock.json                 One root dependency lockfile
frontend/
  index.html                      Browser HTML entry
  src/
    main.tsx                      Thin React mounting entry
    bootstrap/                    Providers, initialization and existing page dispatch
    pages/
      sign-in.tsx                 Assemble existing sign-in UI and domain actions
      consent.tsx                 [future] Assemble approved consent UI
      applications.tsx            [future] Assemble owner-management UI
    wallet-auth/
      components/                 Wallet choices, SIWE review and phone approval UI
      hooks/                      Wallet authentication state/orchestration
      wallet.ts                   Wallet connection integration
      wallet-sdk.ts               Wallet SDK integration
      api.ts                      Browser calls to authentication HTTP endpoints
      index.ts                    Public domain interface when needed
    authorization/                [future] Application/scopes context and allow/deny UI
    applications/                 [future] Owner registration/management interactions
    ui/                           Generic presentation primitives; no domain imports
    lib/                          Generic frontend helpers; no domain imports
    assets/                       Images, wallet icons and attribution
    styles/                       Theme tokens and global CSS
backend/
  src/
    index.ts                      Thin executable entry
    bootstrap/
      server.ts                   Create server, mount domains and start listening
    wallet-auth/
      auth.ts                     Existing SIWE/session/auth integration
      qr.ts                       Existing cross-device approval behavior
      index.ts                    Public domain interface when needed
    oidc/                         [future] OIDC Core/Discovery provider integration
    applications/                 [future] Owner-authorized client configuration
    infrastructure/
      config.ts                   Backend environment/runtime configuration
shared/contracts/                 [future] Safe runtime-neutral request/response schemas
tests/
  app/                            Existing application unit/integration tests
  e2e/                            Existing browser acceptance tests and fixtures
  test_*.py                       Existing harness tests
```

Subfiles are responsibility examples, not a mandatory file count or layering framework. A small domain can start with one cohesive module; introduce another file when its responsibility warrants it. Do not introduce production `app/` or `features/` containers: put startup wiring in `bootstrap/`, screen assembly in frontend `pages/`, behavior in a named domain, and generic code in the specified UI/helper/infrastructure locations. Domain-local `components/` and `hooks/` have explicit ownership and are not global catch-all directories.

The existing central `tests/app/` has a dedicated meaning: application unit/integration tests. Retaining it does not authorize a production `app/` container or imply a test migration. Likewise, machine-declaration role labels `app`, `feature` and `shared` describe composition, domains and generic building blocks; they are not filesystem directory names. During migration configure the explicit target directories to those roles without requiring a literal `features/` path.

## Existing code: find it before adding a replacement

| Current location | Responsibility and handling |
|---|---|
| `src/main.tsx` | Current app assembly and legacy authentication presentation; inspect before changing page assembly. Extract only within approved scope. |
| `src/components/wallet/` | Existing wallet-specific presentation, not reusable shared UI. Keep current paths for scoped maintenance; no parallel implementation under a new path. |
| `src/hooks/use-wallet-auth.ts` | Existing wallet authentication orchestration. Feature-owned despite its current global path. |
| `src/wallet.ts`, `src/wallet-sdk.ts` | Existing wallet connection/SDK integration. Feature-owned, not generic helpers. |
| `src/lib/api.ts` | Existing browser authentication API client. Its directory does not make it shared infrastructure. |
| `src/lib/utils.ts` | Existing generic frontend presentation helper; keep it independent of wallet features. |
| `src/components/ui/` | Shared primitives such as buttons and dialogs; receive feature behavior through props/callbacks. |
| `src/style.css`, `src/assets/`, `src/walletgate.png` | Existing global theme/assets and original branding asset. Follow asset preservation rules in the relevant story; an unused file is not permission to delete it. |
| `server/index.ts` | Current HTTP startup/composition; target `backend/src/bootstrap/server.ts` with a thin `backend/src/index.ts` entry only during the approved migration. |
| `server/auth.ts`, `server/qr.ts` | Existing authentication/QR backend behavior. Maintain here until the separately approved migration to `backend/src/wallet-auth/`; do not duplicate it in another directory. |
| `server/config.ts` | Existing backend runtime configuration. Server-only; never import into browser code. |
| Root package/lock/config files, `index.html`, `.npmrc`, `.gitignore`, `.env.example`, `components.json`, `skills-lock.json` when present | Dependency, entry, tool, environment-template or skill-install configuration. Each necessary edit requires explicit inclusion in task scope. Never place credentials in source or templates. |
| `.vscode/` | Existing editor configuration, not application source. Changes still need explicit scope. |
| `data/`, `.env`, local databases | Runtime/local state, not feature source or output to commit. Data operations require their own authorization. |
| `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, ignored work artifacts/experiments | Dependencies or generated/local outputs, not application source. Do not hand-edit outputs to implement a feature or add them to source commits. Historical tracked artifacts remain subject to approved scope. |

This table is the human-readable orientation map; `config/project-structure.json` supplies executable ownership and `config/dependency-baseline.json` records exact existing violations. Keep them consistent through human-reviewed changes, without copying another directory tree. Existing paths are retained; no new reverse dependency is justified by legacy placement. If current reality differs, identify the mismatch and propose the smallest update rather than silently relocating code. The initial inventory includes tracked root files, all tracked top-level directories, 16 production modules and five baselined private-feature imports; runtime/local outputs remain non-source areas.

## Dependency principles

- Application composition assembles feature public interfaces and shared building blocks. Feature code must not import application composition.
- Features may import shared building blocks. One feature accesses another only through an explicitly declared public interface, never a private internal path. Do not create broad re-export barrels that accidentally expose every file.
- Shared code cannot import features or application composition, even through public interfaces or type-only imports. This also applies through aliases and re-export modules. For example, a shared button receives `loading` and `onClick`; it must not read wallet-authentication state itself.
- Product-specific assembly belongs in frontend `pages/`/`bootstrap/` or backend `bootstrap/`, not a generic `app/` folder. A header showing wallet identity can combine reusable UI with a wallet domain's exported component. Calling it a shared header does not make a wallet dependency generic.
- Browser code calls backend HTTP endpoints through a frontend API client. It must not import server implementation, database handles, secrets or server configuration, even from a public interface.
- Cross-runtime contracts contain only safe types/schemas and runtime-neutral validation where needed. They cannot import frontend or backend feature implementations. Shared frontend helpers and backend infrastructure remain separate; similar names alone do not justify sharing.
- Existing dependency violations are individually recorded in the finite baseline; no blanket exemption or automatic regeneration is provided. The five initial entries preserve existing app/server assembly imports without moving code. They are candidate bootstrap policy requiring human review, not agent-authenticated approvals of permanent exceptions. Removed violations may remain as reported stale entries until a reviewed cleanup; they need not be reintroduced.

## Choose where to add or update code

| Change | Placement decision |
|---|---|
| Fix existing wallet connection/signing | Inspect the existing wallet modules/controller/components above and update the owner; avoid a duplicate implementation. |
| Add UI for a new approved domain | The specifically named frontend domain (`wallet-auth/`, `authorization/`, or `applications/`), with its components, hooks and browser API calls as needed. Use current owners until the migration is delivered. |
| Add a reusable button/dialog | Current `src/components/ui/`, then target `frontend/src/ui/` after migration; no domain imports. Require actual reuse rationale and explicit scope for generic-code changes. |
| Add a domain-specific helper | Its named domain, not generic `lib/` merely because it is a function. |
| Assemble a screen | Target frontend `pages/`; `pages/sign-in.tsx` assembles wallet authentication. Until migration, inspect the existing composition in `src/main.tsx`. |
| Configure providers/navigation/startup | Target frontend or backend `bootstrap/`; consume domains through their public interfaces. Preserve current startup/dispatch until the approved mechanical extraction. |
| Add a backend endpoint | Its specifically named backend domain (`wallet-auth/`, `oidc/`, or `applications/`); mount through `bootstrap/server.ts`. No generic `features/` or parallel root API bucket. |
| Add a browser API call | The calling frontend domain's `api.ts`; no database or server implementation imports. |
| Share a request/response schema across runtimes | A narrowly scoped runtime-neutral contract in the declared shared contract area, if needed and approved. |
| Add tests or assets | Existing test/asset conventions, with clear feature ownership and explicit writable paths in the plan. Public-interface rules govern production dependencies; test access/exclusions must be explicit in future enforcement configuration. |
| Add configuration, a dependency or migration | Explicit named files/paths in the approved task scope; never treat common files as automatically writable. No migration directory is needed before a real approved migration. |

## Branch workflow and placement

Follow the five steps in [PROCESS](PROCESS.md#approved-delivery-workflow): approve the story, run baseline checks, propose paths and implement on a new branch, obtain review of finished changes, then merge when authorized. Document ownership and any new-area skeleton before implementation. Include shared/config/test files and plan/evidence updates in the proposed paths. No separate human path approval is required; record necessary technical revisions within the approved story and ask only when a human-owned decision changes. Create directories only when real approved work needs them.

Run final checks after implementation and inspect the entire base/head diff. Present proposed and actual paths, scope revisions and evidence for human review. Changes after review require renewed presentation. A PR is a review interface and may be required by existing host settings; it is not a universal process prerequisite. Checks do not prevent local writes or establish human acceptance.

## Executable checks and coverage

- `bash scripts/verify.sh`: Python harness/scope/approval fixtures, Node dependency fixtures, production ownership/dependencies, then the unchanged real application checks. Legacy approval fixtures exercise an optional verifier; they do not impose a human scope-approval gate.
- Supply `STRUCTURE_SCOPE_BASE`, `STRUCTURE_SCOPE_HEAD` and `STRUCTURE_SCOPE_FILE` to that command to include an actual full-diff scope check. Partial inputs fail; without them verification explicitly reports that no actual diff was selected. A local success is path verification, not human approval.
- `node scripts/check_dependencies.mjs`: inspect current production files against the declaration/baseline. Unknown source ownership, ambiguous/overlapping declarations, unsupported configured source types, unresolved first-party imports and nonliteral `import()`/`require()` fail. New top-level tracked/unignored areas and unknown root files require declaration instead of being silently ignored.
- `node scripts/check_dependencies.mjs --ref <full-commit-sha>`: parse Git source blobs using the checker's current trusted declaration and baseline. It does not check out or import candidate modules. Use only a trusted checker/dependency installation when evaluating untrusted source.
- `python3 scripts/check_scope.py --base <base-commit> --head <head-commit> --scope work/<story>/scope.json`: check all changed paths between explicit commits, including both rename endpoints. It rejects symlink/submodule changes and unsafe scope paths. The JSON contains `version: 1`, `story`, and `allowed` entries with `path` and `kind: file|directory`. Entries are canonical repository-relative paths without globs, overlaps or implicit common-file exceptions. This command checks paths, not human identity.
- The selected base must be an ancestor of the head. If the trusted base advances independently, verification asks you to update the branch first instead of misreporting base-only additions as candidate deletions. Re-run scope/dependency/product checks and final current-head review after updating; final review of an earlier head cannot authorize the update.
- Optional legacy diagnostic, not a required delivery gate: `python3 scripts/verify_scope_approval.py --pr <number>`: from the current trusted PR base checkout, retrieve GitHub metadata/comments/reviews, verify exact scope authorization and run the trusted dependency checker against candidate Git blobs. It requires one changed `work/<story>/scope.json`, uses base policy/config/baseline, and refuses missing authorization. Its output separates scope authorization from final current-head review. Local JSON fixtures cannot be passed as host approval through this CLI.

Dependency parsing uses the installed TypeScript 7 native AST API with synthetic parse-only snapshots. Supported first-party forms: static value/type imports, re-exports, import-equals, import-type expressions, literal dynamic imports and literal CommonJS `require`; relative file/index resolution, declared prefix aliases such as `@/`, JS-to-TS extension substitution and Vite asset query suffixes. Public interfaces are explicit legacy entries or a named feature's `index.ts`. Tests may access production internals; production dependency policy excludes test/automation modules, whose paths remain scope-controlled. Supported production code extensions are TS/TSX/MTS/CTS and JS/JSX/MJS/CJS; documented assets are classified but not parsed as code.

Coverage limits: this is not a bundler, npm package graph audit, full TypeScript resolver or runtime sandbox. It does not follow package conditional exports, arbitrary import maps, CSS dependency graphs, eval, aliased loader functions, generated module names or executable framework configuration. Unknown first-party paths/nonliteral module calls fail where recognized. External packages are not traversed; browser/neutral direct Node builtins are rejected. Library changes must reverify the installed unstable AST API. Source snapshot symlinks are rejected. These limits must not be described as proof that an entire runtime bundle contains no server code.

## Bootstrap and host setup

The current process requires baseline/final checks, declared branch paths and human review of finished changes. It does not require a custom GitHub App, `/approve-scope` comments or an independent publisher. The existing approval verifier, policy and diagnostic workflow implement the superseded stronger authorization model and are optional legacy tooling; their presence does not establish an active approval requirement. This documentation update does not delete or change their code.

Existing GitHub branch protection is separate from repository documents. During this verification run, live main protection requires `Harness and product verification` and `PR path scope`, with zero approving reviews and no latest-push approval requirement. A PR remains the configured merge route; the owner may review and merge after checks pass. These settings were read, not changed by this run. Follow actual host requirements and do not bypass failing checks.

Keep CI credentials out of candidate code, review changes to checkers/configuration along with the implementation, and report verification limits. The simplified workflow relies on human review and agent discipline; it does not guarantee that candidate-authored enforcement cannot be weakened. An initial installation or later policy change needs review of its actual diff before an authorized merge. Neither a merge nor passing CI constitutes business acceptance or release authorization.

## Context ownership

This guide owns directory responsibilities and placement examples. `AGENTS.md` routes Codex here; the Product Contract states maintainability intent; the UI Design Contract covers UI-specific responsibilities; PROCESS and skills govern when to review the structure and task scope. Link here rather than maintaining another full directory tree. Never change product behavior, approved ACs, story status or human approval metadata merely to align directories.
