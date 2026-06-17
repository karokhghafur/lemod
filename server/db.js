import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'lemod.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT DEFAULT 'New chat',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch {
  // column already exists
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN password_plain TEXT`);
} catch {
  // column already exists
}

export function isAwaitingReply(conversationId) {
  const last = db
    .prepare(
      `SELECT role FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(conversationId);
  return last?.role === 'user';
}

export default db;
