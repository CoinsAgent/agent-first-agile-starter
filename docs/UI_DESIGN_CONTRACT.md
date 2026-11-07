# WalletGate UI Design Contract

> **Status:** Proposed implementation contract\
> **Product:** WalletGate — Your wallet. Your way in.\
> **Descriptor:** OIDC(W) — An OpenID Connect provider that lets users sign in to applications with their Ethereum wallets.\
> **UI stack:** shadcn/ui + Tailwind CSS (React)\
> **Wallet/auth stack:** wagmi + viem + Better Auth\
> **Audience:** Codex and human reviewers\
> **Reference:** https://ui.shadcn.com/docs/theming

## 1. Purpose and authority

This contract defines WalletGate's product UI principles, visual tokens, wallet-authentication experience, accessibility requirements, and acceptance criteria. Codex MUST implement new or modified authentication UI in accordance with it.

- Product/security contracts, OAuth 2.0/OIDC protocol requirements, SIWE validation, and the actual backend remain authoritative for protocol behavior.
- This document governs presentation and user interactions; it MUST NOT redefine security guarantees or authentication results.
- Before changing code, inspect the actual repo, installed wagmi, viem, Better Auth, shadcn/ui primitive and Tailwind versions, current UI stack, routing, existing design tokens, and auth flow. Do not assume example APIs work unchanged.
- When requirements conflict, prefer correct and secure authentication, then accessibility, then this contract's aesthetic preferences. Record deviations.

## 2. Design intent

**Design philosophy:** Minimal. Trustworthy. Wallet-native.\
**Product experience:** Familiar sign-in UX powered by wallet proof of control.\
**Guiding sentence:** *Wallet-native identity. Familiar authentication UX.*

WalletGate is an **identity provider**, not a crypto trading platform, portfolio dashboard, NFT marketplace, or DeFi application.

### Non-negotiable principles

1. **Authentication first.** Every visible element should help a person understand, complete, verify, or recover from sign-in.
2. **Separate wallet connection from authentication.** A connected wallet is not an authenticated WalletGate session. Show successful sign-in only after the server validates SIWE and the expected OIDC flow completes.
3. **Familiarity over novelty.** Follow established identity-provider patterns: one primary sign-in area with clear wallet choices, steps, consent and understandable errors.
4. **Trust through clarity.** Identify the requesting application and purpose, especially before approving scopes or signing a message. Do not imply WalletGate has verified an application's trustworthiness unless it has.
5. **Wallet choice and interoperability.** Offer discoverable installed-wallet and mobile-wallet paths supported by the integration; avoid privileging one extension without an explicit user choice.
6. **Minimum cognitive load.** Default to the next necessary action, not advanced wallet configuration or unrelated blockchain functionality.
7. **Privacy by design.** Reveal only information necessary for authentication and approved authorization. Never request seed phrases or private keys.
8. **Accessible by default.** Keyboard, screen reader, contrast, error recovery, mobile, and reduced-motion support are release requirements.
9. **Responsive by default.** Work from narrow mobile viewports to desktop without hidden critical controls.
10. **One design system.** WalletGate components and the custom shadcn/ui wallet dialog must share consistent typography, accent color, density, corner radius, and light/dark behavior through shared local component tokens.

## 3. Brand and voice

- **Product name:** WalletGate
- **Tagline:** Your wallet. Your way in.
- **Short description:** Sign in to applications with your Ethereum wallet.
- **Technical descriptor:** OIDC(W) — An OpenID Connect provider that lets users sign in to applications with their Ethereum wallets.
- **Voice:** Calm, precise, inclusive, security-conscious; plain English before protocol jargon.
- **Tone:** Professional and reassuring without making unverifiable claims.

**UI copy examples:**

