import { db } from "@/db";
import { sessions, auditLogs } from "@/db/schema";
import { getCurrentSession, clearSessionCookie, hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq, and, ne, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskIp(ip?: string | null): string {
  if (!ip) return "Unknown";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  } else if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts[0]}:${parts[1] || ""}:****:****`;
  }
  return "***.***";
}

const deleteSessionSchema = z.object({
  sessionId: z.string().optional(),
  revokeOthers: z.boolean().optional(),
  revokeAll: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const current = await getCurrentSession(req);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const userSessions = await db
      .select({
        id: sessions.id,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, current.user.id), gt(sessions.expiresAt, now)));

    const formatted = userSessions.map((s) => ({
      id: s.id.slice(0, 16) + "...",
      userAgent: s.userAgent || "Unknown Device / Browser",
      maskedIp: maskIp(s.ipAddress),
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === current.session.id,
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to load active sessions.", route: "/api/auth/sessions" });
  }
}

export async function DELETE(req: NextRequest) {
  const current = await getCurrentSession(req);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, revokeOthers, revokeAll } = deleteSessionSchema.parse(body);

    if (revokeAll) {
      await db.delete(sessions).where(eq(sessions.userId, current.user.id));
      await clearSessionCookie();

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: current.user.id,
        action: "REVOKE_ALL_SESSIONS",
        targetType: "user",
        targetId: current.user.id,
      });

      return NextResponse.json({ success: true, message: "All sessions have been revoked." });
    }

    if (revokeOthers) {
      await db
        .delete(sessions)
        .where(and(eq(sessions.userId, current.user.id), ne(sessions.id, current.session.id)));

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: current.user.id,
        action: "REVOKE_OTHER_SESSIONS",
        targetType: "user",
        targetId: current.user.id,
      });

      return NextResponse.json({ success: true, message: "All other sessions have been revoked." });
    }

    if (sessionId) {
      // Find matching session by prefix or exact hash
      const userSessions = await db.select().from(sessions).where(eq(sessions.userId, current.user.id));
      const target = userSessions.find((s) => s.id.startsWith(sessionId.replace("...", "")) || s.id === sessionId);

      if (target) {
        await db.delete(sessions).where(eq(sessions.id, target.id));
        if (target.id === current.session.id) {
          await clearSessionCookie();
        }

        await db.insert(auditLogs).values({
          id: `aud_${nanoid(16)}`,
          operatorId: current.user.id,
          action: "REVOKE_SINGLE_SESSION",
          targetType: "session",
          targetId: target.id,
        });

        return NextResponse.json({ success: true, message: "Selected session revoked." });
      }
    }

    return NextResponse.json({ error: "Invalid revocation request." }, { status: 400 });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to revoke session.", route: "/api/auth/sessions" });
  }
}