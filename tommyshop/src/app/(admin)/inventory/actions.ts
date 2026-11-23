'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { recordPurchase, recordWaste, applyStockCount } from '@/lib/services/inventory';
import {
  CreatePurchaseSchema,
  WasteSchema,
  CreateStockCountSchema,
  ApplyStockCountSchema,
} from '@/lib/validators/inventory';
import Decimal from 'decimal.js';
import { z } from 'zod';

// ─── Supplier ──────────────────────────────────────────────────────────────────

export async function createSupplierAction(formData: FormData) {
  await requireRole('ADMIN');
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name is required' };
  await prisma.supplier.create({
    data: {
      name,
      phone: (formData.get('phone') as string) || null,
      note: (formData.get('note') as string) || null,
    },
  });
  revalidatePath('/admin/inventory/suppliers');
}

export async function deactivateSupplierAction(supplierId: string) {
  await requireRole('ADMIN');
  await prisma.supplier.update({ where: { id: supplierId }, data: { isActive: false } });
  revalidatePath('/admin/inventory/suppliers');
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function recordPurchaseAction(rawInput: unknown) {
  const admin = await requireRole('ADMIN');
  const parsed = CreatePurchaseSchema.safeParse(rawInput);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await prisma.$transaction(tx => recordPurchase(tx, admin.id, parsed.data));
    revalidatePath('/admin/inventory');
    revalidatePath('/admin/inventory/purchases');
    return { ok: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ─── Waste ────────────────────────────────────────────────────────────────────

export async function recordWasteAction(rawInput: unknown) {
  const admin = await requireRole('ADMIN');
  const parsed = WasteSchema.safeParse(rawInput);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await prisma.$transaction(tx => recordWaste(tx, admin.id, parsed.data));
    revalidatePath('/admin/inventory');
    return { ok: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ─── Stock count ──────────────────────────────────────────────────────────────

export async function createStockCountAction(rawInput: unknown) {
  const admin = await requireRole('ADMIN');
  const parsed = CreateStockCountSchema.safeParse(rawInput);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const countDate = new Date(parsed.data.countDate);

  // Fetch system qty for each item
  const itemIds = parsed.data.items.map(i => i.itemId);
  const dbItems = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, stockQty: true },
  });
  const qtyMap = new Map(dbItems.map(i => [i.id, new Decimal(i.stockQty.toString())]));

  const stockCount = await prisma.stockCount.create({
    data: {
      countDate,
      note: parsed.data.note ?? null,
      createdById: admin.id,
      items: {
        create: parsed.data.items.map(i => {
          const systemQty = qtyMap.get(i.itemId) ?? new Decimal(0);
          const countedQty = new Decimal(i.countedQty);
          return {
            itemId: i.itemId,
            systemQty,
            countedQty,
            difference: countedQty.sub(systemQty),
          };
        }),
      },
    },
  });

  revalidatePath('/admin/inventory/stock-counts');
  return { ok: true as const, stockCountId: stockCount.id };
}

export async function applyStockCountAction(stockCountId: string) {
  const admin = await requireRole('ADMIN');
  const id = z.string().uuid().parse(stockCountId);
  try {
    await prisma.$transaction(tx => applyStockCount(tx, admin.id, id));
    revalidatePath('/admin/inventory');
    revalidatePath('/admin/inventory/stock-counts');
    return { ok: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed' };
  }
}