| Context | Preferred copy | Avoid |
|---|---|---|
| Wallet shortcut accessible name | `Sign in with MetaMask` (use the chosen wallet name) | `Web3 login revolution` |
| Wallet selection | `Choose your wallet` | `Choose your crypto gateway` |
| SIWE action | `Sign message to continue` | `Approve transaction` |
| Pending request | `Check your wallet for a signature request` | `Logging in...` with no further explanation |
| Success | `Signed in successfully` **only after server confirmation** | `Connected! You're signed in` |
| Signature explanation | `Signing confirms you control this wallet. It does not send a transaction.` **only where accurate for the requested SIWE signature** | `Signing is always risk-free` |
| Rejection | `You declined the signature request. Try again when you're ready.` | `Wallet failure` |
| Wrong network | `Switch to a supported network to continue.` | `Chain error 4902` |

Do not use terms like “anonymous,” “verified,” “safe,” or “gas-free” as blanket guarantees. Use them only when substantiated by the exact implemented action.

## 4. Experience architecture

### 4.1 Authentication screen anatomy

A typical sign-in or authorization page SHOULD contain, in this order:

1. WalletGate mark and product name.
2. Context: the requesting application's verified/display name, with a safe fallback if it is unavailable or unverified.
3. Clear headline: `Sign in with your wallet`.
4. One concise explanation of what happens.
5. Primary sign-in area: five wallet icons in the former button position, with accessible wallet names. A chosen installed extension connects directly. Preload supported native SDK code at page load: absent MetaMask/Coinbase extensions invoke their SDK QR connection flows, followed by SIWE review. Rainbow/Trust QR requiring WalletConnect project IDs is excluded; Rabby remains extension-only until a supported native QR route is verified. Missing extension-only wallets show honest unavailability without installation guides. The custom SIWE phone-approval action remains separately labeled.
6. Contextual, optional secondary actions: `How it works`, `Need a wallet?`, or `Try again`.
7. Plain-language privacy/security text and relevant policy links, if available.

Keep the central desktop content narrow (typically 400–440 px). Avoid large promotional hero art on essential authentication pages. Keep primary actions visible on mobile without horizontal overflow.

### 4.2 State model

For local signing, UI MUST explicitly handle:

`idle -> selecting_wallet -> connecting -> connected_unverified -> signature_requested -> verifying -> authenticated`

The proposed QR branch is `idle -> qr_pending -> phone_review -> phone_signing -> verifying -> approved -> completing -> authenticated`, with explicit cancellation and expiry. Desktop connector state may remain disconnected throughout.

Alternative/recovery states include `cancelled`, `connection_failed`, `signature_rejected`, `expired`, `wrong_network`, `account_changed`, `disconnected`, `verification_failed`, and `authorization_failed`.

- Show distinct progress labels for **connecting**, **waiting for signature**, and **server verification**.
- Connection success MUST NOT advance to signed-in status until verification succeeds.
- Prevent duplicate submissions while a request is in flight; provide a clear cancel/back path when feasible.
- Handle users changing wallet accounts, networks, or disconnecting at any step: invalidate stale UI assumptions and restart/reverify as needed.
- Handle timeout and replay-safe restart through the server's canonical nonce/session rules.
- If the flow is an OIDC authorization request, preserve validated authorization context, `state`, and PKCE/server session requirements; do not expose secrets or bypass consent.
- After success, continue through the legitimate OIDC redirect/response flow rather than a hard-coded dashboard redirect.

### 4.3 Wallet discovery and mobile

