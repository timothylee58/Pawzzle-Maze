import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function openStore(filename = ':memory:') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, definition TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY, challenge_id TEXT NOT NULL REFERENCES challenges(id), player_id TEXT NOT NULL, started_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', attempts INTEGER NOT NULL DEFAULT 0, best TEXT, UNIQUE(challenge_id,player_id));
    CREATE TABLE IF NOT EXISTS submissions(round_id TEXT NOT NULL REFERENCES rounds(id), id TEXT NOT NULL, payload TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(round_id,id));
    CREATE INDEX IF NOT EXISTS rounds_challenge ON rounds(challenge_id,status);`);
  return db;
}
