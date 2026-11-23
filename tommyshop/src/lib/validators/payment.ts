import { z } from 'zod';

const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a positive decimal')
  .refine((v) => parseFloat(v) > 0, 'Must be greater than 0');

export const CreateDebtPaymentSchema = z.object({
  customerId: z.string().uuid(),
  amount: positiveDecimalString,
  method: z.enum(['CASH', 'TRANSFER']),
  businessDate: z.string().date(),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  screenshotPath: z.string().optional(),
  imageHash: z.string().optional(),
  salesOverride: z.array(z.string().uuid()).optional(),
});

export type CreateDebtPaymentInput = z.infer<typeof CreateDebtPaymentSchema>;
