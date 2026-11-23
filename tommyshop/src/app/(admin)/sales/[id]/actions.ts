'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { voidSale } from '@/lib/services/sale';
import { VoidSaleSchema } from '@/lib/validators/sale';

export async function voidSaleAction(saleId: string, reason: string) {
  const admin = await requireRole('ADMIN');
  const parsed = VoidSaleSchema.safeParse({ saleId, reason });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  try {
    await prisma.$transaction(tx => voidSale(tx, admin.id, parsed.data));
    revalidatePath('/admin/sales');
    revalidatePath(`/admin/sales/${saleId}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed' };
  }
}
