import { db } from "@/db";
import { ordersMarket, walletLedger, productPurchases, products, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { executeLedgerTransaction } from "@/lib/ledger";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq, or, and, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveActionSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(["retry_entitlement", "compensate_refund", "mark_resolved"]),
  resolutionNotes: z.string().min(5).max(500),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const now = new Date();

    const stuckOrders = await db
      .select()
      .from(ordersMarket)
      .where(
        or(
          eq(ordersMarket.status, "manual_review"),
          eq(ordersMarket.recoveryRequired, true),
          and(eq(ordersMarket.status, "processing"), lt(ordersMarket.leaseExpiresAt, now))
        )
      )
      .limit(50);

    return NextResponse.json({ orders: stuckOrders });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to list recovery orders.", route: "/api/admin/orders/recovery" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const body = await req.json();
    const { orderId, action, resolutionNotes } = resolveActionSchema.parse(body);

    const order = (
      await db.select().from(ordersMarket).where(eq(ordersMarket.id, orderId)).limit(1)
    )[0];

    if (!order) {
      return NextResponse.json({ error: "Target order not found." }, { status: 404 });
    }

    if (action === "compensate_refund") {
      const refundRes = await executeLedgerTransaction({
        userId: order.buyerId,
        amount: order.amount,
        type: "admin_adjustment",
        source: `Admin Manual Recovery Refund by ${adminUser.username}`,
        operatorId: adminUser.id,
        idempotencyKey: `admin_recovery_refund_${order.id}`,
        notes: resolutionNotes,
      });

      await db
        .update(ordersMarket)
        .set({
          status: "failed",
          recoveryRequired: false,
          failureReason: `Admin resolved with full refund: ${resolutionNotes}`,
          updatedAt: new Date(),
        })
        .where(eq(ordersMarket.id, order.id));

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: adminUser.id,
        action: "ORDER_RECOVERY_REFUND",
        targetType: "orders_market",
        targetId: order.id,
        details: JSON.stringify({ orderId: order.id, refundRes, resolutionNotes }),
      });

      return NextResponse.json({ success: true, message: "Order refunded and marked as resolved." });
    } else if (action === "retry_entitlement") {
      const purchaseId = `ent_${nanoid(16)}`;
      const entitlementKey = `VALAX-ENT-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

      await db.insert(productPurchases).values({
        id: purchaseId,
        productId: order.productId,
        buyerId: order.buyerId,
        tokensSpent: order.amount,
        licenseKey: entitlementKey,
        idempotencyKey: order.idempotencyKey,
        status: "active",
      });

      await db
        .update(ordersMarket)
        .set({
          status: "fulfilled",
          entitlementId: purchaseId,
          recoveryRequired: false,
          failureReason: null,
          updatedAt: new Date(),
        })
        .where(eq(ordersMarket.id, order.id));

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: adminUser.id,
        action: "ORDER_RECOVERY_ENTITLEMENT",
        targetType: "orders_market",
        targetId: order.id,
        details: JSON.stringify({ orderId: order.id, purchaseId, resolutionNotes }),
      });

      return NextResponse.json({ success: true, message: "Entitlement granted and order marked completed." });
    } else if (action === "mark_resolved") {
      await db
        .update(ordersMarket)
        .set({
          recoveryRequired: false,
          updatedAt: new Date(),
        })
        .where(eq(ordersMarket.id, order.id));

      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: adminUser.id,
        action: "ORDER_RECOVERY_DISMISSED",
        targetType: "orders_market",
        targetId: order.id,
        details: JSON.stringify({ orderId: order.id, resolutionNotes }),
      });

      return NextResponse.json({ success: true, message: "Order marked as resolved." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Order recovery operation failed.", route: "/api/admin/orders/recovery" });
  }
}