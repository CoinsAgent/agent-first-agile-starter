# Delivery plan — US-004

## Story and scope

Human explicitly approved US-004 READY (CoinsAgent, 2026-11-16 Asia/Shanghai), then invoked deliver-story. Implement AC-01–12 and Q1–Q28 as one vertical slice. No upstream patches, existing-data conversion/reset, deployment, PR/CI, host changes or registry publication. Linux CLI + companion repository skill, SIWE owner consent, IAT-only reference ownership, per-target management and independent revocation.

## Current architecture and approach

Reuse provider code/PKCE, IAT register endpoint, supported adapters/middleware and existing family-isolated protocol integration. Add management grant persistence and policy beside OIDC; applications owns IAT/CRUD/rate/idempotency/quota/deletion. Bootstrap initializes fixed fresh schema and one system public CLI. All normal client ownership is immutable verified referenceId, userId null. Canonical wallet user identity remains.

## Structure and writable paths

Authoritative guide: docs/PROJECT_STRUCTURE.md. Exact proposed writable files are in scope.json, declared before edits; tests and shared/config are explicit. New `cli/index.ts` thin executable, `cli/auth.ts` authorization/callback/storage/refresh, `cli/applications.ts` HTTP commands. CLI imports no backend internals. New backend/oidc/management.ts owns grant/consent/policy, backend/applications/management.ts owns token-authorized application operations. Frontend authorization/management.tsx owns consent and authorization list/revoke, pages compose sign-in; generic UI remains independent. Document skeleton in PROJECT_STRUCTURE before product edits. No empty folders. Companion .agents/skills/walletgate-cli/SKILL.md contains instructions, never credentials.

Branch: codex/us-004-cli-management. Intended full-diff base: c224199b3da4333f73cbf09d320f97c1d0774082. Starting retained acceptance commit:09d4594. Carry backlog/US-003.md and work/US-003/evidence.md. Read-only `gh pr view 11` and `gh run view 43551002730` reconfirm human CoinsAgent merge c224199 on2026-11-14T03:22:29Z after both required checks succeeded on307d3a1. No other WIP; all predecessors ACCEPTED locally. Existing dirty story/map are the authorized shaping/approval changes; preserve them.

Baseline `bash scripts/verify.sh` started before source edits; output currently /tmp/us004-baseline.log. Record actual completion before implementation. No baseline result claimed yet.

## Acceptance tests

| AC | Planned executable verification | Layer |
|---|---|---|
|01|management.test.ts, management.spec.ts, cli.test.ts: actual provider public PKCE/browser binding/callback/expiry/denial|integration/E2E|
|02|management.test.ts token/client/purpose/resource/scope substitutions and cookie bypasses|integration|
|03|management.test.ts boundary/restart/refresh replay/grant isolation/logout/replacement|integration|
|04|management.test.ts IAT boundaries, single-success, retries, parent revoke, rate|integration|
|05|management.test.ts and database.test.ts actual reference assignment/immutable fields/fresh-only refusal|integration|
|06|applications/management tests validation/secret/reconciliation/quota/rate/rollback|integration|
|07|management.test.ts two wallets/two targets/per-operation no implied read|integration|
|08|management.test.ts update atomicity and pending/code redirect removal|integration|
|09|management.test.ts protocol deletion and unrelated-family survival|integration|
|10|management.spec.ts real consent/list/revoke/guidance, axe/light/dark/narrow/keyboard/zoom|browser E2E|
|11|cli.test.ts actual command invocation, credential files, output/errors/confirmation; skill command smoke|CLI integration|
|12|full scripts/verify.sh, scope/dependency check and independent read-only review|full|

## Verification and risks

Use focused checks while implementing, full bash scripts/verify.sh and complete committed diff scope before QA_PASSED. Source inspection is not compatibility proof. Investigate resource-triggered JWT issuance, offline family policy and public CLI special profile; report material incompatibility without weakening ACs. Existing application/identity/OIDC fixtures must create through new IAT flow rather than preserve removed session authority. Preserve negative coverage; adapt expectations for reference ownership/system client. Browser evidence belongs work/US-004/artifacts, no earlier-story artifact writes. Independent reviewer will inspect complete diff, no human acceptance claims.

