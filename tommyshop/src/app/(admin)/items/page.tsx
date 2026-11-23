import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { formatETB } from '@/lib/money';
import { createItemAndRedirect } from './actions';
import Decimal from 'decimal.js';

export default async function ItemsPage() {
  await requireRole('ADMIN');

  const items = await prisma.item.findMany({
    include: {
      prices: {
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Items</h1>
        <Link
          href="/items/new"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + Add Item
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Amharic</th>
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-right">Sell Price (ETB)</th>
              <th className="px-4 py-3 text-right">Avg Cost (ETB)</th>
              <th className="px-4 py-3 text-right">Stock Qty</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-zinc-400 dark:text-zinc-500"
                >
                  No items yet. Click <strong>+ Add Item</strong> to get started.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const isLowStock =
                new Decimal(item.stockQty.toString()).lte(
                  new Decimal(item.lowStockLevel.toString())
                );

              return (
                <tr
                  key={item.id}
                  className={
                    isLowStock
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-white dark:bg-zinc-900'
                  }
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {item.name}
                    {isLowStock && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                        Low stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {item.nameAm ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                    {formatETB(item.sellPrice.toString())}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                    {formatETB(item.avgCost.toString())}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                    {new Decimal(item.stockQty.toString()).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/items/${item.id}`}
                      className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item */}
      <section className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Add Item</h2>
        <form action={createItemAndRedirect} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Telapia"
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Amharic Name
            </label>
            <input
              name="nameAm"
              type="text"
              placeholder="e.g. ጥልፒያ"
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              name="unit"
              required
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="KG">KG</option>
              <option value="PIECE">PIECE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <input
              name="category"
              type="text"
              placeholder="e.g. Fish"
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Sell Price (ETB) <span className="text-red-500">*</span>
            </label>
            <input
              name="sellPrice"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Low-stock Level
            </label>
            <input
              name="lowStockLevel"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.000"
              className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Create Item
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
