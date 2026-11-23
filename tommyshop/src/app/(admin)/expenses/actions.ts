'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import Decimal from 'decimal.js';
import { z } from 'zod';

const ExpenseSchema = z.object({
  businessDate: z.string().date(),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) > 0),
  method: z.enum(['CASH', 'TRANSFER']).default('CASH'),
});

export async function createExpenseAction(formData: FormData) {
  const admin = await requireRole('ADMIN');
  const parsed = ExpenseSchema.safeParse({
    businessDate: formData.get('businessDate'),
    category: formData.get('category'),
    description: formData.get('description') || undefined,
    amount: formData.get('amount'),
    method: formData.get('method') || 'CASH',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { businessDate, category, description, amount, method } = parsed.data;
  await prisma.expense.create({
    data: {
      businessDate: new Date(businessDate),
      category,
      description: description ?? null,
      amount: new Decimal(amount),
      method,
      createdById: admin.id,
    },
  });
  revalidatePath('/admin/expenses');
  return { ok: true as const };
}
