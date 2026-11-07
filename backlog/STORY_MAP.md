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
| Minimal end-to-end release | [Connect, sign SIWE, enter owner session](US-001.md) | [Create two independent clients and obtain configuration](US-002.md) | [List, edit redirects and disable owned clients](US-003.md) |
| Later | Broader wallet/platform coverage | Authorized dynamic registration | Ownership transfer, credential rotation, richer scope/policy controls |

Proposed authentication refinement before registration: [US-001-01 — choose a wallet or approve SIWE login by QR](US-001-01.md). The owner follows the same connect → review SIWE → sign → server verification journey with a custom shadcn/ui wallet dialog and wagmi EIP-6963 discovery.

### End user

| Proposed slice | Arrive from an application | Prove identity | Decide access | Return signed in |
|---|---|---|---|---|
| Minimal end-to-end release | [Start a standard OIDC authorization request](US-004.md) | [Step-by-step wallet authentication](US-001.md) | [Allow or deny named application's requested access](US-004.md) | [Application receives and validates wallet subject](US-005.md) |
| Later | More client types | Broader wallet support | Remembered consent and grant management | Broader claim sets and account bindings |

The shared prove-identity entry point is refined by [US-001-01](US-001-01.md); the human selected installed-wallet choice, custom SIWE QR authentication and Android Chrome handoff using wagmi, viem, Better Auth, shadcn/ui and Tailwind. The human confirmed phone approval of the originating desktop when Chrome has no wallet extension; the approved request/session policy and wallet matrix are maintained in the story. Wallet transport, RPC, ENS, images and wallet-owned services require separate configuration and network verification. OIDC consent and return remain in US-004/005.

### Application developer and self-hosting operator

| Proposed slice | Run and configure IdP | Configure a client | Integrate | Confirm outcome |
|---|---|---|---|---|
| Minimal end-to-end release | [Documented local setup](US-001.md), extended by each story | [Wallet-authorized registration](US-002.md) | [Discovery, keys and authorization code flow](US-004.md) | [Independent relying-party example and reproducible walkthrough](US-005.md) |
| Later | Production deployment, backup/recovery and operational hardening | Additional registration methods | Public/native clients, additional grants | Additional interoperability suites |

### Maintainer and Codex

This reusable starter/harness journey supports controlled development of WalletGate and future projects. It does not extend the WalletGate product contract or require moving existing application code.

The separate [US-001-03 migration proposal](US-001-03.md) applies the human-selected `frontend/src/` and `backend/src/` names with one root package. Backend destinations use explicit `bootstrap/`, `wallet-auth/`, `oidc/`, `applications/` and `infrastructure/` ownership; future domains are documented, not scaffolded or implemented by migration. It explicitly scopes actual moves and tooling updates outside US-001-02; that story's no-migration boundary and delivery gate remain unchanged.

Frontend destinations likewise use explicit `bootstrap/`, `pages/`, `wallet-auth/`, `authorization/`, `applications/`, `ui/`, `lib/`, `assets/` and `styles/` responsibilities. The migration proposes mechanical separation of the existing sign-in entry/page assembly, not new consent/management screens or frontend Discovery functionality.

| Proposed slice | Understand the structure | Approve a task boundary | Add/update the right code | Verify and review |
|---|---|---|---|---|
| Minimal controlled-change workflow | [Declare project-specific ownership and placement guidance](US-001-02.md) | [Codex runs baseline checks and proposes branch paths](US-001-02.md) | [Feature-local work, public interfaces, explicit scope expansion](US-001-02.md) | [Scope/dependency checks and human review of finished changes](US-001-02.md) |
| Separate layout migration | [Review explicit frontend/backend naming and current→target mapping](US-001-03.md) | [Approve both endpoints and tooling paths](US-001-03.md) | [Relocate existing code while retaining one root package](US-001-03.md) | [Run the unchanged authentication/UI regressions and migrated structure checks](US-001-03.md) |
| Later | Additional language adapters | Broader multi-task workflows | Separately approved legacy cleanup/migration | Additional audit/reporting tools |

Proposed usable harness outcome: a maintainer adopts the convention without reorganizing existing code, approves a story and reviews its finished branch, and can distinguish a valid change from an unrelated edit or new private-feature dependency. Success requires allowed changes to pass and unauthorized/tampering fixtures to fail; existing host restrictions remain effective; the process requires no separate App or pre-edit path approval. [US-001-02](US-001-02.md) owns the detailed criteria and decisions, including gradual adoption. This is a separate enabling slice, not completion of the WalletGate evaluation release.

## Proposed minimal release

- Usable end-to-end outcome: on a self-hosted evaluation instance, an owner registers and manages two distinct applications; an end user signs in through either application with SIWE and explicit consent; each application receives the same canonical wallet-address subject through standard OIDC.
- Observable success signal: repeat the documented setup with two client registrations; successfully sign in to both, compare their subjects and distinct client IDs, deny consent without receiving tokens, and prove that another owner cannot manage either application. Disable a client and show subsequent authorization/token issuance is rejected for it.
- Included: wallet login/logout, owner-authorized registration and limited management, standard authorization code flow, consent, discovery/verification keys, independent relying-party example, and repeatable self-hosted evaluation instructions.
- Proposed exclusions: additional grants and refresh tokens, dynamic registration, ownership transfer, credential rotation, production deployment/SLA, unrelated service-account binding, agent identity/payments. These exclusions limit the proposed first release; they do not remove longer-term contract obligations.
- Dependencies and risks: wallet access in the chosen browser/platform matrix; approved session and identity policies; a configured trusted origin and issuer; runtime/database setup; supported Better Auth customization. Framework compatibility is unverified. Delivery must investigate gaps and report them rather than weaken the contract or assume current library support.
- Each story extends the runnable setup and verification appropriate to its behavior. US-001 is a foundation, not the complete release. Production readiness and release authorization are separate decisions.

## Story sequence

| Story | Actor and value | Dependencies | Contribution to release |
|---|---|---|---|
| [US-001](US-001.md) — Prove wallet control | Owner/end user obtains a SIWE-authenticated session | Human policy decisions D2–D4 below | Shared authentication boundary and first usable sign-in journey |
| [US-001-01](US-001-01.md) — Choose a wallet or approve SIWE login by QR | Owner/end user selects a wallet and completes existing SIWE login with a custom dialog, shared CSS/Tailwind tokens and phone approval | US-001; wallet/platform and custom QR security-policy decisions in the story | Human-selected next slice before US-002; custom QR binding/consent implementation and real-device verification are required |
| [US-001-02](US-001-02.md) — Keep Codex changes within a clear project structure | Maintainer knows where code belongs and controls task write scope | Existing delivery gate resolved; approved story, declared branch paths, final checks and human review | Requested reusable harness slice before further growth; no application migration or authentication changes |
| [US-001-03](US-001-03.md) — Make frontend/backend ownership visible | Maintainer locates existing application code by explicit runtime and feature ownership | US-001-02 delivery gate resolved; separately approved migration scope | Human-selected naming applied through a behavior-preserving migration, with one root package |
| [US-002](US-002.md) — Register independent applications | Owner obtains distinct client identities and configuration | US-001; client profile decision D5 | Supplies real clients for third-party sign-in |
| [US-003](US-003.md) — Manage owned applications | Owner maintains and disables only their applications | US-002 | Demonstrates ongoing owner control and isolation |
| [US-004](US-004.md) — Authorize wallet sign-in | End user consents and returns an authorization code to an application | US-001–US-003; D5 | Provides standards-based consent and token issuance |
| [US-005](US-005.md) — Integrate an independent relying party | Developer verifies wallet identity without IdP frontend dependencies | US-004 | Demonstrates the complete release across two clients |

## Next story to detail

- Latest targeted shaping: [US-001-03](US-001-03.md), a separately scoped migration to explicit frontend/backend paths. Proposed after US-001-02's delivery gate is resolved; drafting does not authorize parallel implementation or change earlier approved criteria.
- Current targeted shaping request: [US-001-02](US-001-02.md), detailing the agreed project-structure and controlled-change workflow. Proposed next delivery after the current story's gate is resolved, subject to human priority and READY approval; this does not authorize parallel delivery or supersede approved product criteria.
- Recommendation: [US-001-01](US-001-01.md), following the user's selected custom shadcn/ui/Tailwind wallet UI and wagmi/viem/Better Auth stack. The human selected this story next, including EIP-6963 selection, custom SIWE QR authentication and Android Chrome handoff. The earlier external-service restriction has been withdrawn; approved custom QR semantics, binding policy and wallet matrix are recorded in the story; phone-reachable configuration and actual compatibility evidence are delivery responsibilities. The human-confirmed custom QR journey authenticates the originating desktop through explicit phone approval when Chrome has no extension; it does not establish a remote wallet connector. Refer to US-001 itself for its authoritative lifecycle and accepted scope.
- Detailed positive, negative and boundary acceptance criteria for the current structure-management request are maintained in US-001-02; the earlier wallet refinement remains governed by US-001-01. Other product stories have provisional outlines to refine before delivery.

## Open human decisions

All defaults below are proposals, not approved policy. No product-document changes are proposed.

| Decision | Proposed default | Impact / alternatives |
|---|---|---|
| D1 — Release and order | The five-story evaluation release above, starting with US-001 | A production release needs additional operational and security scope; a different priority changes the story sequence. |
| D2 — Initial wallet/platform audience | Ethereum mainnet (chain ID 1), externally owned accounts; injected wallets in desktop Chromium and mobile wallet in-app browsers | Smart-contract wallets, other chains, external mobile-browser handoff and QR connection remain later work. Name at least one desktop wallet/browser and one mobile wallet/OS/browser combination before US-001 becomes READY; accepting this scope does not establish compatibility. |
| D3 — Address representation | Lowercase `0x` plus 40 hex characters for authenticated address and future public `sub` | Checksummed form is an alternative. Choosing once avoids inconsistent identity across clients; no chain prefix or internal ID in `sub`. |
| D4 — Authentication policy | Server-issued nonce valid for 5 minutes; absolute session lifetime 1 hour without sliding renewal; explicit logout; fresh SIWE after expiry; reuse only sessions proven to originate from SIWE | Longer/shorter durations change usability and exposure. SIWE expiration must not exceed nonce deadline, no future issued-at/not-before values accepted, and zero clock-skew allowance proposed. Tests must cover exact boundaries. |
| D5 — Initial OIDC profile | Confidential server-side web clients; authorization code with PKCE S256; `openid` only; explicit consent each authorization; no refresh tokens or dynamic registration | Public/native clients, remembered consent and additional claims/grants need separate scope. Before US-002/004 becomes READY, resolve redirect policy, credential lifecycle, token/code lifetimes and client-auth method. |

US-001 records the human's decisions for its delivered scope; the historical proposals above do not override that record. For US-001-01, its story records the human-approved QR policy and expanded wallet matrix; refer there for lifecycle and authorization. D5 may remain provisional until the dependent stories are refined. The human records approval metadata and performs the READY transition through the protected PR flow described in [PROCESS](../docs/PROCESS.md); approval of this map does not authorize every story.
