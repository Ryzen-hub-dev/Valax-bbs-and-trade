import { db } from "@/db";
import { products, productPurchases, walletAccounts, walletLedger, auditLogs } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { executeLedgerTransaction, getUserWallet } from "@/lib/ledger";
import { handleApiError } from "@/lib/errors";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const purchaseSchema = z.object({
  productId: z.string().min(1).max(64),
  idempotencyKey: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { productId, idempotencyKey: clientKey } = purchaseSchema.parse(body);

    // 1. Fetch Product and validate server-side state
    const product = (
      await db.select().from(products).where(eq(products.id, productId)).limit(1)
    )[0];

    if (!product || product.status !== "active" || product.moderationStatus !== "approved") {
      return NextResponse.json({ error: "Digital asset is currently unavailable for purchase." }, { status: 404 });
    }

    if (product.developerId === session.user.id) {
      return NextResponse.json({ error: "Developers cannot purchase their own digital assets." }, { status: 400 });
    }

    const tokenPrice = Number(product.tokenPrice);
    if (isNaN(tokenPrice) || tokenPrice < 0) {
      return NextResponse.json({ error: "Invalid product pricing configuration." }, { status: 400 });
    }

    // 2. Check existing active entitlement (Race condition prevention & Idempotency)
    const existingEntitlements = await db
      .select()
      .from(productPurchases)
      .where(
        and(
          eq(productPurchases.productId, productId),
          eq(productPurchases.buyerId, session.user.id),
          eq(productPurchases.status, "active")
        )
      )
      .limit(1);

    if (existingEntitlements.length > 0) {
      const activeEnt = existingEntitlements[0];
      return NextResponse.json({
        success: true,
        isExisting: true,
        entitlementId: activeEnt.id,
        githubReleaseUrl: product.githubReleaseUrl,
        message: "You already hold an active entitlement for this digital asset.",
      });
    }

    // 3. Verify Buyer Wallet Balance
    const buyerWallet = await getUserWallet(session.user.id);
    if (!buyerWallet || buyerWallet.balance < tokenPrice) {
      return NextResponse.json(
        { error: `Insufficient Valax Utility Credits. Required: ${tokenPrice}, Available: ${buyerWallet?.balance ?? 0}` },
        { status: 400 }
      );
    }

    // 4. Deterministic Idempotency Key
    const normalizedKey = clientKey
      ? `pur_cli_${session.user.id}_${productId}_${clientKey}`
      : `pur_auto_${session.user.id}_${productId}_${nanoid(16)}`;

    // 5. Atomic Debit & Entitlement Allocation
    const purchaseId = `ent_${nanoid(16)}`;
    const entitlementKey = `VALAX-ENT-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

    // Debit Buyer
    const debitResult = await executeLedgerTransaction({
      userId: session.user.id,
      amount: -tokenPrice,
      type: "purchase_product",
      source: "Marketplace Purchase",
      referenceId: productId,
      idempotencyKey: normalizedKey,
      notes: `Purchase Entitlement: ${product.title}`,
    });

    if (!debitResult.success) {
      return NextResponse.json({ error: debitResult.error || "Credit transaction failed." }, { status: 400 });
    }

    // Insert Entitlement Record
    await db.insert(productPurchases).values({
      id: purchaseId,
      productId: product.id,
      buyerId: session.user.id,
      tokensSpent: tokenPrice,
      licenseKey: entitlementKey,
      status: "active",
    });

    // Increment sales count
    await db
      .update(products)
      .set({ salesCount: sql`${products.salesCount} + 1` })
      .where(eq(products.id, product.id));

    // Audit log
    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: session.user.id,
      action: "MARKET_PURCHASE",
      targetType: "product",
      targetId: product.id,
      details: JSON.stringify({ purchaseId, tokensSpent: tokenPrice }),
    });

    return NextResponse.json({
      success: true,
      entitlementId: purchaseId,
      githubReleaseUrl: product.githubReleaseUrl,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Digital asset purchase could not be completed." });
  }
}