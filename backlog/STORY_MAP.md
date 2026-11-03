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

### End user

| Proposed slice | Arrive from an application | Prove identity | Decide access | Return signed in |
|---|---|---|---|---|
| Minimal end-to-end release | [Start a standard OIDC authorization request](US-004.md) | [Step-by-step wallet authentication](US-001.md) | [Allow or deny named application's requested access](US-004.md) | [Application receives and validates wallet subject](US-005.md) |
| Later | More client types | Broader wallet support | Remembered consent and grant management | Broader claim sets and account bindings |

### Application developer and self-hosting operator

| Proposed slice | Run and configure IdP | Configure a client | Integrate | Confirm outcome |
|---|---|---|---|---|
| Minimal end-to-end release | [Documented local setup](US-001.md), extended by each story | [Wallet-authorized registration](US-002.md) | [Discovery, keys and authorization code flow](US-004.md) | [Independent relying-party example and reproducible walkthrough](US-005.md) |
| Later | Production deployment, backup/recovery and operational hardening | Additional registration methods | Public/native clients, additional grants | Additional interoperability suites |

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
| [US-002](US-002.md) — Register independent applications | Owner obtains distinct client identities and configuration | US-001; client profile decision D5 | Supplies real clients for third-party sign-in |
| [US-003](US-003.md) — Manage owned applications | Owner maintains and disables only their applications | US-002 | Demonstrates ongoing owner control and isolation |
| [US-004](US-004.md) — Authorize wallet sign-in | End user consents and returns an authorization code to an application | US-001–US-003; D5 | Provides standards-based consent and token issuance |
| [US-005](US-005.md) — Integrate an independent relying party | Developer verifies wallet identity without IdP frontend dependencies | US-004 | Demonstrates the complete release across two clients |

## Next story to detail

- Recommendation: [US-001](US-001.md). Both owner management and end-user authorization depend on trustworthy SIWE authentication. Delivering it first exposes session and wallet compatibility risks without conflating authentication with OIDC integration.
- Detailed positive, negative and boundary acceptance criteria are maintained in that story. Other stories have provisional outlines to refine before delivery.

## Open human decisions

All defaults below are proposals, not approved policy. No product-document changes are proposed.

| Decision | Proposed default | Impact / alternatives |
|---|---|---|
| D1 — Release and order | The five-story evaluation release above, starting with US-001 | A production release needs additional operational and security scope; a different priority changes the story sequence. |
| D2 — Initial wallet/platform audience | Ethereum mainnet (chain ID 1), externally owned accounts; injected wallets in desktop Chromium and mobile wallet in-app browsers | Smart-contract wallets, other chains, external mobile-browser handoff and QR connection remain later work. Name at least one desktop wallet/browser and one mobile wallet/OS/browser combination before US-001 becomes READY; accepting this scope does not establish compatibility. |
| D3 — Address representation | Lowercase `0x` plus 40 hex characters for authenticated address and future public `sub` | Checksummed form is an alternative. Choosing once avoids inconsistent identity across clients; no chain prefix or internal ID in `sub`. |
| D4 — Authentication policy | Server-issued nonce valid for 5 minutes; absolute session lifetime 1 hour without sliding renewal; explicit logout; fresh SIWE after expiry; reuse only sessions proven to originate from SIWE | Longer/shorter durations change usability and exposure. SIWE expiration must not exceed nonce deadline, no future issued-at/not-before values accepted, and zero clock-skew allowance proposed. Tests must cover exact boundaries. |
| D5 — Initial OIDC profile | Confidential server-side web clients; authorization code with PKCE S256; `openid` only; explicit consent each authorization; no refresh tokens or dynamic registration | Public/native clients, remembered consent and additional claims/grants need separate scope. Before US-002/004 becomes READY, resolve redirect policy, credential lifecycle, token/code lifetimes and client-auth method. |

Before US-001 can become READY, confirm D1–D4 and review its ACs. D5 may remain provisional until the dependent stories are refined. The human records approval metadata and performs the READY transition through the protected PR flow described in [PROCESS](../docs/PROCESS.md); approval of this map does not authorize every story.
