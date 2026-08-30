import { client } from "./index";
import * as dotenv from "dotenv";
dotenv.config();

const ddlStatements = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    is_banned INTEGER NOT NULL DEFAULT 0,
    is_muted INTEGER NOT NULL DEFAULT 0,
    muted_until INTEGER,
    ban_reason TEXT,
    reputation_score INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_login_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS users_discord_id_idx ON users(discord_id);`,
  `CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);`,

  // 2. Sessions
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    user_agent TEXT,
    ip_address TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);`,

  // 3. Wallet Accounts
  `CREATE TABLE IF NOT EXISTS wallet_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    frozen_balance INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS wallet_accounts_user_id_idx ON wallet_accounts(user_id);`,

  // 4. Wallet Ledger
  `CREATE TABLE IF NOT EXISTS wallet_ledger (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    reference_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    operator_id TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS ledger_account_id_idx ON wallet_ledger(account_id);`,
  `CREATE INDEX IF NOT EXISTS ledger_user_id_idx ON wallet_ledger(user_id);`,
  `CREATE INDEX IF NOT EXISTS ledger_idempotency_key_idx ON wallet_ledger(idempotency_key);`,
  `CREATE INDEX IF NOT EXISTS ledger_created_at_idx ON wallet_ledger(created_at);`,

  // 5. Forum Boards
  `CREATE TABLE IF NOT EXISTS forum_boards (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'MessageSquare',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    min_reputation_to_post INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS boards_slug_idx ON forum_boards(slug);`,

  // 6. Forum Threads
  `CREATE TABLE IF NOT EXISTS forum_threads (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES forum_boards(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_highlighted INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    last_reply_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS threads_board_id_idx ON forum_threads(board_id);`,
  `CREATE INDEX IF NOT EXISTS threads_author_id_idx ON forum_threads(author_id);`,
  `CREATE INDEX IF NOT EXISTS threads_slug_idx ON forum_threads(slug);`,
  `CREATE INDEX IF NOT EXISTS threads_last_reply_at_idx ON forum_threads(last_reply_at);`,
  `CREATE INDEX IF NOT EXISTS threads_created_at_idx ON forum_threads(created_at);`,

  // 7. Forum Replies
  `CREATE TABLE IF NOT EXISTS forum_replies (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_reply_id TEXT,
    content TEXT NOT NULL,
    is_solution INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS replies_thread_id_idx ON forum_replies(thread_id);`,
  `CREATE INDEX IF NOT EXISTS replies_author_id_idx ON forum_replies(author_id);`,
  `CREATE INDEX IF NOT EXISTS replies_created_at_idx ON forum_replies(created_at);`,

  // 8. Forum Likes & Bookmarks
  `CREATE TABLE IF NOT EXISTS forum_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(user_id, target_type, target_id)
  );`,
  `CREATE INDEX IF NOT EXISTS likes_target_idx ON forum_likes(target_type, target_id);`,

  `CREATE TABLE IF NOT EXISTS forum_bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(user_id, target_type, target_id)
  );`,

  // 9. Digital Marketplace Products
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    developer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    token_price INTEGER NOT NULL,
    fiat_price_usd INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    version TEXT NOT NULL DEFAULT '1.0.0',
    compatibility TEXT NOT NULL DEFAULT 'Valax Standard',
    changelog TEXT NOT NULL DEFAULT 'Initial release',
    github_repository_url TEXT,
    github_release_url TEXT NOT NULL,
    external_demo_url TEXT,
    documentation_url TEXT,
    preview_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    moderation_status TEXT NOT NULL DEFAULT 'approved',
    moderation_note TEXT,
    sales_count INTEGER NOT NULL DEFAULT 0,
    rating_average REAL NOT NULL DEFAULT 5.0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS products_developer_id_idx ON products(developer_id);`,
  `CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);`,
  `CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);`,
  `CREATE INDEX IF NOT EXISTS products_mod_status_idx ON products(moderation_status);`,

  // 10. Product Purchases & Licenses
  `CREATE TABLE IF NOT EXISTS product_purchases (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tokens_spent INTEGER NOT NULL,
    license_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS purchases_product_id_idx ON product_purchases(product_id);`,
  `CREATE INDEX IF NOT EXISTS purchases_buyer_id_idx ON product_purchases(buyer_id);`,
  `CREATE INDEX IF NOT EXISTS purchases_license_key_idx ON product_purchases(license_key);`,

  // 11. PayPal Orders
  `CREATE TABLE IF NOT EXISTS orders_paypal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL UNIQUE,
    amount_usd INTEGER NOT NULL,
    credits_granted INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    raw_paypal_response TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders_paypal(user_id);`,
  `CREATE INDEX IF NOT EXISTS orders_paypal_order_id_idx ON orders_paypal(paypal_order_id);`,

  // 12. Reports
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    handled_by TEXT REFERENCES users(id),
    resolution_note TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);`,
  `CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id);`,

  // 13. Audit Logs
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE INDEX IF NOT EXISTS audit_operator_id_idx ON audit_logs(operator_id);`,
  `CREATE INDEX IF NOT EXISTS audit_created_at_idx ON audit_logs(created_at);`,

  // 14. System Settings
  `CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`
];

async function runMigration() {
  console.log("[+] Running database migration on Turso...");
  for (const stmt of ddlStatements) {
    try {
      await client.execute(stmt);
    } catch (err) {
      console.error("[-] Migration error executing statement:", stmt, err);
      process.exit(1);
    }
  }
  console.log("[+] Database migration completed successfully!");
}

runMigration();
