'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { createPayment, allocateDebtPayment } from '@/lib/services/payment';
import { CreateDebtPaymentSchema } from '@/lib/validators/payment';

export async function recordDebtPaymentAction(rawInput: unknown) {
  const profile = await requireRole('SALES');
  const parsed = CreateDebtPaymentSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await createPayment(tx, {
        kind: 'DEBT',
        method: parsed.data.method,
        amount: parsed.data.amount,
        businessDate: new Date(parsed.data.businessDate),
        customerId: parsed.data.customerId,
        receivedById: profile.id,
        bankName: parsed.data.bankName,
        reference: parsed.data.reference,
        screenshotPath: parsed.data.screenshotPath,
        imageHash: parsed.data.imageHash,
      });

      if (parsed.data.method === 'CASH') {
        await allocateDebtPayment(
          tx,
          payment.id,
          parsed.data.customerId,
          parsed.data.salesOverride
        );
      }
    });

    revalidatePath('/sales/customers');
    revalidatePath(`/sales/customers/${parsed.data.customerId}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}
