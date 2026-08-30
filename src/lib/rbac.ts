import { users } from "@/db/schema";
import { getCurrentSession } from "./auth";

export function getAdminDiscordIds(): Set<string> {
  const envIds = process.env.ADMIN_DISCORD_IDS || "";
  return new Set(envIds.split(",").map((id) => id.trim()).filter(Boolean));
}

export function isUserAdmin(user: typeof users.$inferSelect): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const adminIds = getAdminDiscordIds();
  return adminIds.has(user.discordId);
}

export function isUserModerator(user: typeof users.$inferSelect): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "moderator" || isUserAdmin(user);
}

export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireModerator() {
  const { user } = await requireAuth();
  if (!isUserModerator(user)) {
    throw new Error("FORBIDDEN_MODERATOR_REQUIRED");
  }
  return user;
}

export async function requireAdmin() {
  const { user } = await requireAuth();
  if (!isUserAdmin(user)) {
    throw new Error("FORBIDDEN_ADMIN_REQUIRED");
  }
  return user;
}