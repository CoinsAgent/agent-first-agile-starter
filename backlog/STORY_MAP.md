# Story map — WalletGate

Planning proposal only. Human-owned product documents govern scope. Linked story
files own lifecycle status, approved ACs and approval metadata.

## Product context

- [Vision](../docs/VISION.md) and [Product Contract v1.1](../docs/PRODUCT_CONTRACT.md) are human-accepted. This map proposes delivery scope within those boundaries.
- Application owners want to register and control independent applications using their verified wallet.
- End users want to sign in to those applications by proving wallet control, with clear consent.
- Application developers want to consume standard OIDC endpoints without adopting the IdP's frontend libraries.
- Self-hosting operators need a reproducible way to run and configure the release; production operations are a later slice.

## Journeys and release slices

### Application owner

| Proposed slice | Prove wallet control | Register applications | Maintain applications |
|---|---|---|---|
| Minimal end-to-end release | [Connect, sign SIWE, enter owner session](US-001.md) | [Register independent clients, save credentials and view my applications](US-002.md) | [Edit redirects and disable clients from my owner list](US-004.md) |
| Later | Broader wallet/platform coverage | Authorized dynamic registration | Ownership transfer, credential rotation, richer scope/policy controls |

Proposed authentication refinement before registration: [US-001-01 — choose a wallet or approve SIWE login by QR](US-001-01.md). The owner follows the same connect → review SIWE → sign → server verification journey with a custom shadcn/ui wallet dialog and wagmi EIP-6963 discovery.

Targeted ownership refinement: [US-001-07](US-001-07.md) connects the verified wallet user to each registered client through native `oauthClient.userId`, then uses that identity for viewing, authorization and limits. The human selected fresh databases only, no conversion of existing clients, and this slice before US-004 editing/disabling. The human subsequently selected US-003 token issuance before US-004 token-based management. Success means wallet A retains two independent clients across reauthentication/restart while wallet B cannot access them; incompatible storage is refused without conversion or deletion.

### End user

