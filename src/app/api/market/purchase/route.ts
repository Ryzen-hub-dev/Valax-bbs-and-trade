import { db } from "@/db";
import { products, productPurchases, ordersMarket, walletLedger, auditLogs } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet, executeLedgerTransaction } from "@/lib/ledger";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
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
const LEASE_DURATION_MS = 30000; // 30 seconds processing lease

export async function POST(req: NextRequest) {
  // 1. Authenticate Session
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  // 2. Strict CSRF & Origin Validation
  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  // 3. Distributed Rate Limiting (Fail-closed on financial mutations)
  const clientIp = getClientIp(req);
  const rateKey = `purchase:${session.user.id}:${clientIp}`;
  const rate = await checkRateLimitAsync(rateKey, { maxRequests: 10, windowSeconds: 60, failClosed: true });
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
      { error: "Idempotency-Key header is mandatory for purchase transactions." },
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

    const now = Date.now();

    // 6. Check Order State Machine by (buyerId, idempotencyKey)
    const existingOrder = (
      await db
        .select()
        .from(ordersMarket)
        .where(
          and(
            eq(ordersMarket.buyerId, session.user.id),
            eq(ordersMarket.idempotencyKey, rawIdempotencyKey)
          )
        )
        .limit(1)
    )[0];

    let orderId = `ord_${nanoid(16)}`;

    if (existingOrder) {
      // Conflict check: Same Idempotency-Key reused for a different product
      if (existingOrder.productId !== productId) {
        return NextResponse.json(
          { error: "Idempotency conflict: This Idempotency-Key was previously used for a different product." },
          { status: 409 }
        );
      }

      if (existingOrder.status === "completed" && existingOrder.entitlementId) {
        const prod = (
          await db.select().from(products).where(eq(products.id, existingOrder.productId)).limit(1)
        )[0];

        return NextResponse.json({
          success: true,
          isIdempotentReplay: true,
          entitlementId: existingOrder.entitlementId,
          githubReleaseUrl: prod?.githubReleaseUrl || "",
          message: "Previous transaction confirmed. No additional credits deducted.",
        });
      }

      if (existingOrder.status === "failed") {
        return NextResponse.json(
          { error: `Previous purchase attempt failed: ${existingOrder.failureReason || "Transaction rejected"}` },
          { status: 409 }
        );
      }

      if (existingOrder.status === "manual_review") {
        return NextResponse.json(
          { error: "Order is flagged for manual review by platform administration." },
          { status: 422 }
        );
      }

      if (existingOrder.status === "processing") {
        const isLeaseActive = existingOrder.leaseExpiresAt && existingOrder.leaseExpiresAt.getTime() > now;
        if (isLeaseActive) {
          return NextResponse.json(
            { error: "Order is actively being processed under lease. Please retry in a few seconds." },
            { status: 409 }
          );
        }

        // LEASE EXPIRED RECONCILIATION
        console.warn(`[Order Reconciliation] Lease expired for order ${existingOrder.id}. Reconciling ledger and entitlement...`);
        const ledgerKey = `ledger_${rawIdempotencyKey}`;
        const existingLedger = (
          await db.select().from(walletLedger).where(eq(walletLedger.idempotencyKey, ledgerKey)).limit(1)
        )[0];

        const existingEntitlement = (
          await db.select().from(productPurchases).where(
            and(
              eq(productPurchases.buyerId, session.user.id),
              eq(productPurchases.idempotencyKey, rawIdempotencyKey)
            )
          ).limit(1)
        )[0];

        if (existingLedger && existingEntitlement) {
          // Reconcile -> Completed
          await db.update(ordersMarket).set({
            status: "completed",
            entitlementId: existingEntitlement.id,
            ledgerReference: ledgerKey,
            updatedAt: new Date(),
          }).where(eq(ordersMarket.id, existingOrder.id));

          const prod = (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0];
          return NextResponse.json({
            success: true,
            isIdempotentReplay: true,
            entitlementId: existingEntitlement.id,
            githubReleaseUrl: prod?.githubReleaseUrl || "",
            message: "Transaction recovered and confirmed.",
          });
        } else if (existingLedger && !existingEntitlement) {
          // Debited but no entitlement -> Execute compensation refund
          const refundRes = await executeLedgerTransaction({
            userId: session.user.id,
            amount: existingOrder.amount,
            type: "admin_adjustment",
            source: "Crash Recovery Refund",
            referenceId: productId,
            idempotencyKey: `recovery_refund_${rawIdempotencyKey}`,
            notes: "Automatic refund for unfulfilled expired order",
          });

          if (refundRes.success) {
            await db.update(ordersMarket).set({
              status: "failed",
              failureReason: "Crash recovered: unfulfilled order was refunded.",
              updatedAt: new Date(),
            }).where(eq(ordersMarket.id, existingOrder.id));

            return NextResponse.json(
              { error: "Previous unfulfilled order has been automatically refunded. Please retry your purchase." },
              { status: 409 }
            );
          } else {
            await db.update(ordersMarket).set({
              status: "manual_review",
              recoveryRequired: true,
              failureReason: "CRITICAL: Expired order refund failed during crash reconciliation.",
              updatedAt: new Date(),
            }).where(eq(ordersMarket.id, existingOrder.id));

            return NextResponse.json(
              { error: "Order recovery exception. Flagged for manual review." },
              { status: 500 }
            );
          }
        } else {
          // Never debited -> Refresh lease and proceed
          orderId = existingOrder.id;
          await db.update(ordersMarket).set({
            leaseExpiresAt: new Date(now + LEASE_DURATION_MS),
            retryCount: sql`${ordersMarket.retryCount} + 1`,
            updatedAt: new Date(),
          }).where(eq(ordersMarket.id, existingOrder.id));
        }
      }
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

    // 10. Execute State Machine Transition -> 'processing' with Active Lease
    if (!existingOrder) {
      await db.insert(ordersMarket).values({
        id: orderId,
        buyerId: session.user.id,
        productId: product.id,
        idempotencyKey: rawIdempotencyKey,
        amount: tokenPrice,
        status: "processing",
        processingStartedAt: new Date(now),
        leaseExpiresAt: new Date(now + LEASE_DURATION_MS),
      });
    }

    // Step A: Debit Buyer Ledger
    const debitResult = await executeLedgerTransaction({
      userId: session.user.id,
      amount: -tokenPrice,
      type: "purchase_product",
      source: "Marketplace Purchase",
      referenceId: productId,
      idempotencyKey: `ledger_${rawIdempotencyKey}`,
      notes: `Purchase: ${product.title}`,
    });

    if (!debitResult.success) {
      await db
        .update(ordersMarket)
        .set({ status: "failed", failureReason: debitResult.error || "Credit transaction failed", updatedAt: new Date() })
        .where(eq(ordersMarket.id, orderId));

      return NextResponse.json({ error: debitResult.error || "Credit transaction failed." }, { status: 400 });
    }

    // Step B: Issue Entitlement
    const purchaseId = `ent_${nanoid(16)}`;
    const entitlementKey = `VALAX-ENT-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

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
      // Step B-Rollback: Execute Compensation Refund
      console.error("[Purchase Compensation] Entitlement insert failed. Executing refund...", insertErr);
      await db
        .update(ordersMarket)
        .set({ status: "compensating", failureReason: insertErr?.message || "Entitlement insert conflict", updatedAt: new Date() })
        .where(eq(ordersMarket.id, orderId));

      const refundResult = await executeLedgerTransaction({
        userId: session.user.id,
        amount: tokenPrice,
        type: "admin_adjustment",
        source: "Purchase Rollback / Compensation",
        referenceId: productId,
        idempotencyKey: `refund_${rawIdempotencyKey}`,
        notes: `Rollback purchase for: ${product.title}`,
      });

      if (refundResult.success) {
        await db
          .update(ordersMarket)
          .set({ status: "failed", failureReason: "Entitlement creation failed. Full credit refund completed.", updatedAt: new Date() })
          .where(eq(ordersMarket.id, orderId));

        return NextResponse.json(
          { error: "Conflict: Concurrent purchase in progress or active entitlement already exists. Credits refunded." },
          { status: 409 }
        );
      } else {
        // Critical: Refund also failed -> Escalate to manual review
        await db
          .update(ordersMarket)
          .set({ status: "manual_review", recoveryRequired: true, failureReason: "CRITICAL: Entitlement failed and compensation refund failed.", updatedAt: new Date() })
          .where(eq(ordersMarket.id, orderId));

        await db.insert(auditLogs).values({
          id: `crit_${nanoid(16)}`,
          operatorId: session.user.id,
          action: "CRITICAL_MANUAL_REVIEW_REQUIRED",
          targetType: "orders_market",
          targetId: orderId,
          details: JSON.stringify({ buyerId: session.user.id, tokenPrice }),
        });

        return NextResponse.json(
          { error: "A transaction exception occurred. The order has been submitted for manual admin resolution." },
          { status: 500 }
        );
      }
    }

    // Step C: Increment Sales Counter (Non-blocking)
    try {
      await db
        .update(products)
        .set({ salesCount: sql`${products.salesCount} + 1` })
        .where(eq(products.id, product.id));
    } catch (salesErr) {
      console.warn("[Purchase Warning] Sales count increment failed non-fatally");
    }

    // Step D: Write Audit Log
    try {
      await db.insert(auditLogs).values({
        id: `aud_${nanoid(16)}`,
        operatorId: session.user.id,
        action: "MARKET_PURCHASE",
        targetType: "product",
        targetId: product.id,
        details: JSON.stringify({ purchaseId, orderId, tokensSpent: tokenPrice, idempotencyKey: rawIdempotencyKey }),
      });
    } catch (audErr) {
      console.warn("[Purchase Warning] Audit log write failed non-fatally");
    }

    // Step E: Complete State Machine Order Transition -> 'completed'
    await db
      .update(ordersMarket)
      .set({
        status: "completed",
        entitlementId: purchaseId,
        ledgerReference: `ledger_${rawIdempotencyKey}`,
        updatedAt: new Date(),
      })
      .where(eq(ordersMarket.id, orderId));

    return NextResponse.json({
      success: true,
      entitlementId: purchaseId,
      githubReleaseUrl: product.githubReleaseUrl,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Digital asset purchase could not be completed.", route: "/api/market/purchase" });
  }
}