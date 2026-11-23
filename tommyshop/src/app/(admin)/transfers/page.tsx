import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedUrl } from '@/lib/supabase/admin';
import { TransferCard, type TransferSummary } from './TransferCard';
import { BulkVerifyBar } from './BulkVerifyBar';

export default async function TransfersPage() {
  await requireRole('ADMIN');

  const pending = await prisma.payment.findMany({
    where: { method: 'TRANSFER', verifyStatus: 'PENDING' },
    include: {
      sale: { select: { number: true, businessDate: true } },
      receivedBy: { select: { fullName: true, username: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Get signed URLs (300s expiry)
  const transfers: TransferSummary[] = await Promise.all(
    pending.map(async p => {
      let screenshotUrl: string | null = null;
      if (p.screenshotPath) {
        try { screenshotUrl = await getSignedUrl('transfer-screenshots', p.screenshotPath, 300); }
        catch { screenshotUrl = null; }
      }
      return {
        id: p.id,
        amount: p.amount.toString(),
        bankName: p.bankName,
        reference: p.reference,
        screenshotUrl,
        createdAt: p.createdAt.toISOString(),
        sale: p.sale ? { number: p.sale.number, businessDate: p.sale.businessDate } : null,
        receivedBy: p.receivedBy,
        customer: p.customer,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transfer Verification</h1>
        <span className="text-sm text-zinc-500">{transfers.length} pending</span>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-zinc-400">No pending transfers</p>
        </div>
      ) : (
        <>
          {transfers.length > 1 && (
            <BulkVerifyBar transfers={transfers} />
          )}
          <div className="space-y-4">
            {transfers.map(t => (
              <TransferCard key={t.id} transfer={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
