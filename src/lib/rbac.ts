import { getCurrentSession } from "@/lib/auth";
import { users, auditLogs } from "@/db/schema";
import { db } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export type Role = "user" | "moderator" | "admin";

export type Permission =
  | "forum.thread.create"
  | "forum.thread.edit.own"
  | "forum.thread.moderate"
  | "forum.reply.create"
  | "forum.report.review"
  | "product.create"
  | "product.edit.own"
  | "product.review"
  | "order.view.own"
  | "order.recovery"
  | "credit.view.own"
  | "credit.adjust"
  | "user.mute"
  | "user.ban"
  | "role.assign"
  | "settings.manage"
  | "audit.view";

const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  user: new Set<Permission>([
    "forum.thread.create",
    "forum.thread.edit.own",
    "forum.reply.create",
    "product.create",
    "product.edit.own",
    "order.view.own",
    "credit.view.own",
  ]),
  moderator: new Set<Permission>([
    "forum.thread.create",
    "forum.thread.edit.own",
    "forum.thread.moderate",
    "forum.reply.create",
    "forum.report.review",
    "product.create",
    "product.edit.own",
    "product.review",
    "order.view.own",
    "credit.view.own",
    "user.mute",
  ]),
  admin: new Set<Permission>([
    "forum.thread.create",
    "forum.thread.edit.own",
    "forum.thread.moderate",
    "forum.reply.create",
    "forum.report.review",
    "product.create",
    "product.edit.own",
    "product.review",
    "order.view.own",
    "order.recovery",
    "credit.view.own",
    "credit.adjust",
    "user.mute",
    "user.ban",
    "role.assign",
    "settings.manage",
    "audit.view",
  ]),
};

export function hasPermission(
  user: { role?: string; isBanned?: boolean } | null | undefined,
  permission: Permission
): boolean {
  if (!user || user.isBanned) return false;
  const role = (user.role as Role) || "user";
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

export function isUserAdmin(user?: { role?: string; isBanned?: boolean } | null): boolean {
  return hasPermission(user, "settings.manage");
}

export function isUserModerator(user?: { role?: string; isBanned?: boolean } | null): boolean {
  return hasPermission(user, "forum.thread.moderate");
}

export async function requireAuth(req?: NextRequest) {
  const session = await getCurrentSession(req);
  if (!session) {
    throw new Error("UNAUTHORIZED: Please sign in with Discord.");
  }
  if (session.user.isBanned) {
    throw new Error("UNAUTHORIZED: Account has been suspended.");
  }
  return session;
}

export async function requirePermission(
  permission: Permission,
  req?: NextRequest
): Promise<typeof users.$inferSelect> {
  const session = await requireAuth(req);
  if (!hasPermission(session.user, permission)) {
    throw new Error(`UNAUTHORIZED_ADMIN: Insufficient permissions for ${permission}.`);
  }
  return session.user;
}

export async function requireAdmin(req?: NextRequest): Promise<typeof users.$inferSelect> {
  return requirePermission("settings.manage", req);
}

export async function requireModerator(req?: NextRequest): Promise<typeof users.$inferSelect> {
  return requirePermission("forum.thread.moderate", req);
}

export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isBanned, false)));

  if (adminUsers.length <= 1 && adminUsers.some((u) => u.id === userId)) {
    return true;
  }
  return false;
}