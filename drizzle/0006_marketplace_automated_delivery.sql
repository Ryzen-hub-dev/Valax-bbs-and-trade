-- Phase 1D: Marketplace Automated Delivery System & Immutable Version Snapshots

-- 1. Add delivery and verification columns to products table
ALTER TABLE products ADD COLUMN github_owner TEXT;
ALTER TABLE products ADD COLUMN github_repo TEXT;
ALTER TABLE products ADD COLUMN repository_url TEXT;
ALTER TABLE products ADD COLUMN release_url TEXT;
ALTER TABLE products ADD COLUMN release_tag TEXT;
ALTER TABLE products ADD COLUMN release_version TEXT DEFAULT '1.0.0';
ALTER TABLE products ADD COLUMN release_asset_url TEXT;
ALTER TABLE products ADD COLUMN release_commit_sha TEXT;
ALTER TABLE products ADD COLUMN release_checksum TEXT;
ALTER TABLE products ADD COLUMN license_terms TEXT;
ALTER TABLE products ADD COLUMN support_url TEXT;
ALTER TABLE products ADD COLUMN verification_status TEXT DEFAULT 'unverified';
ALTER TABLE products ADD COLUMN last_verified_at INTEGER;

-- Backfill legacy product rows
UPDATE products 
SET 
  release_url = COALESCE(github_release_url, 'https://github.com/valax-scrub/releases/tag/v1.0.0'),
  repository_url = COALESCE(github_repository_url, 'https://github.com/valax-scrub/releases'),
  release_tag = 'v' || COALESCE(version, '1.0.0'),
  release_version = COALESCE(version, '1.0.0'),
  verification_status = 'verified',
  last_verified_at = strftime('%s', 'now')
WHERE release_url IS NULL;

-- 2. Create product_versions table for immutable release tracking
CREATE TABLE IF NOT EXISTS product_versions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  release_tag TEXT NOT NULL,
  release_url TEXT NOT NULL,
  release_asset_url TEXT,
  release_commit_sha TEXT,
  release_checksum TEXT,
  changelog TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS product_versions_product_id_idx ON product_versions(product_id);
CREATE INDEX IF NOT EXISTS product_versions_version_idx ON product_versions(product_id, version);

-- 3. Create order_delivery_snapshots table for immutable post-purchase delivery access
CREATE TABLE IF NOT EXISTS order_delivery_snapshots (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders_market(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_version_id TEXT,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_title TEXT NOT NULL,
  purchased_version TEXT NOT NULL,
  release_tag TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  release_url TEXT NOT NULL,
  release_asset_url TEXT,
  release_commit_sha TEXT,
  release_checksum TEXT,
  delivery_status TEXT DEFAULT 'fulfilled' NOT NULL,
  delivery_notes TEXT,
  delivered_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS delivery_snapshots_order_id_idx ON order_delivery_snapshots(order_id);
CREATE INDEX IF NOT EXISTS delivery_snapshots_buyer_id_idx ON order_delivery_snapshots(buyer_id);
CREATE INDEX IF NOT EXISTS delivery_snapshots_product_id_idx ON order_delivery_snapshots(product_id);