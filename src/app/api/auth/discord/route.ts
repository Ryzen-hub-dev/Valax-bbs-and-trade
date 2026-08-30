import { generateState } from "arctic";
import { discord } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
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