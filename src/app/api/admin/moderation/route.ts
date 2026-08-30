import { db } from "@/db";
import { reports, forumThreads, products, auditLogs } from "@/db/schema";
import { requireModerator } from "@/lib/rbac";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modActionSchema = z.object({
  type: z.enum(["resolve_report", "delete_thread", "pin_thread", "approve_product", "reject_product"]),
  targetId: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const modUser = await requireModerator();

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const body = await req.json();
    const { type, targetId, note } = modActionSchema.parse(body);

    if (type === "resolve_report") {
      await db
        .update(reports)
        .set({ status: "resolved", handledBy: modUser.id, resolutionNote: note || "Resolved by staff" })
        .where(eq(reports.id, targetId));
    } else if (type === "delete_thread") {
      await db.update(forumThreads).set({ status: "deleted" }).where(eq(forumThreads.id, targetId));
    } else if (type === "pin_thread") {
      const thread = (await db.select().from(forumThreads).where(eq(forumThreads.id, targetId)).limit(1))[0];
      if (thread) {
        await db.update(forumThreads).set({ isPinned: !thread.isPinned }).where(eq(forumThreads.id, targetId));
      }
    } else if (type === "approve_product") {
      await db.update(products).set({ moderationStatus: "approved", status: "active" }).where(eq(products.id, targetId));
    } else if (type === "reject_product") {
      await db.update(products).set({ moderationStatus: "rejected", moderationNote: note }).where(eq(products.id, targetId));
    }

    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: modUser.id,
      action: `MOD_${type.toUpperCase()}`,
      targetType: type.includes("report") ? "report" : type.includes("product") ? "product" : "thread",
      targetId,
      details: JSON.stringify({ note }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Moderation action failed." });
  }
}