import { z } from 'zod';

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a positive decimal number')
  .refine((v) => parseFloat(v) > 0, 'Must be greater than 0');

export const SaleItemSchema = z.object({
  itemId: z.string().uuid(),
  qty: positiveDecimalString,
  unitPrice: positiveDecimalString,
});

export const PaymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER']),
  amount: positiveDecimalString,
  bankName: z.string().optional(),
  reference: z.string().optional(),
  screenshotPath: z.string().optional(),
  imageHash: z.string().optional(),
});

export const CreateSaleSchema = z.object({
  clientId: z.string().uuid(),
  businessDate: z.string().date(),
  items: z.array(SaleItemSchema).min(1, 'At least one item is required'),
  payments: z.array(PaymentSchema),
  customerId: z.string().uuid().optional(),
  note: z.string().optional(),
  adminOverrideCreditLimit: z.boolean().default(false),
  adminOverrideMaxDebtDays: z.boolean().default(false),
});

export const VoidSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().min(1, 'Void reason is required'),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type VoidSaleInput = z.infer<typeof VoidSaleSchema>;
export type SaleItemInput = z.infer<typeof SaleItemSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
