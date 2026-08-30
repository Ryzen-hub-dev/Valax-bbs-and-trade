import { db } from "@/db";
import { walletLedger, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { executeLedgerTransaction } from "@/lib/ledger";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ledgerAdjustSchema = z.object({
  targetUserId: z.string().min(1),
  amount: z.number().int().refine((val) => Number.isSafeInteger(val) && val !== 0, {
    message: "Adjustment amount must be a non-zero whole integer.",
  }),
  reason: z.string().min(5).max(500),
  confirmationCode: z.string().min(1),
});

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
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
        { error: "Invalid double-confirmation code. Type CONFIRM_VALAX_ADJUST to proceed." },
        { status: 400 }
      );
    }

    // 1. Idempotency Replay Check
    const existingEntry = (
      await db
        .select()
        .from(walletLedger)
        .where(eq(walletLedger.idempotencyKey, rawIdempotencyKey))
        .limit(1)
    )[0];

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        isIdempotentReplay: true,
        transactionId: existingEntry.id,
        newBalance: existingEntry.balanceAfter,
        message: "Previous adjustment confirmed. No additional credits modified.",
      });
    }

    const requestId = generateRequestId();

    const result = await executeLedgerTransaction({
      userId: targetUserId,
      amount,
      type: "admin_adjustment",
      source: `Admin Manual Adjustment by ${adminUser.username}`,
      operatorId: adminUser.id,
      idempotencyKey: rawIdempotencyKey,
      notes: reason,
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
        amount,
        reason,
        requestId,
      }),
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      requestId,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Ledger manual adjustment failed." });
  }
}