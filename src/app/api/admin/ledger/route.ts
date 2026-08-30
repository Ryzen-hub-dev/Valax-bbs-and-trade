import { requireAdmin } from "@/lib/rbac";
import { executeLedgerTransaction } from "@/lib/ledger";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ledgerAdjustSchema = z.object({
  targetUserId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().min(3),
  confirmationCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const body = await req.json();
    const { targetUserId, amount, reason, confirmationCode } = ledgerAdjustSchema.parse(body);

    if (confirmationCode !== "CONFIRM_VALAX_ADJUST") {
      return NextResponse.json({ error: "Invalid double-confirmation code. Type CONFIRM_VALAX_ADJUST to proceed." }, { status: 400 });
    }

    const idempotencyKey = `admin_adjust_${adminUser.id}_${targetUserId}_${Date.now()}`;
    const result = await executeLedgerTransaction({
      userId: targetUserId,
      amount,
      type: "admin_adjustment",
      source: `Admin Manual Adjustment by ${adminUser.username}`,
      operatorId: adminUser.id,
      idempotencyKey,
      notes: reason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Adjustment failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, newBalance: result.newBalance });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Ledger manual adjustment failed." });
  }
}