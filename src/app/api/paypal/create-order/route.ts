import { db } from "@/db";
import { ordersPaypal } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { createPayPalOrder } from "@/lib/paypal";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createOrderSchema = z.object({
  tierCredits: z.enum(["100", "500", "1200", "3000"]),
});

const TIER_PRICES_USD_CENTS: Record<string, number> = {
  "100": 500,    // $5.00
  "500": 2000,   // $20.00
  "1200": 4500,  // $45.00
  "3000": 10000, // $100.00
};

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tierCredits } = createOrderSchema.parse(body);

    const credits = parseInt(tierCredits, 10);
    const amountCents = TIER_PRICES_USD_CENTS[tierCredits];
    if (!amountCents) {
      return NextResponse.json({ error: "Invalid credit tier" }, { status: 400 });
    }

    const internalOrderId = `ord_${nanoid(16)}`;

    // Call PayPal REST API
    const ppOrder = await createPayPalOrder(amountCents, internalOrderId);

    // Save record in orders_paypal table
    await db.insert(ordersPaypal).values({
      id: internalOrderId,
      userId: session.user.id,
      paypalOrderId: ppOrder.id,
      amountUsd: amountCents,
      creditsGranted: credits,
      status: "created",
      rawPaypalResponse: JSON.stringify(ppOrder),
    });

    return NextResponse.json({
      orderId: ppOrder.id,
      approveUrl: ppOrder.links?.find((l: any) => l.rel === "approve")?.href,
    });
  } catch (err: any) {
    console.error("PayPal Create Order Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}