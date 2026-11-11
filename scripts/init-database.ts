import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../backend/bootstrap/database';

let db: Database.Database | undefined;
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--database' || !isAbsolute(args[1])) throw new Error('Select an absolute database path.');
  const path = args[1], existed = existsSync(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  db = new Database(path);
  if (!existed) chmodSync(path, 0o600);
  initializeDatabase(db);
  console.log('Initialized empty WalletGate database. Start the server with DATABASE_PATH pointing to this file.');
} catch {
  console.error('Database initialization failed. Use --database /absolute/path/to/empty.sqlite. Existing tables/data are never changed.');
  process.exitCode = 1;
} finally { db?.close(); }
