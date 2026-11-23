'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { writeLog } from '@/lib/services/audit';
import Decimal from 'decimal.js';
import { z } from 'zod';

const CustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxDebtDays: z.coerce.number().int().min(1).optional(),
  note: z.string().optional(),
});

export async function createCustomerAction(formData: FormData) {
  await requireRole('ADMIN');
  const parsed = CustomerSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
    creditLimit: formData.get('creditLimit') || undefined,
    maxDebtDays: formData.get('maxDebtDays') || undefined,
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, phone, address, creditLimit, maxDebtDays, note } = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      name,
      phone: phone ?? null,
      address: address ?? null,
      creditLimit: creditLimit ? new Decimal(creditLimit) : new Decimal(0),
      maxDebtDays: maxDebtDays ?? null,
      note: note ?? null,
    },
  });
  revalidatePath('/admin/customers');
  return { customerId: customer.id };
}

export async function updateCreditSettingsAction(formData: FormData) {
  await requireRole('ADMIN');
  const customerId = z.string().uuid().parse(formData.get('customerId'));
  const creditLimit = formData.get('creditLimit') as string;
  const maxDebtDays = formData.get('maxDebtDays') as string;
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      creditLimit: creditLimit ? new Decimal(creditLimit) : undefined,
      maxDebtDays: maxDebtDays ? parseInt(maxDebtDays) : null,
    },
  });
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function writeOffDebtAction(formData: FormData) {
  const admin = await requireRole('ADMIN');
  const customerId = z.string().uuid().parse(formData.get('customerId'));
  const reason = (formData.get('reason') as string)?.trim();
  if (!reason) return { error: 'Reason is required' };

  const unpaidSales = await prisma.sale.findMany({
    where: { customerId, status: 'COMPLETED', balanceDue: { gt: 0 } },
  });

  if (unpaidSales.length === 0) return { error: 'No outstanding balance to write off' };

  await prisma.$transaction(async (tx) => {
    for (const sale of unpaidSales) {
      const before = { balanceDue: sale.balanceDue.toString() };
      await tx.sale.update({
        where: { id: sale.id },
        data: { balanceDue: new Decimal(0) },
      });
      await writeLog(tx, admin.id, 'DEBT_WRITEOFF', 'Sale', sale.id, before, {
        balanceDue: '0',
        reason,
      });
    }
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath('/admin/customers');
  return { ok: true as const };
}
