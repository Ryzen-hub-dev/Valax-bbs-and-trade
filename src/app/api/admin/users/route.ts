import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { revokeAllUserSessions } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const userActionSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["ban", "unban", "mute", "unmute", "set_role", "revoke_sessions"]),
  role: z.enum(["user", "moderator", "admin"]).optional(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();
    const { targetUserId, action, role, reason } = userActionSchema.parse(body);

    if (action === "ban") {
      await db.update(users).set({ isBanned: true, banReason: reason || "Admin ban" }).where(eq(users.id, targetUserId));
      await revokeAllUserSessions(targetUserId);
    } else if (action === "unban") {
      await db.update(users).set({ isBanned: false, banReason: null }).where(eq(users.id, targetUserId));
    } else if (action === "mute") {
      await db.update(users).set({ isMuted: true }).where(eq(users.id, targetUserId));
    } else if (action === "unmute") {
      await db.update(users).set({ isMuted: false }).where(eq(users.id, targetUserId));
    } else if (action === "set_role" && role) {
      await db.update(users).set({ role }).where(eq(users.id, targetUserId));
    } else if (action === "revoke_sessions") {
      await revokeAllUserSessions(targetUserId);
    }

    // Write audit log
    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: adminUser.id,
      action: `USER_${action.toUpperCase()}`,
      targetType: "user",
      targetId: targetUserId,
      details: JSON.stringify({ reason, role }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Admin action failed" }, { status: 403 });
  }
}