import { db } from "@/db";
import { reports, forumThreads, products, auditLogs, users, productVersions } from "@/db/schema";
import { requirePermission, requireModerator } from "@/lib/rbac";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { verifyGitHubRelease } from "@/lib/github-validator";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modActionSchema = z.object({
  type: z.enum([
    "resolve_report",
    "delete_thread",
    "pin_thread",
    "approve_product",
    "reject_product",
    "pause_product",
    "reverify_product",
    "revoke_product",
    "archive_product",
  ]),
  targetId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireModerator(req);

    const pendingReports = await db
      .select()
      .from(reports)
      .where(eq(reports.status, "pending"))
      .orderBy(desc(reports.createdAt))
      .limit(50);

    const allProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        category: products.category,
        tokenPrice: products.tokenPrice,
        version: products.releaseVersion,
        releaseTag: products.releaseTag,
        repositoryUrl: products.repositoryUrl,
        releaseUrl: products.releaseUrl,
        releaseChecksum: products.releaseChecksum,
        verificationStatus: products.verificationStatus,
        lastVerifiedAt: products.lastVerifiedAt,
        status: products.status,
        moderationStatus: products.moderationStatus,
        salesCount: products.salesCount,
        developerId: products.developerId,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(50);

    return NextResponse.json({
      reports: pendingReports,
      pendingProducts: allProducts.filter((p) => p.moderationStatus === "pending"),
      allProducts,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to load moderation queue.", route: "/api/admin/moderation" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const body = await req.json();
    const { type, targetId, note } = modActionSchema.parse(body);

    let modUser: typeof users.$inferSelect;

    if (type === "resolve_report") {
      modUser = await requirePermission("forum.report.review", req);
    } else if (
      type === "approve_product" ||
      type === "reject_product" ||
      type === "pause_product" ||
      type === "reverify_product" ||
      type === "revoke_product" ||
      type === "archive_product"
    ) {
      modUser = await requirePermission("product.review", req);
    } else {
      modUser = await requirePermission("forum.thread.moderate", req);
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`mod_actions:${modUser.id}:${clientIp}`, {
      maxRequests: 30,
      windowSeconds: 60,
      failClosed: true,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many moderation requests. Please wait." }, { status: 429 });
    }

    const requestId = generateRequestId();

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
      await db.update(products).set({ moderationStatus: "approved", status: "active", updatedAt: new Date() }).where(eq(products.id, targetId));
    } else if (type === "reject_product") {
      await db.update(products).set({ moderationStatus: "rejected", status: "draft", moderationNote: note, updatedAt: new Date() }).where(eq(products.id, targetId));
    } else if (type === "pause_product") {
      await db.update(products).set({ status: "paused", moderationNote: note, updatedAt: new Date() }).where(eq(products.id, targetId));
    } else if (type === "revoke_product") {
      await db.update(products).set({ status: "revoked", moderationNote: note, updatedAt: new Date() }).where(eq(products.id, targetId));
    } else if (type === "archive_product") {
      await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, targetId));
    } else if (type === "reverify_product") {
      const prod = (await db.select().from(products).where(eq(products.id, targetId)).limit(1))[0];
      if (prod) {
        const check = await verifyGitHubRelease({
          repositoryUrl: prod.repositoryUrl || prod.githubRepositoryUrl || "",
          releaseUrl: prod.releaseUrl || prod.githubReleaseUrl,
          releaseTag: prod.releaseTag || `v${prod.version}`,
        });

        await db.update(products).set({
          verificationStatus: check.isValid ? "verified" : "failed",
          status: check.isValid ? prod.status : "paused",
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(products.id, targetId));
      }
    }

    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: modUser.id,
      action: `MOD_${type.toUpperCase()}`,
      targetType: type.includes("report") ? "report" : type.includes("product") ? "product" : "thread",
      targetId,
      details: JSON.stringify({ note, requestId }),
    });

    return NextResponse.json({ success: true, requestId, message: `Moderation action '${type}' executed.` });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Moderation action failed.", route: "/api/admin/moderation" });
  }
}