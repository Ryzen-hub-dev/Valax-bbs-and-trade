ALTER TABLE sessions ADD COLUMN public_session_id text;
--> statement-breakpoint
UPDATE sessions SET public_session_id = 'psess_' || lower(hex(randomblob(16))) WHERE public_session_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_session_id_unique ON sessions (public_session_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);