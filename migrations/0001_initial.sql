CREATE TABLE IF NOT EXISTS sessions (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 is_open INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS answers (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 device_hash TEXT NOT NULL,
 body TEXT NOT NULL,
 themes TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
 approved_quote INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS answers_session_idx ON answers(session_id);
CREATE INDEX IF NOT EXISTS answers_device_idx ON answers(session_id, device_hash);
CREATE TABLE IF NOT EXISTS admin_tokens (
 token_hash TEXT PRIMARY KEY,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_expiry_idx ON admin_tokens(expires_at);
