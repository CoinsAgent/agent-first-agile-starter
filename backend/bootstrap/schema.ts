import { clientCapTrigger } from '../applications';

// Pinned initial schema, applied only to an empty database by explicit setup.
export const initialSchema = String.raw`
-- Initial WalletGate schema for the pinned Better Auth/core/provider 1.7.15 stack.
-- Apply only to an empty database through scripts/init-database.ts. No row data.

CREATE TABLE "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);

CREATE TABLE "applicationRate" ("id" text not null primary key, "owner" text not null unique, "startedAt" date not null, "attempts" integer not null);

CREATE TABLE "applicationSubmission" ("id" text not null primary key, "key" text not null unique, "owner" text not null, "requestId" text not null, "digest" text not null, "clientId" text not null unique);

CREATE TABLE "jwks" ("id" text not null primary key, "publicKey" text not null, "privateKey" text not null, "createdAt" date not null, "expiresAt" date, "alg" text, "crv" text);

CREATE TABLE "oauthAccessToken" ("id" text not null primary key, "token" text not null unique, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "sessionId" text references "session" ("id") on delete set null, "userId" text references "user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" text, "requestedUserInfoClaims" text, "refreshId" text references "oauthRefreshToken" ("id") on delete cascade, "expiresAt" date not null, "createdAt" date not null, "revoked" date, "confirmation" text, "scopes" text not null);

CREATE TABLE "oauthClient" ("id" text not null primary key, "clientId" text not null unique, "clientSecret" text, "clientDiscoveryId" text, "disabled" integer, "skipConsent" integer, "enableEndSession" integer, "subjectType" text, "scopes" text, "clientCredentialsScopes" text, "userId" text references "user" ("id") on delete cascade, "createdAt" date, "updatedAt" date, "name" text, "uri" text, "icon" text, "contacts" text, "tos" text, "policy" text, "softwareId" text, "softwareVersion" text, "softwareStatement" text, "redirectUris" text not null, "postLogoutRedirectUris" text, "backchannelLogoutUri" text, "backchannelLogoutSessionRequired" integer, "tokenEndpointAuthMethod" text, "applicationType" text, "jwks" text, "jwksUri" text, "grantTypes" text, "responseTypes" text, "requirePKCE" integer, "dpopBoundAccessTokens" integer, "referenceId" text, "metadata" text);

CREATE TABLE "oauthClientAssertion" ("id" text not null primary key, "expiresAt" date not null);

CREATE TABLE "oauthClientResource" ("id" text not null primary key, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "resourceId" text not null references "oauthResource" ("identifier") on delete cascade, "metadata" text, "createdAt" date);

CREATE TABLE "oauthConsent" ("id" text not null primary key, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "userId" text references "user" ("id") on delete cascade, "referenceId" text, "resources" text, "requestedUserInfoClaims" text, "scopes" text not null, "createdAt" date not null, "updatedAt" date not null);

CREATE TABLE "oauthRefreshToken" ("id" text not null primary key, "token" text not null unique, "clientId" text not null references "oauthClient" ("clientId") on delete cascade, "sessionId" text references "session" ("id") on delete set null, "userId" text not null references "user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" text, "requestedUserInfoClaims" text, "expiresAt" date not null, "createdAt" date not null, "revoked" date, "rotatedAt" date, "rotationReplayResponse" text, "rotationReplayExpiresAt" date, "authTime" date, "confirmation" text, "scopes" text not null);

CREATE TABLE "oauthResource" ("id" text not null primary key, "identifier" text not null unique, "name" text not null, "accessTokenTtl" integer, "refreshTokenTtl" integer, "signingAlgorithm" text, "signingKeyId" text, "allowedScopes" text, "customClaims" text, "dpopBoundAccessTokensRequired" integer, "disabled" integer, "createdAt" date, "updatedAt" date, "policyVersion" integer, "metadata" text);

CREATE TABLE qrRate (key TEXT PRIMARY KEY, start INTEGER NOT NULL, count INTEGER NOT NULL);

CREATE TABLE qrRequest (
    id TEXT PRIMARY KEY, ownerHash TEXT NOT NULL, phoneHash TEXT,
    confirmation TEXT NOT NULL, expiresAt INTEGER NOT NULL,
    state TEXT NOT NULL, message TEXT, signature TEXT);

CREATE TABLE "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade, "authMethod" text, "walletAddress" text);

CREATE TABLE "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);

CREATE TABLE "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

CREATE TABLE "walletAddress" ("id" text not null primary key, "userId" text not null references "user" ("id") on delete cascade, "address" text not null, "chainId" integer not null, "isPrimary" integer not null, "createdAt" date not null);

CREATE TABLE walletChallenge (attemptHash TEXT PRIMARY KEY, message TEXT NOT NULL, expiresAt INTEGER NOT NULL);

CREATE TABLE walletgateIdentityState (id INTEGER PRIMARY KEY CHECK(id = 1), generation TEXT NOT NULL);

CREATE INDEX "account_userId_idx" on "account" ("userId");

CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" on "oauthAccessToken" ("authorizationCodeId");

CREATE INDEX "oauthAccessToken_clientId_idx" on "oauthAccessToken" ("clientId");

CREATE INDEX "oauthAccessToken_refreshId_idx" on "oauthAccessToken" ("refreshId");

CREATE INDEX "oauthAccessToken_sessionId_idx" on "oauthAccessToken" ("sessionId");

CREATE INDEX "oauthAccessToken_userId_idx" on "oauthAccessToken" ("userId");

CREATE INDEX "oauthClientResource_clientId_idx" on "oauthClientResource" ("clientId");

CREATE UNIQUE INDEX "oauthClientResource_clientId_resourceId_uidx" on "oauthClientResource" ("clientId", "resourceId");

CREATE INDEX "oauthClientResource_resourceId_idx" on "oauthClientResource" ("resourceId");

CREATE INDEX "oauthClient_userId_idx" on "oauthClient" ("userId");

CREATE INDEX "oauthConsent_clientId_idx" on "oauthConsent" ("clientId");

CREATE INDEX "oauthConsent_userId_idx" on "oauthConsent" ("userId");

CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" on "oauthRefreshToken" ("authorizationCodeId");

CREATE INDEX "oauthRefreshToken_clientId_idx" on "oauthRefreshToken" ("clientId");

CREATE INDEX "oauthRefreshToken_sessionId_idx" on "oauthRefreshToken" ("sessionId");

CREATE INDEX "oauthRefreshToken_userId_idx" on "oauthRefreshToken" ("userId");

CREATE INDEX qrOwner ON qrRequest(ownerHash);

CREATE INDEX "session_userId_idx" on "session" ("userId");

CREATE INDEX "verification_identifier_idx" on "verification" ("identifier");

CREATE INDEX "walletAddress_userId_idx" on "walletAddress" ("userId");

CREATE UNIQUE INDEX wallet_address_chain_unique ON walletAddress(address, chainId);

CREATE UNIQUE INDEX walletgate_one_user_per_address ON walletAddress(lower(address));

CREATE UNIQUE INDEX walletgate_one_wallet_per_user ON walletAddress(userId);

${clientCapTrigger}

CREATE TRIGGER "walletgate_fence_account_DELETE" BEFORE DELETE ON "account"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_account_INSERT" BEFORE INSERT ON "account"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_account_UPDATE" BEFORE UPDATE ON "account"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationRate_DELETE" BEFORE DELETE ON "applicationRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationRate_INSERT" BEFORE INSERT ON "applicationRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationRate_UPDATE" BEFORE UPDATE ON "applicationRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationSubmission_DELETE" BEFORE DELETE ON "applicationSubmission"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationSubmission_INSERT" BEFORE INSERT ON "applicationSubmission"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_applicationSubmission_UPDATE" BEFORE UPDATE ON "applicationSubmission"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_jwks_DELETE" BEFORE DELETE ON "jwks"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_jwks_INSERT" BEFORE INSERT ON "jwks"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_jwks_UPDATE" BEFORE UPDATE ON "jwks"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthAccessToken_DELETE" BEFORE DELETE ON "oauthAccessToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthAccessToken_INSERT" BEFORE INSERT ON "oauthAccessToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthAccessToken_UPDATE" BEFORE UPDATE ON "oauthAccessToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientAssertion_DELETE" BEFORE DELETE ON "oauthClientAssertion"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientAssertion_INSERT" BEFORE INSERT ON "oauthClientAssertion"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientAssertion_UPDATE" BEFORE UPDATE ON "oauthClientAssertion"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientResource_DELETE" BEFORE DELETE ON "oauthClientResource"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientResource_INSERT" BEFORE INSERT ON "oauthClientResource"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClientResource_UPDATE" BEFORE UPDATE ON "oauthClientResource"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClient_DELETE" BEFORE DELETE ON "oauthClient"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClient_INSERT" BEFORE INSERT ON "oauthClient"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthClient_UPDATE" BEFORE UPDATE ON "oauthClient"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthConsent_DELETE" BEFORE DELETE ON "oauthConsent"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthConsent_INSERT" BEFORE INSERT ON "oauthConsent"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthConsent_UPDATE" BEFORE UPDATE ON "oauthConsent"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthRefreshToken_DELETE" BEFORE DELETE ON "oauthRefreshToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthRefreshToken_INSERT" BEFORE INSERT ON "oauthRefreshToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_oauthRefreshToken_UPDATE" BEFORE UPDATE ON "oauthRefreshToken"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRate_DELETE" BEFORE DELETE ON "qrRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRate_INSERT" BEFORE INSERT ON "qrRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRate_UPDATE" BEFORE UPDATE ON "qrRate"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRequest_DELETE" BEFORE DELETE ON "qrRequest"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRequest_INSERT" BEFORE INSERT ON "qrRequest"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_qrRequest_UPDATE" BEFORE UPDATE ON "qrRequest"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_session_DELETE" BEFORE DELETE ON "session"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_session_INSERT" BEFORE INSERT ON "session"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_session_UPDATE" BEFORE UPDATE ON "session"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_user_DELETE" BEFORE DELETE ON "user"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_user_INSERT" BEFORE INSERT ON "user"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_user_UPDATE" BEFORE UPDATE ON "user"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_verification_DELETE" BEFORE DELETE ON "verification"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_verification_INSERT" BEFORE INSERT ON "verification"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_verification_UPDATE" BEFORE UPDATE ON "verification"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletAddress_DELETE" BEFORE DELETE ON "walletAddress"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletAddress_INSERT" BEFORE INSERT ON "walletAddress"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletAddress_UPDATE" BEFORE UPDATE ON "walletAddress"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletChallenge_DELETE" BEFORE DELETE ON "walletChallenge"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletChallenge_INSERT" BEFORE INSERT ON "walletChallenge"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER "walletgate_fence_walletChallenge_UPDATE" BEFORE UPDATE ON "walletChallenge"
      WHEN walletgate_generation() != (SELECT generation FROM walletgateIdentityState WHERE id = 1)
      BEGIN SELECT RAISE(ABORT, 'WalletGate reset: restart this connection'); END;

CREATE TRIGGER walletgate_user_address BEFORE INSERT ON user
    WHEN length(NEW.id) != 42 OR substr(NEW.id, 1, 2) != '0x' OR substr(NEW.id, 3) GLOB '*[^0-9a-f]*'
    BEGIN SELECT RAISE(ABORT, 'User ID must be a canonical wallet address'); END;

CREATE TRIGGER walletgate_wallet_binding BEFORE INSERT ON walletAddress
    WHEN lower(NEW.address) != NEW.userId OR NEW.chainId != 1
    BEGIN SELECT RAISE(ABORT, 'Wallet must match its user ID'); END;
`;
