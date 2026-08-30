import { requireFeatureFlag } from "@/lib/flags";
import { db } from "@/db";
import { walletLedger, walletAccounts, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { executeLedgerTransaction, getUserWallet } from "@/lib/ledger";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ledgerAdjustSchema = z.object({
  targetUserId: z.string().min(1),
  amount: z.number().int().refine((val) => Number.isSafeInteger(val) && val !== 0 && Math.abs(val) <= 1000000, {
    message: "Adjustment amount must be a non-zero whole integer with an absolute maximum of 1,000,000 credits.",
  }),
  reason: z.string().min(5).max(500),
  confirmationCode: z.string().min(1),
});

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

export async function POST(req: NextRequest) {
  try {
    await requireFeatureFlag("ADMIN_LEDGER_ADJUST_ENABLED");
    const adminUser = await requireAdmin(req);

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    // Fail-closed rate limiting on administrative financial operations
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`admin_ledger:${adminUser.id}:${clientIp}`, {
      maxRequests: 10,
      windowSeconds: 60,
      failClosed: true,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many ledger adjustment attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const rawIdempotencyKey = req.headers.get("Idempotency-Key")?.trim();
    if (!rawIdempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is mandatory for admin ledger adjustments." },
        { status: 400 }
      );
    }

    if (!IDEMPOTENCY_KEY_REGEX.test(rawIdempotencyKey)) {
      return NextResponse.json(
        { error: "Invalid Idempotency-Key format. Must be 8-128 alphanumeric characters, underscores, or hyphens." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { targetUserId, amount, reason, confirmationCode } = ledgerAdjustSchema.parse(body);

    if (confirmationCode !== "CONFIRM_VALAX_ADJUST") {
      return NextResponse.json(
        { error: "Invalid confirmation phrase. Type CONFIRM_VALAX_ADJUST to proceed." },
        { status: 400 }
      );
    }

    // Compute cryptographic request fingerprint binding operator, target, amount, and reason
    const normalizedReason = reason.trim().toLowerCase();
    const requestFingerprint = createHash("sha256")
      .update(`${adminUser.id}:${targetUserId}:${amount}:${normalizedReason}`)
      .digest("hex");

    const namespacedLedgerKey = `admin_adjust_${adminUser.id}_${rawIdempotencyKey}`;

    // 1. Idempotency Check with Complete 4-Field Fingerprint Validation
    const existingEntry = (
      await db
        .select()
        .from(walletLedger)
        .where(eq(walletLedger.idempotencyKey, namespacedLedgerKey))
        .limit(1)
    )[0];

    if (existingEntry) {
      const isOperatorMatch = existingEntry.operatorId === adminUser.id;
      const isTargetMatch = existingEntry.userId === targetUserId;
      const isAmountMatch = existingEntry.amount === amount;
      const isFingerprintMatch = existingEntry.notes?.includes(`[FP:${requestFingerprint}]`);

      if (!isOperatorMatch || !isTargetMatch || !isAmountMatch || !isFingerprintMatch) {
        return NextResponse.json(
          { error: "Idempotency conflict: This Idempotency-Key was previously used with different parameters (operator, target, amount, or reason)." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        isIdempotentReplay: true,
        transactionId: existingEntry.id,
        newBalance: existingEntry.balanceAfter,
        message: "Previous adjustment confirmed. No additional credits modified.",
      });
    }

    // 2. Target Wallet Validation & Negative Balance Prevention
    const targetWallet = await getUserWallet(targetUserId);
    if (!targetWallet) {
      return NextResponse.json({ error: "Target user wallet account does not exist." }, { status: 404 });
    }

    const projectedBalance = targetWallet.balance + amount;
    if (projectedBalance < 0) {
      return NextResponse.json(
        { error: `Adjustment would result in a negative wallet balance (Current: ${targetWallet.balance}, Requested: ${amount}).` },
        { status: 400 }
      );
    }

    const requestId = generateRequestId();

    const result = await executeLedgerTransaction({
      userId: targetUserId,
      amount,
      type: "admin_adjustment",
      source: `Admin Manual Adjustment by ${adminUser.username}`,
      operatorId: adminUser.id,
      idempotencyKey: namespacedLedgerKey,
      notes: `[FP:${requestFingerprint}] ${reason}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Adjustment failed." }, { status: 400 });
    }

    await db.insert(auditLogs).values({
      id: `aud_${nanoid(16)}`,
      operatorId: adminUser.id,
      action: "ADMIN_LEDGER_ADJUST",
      targetType: "user_wallet",
      targetId: targetUserId,
      details: JSON.stringify({
        idempotencyKey: rawIdempotencyKey,
        fingerprint: requestFingerprint,
        amount,
        reason,
        balanceBefore: targetWallet.balance,
        balanceAfter: result.newBalance,
        requestId,
      }),
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      requestId,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Ledger manual adjustment failed.", route: "/api/admin/ledger" });
  }
}