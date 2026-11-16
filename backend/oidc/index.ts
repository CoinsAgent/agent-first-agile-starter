import type Database from 'better-sqlite3';
import { oauthProvider, type OAuthOptions, type Scope } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins';
import { CLI_CLIENT, MANAGEMENT_RESOURCE, MANAGEMENT_SCOPES, managementTokenPolicy, getGrant, grantActive, hashManagement } from './management';
import { tokenPolicy, TOKEN_SECONDS, FAMILY_SECONDS } from './policy';
export { createProtocol } from './protocol';

export function registrationProvider(db: Database.Database) {
  const options: OAuthOptions<Scope[]> = {
    loginPage: '/oidc-login', consentPage: '/oidc-consent', storeClientSecret: 'hashed',
    allowDynamicClientRegistration: true, allowUnauthenticatedClientRegistration: false,
    validateInitialAccessToken: async ({initialAccessToken}) => {
      const row=db.prepare('SELECT grantId,expiresAt,consumed FROM managementIat WHERE token = ?').get(hashManagement(initialAccessToken)) as {grantId:string;expiresAt:number;consumed:number}|undefined;
      const grant=row?getGrant(db,row.grantId):undefined;
      return row && !row.consumed && row.expiresAt>Date.now() && grantActive(grant) && grant.registration ? {referenceId:grant.owner}:false;
    },
    scopes: ['openid', 'offline_access'], grantTypes: ['authorization_code', 'refresh_token'],
    clientRegistrationDefaultScopes: ['openid'], clientRegistrationAllowedScopes: ['openid'],
    accessTokenExpiresIn: TOKEN_SECONDS, idTokenExpiresIn: TOKEN_SECONDS,
    refreshTokenExpiresIn: FAMILY_SECONDS, codeExpiresIn: 60, refreshTokenReuseInterval: 0,
    advertisedMetadata: { claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'at_hash', 'acr'] },
    clientPrivileges: () => false,
  };
  return [jwt({ jwks: { keyPairConfig: { alg: 'RS256' } }, disableSettingJwtHeader: true }), oauthProvider(options), tokenPolicy(db, options)] as const;
}

export { createManagement, managementSchema, CLI_CLIENT, MANAGEMENT_RESOURCE, MANAGEMENT_SCOPES } from './management';
export type { ManagementGrant, Permissions } from './management';
export { getGrant, grantActive, hashManagement, revokeManagement } from './management';

export function managementProvider(db: Database.Database) {
  const options: OAuthOptions<Scope[]> = {
    loginPage:'/oidc-login', consentPage:'/oidc-consent', storeClientSecret:'encrypted', disableJwtPlugin:true,
    allowDynamicClientRegistration:false, allowUnauthenticatedClientRegistration:false,
    scopes:MANAGEMENT_SCOPES, grantTypes:['authorization_code','refresh_token'],
    clientRegistrationAllowedScopes:[], accessTokenExpiresIn:900, refreshTokenExpiresIn:30*86400,
    codeExpiresIn:60, refreshTokenReuseInterval:0, clientPrivileges:()=>false,
    validateInitialAccessToken: async ({initialAccessToken}) => {
      const row = db.prepare('SELECT grantId,expiresAt,consumed FROM managementIat WHERE token = ?').get(hashManagement(initialAccessToken)) as { grantId:string;expiresAt:number;consumed:number } | undefined;
      const grant = row ? getGrant(db,row.grantId) : undefined;
      if (!row || row.consumed || row.expiresAt<=Date.now() || !grantActive(grant) || !grant.registration) return false;
      return { referenceId:grant.owner };
    },
  };
  // Registration's confidential web profile remains openid-only. The system
  // management client is initialized explicitly and is never self-registered.
  const registrationOptions = options;
  return { options:registrationOptions, plugins:[oauthProvider(registrationOptions),managementTokenPolicy(db,registrationOptions)] };
}
export const systemCliRecord = { clientId:CLI_CLIENT, resource:MANAGEMENT_RESOURCE };
export { invalidateClientAuthorization } from './protocol';
