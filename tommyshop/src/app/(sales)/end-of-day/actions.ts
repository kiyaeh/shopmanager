'use server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { submitDayEnd } from '@/lib/services/closing';
import Decimal from 'decimal.js';

export async function submitDayEndAction(countedCashStr: string) {
  const profile = await requireRole('SALES');
  const countedCash = new Decimal(countedCashStr);
  if (countedCash.lt(0)) return { ok: false as const, error: 'Counted cash cannot be negative' };
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closing = await prisma.$transaction(tx =>
      submitDayEnd(tx, profile.id, today, countedCash)
    );
    return {
      ok: true as const,
      expectedCash: closing.expectedCash?.toString() ?? '0',
      countedCash: closing.countedCash?.toString() ?? countedCashStr,
      cashDifference: closing.cashDifference?.toString() ?? '0',
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}
