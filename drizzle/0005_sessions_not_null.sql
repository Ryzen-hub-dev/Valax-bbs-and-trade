CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  public_session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  user_agent TEXT,
  ip_address TEXT
);
--> statement-breakpoint
INSERT INTO sessions_new (id, public_session_id, user_id, expires_at, created_at, user_agent, ip_address)
  SELECT id, public_session_id, user_id, expires_at, created_at, user_agent, ip_address FROM sessions;
--> statement-breakpoint
DROP TABLE sessions;
--> statement-breakpoint
ALTER TABLE sessions_new RENAME TO sessions;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);