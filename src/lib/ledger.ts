import { db } from "@/db";
import { walletAccounts, walletLedger } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export type LedgerTransactionType =
  | "reward"
  | "purchase_product"
  | "sale_revenue"
  | "admin_adjustment"
  | "paypal_credit_purchase"
  | "fee_deduction"
  | "refund";

export interface LedgerEntryParams {
  userId: string;
  amount: number; // positive for credit, negative for debit
  type: LedgerTransactionType;
  source: string;
  referenceId?: string;
  idempotencyKey: string;
  operatorId?: string;
  notes?: string;
}

export async function executeLedgerTransaction(params: LedgerEntryParams): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const { userId, amount, type, source, referenceId, idempotencyKey, operatorId, notes } = params;

  // 1. Check idempotency
  const existingLedger = await db
    .select()
    .from(walletLedger)
    .where(eq(walletLedger.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingLedger.length > 0) {
    return {
      success: true,
      newBalance: existingLedger[0].balanceAfter,
    };
  }

  // 2. Fetch or initialize wallet account
  let account = (
    await db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.userId, userId))
      .limit(1)
  )[0];

  if (!account) {
    const newAccountId = `acc_${nanoid(16)}`;
    await db.insert(walletAccounts).values({
      id: newAccountId,
      userId,
      balance: 0,
      frozenBalance: 0,
      version: 1,
    });
    account = {
      id: newAccountId,
      userId,
      balance: 0,
      frozenBalance: 0,
      version: 1,
      updatedAt: new Date(),
    };
  }

  const balanceBefore = account.balance;
  const balanceAfter = balanceBefore + amount;

  if (balanceAfter < 0) {
    return {
      success: false,
      newBalance: balanceBefore,
      error: "Insufficient Valax Utility Credits balance.",
    };
  }

  // 3. Atomically update wallet account with optimistic locking
  const updateResult = await db
    .update(walletAccounts)
    .set({
      balance: balanceAfter,
      version: account.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(walletAccounts.id, account.id));

  // 4. Record ledger journal entry
  const ledgerId = `tx_${nanoid(20)}`;
  await db.insert(walletLedger).values({
    id: ledgerId,
    accountId: account.id,
    userId,
    amount,
    balanceBefore,
    balanceAfter,
    type,
    source,
    referenceId,
    idempotencyKey,
    operatorId,
    notes,
  });

  return {
    success: true,
    newBalance: balanceAfter,
  };
}

export async function getUserWallet(userId: string) {
  let account = (
    await db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.userId, userId))
      .limit(1)
  )[0];

  if (!account) {
    const newAccountId = `acc_${nanoid(16)}`;
    await db.insert(walletAccounts).values({
      id: newAccountId,
      userId,
      balance: 0,
      frozenBalance: 0,
      version: 1,
    });
    return { id: newAccountId, userId, balance: 0, frozenBalance: 0, version: 1 };
  }

  return account;
}