- Build a WalletGate-owned wallet dialog with shadcn/ui components. Present wagmi-discovered EIP-6963 injected providers; select the connector the person explicitly chooses. Discovery metadata is untrusted display data, not a verified wallet endorsement.
- Keep connector/account/network state in wagmi and application authentication state in the auth controller backed by Better Auth. A desktop approved by a phone may have an authenticated session without a local wallet connection.
- Offer a custom SIWE QR authentication route in the same dialog. The proposed journey is desktop request → phone opens WalletGate approval page → wallet signs SIWE → server verifies approval → originating desktop completes login. This is an application-owned authentication journey, not a generic wallet RPC connection.
- A QR code is a bootstrap link, not authentication proof. Use an opaque expiring request reference, never a private key, signature, session cookie, desktop completion secret or reusable login credential. Scanning/opening a link does not approve or consume it.
- The phone page must identify WalletGate and the target desktop login, show the selected wallet/message and require explicit approval. Propose matching confirmation context across devices to reduce mistaken approvals; do not claim QR flow prevents phishing or forwarding.
- Browser-bound desktop completion and phone approval are distinct capabilities. Bind SIWE proof to the specific server-held request and verified wallet; only the initiating browser can redeem the result once. Reject cancelled, expired, replaced, replayed or mismatched requests and late callbacks.
- Confirm the QR lifetime, target-session policy, confirmation UX and supported wallet/OS/browser paths in the story before READY. Existing same-browser challenge/session policies remain authoritative; cross-device approval is an explicit new binding to review, not permission to accept an arbitrary foreign-browser signature.
- Android Chrome handoff must use documented links into a supported wallet's browser or signing path and preserve the intended request on return. A plain URL is not assumed to make every wallet's scanner or external browser a signer. Provide accurate manual open/copy guidance when automatic handoff is unsupported.
- No-extension users may use the approved QR flow or neutral wallet-install/help guidance. Distinguish connect, sign, phone approval and desktop completion, with cancellation and retry at each step.

### 4.4 OIDC relying-party identity and consent

- Display the requesting application's identity with clear provenance; validate OAuth client information server-side.
- If application branding is not verified, avoid implying endorsement by WalletGate.
- Display requested scopes in human-friendly language with an option to inspect technical details.
- Show an explicit Allow/Cancel choice wherever consent is required by the product/policy.
- Never preselect or hide material consent behind wallet connectivity.
- Never disclose information before the server verifies session and authorization requirements.

## 5. Visual design system

### 5.1 Direction

Use a **modern, minimal identity-service** aesthetic. Take cues from familiar SaaS authentication interfaces, not from exchange terminals or futuristic crypto dashboards.

Avoid neon gradients, glowing blockchain illustrations, trading tickers, token prices, visual clutter, animated particles, and decorative crypto symbols unrelated to login.

### 5.2 Color tokens (initial proposal)

These are **WalletGate-owned design tokens**, mapped into shadcn/ui semantic CSS variables and Tailwind utilities. Keep one palette shared by the page, wallet dialog and QR approval screens.

| Semantic token | Light | Dark | Usage |
|---|---|---|---|
| `--wg-bg` | `#FFFFFF` | `#0B1120` | Page background |
| `--wg-surface` | `#F8FAFC` | `#151E2E` | Cards, secondary sections |
| `--wg-text` | `#0F172A` | `#F8FAFC` | Main text |
| `--wg-text-muted` | `#475569` | `#CBD5E1` | Supporting text |
| `--wg-border` | `#CBD5E1` | `#475569` | Dividers, outlines |
| `--wg-accent` | `#635BFF` | `#8B85FF` | Focus, brand, selected states |
| `--wg-accent-foreground` | `#FFFFFF` | `#0B1120` | Text/icons on accent fills |
| `--wg-success` | `#15803D` | `#4ADE80` | Positive completion |
| `--wg-danger` | `#B91C1C` | `#F87171` | Errors, destructive actions |
| `--wg-warning` | `#A16207` | `#FACC15` | Cautions |

**Critical:** Values are a starting palette, not a contrast waiver. Verify WCAG 2.2 AA contrast of **every rendered foreground/background pair**, including accent buttons, muted text, dark-mode surfaces, disabled controls, and focus indicators. Adjust tokens when verification fails. Do not convey state with color alone.

Color-role rules:

- Accent is primarily for the one principal call-to-action, focus, and selection—not an invitation to color all surfaces purple.
- Keep large surfaces neutral.
- Use success green **only** for verified successful states.
- Use danger red for real errors, never for expected “not connected yet” states.
- Wallet-specific logos retain their legitimate brand colors; do not recolor logos to match WalletGate.
- Ethereum iconography may identify the supported network, but must not dominate product branding.

