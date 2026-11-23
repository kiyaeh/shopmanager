'use client';
import { useState, useTransition } from 'react';
import { submitDayEndAction } from './actions';
import Decimal from 'decimal.js';

interface Props { expectedCash: string; previousCountedCash: string | null; }

export function EndOfDayForm({ expectedCash, previousCountedCash }: Props) {
  const [pending, startTransition] = useTransition();
  const [countedCash, setCountedCash] = useState(previousCountedCash ?? '');
  const [result, setResult] = useState<{ expectedCash: string; countedCash: string; cashDifference: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const diff = countedCash ? new Decimal(countedCash || '0').sub(expectedCash) : null;

  function handleSubmit() {
    if (!countedCash || new Decimal(countedCash).lt(0)) { setError('Enter a valid cash amount'); return; }
    setError(null);
    startTransition(async () => {
      const res = await submitDayEndAction(countedCash);
      if (res.ok) setResult(res);
      else setError(res.error);
    });
  }

  if (result) return (
    <div className="rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold text-lg">End of Day Submitted ✓</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-zinc-500">Expected</p><p className="font-semibold">{result.expectedCash}</p></div>
        <div><p className="text-zinc-500">Counted</p><p className="font-semibold">{result.countedCash}</p></div>
      </div>
      <div className={`rounded-lg p-3 text-center font-bold ${new Decimal(result.cashDifference).isZero() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        Difference: {result.cashDifference} ETB
        {!new Decimal(result.cashDifference).isZero() && ' ⚠️'}
      </div>
      <p className="text-sm text-zinc-500 text-center">The admin will review and close the day.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Counted Cash (ETB)</label>
        <input type="number" step="0.01" min="0" value={countedCash} onChange={e => setCountedCash(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-4 text-2xl font-mono text-center"
          placeholder="0.00" />
      </div>
      {diff !== null && (
        <div className={`rounded-lg p-3 text-center text-sm font-medium ${diff.isZero() ? 'bg-green-100 text-green-700' : diff.lt(0) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          {diff.isZero() ? '✓ Matches expected cash' : `Difference: ${diff.toFixed(2)} ETB`}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleSubmit} disabled={pending || !countedCash}
        className="w-full rounded-xl bg-indigo-600 text-white py-4 text-lg font-bold min-h-[56px] disabled:opacity-50">
        {pending ? 'Submitting…' : 'Submit End of Day'}
      </button>
    </div>
  );
}
