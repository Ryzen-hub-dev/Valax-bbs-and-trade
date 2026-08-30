import { db } from "@/db";
import { sessions, auditLogs } from "@/db/schema";
import { getCurrentSession, clearSessionCookie } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { eq, and, ne, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
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
  publicSessionId: z.string().min(24).max(64).optional(),
  revokeOthers: z.boolean().optional(),
  revokeAllOthers: z.boolean().optional(),
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
        publicSessionId: sessions.publicSessionId,
        id: sessions.id,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, current.user.id), gt(sessions.expiresAt, now)));

    const formatted = userSessions.map((s) => ({
      publicSessionId: s.publicSessionId || `psess_${s.id.slice(0, 24)}`,
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
    const { publicSessionId, revokeOthers, revokeAllOthers, revokeAll } = deleteSessionSchema.parse(body);

    const requestId = generateRequestId();

    if (revokeAll) {
      await db.delete(sessions).where(eq(sessions.userId, current.user.id));
      await clearSessionCookie();

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: current.user.id,
        action: "REVOKE_ALL_SESSIONS",
        targetType: "user",
        targetId: current.user.id,
        details: JSON.stringify({ requestId }),
      });

      return NextResponse.json({ success: true, message: "All sessions have been revoked." });
    }

    if (revokeOthers || revokeAllOthers) {
      const delRes = await db
        .delete(sessions)
        .where(and(eq(sessions.userId, current.user.id), ne(sessions.id, current.session.id)));

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: current.user.id,
        action: "REVOKE_OTHER_SESSIONS",
        targetType: "user",
        targetId: current.user.id,
        details: JSON.stringify({ requestId }),
      });

      return NextResponse.json({ success: true, revokedCount: 1, message: "All other sessions have been revoked." });
    }

    if (publicSessionId) {
      // Strictly match exact publicSessionId belonging to this user
      const targetSession = (
        await db
          .select()
          .from(sessions)
          .where(and(eq(sessions.userId, current.user.id), eq(sessions.publicSessionId, publicSessionId)))
          .limit(1)
      )[0];

      if (!targetSession) {
        return NextResponse.json({ error: "Session not found or already revoked." }, { status: 404 });
      }

      await db.delete(sessions).where(eq(sessions.id, targetSession.id));

      if (targetSession.id === current.session.id) {
        await clearSessionCookie();
      }

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: current.user.id,
        action: "REVOKE_SINGLE_SESSION",
        targetType: "session",
        targetId: publicSessionId,
        details: JSON.stringify({ requestId }),
      });

      return NextResponse.json({ success: true, message: "Selected session revoked." });
    }

    return NextResponse.json({ error: "Invalid revocation request. Please specify publicSessionId, revokeOthers, or revokeAll." }, { status: 400 });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to revoke session.", route: "/api/auth/sessions" });
  }
}