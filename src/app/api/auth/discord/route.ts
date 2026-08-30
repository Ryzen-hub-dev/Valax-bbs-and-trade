import { generateState } from "arctic";
import { getDiscordClient } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const discord = getDiscordClient(origin);
  const state = generateState();
  const url = discord.createAuthorizationURL(state, ["identify", "email"]);

  const cookieStore = cookies();
  cookieStore.set("discord_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
  });

  return NextResponse.redirect(url);
}