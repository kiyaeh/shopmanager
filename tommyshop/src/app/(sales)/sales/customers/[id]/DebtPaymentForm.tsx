'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordDebtPaymentAction } from '../actions';
import Decimal from 'decimal.js';

interface SaleOption {
  id: string;
  number: number;
  date: string;
  balanceDue: string;
  items: string;
}

interface Props {
  customerId: string;
  outstanding: string;
  sales: SaleOption[];
}

export function DebtPaymentForm({ customerId, outstanding, sales }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function handleSubmit() {
    if (!amount || new Decimal(amount).lte(0)) {
      setError('Enter a valid amount');
      return;
    }
    setError(null);
    const input = { customerId, amount, method, businessDate: dateStr };
    startTransition(async () => {
      const res = await recordDebtPaymentAction(input);
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (success) return (
    <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-5 text-center space-y-3">
      <p className="text-green-700 dark:text-green-300 font-semibold text-lg">✓ Payment Recorded</p>
      <button onClick={() => router.push('/sales/customers')}
        className="text-sm text-indigo-600 hover:text-indigo-800">
        Back to Customers
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Record Payment</h2>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Amount (ETB)</label>
        <input type="number" step="0.01" min="0.01"
          value={amount} onChange={e => setAmount(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-4 text-2xl font-mono text-center"
          placeholder="0.00" />
      </div>

      <div className="flex gap-3">
        {(['CASH', 'TRANSFER'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMethod(m)}
            className={`flex-1 rounded-xl py-3 font-semibold text-sm min-h-[52px] border-2 transition-colors ${
              method === m
                ? m === 'CASH' ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
            }`}>
            {m === 'CASH' ? '💵 Cash' : '🏦 Transfer'}
          </button>
        ))}
      </div>

      {sales.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Will be allocated to oldest sales first:</p>
          {sales.map(s => (
            <div key={s.id}
              className="flex justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2.5">
              <span>Sale #{s.number} · {s.date}</span>
              <span className="text-red-600 font-medium">{s.balanceDue} ETB</span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

      <button onClick={handleSubmit} disabled={pending || !amount}
        className="w-full rounded-xl bg-green-600 text-white py-4 text-lg font-bold min-h-[56px] disabled:opacity-50 hover:bg-green-700 transition-colors">
        {pending ? 'Recording…' : 'Record Payment'}
      </button>
    </div>
  );
}
