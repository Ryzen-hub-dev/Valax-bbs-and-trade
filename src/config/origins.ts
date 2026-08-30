/**
 * Strict Origin and Host Allowlist for Valax Scrub BBS & Trade
 * Prevents Host Header Injection, SSRF, and Open Redirect attacks.
 */

export const STATIC_ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "https://valax-bbs-and-trade.vercel.app",
  "https://bbs-and-trade.valaxscrub.shop",
] as const;

export const DEFAULT_PRODUCTION_ORIGIN = "https://bbs-and-trade.valaxscrub.shop";

/**
 * Get the full set of allowed origins including explicitly configured preview domains.
 */
export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>(STATIC_ALLOWED_ORIGINS);

  // Add explicit preview origins from environment variable
  const previewEnv = process.env.ALLOWED_PREVIEW_ORIGINS;
  if (previewEnv) {
    const list = previewEnv.split(",").map((s) => s.trim()).filter(Boolean);
    for (const item of list) {
      try {
        const u = new URL(item);
        origins.add(u.origin);
      } catch {
        console.warn(`[Security Warning] Invalid URL in ALLOWED_PREVIEW_ORIGINS: "${item}"`);
      }
    }
  }

  // Add NEXT_PUBLIC_APP_URL if explicitly set and valid
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      origins.add(u.origin);
    } catch {}
  }

  return origins;
}

/**
 * Validate and safely resolve incoming request origin or host against strict allowlist.
 * Returns null if the origin is untrusted or invalid (fail closed).
 */
export function getSafeOrigin(incomingCandidate?: string | null): string | null {
  if (!incomingCandidate || typeof incomingCandidate !== "string") {
    return null;
  }

  try {
    let urlStr = incomingCandidate.trim();
    if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
      urlStr = `https://${urlStr}`;
    }

    const parsed = new URL(urlStr);
    const normalizedOrigin = parsed.origin;

    const allowed = getAllowedOrigins();
    if (allowed.has(normalizedOrigin)) {
      return normalizedOrigin;
    }

    // Untrusted Origin -> fail closed
    console.warn(`[Security Alert] Rejected untrusted origin/host: "${incomingCandidate}"`);
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the OAuth Base URL safely. Fails closed if no valid origin can be determined.
 */
export function getSafeOAuthCallbackBase(originCandidate?: string | null): string {
  const verified = getSafeOrigin(originCandidate);
  if (verified) {
    return verified;
  }

  // Fallback to default production origin only if verified against allowlist
  const fallback = DEFAULT_PRODUCTION_ORIGIN;
  const allowed = getAllowedOrigins();
  if (allowed.has(fallback)) {
    return fallback;
  }

  throw new Error("OAUTH_ORIGIN_NOT_ALLOWED: No allowed origin available for OAuth callback.");
}