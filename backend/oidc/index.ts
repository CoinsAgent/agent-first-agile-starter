import type Database from 'better-sqlite3';
import { oauthProvider, type OAuthOptions, type Scope } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins';
import { tokenPolicy, TOKEN_SECONDS, FAMILY_SECONDS } from './policy';
export { createProtocol } from './protocol';

function verified(session?: Record<string, unknown>) {
  return session?.authMethod === 'siwe' && typeof session.walletAddress === 'string' && /^0x[0-9a-f]{40}$/.test(session.walletAddress) && session.userId === session.walletAddress &&
    session.expiresAt instanceof Date && session.expiresAt.getTime() > Date.now();
}
export function registrationProvider(db: Database.Database) {
  const options: OAuthOptions<Scope[]> = {
    loginPage: '/oidc-login', consentPage: '/oidc-consent', storeClientSecret: 'hashed',
    allowDynamicClientRegistration: false, allowUnauthenticatedClientRegistration: false,
    scopes: ['openid', 'offline_access'], grantTypes: ['authorization_code', 'refresh_token'],
    clientRegistrationAllowedScopes: ['openid'],
    accessTokenExpiresIn: TOKEN_SECONDS, idTokenExpiresIn: TOKEN_SECONDS,
    refreshTokenExpiresIn: FAMILY_SECONDS, codeExpiresIn: 60, refreshTokenReuseInterval: 0,
    advertisedMetadata: { claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'at_hash', 'acr'] },
    clientPrivileges: ({ session, action }) => verified(session) && ['create', 'read', 'list'].includes(action),
  };
  return [jwt({ jwks: { keyPairConfig: { alg: 'RS256' } }, disableSettingJwtHeader: true }), oauthProvider(options), tokenPolicy(db, options)] as const;
}
