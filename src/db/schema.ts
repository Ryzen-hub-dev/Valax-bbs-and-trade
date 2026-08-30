import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. Users Table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "moderator", "admin"] }).default("user").notNull(),
  isBanned: integer("is_banned", { mode: "boolean" }).default(false).notNull(),
  isMuted: integer("is_muted", { mode: "boolean" }).default(false).notNull(),
  mutedUntil: integer("muted_until", { mode: "timestamp" }),
  banReason: text("ban_reason"),
  reputationScore: integer("reputation_score").default(0).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }), // Soft delete support
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  discordIdIdx: index("users_discord_id_idx").on(table.discordId),
  roleIdx: index("users_role_idx").on(table.role),
}));

// 2. User Sessions (Revocable, SHA-256 Hashed Token ID)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // SHA-256 hash of session token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

// 3. Valax Utility Credit Wallet Accounts
export const walletAccounts = sqliteTable("wallet_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "restrict" }),
  balance: integer("balance").default(0).notNull(), // Non-financial utility credit balance
  frozenBalance: integer("frozen_balance").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userIdIdx: index("wallet_accounts_user_id_idx").on(table.userId),
}));

// 4. Immutable Double-Entry Wallet Ledger (NEVER CASCADE DELETED)
export const walletLedger = sqliteTable("wallet_ledger", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => walletAccounts.id, { onDelete: "restrict" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(), // signed delta (+ / -)
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  type: text("type").notNull(), // 'reward' | 'purchase_product' | 'admin_adjustment' | 'paypal_credit_purchase' | 'fee_deduction'
  source: text("source").notNull(),
  referenceId: text("reference_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  operatorId: text("operator_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  accountIdIdx: index("ledger_account_id_idx").on(table.accountId),
  userIdIdx: index("ledger_user_id_idx").on(table.userId),
  idempotencyKeyIdx: index("ledger_idempotency_key_idx").on(table.idempotencyKey),
  createdAtIdx: index("ledger_created_at_idx").on(table.createdAt),
}));

// 5. Forum Boards / Categories
export const forumBoards = sqliteTable("forum_boards", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").default("MessageSquare").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  minReputationToPost: integer("min_reputation_to_post").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  slugIdx: index("boards_slug_idx").on(table.slug),
}));

// 6. Forum Threads
export const forumThreads = sqliteTable("forum_threads", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => forumBoards.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  tags: text("tags").default("[]").notNull(),
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false).notNull(),
  isHighlighted: integer("is_highlighted", { mode: "boolean" }).default(false).notNull(),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  isResolved: integer("is_resolved", { mode: "boolean" }).default(false).notNull(),
  status: text("status", { enum: ["published", "pending_review", "hidden", "deleted"] }).default("published").notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  repliesCount: integer("replies_count").default(0).notNull(),
  lastReplyAt: integer("last_reply_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  boardIdIdx: index("threads_board_id_idx").on(table.boardId),
  authorIdIdx: index("threads_author_id_idx").on(table.authorId),
  slugIdx: index("threads_slug_idx").on(table.slug),
  lastReplyAtIdx: index("threads_last_reply_at_idx").on(table.lastReplyAt),
  createdAtIdx: index("threads_created_at_idx").on(table.createdAt),
}));

// 7. Forum Replies
export const forumReplies = sqliteTable("forum_replies", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => forumThreads.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentReplyId: text("parent_reply_id"),
  content: text("content").notNull(),
  isSolution: integer("is_solution", { mode: "boolean" }).default(false).notNull(),
  status: text("status", { enum: ["published", "hidden", "deleted"] }).default("published").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  threadIdIdx: index("replies_thread_id_idx").on(table.threadId),
  authorIdIdx: index("replies_author_id_idx").on(table.authorId),
  createdAtIdx: index("replies_created_at_idx").on(table.createdAt),
}));

// 8. Normalized Forum Tags
export const forumTags = sqliteTable("forum_tags", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  slugIdx: index("forum_tags_slug_idx").on(table.slug),
  usageCountIdx: index("forum_tags_usage_count_idx").on(table.usageCount),
}));

// 9. Forum Thread-to-Tag Junction Table
export const forumThreadTags = sqliteTable("forum_thread_tags", {
  threadId: text("thread_id").notNull().references(() => forumThreads.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => forumTags.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  threadTagPk: uniqueIndex("forum_thread_tag_unique_idx").on(table.threadId, table.tagId),
  tagIdIdx: index("forum_thread_tag_tag_idx").on(table.tagId),
}));

// 10. Likes
export const forumLikes = sqliteTable("forum_likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["thread", "reply", "product"] }).notNull(),
  targetId: text("target_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userTargetUnique: uniqueIndex("user_target_like_idx").on(table.userId, table.targetType, table.targetId),
  targetIdx: index("likes_target_idx").on(table.targetType, table.targetId),
}));