| Proposed slice | Arrive from an application | Prove identity | Decide access | Return signed in |
|---|---|---|---|---|
| Minimal end-to-end release | [Start a standard OIDC authorization request](US-003.md) | [Step-by-step wallet authentication](US-001.md) | [Allow or deny named application's requested access](US-003.md) | [Application receives and validates wallet subject](US-005.md) |
| Later | More client types | Broader wallet support | Remembered consent and grant management | Broader claim sets and account bindings |

The shared prove-identity entry point is refined by [US-001-01](US-001-01.md); the human selected installed-wallet choice, custom SIWE QR authentication and Android Chrome handoff using wagmi, viem, Better Auth, shadcn/ui and Tailwind. The human confirmed phone approval of the originating desktop when Chrome has no wallet extension; the approved request/session policy and wallet matrix are maintained in the story. Wallet transport, RPC, ENS, images and wallet-owned services require separate configuration and network verification. OIDC consent and return remain in US-003/005.

### Application developer and self-hosting operator

| Proposed slice | Run and configure IdP | Configure a client | Integrate | Confirm outcome |
|---|---|---|---|---|
| Minimal end-to-end release | [Documented local setup](US-001.md), extended by each story | [Wallet-authorized registration](US-002.md) | [Discovery, keys and authorization code flow](US-003.md) | [Independent relying-party example and reproducible walkthrough](US-005.md) |
| Later | Production deployment, backup/recovery and operational hardening | Additional registration methods | Public/native clients, additional grants | Additional interoperability suites |

### Wallet identity

The human selected explicit one-time initialization of an empty database before normal startup for US-001-06. The server consumes initialized storage without creating or upgrading tables; the linked story owns this setup requirement and its verification.

| Proposed slice | Select wallet | Prove wallet control | Resolve user | Act as owner |
|---|---|---|---|---|
| Shared SIWE identity refinement | [Use an existing supported address](US-001-06.md) | [Validate SIWE through existing local/QR paths](US-001-06.md) | [Persist exactly one user with user.id equal to the canonical address](US-001-06.md) | [Retain that address's independent applications and isolation](US-001-06.md) |
| Later, separately scoped | Broader wallets/chains | CLI sign-in (human deferred) | Third-party CLI/OIDC integration | Broader session management |

[US-001-06](US-001-06.md) refines the human's clarified Better Auth SIWE identity requirement: one verified address, one persisted user whose ID is that address, and the owner role belonging to that same identity. Success means repeated/case-equivalent sign-ins reuse one user, different addresses stay isolated, and one owner can still manage multiple independent applications. This is address identity, not real-world person or wallet-device uniqueness. The human selected an explicit local development/test reset of old identity and dependent application data, deferred CLI sign-in, and placed this slice next after any current delivery. The linked story owns the detailed deletion boundaries, ACs and final approval gate; no new OAuth grant, CLI credential delivery or product-document change is implied.

### Maintainer and Codex

This reusable starter/harness journey supports controlled development of WalletGate and future projects. It does not extend the WalletGate product contract or require moving existing application code.

The proposed [US-001-03 workflow improvement](US-001-03.md) places local QA before human review, defers PR/CI until explicit human approval of the finished result, and records acceptance after human merge. It is proposed before the layout migration; the linked story owns the approved criteria and delivery record.

The separate [US-001-04 migration proposal](US-001-04.md) applies the human-selected `frontend/src/` and `backend/src/` names with one root package. Backend destinations use explicit `bootstrap/`, `wallet-auth/`, `oidc/`, `applications/` and `infrastructure/` ownership; future domains are documented, not scaffolded or implemented by migration. It explicitly scopes actual moves and tooling updates outside US-001-02; that story's no-migration boundary and delivery gate remain unchanged.

Frontend destinations likewise use explicit `bootstrap/`, `pages/`, `wallet-auth/`, `authorization/`, `applications/`, `ui/`, `lib/`, `assets/` and `styles/` responsibilities. The migration proposes mechanical separation of the existing sign-in entry/page assembly, not new consent/management screens or frontend Discovery functionality.

| Proposed slice | Understand the structure | Approve a task boundary | Add/update the right code | Verify and review |
|---|---|---|---|---|
| Minimal controlled-change workflow | [Declare project-specific ownership and placement guidance](US-001-02.md) | [Codex runs baseline checks and proposes branch paths](US-001-02.md) | [Feature-local work, public interfaces, explicit scope expansion](US-001-02.md) | [Scope/dependency checks and human review of finished changes](US-001-02.md) |
| Local QA before hosted verification | [Review the simplified lifecycle](US-001-03.md) | [Approve a story and review the locally verified result](US-001-03.md) | [Iterate locally and let the agent record QA_PASSED](US-001-03.md) | [Human approval starts PR/CI; human merge completes acceptance](US-001-03.md) |
| Separate layout migration | [Review explicit frontend/backend naming and current→target mapping](US-001-04.md) | [Approve both endpoints and tooling paths](US-001-04.md) | [Relocate existing code while retaining one root package](US-001-04.md) | [Run the unchanged authentication/UI regressions and migrated structure checks](US-001-04.md) |
| Remove redundant src level | [Review direct frontend/backend placement](US-001-05.md) | [Approve the behavior-preserving follow-up](US-001-05.md) | [Lift source one level with existing owners intact](US-001-05.md) | [Run root commands, layout checks and authentication/UI regressions](US-001-05.md) |
| Later | Additional language adapters | Broader multi-task workflows | Separately approved legacy cleanup/migration | Additional audit/reporting tools |

Proposed usable harness outcome: a maintainer adopts the convention without reorganizing existing code, approves a story and reviews its finished branch, and can distinguish a valid change from an unrelated edit or new private-feature dependency. Success requires allowed changes to pass and unauthorized/tampering fixtures to fail; existing host restrictions remain effective; the process requires no separate App or pre-edit path approval. [US-001-02](US-001-02.md) owns the detailed criteria and decisions, including gradual adoption. This is a separate enabling slice, not completion of the WalletGate evaluation release.

## Proposed minimal release

- Usable end-to-end outcome: on a self-hosted evaluation instance, an owner registers and manages two distinct applications; an end user signs in through either application with SIWE and explicit consent; each application receives the same canonical wallet-address subject through standard OIDC.
- Observable success signal: repeat the documented setup with two client registrations; successfully sign in to both, compare their subjects and distinct client IDs, deny consent without receiving tokens, and prove that another owner cannot manage either application. Disable a client and show subsequent authorization/token issuance is rejected for it.
- Included: wallet login/logout, owner-authorized registration and limited management, standard authorization code flow, explicit consent, optional offline access with rotating refresh tokens, UserInfo/revocation, discovery/verification keys, independent relying-party example, and repeatable self-hosted evaluation instructions.
- Proposed exclusions: grants beyond authorization code and refresh, dynamic registration, ownership transfer, credential rotation, production deployment/SLA, unrelated service-account binding, agent identity/payments. These exclusions limit the proposed first release; they do not remove longer-term contract obligations.
- Dependencies and risks: wallet access in the chosen browser/platform matrix; approved session and identity policies; a configured trusted origin and issuer; runtime/database setup; supported Better Auth customization. Framework compatibility is unverified. Delivery must investigate gaps and report them rather than weaken the contract or assume current library support.
- Each story extends the runnable setup and verification appropriate to its behavior. US-001 is a foundation, not the complete release. Production readiness and release authorization are separate decisions.

## Story sequence

On 2026-11-12, the human requested swapping the two draft IDs to match delivery order: **US-003 = wallet-based OIDC sign-in and renewable tokens** (formerly US-004); **US-004 = token-based client management** (formerly US-003). Current backlog references use these IDs. Earlier delivery plans/evidence and historical ordering notes retain their original IDs; this administrative renumbering changes no accepted outcome or approval.

| Story | Actor and value | Dependencies | Contribution to release |
|---|---|---|---|
| [US-001](US-001.md) — Prove wallet control | Owner/end user obtains a SIWE-authenticated session | Human policy decisions D2–D4 below | Shared authentication boundary and first usable sign-in journey |
| [US-001-01](US-001-01.md) — Choose a wallet or approve SIWE login by QR | Owner/end user selects a wallet and completes existing SIWE login with a custom dialog, shared CSS/Tailwind tokens and phone approval | US-001; wallet/platform and custom QR security-policy decisions in the story | Human-selected next slice before US-002; custom QR binding/consent implementation and real-device verification are required |
| [US-001-02](US-001-02.md) — Keep Codex changes within a clear project structure | Maintainer knows where code belongs and controls task write scope | Existing delivery gate resolved; approved story, declared branch paths, final checks and human review | Requested reusable harness slice before further growth; no application migration or authentication changes |
| [US-001-03](US-001-03.md) — Verify locally and defer PR/CI | Maintainer reduces repeated hosted verification during implementation | US-001-02; human approval of detailed workflow criteria | Local QA, human review, delayed PR/CI and acceptance after human merge |
| [US-001-04](US-001-04.md) — Make frontend/backend ownership visible | Maintainer locates existing application code by explicit runtime and feature ownership | US-001-02 delivery gate resolved; separately approved migration scope | Human-selected naming applied through a behavior-preserving migration, with one root package |
| [US-001-05](US-001-05.md) — Put source directly under frontend and backend | Maintainer removes redundant src nesting while retaining runnable behavior | US-001-04; separate scope/AC approval | Proposed maintenance follow-up before registration; one root package and existing ownership rules |
| [US-001-06](US-001-06.md) — Use the verified wallet address as the Better Auth user ID | User/owner reuses exactly one persisted user for one verified address | Existing SIWE/QR and owner isolation; explicit local legacy-data reset | Human-selected next slice after current delivery; CLI deferred, no expansion of OIDC/client scope |
| [US-002](US-002.md) — Register independent applications | Owner obtains distinct client identities and configuration | US-001; client profile decision D5 | Supplies real clients for third-party sign-in |
| [US-001-07](US-001-07.md) — Own OAuth clients through the verified wallet user ID | Owner uses one persisted wallet identity for registration and viewing | US-001-06 and US-002 | Human-selected ownership refinement before US-004; fresh databases only, no existing-client conversion |
| [US-003](US-003.md) — Sign in to applications with wallet-based OIDC and renewable tokens | End user explicitly consents to wallet sign-in and optional continued access | US-001, US-001-06, US-001-07, US-002; D5 | OIDC tokens, discovery/JWKS, UserInfo, refresh rotation and client-authenticated revocation before management |
| [US-004](US-004.md) — Manage owned applications using tokens | Owner maintains and disables only their applications through authorized management tokens | US-002, US-001-07, US-003; management-token policy | Adds token-based management, owner isolation and disabled-client protocol enforcement |
| [US-005](US-005.md) — Integrate an independent relying party | Developer verifies wallet identity without IdP frontend dependencies | US-003 and US-004 | Demonstrates the complete release across two clients |

## Next story to detail

- Human-selected order on 2026-11-12: **US-003 → US-004 → US-005**. Story IDs were swapped at the human’s request; US-003 first supplies OIDC sign-in and renewable tokens using existing registered applications. US-004 then adds token-based client management and enforces disabled state in the already-delivered authorization/token flow.
- [US-003](US-003.md) contains the human-confirmed interview decisions and detailed draft ACs for sign-in, consent, discovery/JWKS, UserInfo, refresh families and revocation. The linked story records the token/session boundaries and provider compatibility risks; explicit READY approval remains separate.
- [US-004](US-004.md) consumes the token foundation. Owner-versus-application management authority, token issuance, audience, permissions, expiry/revocation and API/UI coverage remain human decisions. An ordinary third-party token does not implicitly authorize client management.
- [US-005](US-005.md) demonstrates independent integration and the complete evaluation release. Registration and token issuance alone do not complete that release.
- Carry the locally preserved US-001-07 acceptance story/evidence into the next approved PR, with those paths declared in its scope.
- This ordering decision does not authorize implementation; each linked story owns its scope and READY decision.

## Open human decisions

The table preserves planning defaults; linked stories own human decisions and detailed criteria. Historical proposals cannot override those records. No product-document changes are proposed.

| Decision | Proposed default | Impact / alternatives |
|---|---|---|
| D1 — Release and order | The five-story evaluation release above, starting with US-001 | A production release needs additional operational and security scope; a different priority changes the story sequence. |
| D2 — Initial wallet/platform audience | Ethereum mainnet (chain ID 1), externally owned accounts; injected wallets in desktop Chromium and mobile wallet in-app browsers | Smart-contract wallets, other chains, external mobile-browser handoff and QR connection remain later work. Name at least one desktop wallet/browser and one mobile wallet/OS/browser combination before US-001 becomes READY; accepting this scope does not establish compatibility. |
| D3 — Address representation | Lowercase `0x` plus 40 hex characters for authenticated address and future public `sub` | Checksummed form is an alternative. Choosing once avoids inconsistent identity across clients; no chain prefix or internal ID in `sub`. |
| D4 — Authentication policy | Server-issued nonce valid for 5 minutes; absolute session lifetime 1 hour without sliding renewal; explicit logout; fresh SIWE after expiry; reuse only sessions proven to originate from SIWE | Longer/shorter durations change usability and exposure. SIWE expiration must not exceed nonce deadline, no future issued-at/not-before values accepted, and zero clock-skew allowance proposed. Tests must cover exact boundaries. |
| D6 — Management tokens after basic issuance | Unresolved: wallet-owner access token versus application-specific management credential; decide issuance, audience, permissions, lifetime/revocation and API/UI coverage before READY | US-003 precedes US-004; no implicit management authority for ordinary third-party tokens |
| D5 — OIDC sign-in and renewal | US-003 records the human-confirmed confidential-client profile, explicit consent, `openid` with optional `offline_access`, token lifetimes, rotation/family boundaries and revocation | This supersedes the earlier no-refresh proposal for protocol delivery. US-002 retains its accepted registration outcomes; US-003 owns the scoped renewal extension and its READY decision. |

US-001 records the human's decisions for its delivered scope; the historical proposals above do not override that record. For US-001-01, its story records the human-approved QR policy and expanded wallet matrix; refer there for lifecycle and authorization. US-002 records the human-confirmed registration design; US-003 separately records the subsequent human-confirmed token/consent policies, without inferring READY approval from that interview. The human approves the selected story and supplies approval metadata through the review channel described in [PROCESS](../docs/PROCESS.md); READY approval needs no PR/CI. Human approval of the locally verified finished result starts PR/CI; human merge completes acceptance, recorded locally and carried into the next approved PR. Approval of this map does not authorize every story.
