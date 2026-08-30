import { getCurrentSession } from "@/lib/auth";
import { users } from "@/db/schema";
import { NextRequest } from "next/server";

export type Role = "user" | "moderator" | "admin";

export function isUserAdmin(user?: { role?: string } | null): boolean {
  return user?.role === "admin";
}

export function isUserModerator(user?: { role?: string } | null): boolean {
  return user?.role === "moderator" || user?.role === "admin";
}

export async function requireAuth(req?: NextRequest) {
  const session = await getCurrentSession(req);
  if (!session) {
    throw new Error("UNAUTHORIZED: Please sign in with Discord.");
  }
  return session;
}

export async function requireAdmin(req?: NextRequest): Promise<typeof users.$inferSelect> {
  const session = await getCurrentSession(req);
  if (!session || session.user.role !== "admin") {
    throw new Error("UNAUTHORIZED_ADMIN: Admin privileges required.");
  }
  return session.user;
}

export async function requireModerator(req?: NextRequest): Promise<typeof users.$inferSelect> {
  const session = await getCurrentSession(req);
  if (!session || (session.user.role !== "moderator" && session.user.role !== "admin")) {
    throw new Error("UNAUTHORIZED_MODERATOR: Moderator privileges required.");
  }
  return session.user;
}