### 5.3 Typography

- Primary font: a modern system UI font stack, shared by shadcn/ui components and Tailwind font utilities. Use an existing licensed font only if it can be applied consistently through supported APIs. Do not add a remote font dependency just for branding.
- Base text: 16 px; small helper text: at least 14 px when practical.
- Headline: 24–32 px, semibold; button text: 14–16 px, medium/semibold.
- Use a consistent typographic scale; avoid excessive weight and letter spacing.
- Wallet addresses: monospace, with accessible full-address copy/inspect path. Show shortened addresses only when enough context remains to prevent confusion.

### 5.4 Geometry, layout, and motion

- Spacing: 4 px base grid; default internal spacing 8/12/16/24/32 px.
- Corner radius: start with a shared `--radius` of 0.75rem for cards/dialogs and derive control radii through Tailwind tokens. Avoid arbitrary mixtures of sharp and pill-shaped geometry.
- Primary control minimum hit target: aim for 44 × 44 CSS px (with WCAG minimums always met).
- Layout: centered auth card, sensible max width around 420 px, mobile gutter at least 16 px.
- Shadows: subtle, optional; borders often preferable.
- Transitions: short, functional (about 150–200 ms); respect `prefers-reduced-motion`.
- No layout shifts when errors or loading messages appear where possible.

### 5.5 Theme behavior

- **Default:** follow operating-system light/dark preference on first visit.
- If a user-facing theme choice exists, it must be `System / Light / Dark` and consistently applied to WalletGate pages, wallet dialog and phone approval UI.
- If the system changes while the app is open and the choice is `System`, update both UIs together.
- Respect project privacy and persistence policies before saving preference to local storage/cookie.
- Test both modes; neither is an afterthought. Light mode is the default in product mockups, not a forced runtime mode.

## 6. Custom wallet UI and authentication integration contract

The selected stack is **wagmi + viem + Better Auth + shadcn/ui + Tailwind**. Vendor wallet UI kits and WalletConnect transport are outside this slice. No vendor wallet-connection project ID is required by the proposed direct-injected/custom-QR design; provider-dependent RPC or asset credentials remain separate.

### 6.1 Component and token ownership

- Compose the dialog from local shadcn/ui `Dialog`, title, description, close control and buttons using the project's chosen supported primitive variant. Retain keyboard operation, focus trapping/restoration, accessible names and announcements. A wallet list or QR view must not hide cancellation.
- Make the project own component code, loading/error/retry presentation and the QR approval UI. Keep authentication logic outside visual primitives.
- Use CSS variables in `:root` and `.dark` as the canonical palette. Map the existing WalletGate tokens into shadcn semantic roles:

| WalletGate token | shadcn/ui semantic variable | Tailwind utility role |
|---|---|---|
| `--wg-bg` | `--background` | `bg-background` |
| `--wg-text` | `--foreground` | `text-foreground` |
| `--wg-surface` | `--card`, `--popover`, `--muted` | Card/dialog/muted surfaces |
| `--wg-text` | `--card-foreground`, `--popover-foreground` | Surface text |
| `--wg-text-muted` | `--muted-foreground` | Supporting text |
| `--wg-accent` | `--primary`, `--ring` | Primary action and focus |
| `--wg-accent-foreground` | `--primary-foreground` | Primary action text |
| `--wg-border` | `--border`, `--input` | Boundaries |
| `--wg-danger` | `--destructive` | Errors |

Other required shadcn variables, including selected/secondary surface pairs, must derive from verified semantic roles rather than a second palette. Keep success/warning roles available through WalletGate tokens. Validate actual foreground/background contrast, including text on destructive fills.

### 6.2 Illustrative token mapping

```css
/* Illustrative Tailwind v4 mapping; adapt to the installed version and
   generated shadcn/ui variable format. --wg-* values come from section 5. */
:root {
  --background: var(--wg-bg);
  --foreground: var(--wg-text);
  --primary: var(--wg-accent);
  --primary-foreground: var(--wg-accent-foreground);
  --radius: 0.75rem;
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-lg: var(--radius);
}
```

