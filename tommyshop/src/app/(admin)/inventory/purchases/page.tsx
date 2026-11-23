import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Link from 'next/link';
import { PurchaseForm } from './PurchaseForm';

export default async function PurchasesPage() {
  await requireRole('ADMIN');

  const purchases = await prisma.purchase.findMany({
    orderBy: { purchaseDate: 'desc' },
    take: 50,
    include: {
      supplier: { select: { name: true } },
      items: { include: { item: { select: { name: true } } } },
    },
  });

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, unit: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Purchases</h1>
        <Link href="/admin/inventory/suppliers" className="text-sm text-indigo-600 hover:text-indigo-800">
          Manage Suppliers →
        </Link>
      </div>

      <PurchaseForm suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))} items={items} />

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Supplier</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Items</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Total Cost</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {purchases.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No purchases yet</td></tr>
            ) : purchases.map(p => (
              <tr key={p.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 text-zinc-600">{formatEthiopian(p.purchaseDate)}</td>
                <td className="px-4 py-3">{p.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{p.items.map(pi => pi.item.name).join(', ')}</td>
                <td className="px-4 py-3 text-right font-medium">{formatETB(p.totalCost.toString())}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{formatETB(p.amountPaid.toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
