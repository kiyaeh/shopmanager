'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { writeLog } from '@/lib/services/audit';
import { z } from 'zod';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const UpdatePriceSchema = z.object({
  itemId: z.string().uuid(),
  newPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a positive number with up to 2 decimal places'),
});

const UpdateDetailsSchema = z.object({
  itemId: z.string().uuid(),
  nameAm: z.string().optional(),
  category: z.string().optional(),
  lowStockLevel: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
});

const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameAm: z.string().optional(),
  unit: z.enum(['KG', 'PIECE']),
  category: z.string().optional(),
  sellPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price'),
  lowStockLevel: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
});

// ─── updatePrice ──────────────────────────────────────────────────────────────

export async function updatePrice(formData: FormData) {
  const admin = await requireRole('ADMIN');

  const parsed = UpdatePriceSchema.safeParse({
    itemId: formData.get('itemId'),
    newPrice: formData.get('newPrice'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { itemId, newPrice } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { id: itemId } });
    const before = { sellPrice: item.sellPrice.toString() };

    await tx.priceHistory.create({
      data: {
        itemId,
        sellPrice: item.sellPrice,
        setById: admin.id,
      },
    });

    await tx.item.update({
      where: { id: itemId },
      data: { sellPrice: newPrice },
    });

    const after = { sellPrice: newPrice };
    await writeLog(tx, admin.id, 'PRICE_CHANGE', 'Item', itemId, before, after);
  });

  revalidatePath('/items');
  revalidatePath(`/admin/items/${itemId}`);
}

// ─── toggleItemActive ─────────────────────────────────────────────────────────

export async function toggleItemActive(formData: FormData) {
  const admin = await requireRole('ADMIN');
  const itemId = z.string().uuid().parse(formData.get('itemId'));

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { id: itemId } });
    const before = { isActive: item.isActive };
    const newActive = !item.isActive;

    await tx.item.update({ where: { id: itemId }, data: { isActive: newActive } });

    const after = { isActive: newActive };
    await writeLog(tx, admin.id, 'ITEM_TOGGLE', 'Item', itemId, before, after);
  });

  revalidatePath('/items');
  revalidatePath(`/admin/items/${itemId}`);
}

// ─── updateItemDetails ────────────────────────────────────────────────────────

export async function updateItemDetails(formData: FormData) {
  const admin = await requireRole('ADMIN');

  const parsed = UpdateDetailsSchema.safeParse({
    itemId: formData.get('itemId'),
    nameAm: formData.get('nameAm') || undefined,
    category: formData.get('category') || undefined,
    lowStockLevel: formData.get('lowStockLevel') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { itemId, nameAm, category, lowStockLevel } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { id: itemId } });
    const before = { nameAm: item.nameAm, category: item.category, lowStockLevel: item.lowStockLevel?.toString() };

    await tx.item.update({
      where: { id: itemId },
      data: {
        ...(nameAm !== undefined && { nameAm }),
        ...(category !== undefined && { category }),
        ...(lowStockLevel !== undefined && { lowStockLevel }),
      },
    });

    const after = { nameAm, category, lowStockLevel };
    await writeLog(tx, admin.id, 'ITEM_UPDATE', 'Item', itemId, before, after);
  });

  revalidatePath('/items');
  revalidatePath(`/admin/items/${itemId}`);
}

// ─── createItem ───────────────────────────────────────────────────────────────

export async function createItem(formData: FormData) {
  const admin = await requireRole('ADMIN');

  const parsed = CreateItemSchema.safeParse({
    name: formData.get('name'),
    nameAm: formData.get('nameAm') || undefined,
    unit: formData.get('unit'),
    category: formData.get('category') || undefined,
    sellPrice: formData.get('sellPrice'),
    lowStockLevel: formData.get('lowStockLevel') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, nameAm, unit, category, sellPrice, lowStockLevel } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.item.create({
      data: {
        name,
        nameAm,
        unit,
        category,
        sellPrice,
        ...(lowStockLevel !== undefined && { lowStockLevel }),
      },
    });

    await tx.priceHistory.create({
      data: {
        itemId: created.id,
        sellPrice,
        setById: admin.id,
      },
    });

    await writeLog(tx, admin.id, 'ITEM_CREATE', 'Item', created.id, null, { name, sellPrice });
    return created;
  });

  revalidatePath('/items');
  return { itemId: item.id };
}

// ─── createItemAndRedirect ────────────────────────────────────────────────────
// Used as a form action — creates the item and redirects to its detail page.

import { redirect } from 'next/navigation';

export async function createItemAndRedirect(formData: FormData) {
  const result = await createItem(formData);
  if (result?.itemId) {
    redirect(`/items/${result.itemId}`);
  }
}
