import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { CLI_CLIENT, MANAGEMENT_RESOURCE, MANAGEMENT_SCOPES } from '../oidc';
import { initialSchema } from './schema';

// A fixed initial schema, not an existing-database schema diff or upgrade.
export function initializeDatabase(db: Database.Database) {
  db.transaction(() => {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' LIMIT 1").get()) {
      throw new Error('Initialization requires an empty database. Existing tables/data are never changed.');
    }
    db.exec(initialSchema);
    const generation=randomUUID();
    db.function('walletgate_generation',()=>generation);
    db.prepare('INSERT INTO walletgateIdentityState (id,generation) VALUES (1,?)').run(generation);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO oauthClient (id,clientId,name,redirectUris,scopes,grantTypes,responseTypes,tokenEndpointAuthMethod,applicationType,requirePKCE,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),CLI_CLIENT,'WalletGate CLI',JSON.stringify(['http://127.0.0.1/callback']),JSON.stringify(MANAGEMENT_SCOPES),JSON.stringify(['authorization_code','refresh_token']),JSON.stringify(['code']),'none','native',1,now,now);
    db.prepare('INSERT INTO oauthResource (id,identifier,name,allowedScopes,accessTokenTtl,refreshTokenTtl,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),MANAGEMENT_RESOURCE,'WalletGate Management',JSON.stringify(MANAGEMENT_SCOPES),900,30*86400,now,now);
    db.prepare('INSERT INTO oauthClientResource (id,clientId,resourceId,createdAt) VALUES (?,?,?,?)').run(randomUUID(),CLI_CLIENT,MANAGEMENT_RESOURCE,now);

  }).immediate();
}
