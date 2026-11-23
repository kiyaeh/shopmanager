import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { WasteForm } from './WasteForm';

export default async function InventoryPage() {
  await requireRole('ADMIN');

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inventory</h1>
        <div className="flex gap-3">
          <Link href="/admin/inventory/stock-counts" className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Stock Count
          </Link>
          <Link href="/admin/inventory/purchases" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
            + Record Purchase
          </Link>
        </div>
      </div>

      <WasteForm items={items.map(i => ({ id: i.id, name: i.name, unit: i.unit }))} />

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Item</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Unit</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Stock Qty</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Avg Cost</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Sell Price</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {items.map(item => {
              const isLow = new Decimal(item.stockQty.toString()).lte(
                new Decimal(item.lowStockLevel.toString())
              );
              return (
                <tr key={item.id} className={isLow ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-white dark:bg-zinc-900'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                    {item.nameAm && <p className="text-xs text-zinc-500">{item.nameAm}</p>}
                    {isLow && (
                      <span className="text-xs text-amber-600 font-medium">⚠ Low stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{item.unit}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {new Decimal(item.stockQty.toString()).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatETB(item.avgCost.toString())}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatETB(item.sellPrice.toString())}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/inventory/${item.id}/movements`}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
