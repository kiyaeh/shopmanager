'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createStockCountAction } from '../actions';
import Decimal from 'decimal.js';

interface ItemRow { id: string; name: string; nameAm: string | null; unit: string; systemQty: string; }

export function StockCountForm({ items }: { items: ItemRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const countItems = items
      .filter(item => counts[item.id] !== undefined && counts[item.id] !== '')
      .map(item => ({ itemId: item.id, countedQty: counts[item.id] }));

    if (countItems.length === 0) { setError('Enter at least one counted quantity'); return; }

    const input = {
      countDate: fd.get('countDate') as string,
      note: (fd.get('note') as string) || undefined,
      items: countItems,
    };

    setError(null);
    startTransition(async () => {
      const res = await createStockCountAction(input);
      if (res && 'error' in res) {
        setError(res.error ?? null);
      } else {
        setOpen(false);
        setCounts({});
        router.refresh();
      }
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
      + New Stock Count
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">New Stock Count</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Count Date</label>
          <input name="countDate" type="date" defaultValue={dateStr} required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Note</label>
          <input name="note" type="text"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800">
              <th className="text-left px-3 py-2 text-xs uppercase text-zinc-500">Item</th>
              <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">System Qty</th>
              <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">Counted Qty</th>
              <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map(item => {
              const counted = counts[item.id];
              let diff: string | null = null;
              if (counted !== undefined && counted !== '') {
                try {
                  diff = new Decimal(counted).sub(item.systemQty).toFixed(3);
                } catch { /* invalid input */ }
              }
              return (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.name}</p>
                    {item.nameAm && <p className="text-xs text-zinc-500">{item.nameAm}</p>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600">
                    {new Decimal(item.systemQty).toFixed(3)} {item.unit}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number" step="0.001" min="0"
                      value={counts[item.id] ?? ''}
                      onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm text-right bg-white dark:bg-zinc-800"
                      placeholder={item.systemQty}
                    />
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-sm ${diff === null ? 'text-zinc-400' : diff.startsWith('-') ? 'text-red-600' : diff === '0.000' ? 'text-zinc-400' : 'text-green-600'}`}>
                    {diff !== null ? (parseFloat(diff) > 0 ? '+' : '') + diff : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium min-h-[44px] disabled:opacity-50">
          {pending ? 'Saving…' : 'Save Count'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 min-h-[44px]">
          Cancel
        </button>
      </div>
    </form>
  );
}
