import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

export default async function StockPage() {
  await requireRole('SALES');

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      nameAm: true,
      unit: true,
      stockQty: true,
      lowStockLevel: true,
      sellPrice: true,
    },
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Stock</h1>

      <div className="grid grid-cols-1 gap-3">
        {items.map(item => {
          const qty = new Decimal(item.stockQty.toString());
          const level = new Decimal(item.lowStockLevel.toString());
          const isLow = qty.lte(level);

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 flex justify-between items-center ${isLow ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                {item.nameAm && <p className="text-xs text-zinc-500">{item.nameAm}</p>}
                {isLow && (
                  <span className="text-xs text-amber-600 font-medium">⚠ Low stock</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {qty.toFixed(3)}
                </p>
                <p className="text-xs text-zinc-500">{item.unit}</p>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-zinc-400">No items in catalog</p>
          </div>
        )}
      </div>
    </div>
  );
}
