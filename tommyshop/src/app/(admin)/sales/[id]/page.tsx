import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { VoidButton } from './VoidButton';

interface Props { params: Promise<{ id: string }> }

export default async function SaleDetailPage({ params }: Props) {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { item: { select: { name: true, nameAm: true, unit: true } } } },
      payments: { include: { receivedBy: { select: { fullName: true } } } },
      createdBy: { select: { fullName: true } },
      customer: { select: { name: true } },
    },
  });
  if (!sale) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'Sale', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div className="flex items-center gap-3">
        <Link href="/admin/sales" className="text-zinc-500 text-sm">← Sales</Link>
        <h1 className="text-2xl font-bold">Sale #{sale.number}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          sale.status === 'VOIDED' ? 'bg-zinc-100 text-zinc-500' : 'bg-green-100 text-green-700'
        }`}>{sale.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-zinc-500">Date</p><p className="font-medium">{formatEthiopian(new Date(sale.businessDate))}</p></div>
        <div><p className="text-zinc-500">Created by</p><p className="font-medium">{sale.createdBy.fullName}</p></div>
        <div><p className="text-zinc-500">Customer</p><p className="font-medium">{sale.customer?.name ?? '—'}</p></div>
        <div><p className="text-zinc-500">Balance Due</p><p className={`font-bold ${new Decimal(sale.balanceDue.toString()).gt(0) ? 'text-red-600' : 'text-green-600'}`}>{formatETB(sale.balanceDue.toString())} ETB</p></div>
      </div>

      {/* Items */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-2 text-xs uppercase text-zinc-500">Item</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-zinc-500">Qty</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-zinc-500">Price</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-zinc-500">Cost</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-zinc-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {sale.items.map(si => (
              <tr key={si.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2">{si.item.name}</td>
                <td className="px-4 py-2 text-right">{new Decimal(si.qty.toString()).toFixed(3)} {si.item.unit}</td>
                <td className="px-4 py-2 text-right">{formatETB(si.unitPrice.toString())}</td>
                <td className="px-4 py-2 text-right text-zinc-500">{formatETB(si.unitCost.toString())}</td>
                <td className="px-4 py-2 text-right font-medium">{formatETB(si.lineTotal.toString())}</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 dark:bg-zinc-800 font-bold">
              <td className="px-4 py-2" colSpan={4}>Total</td>
              <td className="px-4 py-2 text-right">{formatETB(sale.total.toString())}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payments */}
      <div className="space-y-2">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Payments</h2>
        {sale.payments.map(p => (
          <div key={p.id} className="flex justify-between text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2">
            <span>{p.method} · {p.verifyStatus}</span>
            <span className="font-medium">{formatETB(p.amount.toString())} ETB</span>
          </div>
        ))}
      </div>

      {/* Audit trail */}
      {auditLogs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Audit Trail</h2>
          {auditLogs.map(log => (
            <div key={log.id} className="text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
              <span className="font-mono text-indigo-600 mr-2">{log.action}</span>
              <span className="text-zinc-500">by {log.user?.fullName ?? 'System'} · {new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Void */}
      {sale.status === 'COMPLETED' && <VoidButton saleId={sale.id} />}
    </div>
  );
}
