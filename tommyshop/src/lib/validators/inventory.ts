import { z } from 'zod';

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a positive decimal number')
  .refine((v) => parseFloat(v) > 0, 'Must be greater than 0');

const nonNegativeDecimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a non-negative decimal number')
  .refine((v) => parseFloat(v) >= 0, 'Must be 0 or greater');

export const CreatePurchaseItemSchema = z.object({
  itemId: z.string().uuid(),
  qty: positiveDecimalString,
  unitCost: positiveDecimalString,
});

export const CreatePurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  purchaseDate: z.string().date(),
  items: z.array(CreatePurchaseItemSchema).min(1, 'At least one item required'),
  note: z.string().optional(),
  amountPaid: nonNegativeDecimalString.optional(),
});

export const WasteSchema = z.object({
  itemId: z.string().uuid(),
  qty: positiveDecimalString,
  reason: z.enum(['spoiled', 'trimmed', 'sample', 'other']),
  businessDate: z.string().date(),
  note: z.string().optional(),
});

export const StockCountItemSchema = z.object({
  itemId: z.string().uuid(),
  countedQty: nonNegativeDecimalString,
});

export const ApplyStockCountSchema = z.object({
  stockCountId: z.string().uuid(),
});

export const CreateStockCountSchema = z.object({
  countDate: z.string().date(),
  note: z.string().optional(),
  items: z.array(StockCountItemSchema).min(1, 'At least one item required'),
});

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
export type WasteInput = z.infer<typeof WasteSchema>;
export type CreateStockCountInput = z.infer<typeof CreateStockCountSchema>;
