'use server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { createSale } from '@/lib/services/sale';
import { CreateSaleSchema } from '@/lib/validators/sale';

export async function createSaleAction(rawInput: unknown) {
  const profile = await requireRole('SALES');
  const parsed = CreateSaleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  try {
    const sale = await prisma.$transaction(tx =>
      createSale(tx, profile.id, profile.role, parsed.data)
    );
    // Don't revalidate here — client does router.push which fetches fresh data
    return { ok: true as const, saleId: sale.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create sale';
    return { ok: false as const, error: msg };
  }
}
