import { OAuth2Tokens } from "arctic";
import { getDiscordClient, createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

interface DiscordUserResponse {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = cookies();
  const storedState = cookieStore.get("discord_oauth_state")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new NextResponse("Invalid OAuth State or Code", { status: 400 });
  }

  try {
    const origin = request.nextUrl.origin;
    const discord = getDiscordClient(origin);
    const tokens: OAuth2Tokens = await discord.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return new NextResponse("Failed to fetch user profile from Discord", { status: 500 });
    }

    const discordUser: DiscordUserResponse = await userResponse.json();

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id) % 5}.png`;

    // Check if user already exists
    let existingUser = (
      await db.select().from(users).where(eq(users.discordId, discordUser.id)).limit(1)
    )[0];

    let userId: string;

    if (!existingUser) {
      userId = `usr_${nanoid(16)}`;
      await db.insert(users).values({
        id: userId,
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatarUrl,
        role: "user",
        reputationScore: 10,
      });
    } else {
      userId = existingUser.id;
      if (existingUser.isBanned) {
        return new NextResponse("Your account has been suspended by an administrator.", { status: 403 });
      }
      await db
        .update(users)
        .set({
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatarUrl,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Create Session
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const token = await createSession(userId, userAgent, ipAddress);
    await setSessionCookie(token);

    return NextResponse.redirect(new URL("/bbs", request.url));
  } catch (error) {
    console.error("OAuth Error:", error);
    return new NextResponse("Authentication error occurred", { status: 500 });
  }
}