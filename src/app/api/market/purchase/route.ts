import { db } from "@/db";
import { products, productPurchases, walletAccounts, walletLedger, auditLogs } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { executeLedgerTransaction, getUserWallet } from "@/lib/ledger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSafeOrigin } from "@/config/origins";
import { handleApiError } from "@/lib/errors";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const purchaseSchema = z.object({
  productId: z.string().min(1).max(64),
});

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

export async function POST(req: NextRequest) {
  // 1. Authenticate Session
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  // 2. CSRF & Origin Validation
  const originHeader = req.headers.get("origin") || req.headers.get("referer");
  if (originHeader) {
    const verifiedOrigin = getSafeOrigin(originHeader);
    if (!verifiedOrigin) {
      return NextResponse.json({ error: "Forbidden: Untrusted Origin or Referer." }, { status: 403 });
    }
  }

  // 3. IP + User Rate Limiting (10 requests per minute)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip";
  const rateKey = `purchase:${session.user.id}:${clientIp}`;
  const rate = checkRateLimit(rateKey, { maxRequests: 10, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many purchase attempts. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  // 4. Strict Header Idempotency-Key Enforcement
  const rawIdempotencyKey = req.headers.get("Idempotency-Key")?.trim();
  if (!rawIdempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header is required for purchase transactions." },
      { status: 400 }
    );
  }

  if (!IDEMPOTENCY_KEY_REGEX.test(rawIdempotencyKey)) {
    return NextResponse.json(
      { error: "Invalid Idempotency-Key format. Must be 8-128 alphanumeric characters, underscores, or hyphens." },
      { status: 400 }
    );
  }

  try {
    // 5. Request body parsing & size validation (< 10KB)
    const rawBodyText = await req.text();
    if (rawBodyText.length > 10240) {
      return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
    }

    const body = JSON.parse(rawBodyText || "{}");
    const { productId } = purchaseSchema.parse(body);

    // 6. Check prior purchase by Idempotency-Key (Idempotent response)
    const existingByIdempotency = await db
      .select()
      .from(productPurchases)
      .where(
        and(
          eq(productPurchases.buyerId, session.user.id),
          eq(productPurchases.idempotencyKey, rawIdempotencyKey)
        )
      )
      .limit(1);

    if (existingByIdempotency.length > 0) {
      const priorEnt = existingByIdempotency[0];
      const prod = (
        await db.select().from(products).where(eq(products.id, priorEnt.productId)).limit(1)
      )[0];

      return NextResponse.json({
        success: true,
        isIdempotentReplay: true,
        entitlementId: priorEnt.id,
        githubReleaseUrl: prod?.githubReleaseUrl || "",
        message: "Previous transaction confirmed. No additional credits deducted.",
      });
    }

    // 7. Validate Product from Database
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
    if (!Number.isSafeInteger(tokenPrice) || tokenPrice <= 0 || tokenPrice > 1000000) {
      return NextResponse.json({ error: "Invalid product pricing configuration in catalog." }, { status: 400 });
    }

    // 8. Prevent duplicate active entitlement (Concurrency & Race Condition check)
    const existingActiveEntitlement = await db
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

    if (existingActiveEntitlement.length > 0) {
      return NextResponse.json({
        success: true,
        isExisting: true,
        entitlementId: existingActiveEntitlement[0].id,
        githubReleaseUrl: product.githubReleaseUrl,
        message: "You already hold an active entitlement for this digital asset.",
      });
    }

    // 9. Check Buyer Wallet Balance
    const buyerWallet = await getUserWallet(session.user.id);
    if (!buyerWallet || buyerWallet.balance < tokenPrice) {
      return NextResponse.json(
        { error: `Insufficient Valax Utility Credits. Required: ${tokenPrice}, Available: ${buyerWallet?.balance ?? 0}` },
        { status: 400 }
      );
    }

    // 10. Atomic Purchase Execution
    const purchaseId = `ent_${nanoid(16)}`;
    const entitlementKey = `VALAX-ENT-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

    // Step A: Debit Buyer Ledger
    const debitResult = await executeLedgerTransaction({
      userId: session.user.id,
      amount: -tokenPrice,
      type: "purchase_product",
      source: "Marketplace Purchase",
      referenceId: productId,
      idempotencyKey: `ledger_${rawIdempotencyKey}`,
      notes: `Purchase Entitlement: ${product.title}`,
    });

    if (!debitResult.success) {
      return NextResponse.json({ error: debitResult.error || "Credit transaction failed." }, { status: 400 });
    }

    // Step B: Insert Entitlement with Idempotency Key
    try {
      await db.insert(productPurchases).values({
        id: purchaseId,
        productId: product.id,
        buyerId: session.user.id,
        tokensSpent: tokenPrice,
        licenseKey: entitlementKey,
        idempotencyKey: rawIdempotencyKey,
        status: "active",
      });
    } catch (insertErr: any) {
      // Compensate / Rollback credit deduction if duplicate active constraint triggered
      await executeLedgerTransaction({
        userId: session.user.id,
        amount: tokenPrice,
        type: "admin_adjustment",
        source: "Purchase Rollback / Compensation",
        referenceId: productId,
        idempotencyKey: `rollback_${rawIdempotencyKey}`,
        notes: `Rollback duplicate purchase for: ${product.title}`,
      });
      return NextResponse.json(
        { error: "Conflict: Concurrent purchase already in progress or completed." },
        { status: 409 }
      );
    }

    // Step C: Increment Sales Counter
    await db
      .update(products)
      .set({ salesCount: sql`${products.salesCount} + 1` })
      .where(eq(products.id, product.id));

    // Step D: Write Audit Log
    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: session.user.id,
      action: "MARKET_PURCHASE",
      targetType: "product",
      targetId: product.id,
      details: JSON.stringify({ purchaseId, tokensSpent: tokenPrice, idempotencyKey: rawIdempotencyKey }),
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