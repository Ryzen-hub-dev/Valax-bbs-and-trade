-- Migration: 0001_add_tags_and_notifications.sql
-- Description: Add normalized forum tags, thread-tag junction table, and in-app notifications

CREATE TABLE IF NOT EXISTS forum_tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS forum_tags_slug_idx ON forum_tags (slug);
CREATE INDEX IF NOT EXISTS forum_tags_usage_count_idx ON forum_tags (usage_count);

CREATE TABLE IF NOT EXISTS forum_thread_tags (
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS forum_thread_tag_unique_idx ON forum_thread_tags (thread_id, tag_id);
CREATE INDEX IF NOT EXISTS forum_thread_tag_tag_idx ON forum_thread_tags (tag_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at);