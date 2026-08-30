import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { requirePermission, isLastActiveAdmin, requireAdmin } from "@/lib/rbac";
import { revokeAllUserSessions } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userActionSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["ban", "unban", "mute", "unmute", "set_role", "revoke_sessions"]),
  role: z.enum(["user", "moderator", "admin"]).optional(),
  reason: z.string().max(500).optional(),
  confirmationCode: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("audit.view", req);

    const userList = await db
      .select({
        id: users.id,
        discordId: users.discordId,
        username: users.username,
        discriminator: users.discriminator,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isBanned: users.isBanned,
        banReason: users.banReason,
        isMuted: users.isMuted,
        reputationScore: users.reputationScore,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(100);

    return NextResponse.json({ users: userList });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to load users list.", route: "/api/admin/users" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const body = await req.json();
    const { targetUserId, action, role, reason, confirmationCode } = userActionSchema.parse(body);

    let operatorUser: typeof users.$inferSelect;

    // Granular permission check per action
    if (action === "ban" || action === "unban") {
      operatorUser = await requirePermission("user.ban", req);
    } else if (action === "set_role") {
      operatorUser = await requirePermission("role.assign", req);
    } else if (action === "mute" || action === "unmute") {
      operatorUser = await requirePermission("user.mute", req);
    } else {
      operatorUser = await requireAdmin(req);
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`admin_users:${operatorUser.id}:${clientIp}`, {
      maxRequests: 20,
      windowSeconds: 60,
      failClosed: true,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many admin user requests. Please wait." }, { status: 429 });
    }

    // 1. Prevent administrator from modifying their own role or banning themselves
    if (targetUserId === operatorUser.id && (action === "set_role" || action === "ban")) {
      return NextResponse.json(
        { error: "Administrative protection: You cannot modify your own role or ban your own account." },
        { status: 400 }
      );
    }

    // 2. Fetch target user
    const targetUser = (
      await db.select().from(users).where(eq(users.id, targetUserId)).limit(1)
    )[0];

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // 3. Last Admin Protection with Confirmation Phrase Check
    if (targetUser.role === "admin" && (action === "ban" || (action === "set_role" && role !== "admin"))) {
      const isSoleAdmin = await isLastActiveAdmin(targetUserId);
      if (isSoleAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Cannot demote or ban the last remaining active administrator." },
          { status: 400 }
        );
      }

      if (confirmationCode !== "CONFIRM_ROLE_CHANGE") {
        return NextResponse.json(
          { error: "Modifying an administrator requires explicit confirmation. Please provide confirmationCode: 'CONFIRM_ROLE_CHANGE'." },
          { status: 400 }
        );
      }
    }

    const requestId = generateRequestId();
    let beforeState: any = { role: targetUser.role, isBanned: targetUser.isBanned, isMuted: targetUser.isMuted };
    let afterState: any = {};

    // 4. Atomic conditional update with subquery guard for Last Admin concurrency safety
    if (action === "ban") {
      const updateResult = await db.run(sql`
        UPDATE users
        SET is_banned = 1,
            ban_reason = ${reason || "Administrative suspension"}
        WHERE id = ${targetUserId}
          AND (
            role != 'admin' OR (
              SELECT count(*) FROM users WHERE role = 'admin' AND is_banned = 0 AND deleted_at IS NULL
            ) > 1
          );
      `);

      if (updateResult.rowsAffected === 0) {
        return NextResponse.json(
          { error: "Forbidden: Cannot ban the last remaining active administrator." },
          { status: 400 }
        );
      }

      await revokeAllUserSessions(targetUserId);
      afterState = { isBanned: true, banReason: reason };
    } else if (action === "unban") {
      await db.update(users).set({ isBanned: false, banReason: null }).where(eq(users.id, targetUserId));
      afterState = { isBanned: false, banReason: null };
    } else if (action === "mute") {
      await db.update(users).set({ isMuted: true }).where(eq(users.id, targetUserId));
      afterState = { isMuted: true };
    } else if (action === "unmute") {
      await db.update(users).set({ isMuted: false }).where(eq(users.id, targetUserId));
      afterState = { isMuted: false };
    } else if (action === "set_role" && role) {
      if (targetUser.role === "admin" && role !== "admin") {
        const updateResult = await db.run(sql`
          UPDATE users
          SET role = ${role}
          WHERE id = ${targetUserId}
            AND (
              SELECT count(*) FROM users WHERE role = 'admin' AND is_banned = 0 AND deleted_at IS NULL
            ) > 1;
        `);

        if (updateResult.rowsAffected === 0) {
          return NextResponse.json(
            { error: "Forbidden: Cannot demote the last remaining active administrator." },
            { status: 400 }
          );
        }
      } else {
        await db.update(users).set({ role }).where(eq(users.id, targetUserId));
      }
      afterState = { role };
    } else if (action === "revoke_sessions") {
      await revokeAllUserSessions(targetUserId);
      afterState = { sessionsRevoked: true };
    }

    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: operatorUser.id,
      action: `USER_${action.toUpperCase()}`,
      targetType: "user",
      targetId: targetUserId,
      details: JSON.stringify({
        reason,
        role,
        before: beforeState,
        after: afterState,
        requestId,
      }),
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: `User ${action} applied successfully.`,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Admin user operation failed.", route: "/api/admin/users" });
  }
}