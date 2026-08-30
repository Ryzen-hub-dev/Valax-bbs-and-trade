import { db } from "@/db";
import { products, productPurchases, users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { executeLedgerTransaction, getUserWallet } from "@/lib/ledger";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const purchaseSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { productId } = purchaseSchema.parse(body);

    const product = (
      await db.select().from(products).where(eq(products.id, productId)).limit(1)
    )[0];

    if (!product || product.status !== "active" || product.moderationStatus !== "approved") {
      return NextResponse.json({ error: "Product not available for purchase" }, { status: 404 });
    }

    if (product.developerId === session.user.id) {
      return NextResponse.json({ error: "You cannot purchase your own product" }, { status: 400 });
    }

    // Check if already purchased
    const existing = await db
      .select()
      .from(productPurchases)
      .where(eq(productPurchases.productId, productId))
      .limit(1);

    const alreadyBought = existing.some((p) => p.buyerId === session.user.id);
    if (alreadyBought) {
      return NextResponse.json({ error: "You already own a license for this asset" }, { status: 400 });
    }

    const price = product.tokenPrice;

    // 1. Debit buyer ledger
    const debitIdempotency = `purchase_debit_${session.user.id}_${productId}_${Date.now()}`;
    const debitResult = await executeLedgerTransaction({
      userId: session.user.id,
      amount: -price,
      type: "purchase_product",
      source: "Marketplace Purchase",
      referenceId: productId,
      idempotencyKey: debitIdempotency,
      notes: `Purchase: ${product.title}`,
    });

    if (!debitResult.success) {
      return NextResponse.json({ error: debitResult.error || "Insufficient Valax Utility Credits" }, { status: 400 });
    }

    // 2. Credit developer (95% creator share, 5% platform burn/fee)
    if (price > 0) {
      const creatorShare = Math.floor(price * 0.95);
      const creditIdempotency = `sale_credit_${product.developerId}_${productId}_${Date.now()}`;
      await executeLedgerTransaction({
        userId: product.developerId,
        amount: creatorShare,
        type: "sale_revenue",
        source: "Marketplace Revenue",
        referenceId: productId,
        idempotencyKey: creditIdempotency,
        notes: `Sale revenue for ${product.title}`,
      });
    }

    // 3. Generate License Key & Record
    const licenseKey = `VALAX-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
    const purchaseId = `pur_${nanoid(16)}`;

    await db.insert(productPurchases).values({
      id: purchaseId,
      productId: product.id,
      buyerId: session.user.id,
      tokensSpent: price,
      licenseKey,
      status: "active",
    });

    // Update product sales counter
    await db
      .update(products)
      .set({ salesCount: product.salesCount + 1 })
      .where(eq(products.id, product.id));

    return NextResponse.json({
      success: true,
      licenseKey,
      githubReleaseUrl: product.githubReleaseUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Purchase failed" }, { status: 400 });
  }
}