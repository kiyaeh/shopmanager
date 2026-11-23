'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { verifyTransfer, rejectTransfer } from '@/lib/services/payment';
import { z } from 'zod';

export async function verifyTransferAction(paymentId: string) {
  await z.string().uuid().parseAsync(paymentId).catch(() => {
    throw new Error('Invalid paymentId');
  });
  const admin = await requireRole('ADMIN');
  try {
    await prisma.$transaction(tx => verifyTransfer(tx, admin.id, paymentId));
    revalidatePath('/admin/transfers');
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function rejectTransferAction(paymentId: string, reason: string) {
  await z.string().uuid().parseAsync(paymentId).catch(() => {
    throw new Error('Invalid paymentId');
  });
  const admin = await requireRole('ADMIN');
  if (!reason.trim()) return { ok: false as const, error: 'Reason is required' };
  try {
    await prisma.$transaction(tx => rejectTransfer(tx, admin.id, paymentId, reason));
    revalidatePath('/admin/transfers');
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function bulkVerifyAction(paymentIds: string[]) {
  const admin = await requireRole('ADMIN');
  try {
    await prisma.$transaction(async tx => {
      for (const id of paymentIds) {
        await verifyTransfer(tx, admin.id, id);
      }
    });
    revalidatePath('/admin/transfers');
    return { ok: true as const, count: paymentIds.length };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}
