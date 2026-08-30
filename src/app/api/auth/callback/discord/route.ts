import { OAuth2Tokens } from "arctic";
import { getDiscordClient, createSession, setSessionCookie } from "@/lib/auth";
import { getSafeOrigin } from "@/config/origins";
import { db } from "@/db";
import { users, walletAccounts, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DiscordUserResponse {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

function isBootstrappedAdminId(discordId: string): boolean {
  const envAdminIds = process.env.ADMIN_DISCORD_IDS || "";
  const adminIdList = envAdminIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIdList.includes(discordId);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const rawOrigin = request.nextUrl.origin || request.headers.get("origin") || request.headers.get("host");
  const safeOrigin = getSafeOrigin(rawOrigin) || "https://bbs-and-trade.valaxscrub.shop";

  const cookieStore = cookies();
  const storedState = cookieStore.get("valax_oauth_state")?.value ?? null;

  // Single-use: Immediately delete state cookie
  cookieStore.delete("valax_oauth_state");

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=oauth_state_invalid", safeOrigin));
  }

  try {
    const verifiedOrigin = getSafeOrigin(rawOrigin);
    if (!verifiedOrigin) {
      return NextResponse.redirect(new URL("/login?error=untrusted_origin", safeOrigin));
    }

    const discord = getDiscordClient(verifiedOrigin);
    const tokens: OAuth2Tokens = await discord.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    // Fetch user profile with 8-second timeout
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=discord_api_failed", safeOrigin));
    }

    const discordUser: DiscordUserResponse = await userResponse.json();

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id.slice(-2) || "0", 10) % 5}.png`;

    const shouldBootstrapAdmin = isBootstrappedAdminId(discordUser.id);

    // Check if user already exists
    const existingUser = (
      await db.select().from(users).where(eq(users.discordId, discordUser.id)).limit(1)
    )[0];

    let userId: string;

    if (!existingUser) {
      userId = `usr_${nanoid(16)}`;
      const assignedRole = shouldBootstrapAdmin ? "admin" : "user";

      await db.insert(users).values({
        id: userId,
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatarUrl,
        role: assignedRole,
        reputationScore: 0,
      });

      await db.insert(walletAccounts).values({
        id: `wacc_${userId}`,
        userId: userId,
        balance: 0,
      });

      if (shouldBootstrapAdmin) {
        await db.insert(auditLogs).values({
          id: `aud_${nanoid(16)}`,
          operatorId: userId,
          action: "ADMIN_BOOTSTRAP_INITIALIZED",
          targetType: "user",
          targetId: userId,
          details: JSON.stringify({ discordId: discordUser.id, reason: "ADMIN_DISCORD_IDS environment match" }),
        });
      }
    } else {
      userId = existingUser.id;

      // Block banned and soft-deleted accounts
      if (existingUser.isBanned || existingUser.deletedAt) {
        await db.insert(auditLogs).values({
          id: `aud_${nanoid(16)}`,
          action: "LOGIN_BLOCKED_BANNED",
          targetType: "user",
          targetId: userId,
          details: JSON.stringify({ isBanned: existingUser.isBanned, deletedAt: existingUser.deletedAt }),
        });
        return NextResponse.redirect(new URL("/login?error=account_suspended", safeOrigin));
      }

      const isPromotingToAdmin = shouldBootstrapAdmin && existingUser.role !== "admin";
      const targetRole = isPromotingToAdmin ? "admin" : existingUser.role;

      await db
        .update(users)
        .set({
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatarUrl,
          role: targetRole,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (isPromotingToAdmin) {
        await db.insert(auditLogs).values({
          id: `aud_${nanoid(16)}`,
          operatorId: userId,
          action: "ADMIN_BOOTSTRAP_INITIALIZED",
          targetType: "user",
          targetId: userId,
          details: JSON.stringify({ discordId: discordUser.id, reason: "ADMIN_DISCORD_IDS environment match" }),
        });
      }
    }

    // Anti-Session Fixation: Create fresh session token
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const token = await createSession(userId, userAgent, ipAddress);
    await setSessionCookie(token);

    // Record login audit log
    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: userId,
      action: "LOGIN_SUCCESS",
      targetType: "user",
      targetId: userId,
      ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
      details: JSON.stringify({ username: discordUser.username }),
    });

    return NextResponse.redirect(new URL("/bbs", safeOrigin));
  } catch (error: any) {
    console.error("[OAuth Callback Exception]:", error?.message || error);
    return NextResponse.redirect(new URL("/login?error=auth_internal_error", safeOrigin));
  }
}