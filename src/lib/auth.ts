import { Discord } from "arctic";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { getSafeOAuthCallbackBase } from "@/config/origins";
import { NextRequest } from "next/server";

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

export async function getCurrentSession(req?: NextRequest): Promise<UserSession | null> {
  let rawToken: string | undefined;

  if (req) {
    rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!rawToken) {
    try {
      const cookieStore = cookies();
      rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // In standalone execution without Next request store
    }
  }

  if (!rawToken) return null;

  try {
    const tokenHash = hashSessionToken(rawToken);
    const now = new Date();

    const result = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { user, session } = result[0];

    if (user.isBanned || user.deletedAt) {
      return null;
    }

    return { user, session };
  } catch (err) {
    console.error("[Auth] Session lookup error:", err);
    return null;
  }
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const rawToken = nanoid(48);
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_SECONDS * 1000);

  await db.insert(sessions).values({
    id: tokenHash,
    userId,
    expiresAt,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
    ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
  });

  return rawToken;
}

export async function setSessionCookie(rawToken: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    try {
      const tokenHash = hashSessionToken(rawToken);
      await db.delete(sessions).where(eq(sessions.id, tokenHash));
    } catch {}
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function revokeAllUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}