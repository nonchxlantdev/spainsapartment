// apps/api/src/db/index.js
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel functions can write only under /tmp, and that disk is wiped between
// cold starts. Local runs keep the durable file under apps/api/data.
const DEFAULT_DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'spains-apartment.db')
  : path.join(__dirname, '..', '..', 'data', 'spains-apartment.db');

let dbInstance = null;

export function getDb(dbPath = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  initSchema(dbInstance);
  return dbInstance;
}