Define dark values through the same token owner and ensure `.dark` matches the Tailwind dark selector. Do not mix raw-color variables with a generated setup expecting HSL channels. Tailwind v3 requires its corresponding configuration mapping; inspect the actual version before choosing syntax. Changing theme must not recreate connectors, challenges, QR requests or sessions.

### 6.3 Wallet connector and application auth state

1. Use one wagmi configuration with EIP-6963 multi-provider discovery and compatible injected connectors. Use the selected connector for account access and viem for standard SIWE/message utilities; do not silently pick the first provider or trust wallet-supplied names/icons as HTML.
2. wagmi owns connector status, account and chain. The application owns request generation, reviewed challenge, signature/verification progress, QR approval/completion, errors and the server-verified session. Better Auth owns session authority; connected/reconnected is never authenticated by itself.
3. Account/network changes or disconnect during local signing invalidate stale challenge assumptions. Guard async results by attempt identity. A connector change does not silently replace an already established session identity or fabricate server-side logout; use explicit server session/logout semantics.
4. For custom QR, WalletGate's backend coordinates request approval and one-time completion through supported Better Auth integration. Do not transfer cookies/signatures through URLs, expose the desktop completion capability on the phone, forge session provenance, or weaken existing browser-bound verification.
5. UI must distinguish phone-approved desktop authentication from a local wallet connection. Do not render a connected desktop wallet or allow local signing solely because the desktop session was approved on a phone.
6. Keep RPC, ENS, images/assets and wallet-owned services separately configured and network-verified. Required external services remain permitted; optional analytics remain disabled. Document endpoint, purpose, data exposure, credentials, browser/server placement and failure behavior. Record limits in observing wallet-owned traffic.
7. QR expiration, explicit cross-device consent, target browser binding and supported wallet handoff are product/security decisions to finalize in the story. The token/UI contract alone does not approve a new session-binding policy or make the story READY.

