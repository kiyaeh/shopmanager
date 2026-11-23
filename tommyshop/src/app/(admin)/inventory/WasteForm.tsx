'use client';
import { useState, useTransition } from 'react';
import { recordWasteAction } from './actions';

const REASONS = ['spoiled', 'trimmed', 'sample', 'other'] as const;

interface ItemOption { id: string; name: string; unit: string; }

export function WasteForm({ items }: { items: ItemOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      itemId: fd.get('itemId') as string,
      qty: fd.get('qty') as string,
      reason: fd.get('reason') as string,
      businessDate: fd.get('businessDate') as string,
      note: (fd.get('note') as string) || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await recordWasteAction(input);
      if (res && 'error' in res) {
        setError(res.error ?? null);
      } else {
        setSuccess(true);
        setOpen(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div>
      {success && <p className="text-sm text-green-600 mb-2">Waste recorded successfully</p>}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Record Waste
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
          <h3 className="font-semibold text-red-700 dark:text-red-300">Record Waste</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Item</label>
              <select name="itemId" required className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800">
                <option value="">Select item…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Qty</label>
              <input name="qty" type="number" step="0.001" min="0.001" required
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" placeholder="0.000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Reason</label>
              <select name="reason" required className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800">
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
              <input name="businessDate" type="date" defaultValue={dateStr} required
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Note (optional)</label>
              <input name="note" type="text"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={pending}
              className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium min-h-[44px] disabled:opacity-50">
              {pending ? 'Recording…' : 'Record Waste'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 min-h-[44px]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