// 11. Bookmarks
export const forumBookmarks = sqliteTable("forum_bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["thread", "product"] }).notNull(),
  targetId: text("target_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userTargetBookmarkUnique: uniqueIndex("user_target_bookmark_idx").on(table.userId, table.targetType, table.targetId),
}));

// 12. Digital Marketplace Products
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  developerId: text("developer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  tokenPrice: integer("token_price").notNull(), // Utility credits
  fiatPriceUsd: integer("fiat_price_usd").default(0).notNull(),
  currency: text("currency").default("USD").notNull(),
  version: text("version").default("1.0.0").notNull(),
  compatibility: text("compatibility").default("Valax Standard").notNull(),
  changelog: text("changelog").default("Initial release").notNull(),
  githubRepositoryUrl: text("github_repository_url"),
  githubReleaseUrl: text("github_release_url").notNull(),
  externalDemoUrl: text("external_demo_url"),
  documentationUrl: text("documentation_url"),
  previewImageUrl: text("preview_image_url"),
  status: text("status", { enum: ["draft", "active", "archived"] }).default("draft").notNull(),
  moderationStatus: text("moderation_status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  moderationNote: text("moderation_note"),
  salesCount: integer("sales_count").default(0).notNull(),
  ratingAverage: real("rating_average").default(5.0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  developerIdIdx: index("products_developer_id_idx").on(table.developerId),
  slugIdx: index("products_slug_idx").on(table.slug),
  categoryIdx: index("products_category_idx").on(table.category),
  moderationStatusIdx: index("products_mod_status_idx").on(table.moderationStatus),
}));

// 13. Marketplace Orders State Machine (Trackable lifecycle & failure compensation)
export const ordersMarket = sqliteTable("orders_market", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "failed", "compensating", "manual_review"] }).default("pending").notNull(),
  ledgerReference: text("ledger_reference"),
  entitlementId: text("entitlement_id"),
  failureReason: text("failure_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  buyerIdempotencyUnique: uniqueIndex("orders_buyer_idempotency_idx").on(table.buyerId, table.idempotencyKey),
  buyerIdIdx: index("orders_market_buyer_id_idx").on(table.buyerId),
  productIdIdx: index("orders_market_product_id_idx").on(table.productId),
  statusIdx: index("orders_market_status_idx").on(table.status),
}));

// 14. Digital Product Purchases and Entitlements (Financial Data Preserved, User+Idempotency Unique)
export const productPurchases = sqliteTable("product_purchases", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  tokensSpent: integer("tokens_spent").notNull(),
  licenseKey: text("license_key").notNull().unique(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status", { enum: ["active", "revoked", "refunded"] }).default("active").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
}, (table) => ({
  productIdIdx: index("purchases_product_id_idx").on(table.productId),
  buyerIdIdx: index("purchases_buyer_id_idx").on(table.buyerId),
  buyerIdempotencyUnique: uniqueIndex("purchases_buyer_idempotency_idx").on(table.buyerId, table.idempotencyKey),
  buyerProductStatusIdx: index("purchases_buyer_product_status_idx").on(table.buyerId, table.productId, table.status),
}));

// 15. PayPal Orders (Financial Data Preserved)
export const ordersPaypal = sqliteTable("orders_paypal", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  paypalOrderId: text("paypal_order_id").notNull().unique(),
  amountUsd: integer("amount_usd").notNull(), // cents
  creditsGranted: integer("credits_granted").notNull(),
  status: text("status", { enum: ["created", "approved", "captured", "completed", "failed", "refunded", "disputed"] }).default("created").notNull(),
  rawPaypalResponse: text("raw_paypal_response"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userIdIdx: index("orders_user_id_idx").on(table.userId),
  paypalOrderIdIdx: index("orders_paypal_order_id_idx").on(table.paypalOrderId),
}));

// 16. Moderation Reports
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["thread", "reply", "product", "user"] }).notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status", { enum: ["pending", "resolved", "dismissed"] }).default("pending").notNull(),
  handledBy: text("handled_by").references(() => users.id, { onDelete: "set null" }),
  resolutionNote: text("resolution_note"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  statusIdx: index("reports_status_idx").on(table.status),
  targetIdx: index("reports_target_idx").on(table.targetType, table.targetId),
}));

// 17. In-App Notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  link: text("link"),
  isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.userId, table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}));

// 18. Immutable Audit Logs (Never deleted on user removal)
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  details: text("details"), // JSON string
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  operatorIdIdx: index("audit_operator_id_idx").on(table.operatorId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

// 19. System Settings (Feature Flags & Policies)
export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// 20. Distributed Turso-Backed Rate Limiting (Serverless multi-instance support)
export const rateLimitEvents = sqliteTable("rate_limit_events", {
  key: text("key").primaryKey(),
  count: integer("count").default(1).notNull(),
  resetAt: integer("reset_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  resetAtIdx: index("rate_limit_reset_at_idx").on(table.resetAt),
}));