**Documentation:** [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog), [Theming](https://ui.shadcn.com/docs/theming), [Tailwind theme variables](https://tailwindcss.com/docs/theme), [Dark mode](https://tailwindcss.com/docs/dark-mode), [wagmi configuration](https://wagmi.sh/react/api/createConfig), [Better Auth SIWE](https://www.better-auth.com/docs/plugins/siwe).

## 7. Security and trust UX

- Never request, display, or collect secret recovery phrases, raw private keys, or exported key files.
- Show the current domain/application context where users make a sign-in decision.
- Distinguish a wallet signature from an onchain transaction; never state that every possible wallet request is harmless.
- Display a readable explanation of the SIWE request and allow inspection of the message where feasible.
- Server MUST verify nonce, intended domain/URI, signature, chain context where required, issue/expiry times, and session binding as defined by the backend's current SIWE contract.
- Assume wallet accounts/network can change between pages and requests; safely reconcile on each auth-sensitive transition.
- Avoid passing wallet details, signature content, authorization codes, tokens, or sensitive OAuth parameters to analytics, logging, or error messages.
- Preserve safe redirect validation and OIDC protocol behavior; UI MUST NOT construct arbitrary post-login redirect URLs.
- Do not claim WalletGate verified the requesting relying party unless a real verification policy exists.

## 8. Accessibility and responsive requirements

Release target: **WCAG 2.2 AA** for owned UI; verify the composed shadcn/ui dialog and custom QR screens; primitive defaults alone do not establish accessibility.

- Text contrast >= 4.5:1 for normal text and >= 3:1 for large text; UI component/focus boundaries meet applicable 3:1 requirements.
- Keyboard-operable controls, visible focus, logical tab order; modal focus trapping and restoration where applicable.
- Actionable elements have meaningful accessible names; wallet logo alone is insufficient.
- Announce important status/errors via appropriate live regions; no endless loading with no guidance.
- Every form error is explicit, located near the related control, and provides a correction path.
- Allow 200% zoom and narrow viewport use without losing controls or requiring horizontal scroll for ordinary content.
- Ensure touch target sizing and adequate separation.
- Honor reduced-motion settings.
- Test mobile browsers, wallet-deep-link handoff and back navigation, and QR flows across devices where feasible.
- Maintain readable content when application/client names or wallet addresses are long.

## 9. Screen and component requirements

### 9.1 Minimum screen/states to cover

1. **Application sign-in:** WalletGate context, requesting application, CTA.
2. **Wallet selection:** custom shadcn/ui wallet dialog with injected wallets and an approved custom SIWE QR route.
3. **Connecting/pending signature:** User-friendly explanation and recovery.
4. **Verifying:** Distinct server-processing state; prevent duplicate submits.
5. **Consent:** Only when required; requesting client, approved scopes, Allow/Cancel.
6. **Success/redirect:** Verified state and standard OIDC continuation.
7. **Failure/retry:** Rejection, mismatch, expiry, disconnect, timeout, unsupported chain, server error.
8. **Wallet setup/help:** Neutral guidance and supported mobile connection option; not a dead-end install page.

### 9.2 Reusable components

Prefer existing UI primitives and repo conventions. If absent, keep the new set intentionally small:

- `AuthLayout`, `BrandHeader`, `AppIdentity`, `WalletDialog`, `WalletOption`, `WalletSignInAction`
- `QrAuthRequest`, `MobileAuthApproval`, `QrAuthStatus` where approved by the story
- `AuthStatus`, `AuthError`, `WalletAddress`, `ScopeConsentList`
- `ThemeToggle` only if a theme control is actually required

Keep business logic in auth controllers/hooks/services, not inside visual components. Keep wagmi connector state separate from the application authentication state; neither should duplicate the other’s authority.

### 9.3 UI ownership and placement

Read the [Project Structure guide](PROJECT_STRUCTURE.md) before adding or updating UI code. It owns the skeleton and current-path mapping; do not maintain a second directory tree here. Document a new UI area's intended placement before implementation and create directories only for approved real files.

- Shared primitives receive state and behavior through inputs/callbacks; they must not import feature hooks, authentication state or feature public interfaces, including type-only imports.
- Wallet-specific views and orchestration belong to the wallet feature's current owner or an explicitly approved feature destination. A visually reusable component is not automatically shared if it depends on wallet behavior.
- Product composition, such as a header combining branding and wallet identity, assembles shared UI and feature public interfaces in the app layer.
- Reuse existing semantic tokens and asset conventions. Feature-specific styles/assets stay with their declared owner; changes to global tokens, shared primitives or build configuration require explicit scope. Never import server implementation or secrets into UI code.
- Preserve current paths until a move is explicitly scoped. Structure guidance does not authorize new screens, changed interactions, migration or additional supported wallets.

## 10. Codex implementation process

**Phase A — Inspect (no behavior changes)**

1. Read `AGENTS.md`, product/security contracts, `docs/PROJECT_STRUCTURE.md`, auth code, installed wagmi/viem/Better Auth versions, local shadcn/ui primitives and Tailwind setup, styling system, existing tests. Identify current owners and propose file placement, any new-area skeleton and writable paths for human review before implementation.
2. Identify current wallet + SIWE + OIDC state transitions and exactly which component owns each transition.
3. Write a concise gap analysis mapping current screens/SDK support to this contract.
4. Identify conflicts/unknown SDK APIs before editing.

**Phase B — Implement one vertical slice**

1. Establish WalletGate semantic light/dark tokens using the existing styling mechanism.
2. Map CSS variables to shadcn/ui semantic roles and Tailwind theme utilities for shared light/dark presentation.
3. Implement the local wallet dialog and signing flow while preserving accepted local security semantics. Implement custom QR approval/completion only within its separately approved story policy.
4. Ensure SIWE signature/verification stages and OIDC continuation are clearly separated.
5. Implement error, cancellation, unsupported-wallet and mobile recovery states, including QR expiry, one-time completion and cross-device binding where approved.

**Phase C — Verify and hand off**

1. Run lint, type-check, existing automated tests, and build; report exact commands/results.
2. Add focused tests for theme choice/resolution, auth state rendering, duplicate submit protection, account/network change, error recovery, and consent where applicable.
3. Use browser-level tests/manual verification for mobile, keyboard, custom wallet dialog and QR approval screens, extension/no-extension, QR/deep link, light/dark, and system-preference change.
4. Capture evidence (screenshots/test logs) for critical screens in both themes; redact wallet/session secrets.
5. Produce a concise handoff: files changed, accepted stories, test results, outstanding risks, and next slice.

## 11. Definition of done / acceptance criteria

Before presenting a slice for human acceptance, evidence all relevant criteria below. This checklist does not itself establish acceptance:

- [ ] WalletGate's screen immediately communicates **who is signing in to which application and why**.
- [ ] The primary wallet-icon row is discoverable and keyboard accessible; each choice connects its detected extension or opens the working QR approval fallback.
- [ ] Multiple installed wallets remain selectable where SDK/environment supports them.
- [ ] No-extension users have a functioning compatible mobile path or a clear, accurate supported-wallet alternative.
- [ ] Any in-scope, policy-approved QR/deep-link route is operational, not decorative; unresolved service-policy conflicts are recorded before delivery.
- [ ] Connection, signature request, server verification, and OIDC authorization are not conflated.
- [ ] A user is never shown as authenticated solely because a wallet connected.
- [ ] Rejected signature, expired nonce/session, network change, account change, and disconnect result in understandable recovery.
- [ ] Application identity and scopes are presented accurately when consent is required.
- [ ] WalletGate pages, wallet dialog and phone approval UI look coherent in light and dark mode.
- [ ] System theme is respected, and explicit theme preference (if supported) remains consistent.
- [ ] Colors meet WCAG AA contrast in actual rendered UI, not merely in token tables.
- [ ] Main flow works at mobile viewport sizes and is keyboard accessible.
- [ ] Unnecessary swap/on-ramp/DeFi functionality is not exposed in the auth experience.
- [ ] No seed phrase/private key requests; no sensitive auth values in front-end logs or analytics.
- [ ] Existing OIDC/SIWE security tests pass and protocol behavior is not regressed.
- [ ] Implementation and test evidence are included in the sprint/handoff record.

## 12. Non-goals and change control

This design contract does **not** authorize:

- Replacing Better Auth or changing OIDC endpoints, grants, consent rules, client registration, or token processing.
- Adding a vendor wallet UI kit, WalletConnect transport or a generic remote-wallet RPC relay to this slice. The WalletGate-owned shadcn/ui wallet dialog and custom SIWE QR approval flow are the intended scope.
- Adding trading, swaps, token purchasing, NFTs, wallet custody, or portfolio management.
- Adding email, social, or passkey authentication without a separate approved product requirement.
- Making unsupported product/security claims in marketing or sign-in copy.

Any proposal outside these boundaries must be documented as a separate design/product decision and approved before implementation.

## 13. Source-of-truth references

- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- shadcn/ui theming: https://ui.shadcn.com/docs/theming
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Tailwind dark mode: https://tailwindcss.com/docs/dark-mode
- wagmi provider discovery: https://wagmi.sh/react/api/createConfig
- wagmi injected connector: https://wagmi.sh/react/api/connectors/injected
- Better Auth SIWE: https://www.better-auth.com/docs/plugins/siwe
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- EIP-6963: https://eips.ethereum.org/EIPS/eip-6963
- EIP-4361: https://eips.ethereum.org/EIPS/eip-4361
- OpenID Connect Core: https://openid.net/specs/openid-connect-core-1_0.html

**Maintenance requirement:** Re-check installed wagmi/viem/Better Auth APIs and local shadcn/ui/Tailwind conventions during substantive upgrades. Examples are implementation guidance, not a guarantee of package compatibility or approval of custom QR security policy.
