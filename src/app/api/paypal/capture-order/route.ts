import { db } from "@/db";
import { ordersPaypal } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { capturePayPalOrder } from "@/lib/paypal";
import { executeLedgerTransaction } from "@/lib/ledger";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const captureSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId } = captureSchema.parse(body);

    const order = (
      await db.select().from(ordersPaypal).where(eq(ordersPaypal.paypalOrderId, orderId)).limit(1)
    )[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "completed" || order.status === "captured") {
      return NextResponse.json({ success: true, message: "Order already fulfilled" });
    }

    // Call PayPal capture API
    const captureResult = await capturePayPalOrder(orderId);

    if (captureResult.status === "COMPLETED") {
      // 1. Update order status
      await db
        .update(ordersPaypal)
        .set({
          status: "completed",
          rawPaypalResponse: JSON.stringify(captureResult),
          updatedAt: new Date(),
        })
        .where(eq(ordersPaypal.id, order.id));

      // 2. Idempotently credit user ledger
      const idempotencyKey = `paypal_credit_${order.id}_${order.paypalOrderId}`;
      await executeLedgerTransaction({
        userId: order.userId,
        amount: order.creditsGranted,
        type: "paypal_credit_purchase",
        source: "PayPal Deposit",
        referenceId: order.paypalOrderId,
        idempotencyKey,
        notes: `Purchased ${order.creditsGranted} Utility Credits via PayPal Order #${order.paypalOrderId}`,
      });

      return NextResponse.json({ success: true, creditsGranted: order.creditsGranted });
    } else {
      await db
        .update(ordersPaypal)
        .set({ status: "failed", rawPaypalResponse: JSON.stringify(captureResult) })
        .where(eq(ordersPaypal.id, order.id));

      return NextResponse.json({ error: "PayPal capture incomplete" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("PayPal Capture Error:", err);
    return NextResponse.json({ error: err.message || "Failed to capture payment" }, { status: 500 });
  }
}