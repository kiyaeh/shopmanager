'use client';

import { useRef, useState, useTransition } from 'react';
import { updatePrice } from '../actions';

interface Props {
  itemId: string;
  currentPrice: string;
}

export function EditPriceForm({ itemId, currentPrice }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePrice(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="itemId" value={itemId} />
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          New Sell Price (ETB)
        </label>
        <div className="flex gap-2">
          <input
            name="newPrice"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={currentPrice}
            required
            className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {pending ? 'Saving…' : 'Update Price'}
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {success && (
          <p className="mt-1 text-sm text-green-600">Price updated successfully.</p>
        )}
      </div>
    </form>
  );
}
