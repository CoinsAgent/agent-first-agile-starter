# WalletGate — Product Vision

**Status:** DRAFT — pending human review and approval.  
**Source:** [Product Understanding Contract, version 1.1](PRODUCT_CONTRACT.md).

## Purpose

**Your wallet. Your way in.**

WalletGate is a self-hosted OpenID Connect identity provider that lets people sign in to third-party applications with their Ethereum wallet. It brings wallet-based authentication to applications through standard OAuth 2.0 and OpenID Connect integration.

## Who it serves

- **End users** who authenticate by proving control of their Ethereum wallet through Sign-In with Ethereum (SIWE).
- **Application owners** who use a verified wallet to register and manage one or more applications, each with its own OAuth client identity and configuration.
- **Application developers** who want wallet-based sign-in through standard OAuth/OIDC endpoints without implementing wallet connection or adopting WalletGate's frontend libraries.

## Desired outcomes

1. **A clear wallet-first sign-in experience.** People can complete a step-by-step browser or mobile login flow using SIWE. New end-user authentication always proves wallet control; accepted SIWE-authenticated sessions may be reused under a defined session policy.
2. **A consistent external identity.** The authenticated Ethereum address, in an approved deterministic canonical representation, is the public OIDC `sub`. The same address produces the same subject across this IdP's clients. This intentionally makes that identity linkable across clients.
3. **Independent, owner-controlled applications.** A SIWE-verified wallet owner can manage multiple applications with distinct client IDs, credentials, redirect URIs, scopes, and policies. Application ownership grants no access to end users' accounts or data.
4. **Interoperable authorization.** Third-party applications can use standard OAuth/OIDC consent and authorization flows without depending on Next.js, wagmi, or viem.
5. **Trustworthy identity claims.** Wallet verification proves control of the wallet. Authentication of a service account requires a reliable binding to that address and the service's authorization policy; unrelated accounts and mailboxes are not implicitly verified.

## Current focus and boundaries

The current objective is a third-party-facing IdP with SIWE-only end-user authentication, wallet-address subjects, wallet-authorized application registration and management, and interoperable consent and authorization flows. Unauthenticated client registration is disabled. Username, email, password, passkey, and external SSO are not independent end-user login methods.

Implementation should reuse supported Better Auth capabilities, with wagmi for wallet discovery/connection and viem for Ethereum signature utilities. Framework limitations must be investigated without weakening the product contract. Demonstration capabilities do not establish production readiness.

## Longer-term direction

WalletGate's longer-term vision includes human-to-human, human-to-agent, and agent-to-agent identity and authorization. Agent authentication, communication, and payments are outside the current implementation scope and are not current acceptance criteria.

The Product Contract remains authoritative for binding rules and constraints. This vision proposes no additional product commitments; delivery scope and measurable acceptance criteria belong in human-approved stories.