## Execution checklist

- [x] Baseline completed and recorded
- [x] Implementation and meaningful AC tests
- [x] Full local verification, scope and independent review
- [x] QA_PASSED handoff with tested revision/evidence
- [ ] Explicit finished-result human approval before PR/CI
- [ ] Human merge before ACCEPTED

## Implementation refinements within approved scope

Two supported Better Auth configurations share the same transaction adapter and storage: normal RP/registration keeps JWT signing and hashed secrets; the management-only provider disables JWT for opaque tokens, accepts only the system public CLI and cannot register clients. Its required encrypted-secret configuration never stores a management client secret because the system public client has none. This avoids mutating global options per request or weakening RP secret storage. Native code/PKCE validation remains intact. Resource URI is urn:walletgate:management with explicit initialized client-resource linkage.

The complete approved shaping diff and prior US-003 acceptance record are included against c224199. New app registration fixtures follow real SIWE/code/IAT paths; old web/session registration expectations are intentionally replaced by token-only equivalents, preserving metadata/rate/quota/idempotency/rollback and RP regressions. No check is disabled. Browser artifacts now use US-004 paths instead of writing US-003 artifacts.

Independent review found and fixed registration/replay inactivity updates, mutable-config disclosure through reconciliation, and missing original-parent binding. Submission records now keep immutable public snapshots and original grant IDs. Added actual-provider regressions; expired IATs cannot authenticate replay, but the original valid management grant can reconcile. No AC/outcome change.

## Final local result

Tested revision3d4ad9816d3c0c92326d4e2023d38c1cf0da52e0 passed full verification with explicit full-diff scope:43 Python tests,41 structure fixtures,287 application/CLI tests,81 browser tests, lockfile/lint/types/build/dependency checks. Independent reviewer rechecked all fixes and found no remaining critical issue. Product source matches reviewed5fd2e35. See evidence.md for actual commands, failures/resolutions, scope and limits. QA status/evidence recording changes no product/tests. Await human review/finished-result approval before PR/CI; no release or data operation performed.

## Human-authorized operation-test deployment

The human explicitly requested release to port3000, accessible at https://walletgate.beeswarm.dev/, followed by self-test instructions. This authorizes this operation-test deployment using the already-selected new environment/database, not PR/CI or merge acceptance. Release source: de112c6 (product/tests identical to full-verified3d4ad98). Use git archive into an immutable release directory, locked offline installation/build, disposable actual-release provider smoke and a separate new initialized database. Preserve old release/database/runtime configuration and prepare automatic rollback before systemd switch. Existing nginx routing/TLS/protection remain unchanged. Only runtime release working directory and selected database override change. Record scripts/logs under the already-declared work/US-004/artifacts and add work/US-004/manual-test.md for the human walkthrough. No product-source/AC changes.

## Human finished-result approval to publish PR and run CI — 2026-11-16

The human explicitly instructed “US-004 looks good—open its PR and run CI.” This approves the presented locally verified/deployed result and authorizes pushing the story branch, opening its PR and running the existing required PR checks. Presented head8580a1e; product/tests match full-local-verified3d4ad9816d3c0c92326d4e2023d38c1cf0da52e0 and deployedde112c63889b8d8d9e26f89e2aea63feacf65743. The approval record changes only plan/evidence, not approved ACs or product/tests. Main was read-only reconfirmed asc224199b3da4333f73cbf09d320f97c1d0774082 and no story PR existed. Run focused metadata/harness, whitespace and complete-diff scope before publication. Open the PR once; let its unchanged required CI start automatically rather than dispatching a duplicate run. Keep actual PR/head/check snapshots in ignored artifacts. Story remains QA_PASSED with empty acceptance fields until confirmed human merge after successful required current-head CI. Earlier unrequested/pending-approval statements are historical checkpoints. No host protection change or agent merge is authorized.
