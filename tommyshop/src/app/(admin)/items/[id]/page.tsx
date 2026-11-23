import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import { EditPriceForm } from './EditPriceForm';
import { EditDetailsForm } from './EditDetailsForm';
import { toggleItemActive } from '../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: Props) {
  await requireRole('ADMIN');

  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      prices: {
        orderBy: { effectiveFrom: 'desc' },
      },
    },
  });

  if (!item) notFound();

  const isLowStock = new Decimal(item.stockQty.toString()).lte(
    new Decimal(item.lowStockLevel.toString())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back link */}
      <div>
        <Link
          href="/admin/items"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          ← Back to Items
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {item.name}
            {item.nameAm && (
              <span className="ml-2 text-lg font-normal text-zinc-500 dark:text-zinc-400">
                ({item.nameAm})
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Unit: <span className="font-medium">{item.unit}</span>
            {item.category && (
              <>
                {' · '}Category:{' '}
                <span className="font-medium">{item.category}</span>
              </>
            )}
          </p>
        </div>

        {/* Active / Inactive toggle */}
        <form action={toggleItemActive}>
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              item.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/70'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600'
            }`}
          >
            {item.isActive ? '✓ Active — click to deactivate' : '✗ Inactive — click to activate'}
          </button>
        </form>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Sell Price"
          value={`ETB ${formatETB(item.sellPrice.toString())}`}
          highlight={false}
        />
        <StatCard
          label="Avg Cost"
          value={`ETB ${formatETB(item.avgCost.toString())}`}
          highlight={false}
        />
        <StatCard
          label="Stock Qty"
          value={new Decimal(item.stockQty.toString()).toFixed(3)}
          highlight={isLowStock}
          badge={isLowStock ? 'Low stock' : undefined}
        />
        <StatCard
          label="Low-stock Level"
          value={new Decimal(item.lowStockLevel.toString()).toFixed(3)}
          highlight={false}
        />
      </div>

      {/* Price update form */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Update Sell Price
        </h2>
        <EditPriceForm
          itemId={item.id}
          currentPrice={item.sellPrice.toString()}
        />
      </section>

      {/* Details edit form */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Edit Details
        </h2>
        <EditDetailsForm
          itemId={item.id}
          nameAm={item.nameAm}
          category={item.category}
          lowStockLevel={item.lowStockLevel.toString()}
        />
      </section>

      {/* Price history */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Price History
        </h2>
        {item.prices.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No price history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Effective From</th>
                  <th className="px-4 py-2 text-right">Sell Price (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {item.prices.map((ph) => (
                  <tr key={ph.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {formatEthiopian(new Date(ph.effectiveFrom))}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                      {formatETB(ph.sellPrice.toString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  highlight: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
      }`}
    >
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {badge && (
        <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          {badge}
        </span>
      )}
    </div>
  );
}
