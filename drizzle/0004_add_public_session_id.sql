ALTER TABLE sessions ADD COLUMN public_session_id text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_session_id_unique ON sessions (public_session_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);