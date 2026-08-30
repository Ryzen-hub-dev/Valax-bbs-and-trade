import { db } from "@/db";
import { products, productPurchases, walletAccounts, walletLedger, auditLogs } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet, executeLedgerTransaction } from "@/lib/ledger";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // 2. Strict CSRF & Origin Validation (Mandatory for state-mutating requests)
  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  // 3. Distributed IP + User Rate Limiting (Max 10 purchase requests per minute)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip";
  const rateKey = `purchase:${session.user.id}:${clientIp}`;
  const rate = await checkRateLimitAsync(rateKey, { maxRequests: 10, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many purchase attempts. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  // 4. Strict Mandatory Idempotency-Key Header Enforcement
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
    // 5. Payload Size Validation (< 10KB)
    const rawBodyText = await req.text();
    if (rawBodyText.length > 10240) {
      return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
    }

    const body = JSON.parse(rawBodyText || "{}");
    const { productId } = purchaseSchema.parse(body);

    // 6. Check Prior Purchase by (buyerId, idempotencyKey)
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
      // Conflict check: Same key cannot be reused for a different product
      if (priorEnt.productId !== productId) {
        return NextResponse.json(
          { error: "Idempotency conflict: This Idempotency-Key was already used for a different digital asset." },
          { status: 409 }
        );
      }

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

    // 7. Validate Product Server-Side State & Strict Integer Price
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

    // 8. Prevent Duplicate Active Entitlement (Partial Unique Index Protection)
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

    // 9. Verify Buyer Wallet Balance
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

    // Step B: Insert Entitlement Record
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
      // Automatic Compensation Rollback
      console.error("[Purchase Error] Entitlement insert failed. Executing compensation rollback...", insertErr);
      const rollbackResult = await executeLedgerTransaction({
        userId: session.user.id,
        amount: tokenPrice,
        type: "admin_adjustment",
        source: "Purchase Rollback / Compensation",
        referenceId: productId,
        idempotencyKey: `rollback_${rawIdempotencyKey}`,
        notes: `Rollback duplicate purchase for: ${product.title}`,
      });

      if (!rollbackResult.success) {
        // Log critical recovery record in audit logs
        await db.insert(auditLogs).values({
          id: `crit_${nanoid(16)}`,
          operatorId: session.user.id,
          action: "CRITICAL_RECOVERY_REQUIRED",
          targetType: "product_purchase",
          targetId: purchaseId,
          details: JSON.stringify({ error: insertErr?.message, buyerId: session.user.id, tokenPrice }),
        });
      }

      return NextResponse.json(
        { error: "Conflict: Concurrent purchase already in progress or active entitlement exists." },
        { status: 409 }
      );
    }

    // Step C: Increment Sales Counter
    try {
      await db
        .update(products)
        .set({ salesCount: sql`${products.salesCount} + 1` })
        .where(eq(products.id, product.id));
    } catch (salesErr) {
      console.warn("[Purchase Warning] Sales count increment failed non-fatally:", salesErr);
    }

    // Step D: Write Audit Log
    try {
      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: session.user.id,
        action: "MARKET_PURCHASE",
        targetType: "product",
        targetId: product.id,
        details: JSON.stringify({ purchaseId, tokensSpent: tokenPrice, idempotencyKey: rawIdempotencyKey }),
      });
    } catch (audErr) {
      console.warn("[Purchase Warning] Audit log write failed non-fatally:", audErr);
    }

    return NextResponse.json({
      success: true,
      entitlementId: purchaseId,
      githubReleaseUrl: product.githubReleaseUrl,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Digital asset purchase could not be completed." });
  }
}