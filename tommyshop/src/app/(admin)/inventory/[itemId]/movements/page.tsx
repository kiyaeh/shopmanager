import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import Link from 'next/link';

interface Props { params: Promise<{ itemId: string }> }

export default async function MovementsPage({ params }: Props) {
  await requireRole('ADMIN');
  const { itemId } = await params;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) notFound();

  const movements = await prisma.stockMovement.findMany({
    where: { itemId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { createdBy: { select: { fullName: true } } },
  });

  const typeColors: Record<string, string> = {
    PURCHASE: 'text-green-600',
    SALE: 'text-red-600',
    SALE_VOID: 'text-blue-600',
    WASTE: 'text-orange-600',
    ADJUSTMENT: 'text-purple-600',
    COUNT_ADJUSTMENT: 'text-indigo-600',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/inventory" className="text-zinc-500 hover:text-zinc-700 text-sm">← Inventory</Link>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {item.name} — Movements
        </h1>
      </div>
      <p className="text-sm text-zinc-500">
        Current stock: <strong>{new Decimal(item.stockQty.toString()).toFixed(3)} {item.unit}</strong>
      </p>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Type</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Qty</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Reason</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {movements.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No movements</td></tr>
            ) : movements.map(m => (
              <tr key={m.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 text-zinc-600">{formatEthiopian(m.businessDate)}</td>
                <td className={`px-4 py-3 font-medium ${typeColors[m.type] ?? 'text-zinc-700'}`}>{m.type}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${new Decimal(m.qty.toString()).gt(0) ? 'text-green-600' : 'text-red-600'}`}>
                  {new Decimal(m.qty.toString()).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{m.reason ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{m.createdBy.fullName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
