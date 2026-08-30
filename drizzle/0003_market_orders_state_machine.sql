-- Migration: 0003_market_orders_state_machine.sql
-- Description: Add orders_market table for transaction state machine and failure recovery tracking

CREATE TABLE IF NOT EXISTS orders_market (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ledger_reference TEXT,
  entitlement_id TEXT,
  failure_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_buyer_idempotency_idx ON orders_market (buyer_id, idempotency_key);
CREATE INDEX IF NOT EXISTS orders_market_buyer_id_idx ON orders_market (buyer_id);
CREATE INDEX IF NOT EXISTS orders_market_product_id_idx ON orders_market (product_id);
CREATE INDEX IF NOT EXISTS orders_market_status_idx ON orders_market (status);