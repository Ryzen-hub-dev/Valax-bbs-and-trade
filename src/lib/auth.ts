import { Discord } from "arctic";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getSafeOAuthCallbackBase } from "@/config/origins";

/**
 * Returns a configured Discord OAuth client.
 * Strictly requires DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET (fails closed if missing).
 * Uses allowlist-validated Origin for callback URL.
 */
export function getDiscordClient(originCandidate?: string | null): Discord {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.trim() === "" || clientSecret.trim() === "") {
    throw new Error("DISCORD_OAUTH_NOT_CONFIGURED: Both DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be configured.");
  }

  const safeOrigin = getSafeOAuthCallbackBase(originCandidate);
  const redirectUri = `${safeOrigin}/api/auth/callback/discord`;

  return new Discord(clientId.trim(), clientSecret.trim(), redirectUri);
}

export const SESSION_COOKIE_NAME = "valax_session_token";
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface UserSession {
  user: typeof users.$inferSelect;
  session: typeof sessions.$inferSelect;
}

export async function getCurrentSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const now = new Date();
    const result = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { user, session } = result[0];

    // Block banned users
    if (user.isBanned) {
      return null;
    }

    return { user, session };
  } catch (err) {
    console.error("[Auth] Session lookup error:", err);
    return null;
  }
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_SECONDS * 1000);

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
    ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.id, token));
    } catch {}
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function revokeAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}