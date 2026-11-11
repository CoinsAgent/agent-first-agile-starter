import type Database from 'better-sqlite3';

// Dependencies first. oauthResource and jwks are server metadata/key material,
// not user registrations, and are deliberately preserved.
export const applicationDataTables = ['oauthAccessToken', 'oauthRefreshToken', 'oauthConsent', 'oauthClientResource', 'applicationSubmission', 'applicationRate', 'oauthClientAssertion', 'oauthClient'] as const;
export function clearApplicationData(db: Database.Database) {
  for (const table of applicationDataTables) {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)) db.exec(`DELETE FROM "${table}"`);
  }
}
