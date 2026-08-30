import { db } from "@/db";
import { ordersPaypal } from "@/db/schema";
import { executeLedgerTransaction } from "@/lib/ledger";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const eventType = rawBody.event_type;
    const resource = rawBody.resource;

    if (!resource || !eventType) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const paypalOrderId = resource.id || resource.supplementary_data?.related_ids?.order_id;
      if (paypalOrderId) {
        const order = (
          await db.select().from(ordersPaypal).where(eq(ordersPaypal.paypalOrderId, paypalOrderId)).limit(1)
        )[0];

        if (order && order.status !== "completed") {
          await db
            .update(ordersPaypal)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(ordersPaypal.id, order.id));

          const idempotencyKey = `paypal_webhook_${order.id}_${rawBody.id}`;
          await executeLedgerTransaction({
            userId: order.userId,
            amount: order.creditsGranted,
            type: "paypal_credit_purchase",
            source: "PayPal Webhook",
            referenceId: paypalOrderId,
            idempotencyKey,
            notes: `Webhook fulfillment for order ${paypalOrderId}`,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("PayPal Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}