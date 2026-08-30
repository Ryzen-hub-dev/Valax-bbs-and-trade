import { generateState } from "arctic";
import { getDiscordClient } from "@/lib/auth";
import { getSafeOrigin } from "@/config/origins";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const rawOrigin = request.nextUrl.origin || request.headers.get("origin") || request.headers.get("host");
    const safeOrigin = getSafeOrigin(rawOrigin);

    if (!safeOrigin) {
      return NextResponse.json(
        { error: "Untrusted origin or host. Access denied." },
        { status: 403 }
      );
    }

    const discord = getDiscordClient(safeOrigin);
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
  } catch (err: any) {
    console.error("[OAuth Init Error]:", err?.message);
    if (err?.message?.includes("DISCORD_OAUTH_NOT_CONFIGURED")) {
      return NextResponse.json(
        { error: "Discord OAuth is not configured on this environment. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to initiate Discord OAuth." }, { status: 500 });
  }
}