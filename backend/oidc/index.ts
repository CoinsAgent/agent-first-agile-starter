import { oauthProvider } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins';

function verified(session?: Record<string, unknown>) {
  return session?.authMethod === 'siwe' && typeof session.walletAddress === 'string' && /^0x[0-9a-f]{40}$/.test(session.walletAddress) &&
    session.expiresAt instanceof Date && session.expiresAt.getTime() > Date.now();
}
// Internal registration infrastructure only. The HTTP facade exposes no provider/JWT routes.
export function registrationProvider() {
  return [jwt(), oauthProvider({
    loginPage: '/', consentPage: '/', storeClientSecret: 'hashed',
    allowDynamicClientRegistration: false, allowUnauthenticatedClientRegistration: false,
    scopes: ['openid'], grantTypes: ['authorization_code'],
    clientRegistrationAllowedScopes: ['openid'],
    clientReference: ({ session }) => verified(session) ? session!.walletAddress as string : undefined,
    clientPrivileges: ({ session, action }) => verified(session) && ['create', 'read', 'list'].includes(action),
  })] as const;
}
