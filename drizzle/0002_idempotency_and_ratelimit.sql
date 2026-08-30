-- Migration: 0002_idempotency_and_ratelimit.sql
-- Description: Add rate_limit_events table and composite unique index for (buyer_id, idempotency_key)

CREATE TABLE IF NOT EXISTS rate_limit_events (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_reset_at_idx ON rate_limit_events (reset_at);

-- Drop previous single-column unique index if existed
DROP INDEX IF EXISTS product_purchases_idempotency_key_idx;

-- Create composite unique index
CREATE UNIQUE INDEX IF NOT EXISTS purchases_buyer_idempotency_idx ON product_purchases (buyer_id, idempotency_key);