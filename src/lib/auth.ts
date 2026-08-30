import { Discord } from "arctic";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions, walletAccounts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

const clientId = process.env.DISCORD_CLIENT_ID || "1492451629595627660";
const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";

export function getDiscordClient(origin?: string): Discord {
  let baseUrl = process.env.DISCORD_REDIRECT_URI;
  if (!baseUrl) {
    const host = origin || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    baseUrl = `${host.replace(/\/$/, "")}/api/auth/callback/discord`;
  }
  return new Discord(clientId, clientSecret, baseUrl);
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
    console.error("Session lookup error:", err);
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
    userAgent: userAgent?.slice(0, 500),
    ipAddress: ipAddress?.slice(0, 100),
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