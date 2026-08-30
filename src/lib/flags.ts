import { db } from "@/db";
import { systemSettings, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export type FeatureFlagKey =
  | "MAINTENANCE_MODE"
  | "FORUM_ENABLED"
  | "THREAD_CREATION_ENABLED"
  | "REPLIES_ENABLED"
  | "REPORTS_ENABLED"
  | "MARKET_ENABLED"
  | "PRODUCT_PUBLISH_ENABLED"
  | "MARKET_PURCHASE_ENABLED"
  | "PAYMENTS_ENABLED"
  | "ADMIN_LEDGER_ADJUST_ENABLED";

export const HIGH_RISK_FEATURE_FLAGS: Set<FeatureFlagKey> = new Set<FeatureFlagKey>([
  "MARKET_PURCHASE_ENABLED",
  "PRODUCT_PUBLISH_ENABLED",
  "PAYMENTS_ENABLED",
  "ADMIN_LEDGER_ADJUST_ENABLED",
]);

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  MAINTENANCE_MODE: false,
  FORUM_ENABLED: true,
  THREAD_CREATION_ENABLED: true,
  REPLIES_ENABLED: true,
  REPORTS_ENABLED: true,
  MARKET_ENABLED: true,
  PRODUCT_PUBLISH_ENABLED: false, // High-risk: Default disabled
  MARKET_PURCHASE_ENABLED: false, // High-risk: Default disabled
  PAYMENTS_ENABLED: false, // High-risk: Default disabled
  ADMIN_LEDGER_ADJUST_ENABLED: false, // High-risk: Default disabled
};

/**
 * Checks whether a specific feature flag is currently active in the database.
 * High-risk flags strictly fail closed (return false) upon database failure.
 */
export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  try {
    const setting = (
      await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, `FLAG_${flag}`))
        .limit(1)
    )[0];

    if (!setting) {
      return DEFAULT_FEATURE_FLAGS[flag] ?? false;
    }

    return setting.value === "true";
  } catch (err) {
    console.error(`[Flags Fail-Closed] Failed to read flag ${flag} from database:`, err);
    // High-risk flags strictly fail closed to prevent unauthorized purchases or transactions
    if (HIGH_RISK_FEATURE_FLAGS.has(flag)) {
      return false;
    }
    return DEFAULT_FEATURE_FLAGS[flag] ?? false;
  }
}

/**
 * Enforces that a feature flag is enabled. Throws an error if the feature is disabled.
 */
export async function requireFeatureFlag(flag: FeatureFlagKey): Promise<void> {
  const enabled = await isFeatureEnabled(flag);
  if (!enabled) {
    throw new Error(`FEATURE_DISABLED: Feature '${flag}' is currently disabled by system administration.`);
  }
}

/**
 * Returns all feature flag states for admin inspection.
 */
export async function getAllFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  try {
    const settings = await db.select().from(systemSettings);
    for (const s of settings) {
      if (s.key.startsWith("FLAG_")) {
        const flagKey = s.key.replace("FLAG_", "") as FeatureFlagKey;
        if (flagKey in flags) {
          flags[flagKey] = s.value === "true";
        }
      }
    }
  } catch (err) {
    console.error("[Flags Error] Failed to load all flags:", err);
  }
  return flags;
}

/**
 * Updates a feature flag and records an audit log entry.
 */
export async function setFeatureFlag(
  flag: FeatureFlagKey,
  enabled: boolean,
  operatorId: string,
  requestId?: string
): Promise<void> {
  const key = `FLAG_${flag}`;
  const previousState = await isFeatureEnabled(flag);

  await db
    .insert(systemSettings)
    .values({ key, value: String(enabled), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: String(enabled), updatedAt: new Date() },
    });

  await db.insert(auditLogs).values({
    id: `aud_${nanoid(16)}`,
    operatorId,
    action: "SET_FEATURE_FLAG",
    targetType: "system_setting",
    targetId: key,
    details: JSON.stringify({
      flag,
      before: previousState,
      after: enabled,
      requestId,
    }),
  });
}