'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordPurchaseAction } from '../actions';

interface Supplier { id: string; name: string; }
interface ItemOption { id: string; name: string; unit: string; }
interface LineItem { itemId: string; name: string; unit: string; qty: string; unitCost: string; }

export function PurchaseForm({ suppliers, items }: { suppliers: Supplier[]; items: ItemOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function addLine() {
    setLines(prev => [...prev, { itemId: '', name: '', unit: '', qty: '', unitCost: '' }]);
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines(prev => {
      const updated = [...prev];
      if (field === 'itemId') {
        const item = items.find(i => i.id === value);
        updated[idx] = { ...updated[idx], itemId: value, name: item?.name ?? '', unit: item?.unit ?? '' };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      supplierId: (fd.get('supplierId') as string) || undefined,
      purchaseDate: fd.get('purchaseDate') as string,
      note: (fd.get('note') as string) || undefined,
      amountPaid: (fd.get('amountPaid') as string) || undefined,
      items: lines.map(l => ({ itemId: l.itemId, qty: l.qty, unitCost: l.unitCost })),
    };
    setError(null);
    startTransition(async () => {
      const res = await recordPurchaseAction(input);
      if (res && 'error' in res) {
        setError(res.error ?? null);
      } else {
        setOpen(false);
        setLines([]);
        router.refresh();
      }
    });
  }

  if (!open) return (
    <button onClick={() => { setOpen(true); addLine(); }}
      className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
      + Record Purchase
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/10 p-5 space-y-4">
      <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">New Purchase</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Supplier (optional)</label>
          <select name="supplierId" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800">
            <option value="">No supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Purchase Date</label>
          <input name="purchaseDate" type="date" defaultValue={dateStr} required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Amount Paid (ETB)</label>
          <input name="amountPaid" type="number" step="0.01" min="0"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Note</label>
          <input name="note" type="text"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Items</span>
          <button type="button" onClick={addLine} className="text-xs text-indigo-600 hover:text-indigo-800">+ Add item</button>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1">
              <select value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)} required
                className="w-full rounded border border-zinc-300 px-2 py-2 text-sm bg-white dark:bg-zinc-800">
                <option value="">Select item…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="w-24">
              <input value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)}
                type="number" step="0.001" min="0.001" required placeholder="Qty"
                className="w-full rounded border border-zinc-300 px-2 py-2 text-sm bg-white dark:bg-zinc-800" />
            </div>
            <div className="w-28">
              <input value={line.unitCost} onChange={e => updateLine(idx, 'unitCost', e.target.value)}
                type="number" step="0.01" min="0.01" required placeholder="Unit cost"
                className="w-full rounded border border-zinc-300 px-2 py-2 text-sm bg-white dark:bg-zinc-800" />
            </div>
            <button type="button" onClick={() => removeLine(idx)} className="text-red-500 text-xs min-h-[36px] min-w-[36px] flex items-center justify-center">✕</button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={pending || lines.length === 0}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium min-h-[44px] disabled:opacity-50">
          {pending ? 'Saving…' : 'Record Purchase'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 min-h-[44px]">
          Cancel
        </button>
      </div>
    </form>
  );
}
