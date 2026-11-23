import type { PrismaTransaction } from '../prisma';

/**
 * Writes an AuditLog row using the provided transaction client.
 *
 * The function MUST be called with an active Prisma transaction (`tx`) so that
 * a failed insert causes the parent transaction to roll back automatically.
 * It never starts its own transaction.
 *
 * Valid action values used throughout the app:
 *   'PRICE_CHANGE' | 'VOID' | 'VERIFY' | 'REJECT' | 'CLOSE_DAY' |
 *   'REOPEN_DAY'  | 'DEBT_WRITEOFF' | 'STOCK_ADJUSTMENT' |
 *   'PURCHASE_EDIT' | 'ROLE_CHANGE'
 *
 * Requirements: 11.1, 11.2
 */
export async function writeLog(
  tx: PrismaTransaction,
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  before: object | null,
  after: object | null
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  });
}
