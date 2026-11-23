'use client';
import { useState, useTransition } from 'react';
import { bulkVerifyAction } from './actions';
import type { TransferSummary } from './TransferCard';

interface BulkVerifyBarProps {
  transfers: TransferSummary[];
}

export function BulkVerifyBar({ transfers }: BulkVerifyBarProps) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allSelected = selected.size === transfers.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transfers.map(t => t.id)));
    }
  }

  function handleBulkVerify() {
    if (selected.size === 0) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await bulkVerifyAction(Array.from(selected));
      if (res.ok) {
        setSuccess(`${res.count} transfer${res.count === 1 ? '' : 's'} verified`);
        setSelected(new Set());
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {allSelected ? 'Deselect all' : 'Select all'} ({transfers.length})
        </span>
      </label>

      {selected.size > 0 && (
        <button
          onClick={handleBulkVerify}
          disabled={pending}
          className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-50 transition-colors"
        >
          {pending ? 'Verifying…' : `✓ Verify ${selected.size} selected`}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
