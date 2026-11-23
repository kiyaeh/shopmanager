'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Decimal from 'decimal.js';
import { createSaleAction } from './actions';

interface ItemOption {
  id: string;
  name: string;
  nameAm: string | null;
  unit: string;
  sellPrice: string;
  stockQty: string;
}

interface LineItem {
  itemId: string;
  name: string;
  nameAm: string | null;
  unit: string;
  qty: string;
  unitPrice: string;
}

type Step = 'items' | 'payment' | 'transfer' | 'confirm';

const BANKS = ['CBE', 'Telebirr', 'Awash', 'BOA', 'Dashen', 'Other'];

export function NewSaleForm({ items }: { items: ItemOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('items');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Transfer state
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [screenshotPath, setScreenshotPath] = useState('');
  const [imageHash, setImageHash] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.nameAm ?? '').includes(search)
  );

  const total = lines.reduce((s, l) => {
    try { return s.add(new Decimal(l.qty).mul(new Decimal(l.unitPrice))); }
    catch { return s; }
  }, new Decimal(0));

  function selectItem(item: ItemOption) {
    setSelectedItemId(item.id);
    setPriceInput(item.sellPrice);
    setQtyInput('');
  }

  function addLine() {
    if (!selectedItemId || !qtyInput || !priceInput) return;
    const item = items.find(i => i.id === selectedItemId)!;
    setLines(prev => {
      const existing = prev.findIndex(l => l.itemId === selectedItemId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: qtyInput, unitPrice: priceInput };
        return updated;
      }
      return [...prev, { itemId: item.id, name: item.name, nameAm: item.nameAm, unit: item.unit, qty: qtyInput, unitPrice: priceInput }];
    });
    setSelectedItemId(null);
    setQtyInput('');
    setPriceInput('');
  }

  function removeLine(itemId: string) {
    setLines(prev => prev.filter(l => l.itemId !== itemId));
  }

  function goToPayment() {
    if (lines.length === 0) { setError('Add at least one item'); return; }
    setError(null);
    setCashAmount(total.toFixed(2));
    setStep('payment');
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      let fileToUpload = file;

      // Compress client-side if > 1MB
      if (file.size > 1024 * 1024 && file.type.startsWith('image/')) {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', 0.7)
          );
          if (blob) {
            fileToUpload = new File([blob], file.name, { type: 'image/jpeg' });
          }
        }
      }

      const buffer = await fileToUpload.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const form = new FormData();
      form.append('file', fileToUpload);
      form.append('imageHash', hash);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return; }
      setScreenshotPath(data.storagePath);
      setImageHash(data.imageHash);
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleSubmitTransfer() {
    if (!bankName) { setUploadError('Please select a bank'); return; }
    if (!reference.trim()) { setUploadError('Reference number is required'); return; }
    if (!screenshotPath || !imageHash) { setUploadError('Please upload a screenshot'); return; }
    setUploadError(null);
    setStep('confirm');
  }

  function handleSubmit() {
    setError(null);
    const clientId = crypto.randomUUID();
    const today = new Date();
    const businessDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const payments =
      step === 'confirm' && screenshotPath && imageHash
        ? [{ method: 'TRANSFER' as const, amount: total.toFixed(2), bankName, reference, screenshotPath, imageHash }]
        : cashAmount && new Decimal(cashAmount).gt(0)
          ? [{ method: 'CASH' as const, amount: cashAmount }]
          : [];

    const input = {
      clientId,
      businessDate,
      items: lines.map(l => ({ itemId: l.itemId, qty: l.qty, unitPrice: l.unitPrice })),
      payments,
      adminOverrideCreditLimit: false,
      adminOverrideMaxDebtDays: false,
    };
    startTransition(async () => {
      const result = await createSaleAction(input);
      if (result.ok) {
        router.push('/sales/today');
      } else {
        setError(result.error);
        setStep('items');
      }
    });
  }

  if (step === 'items') return (
    <div className="p-4 space-y-4 pb-32">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center">←</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">New Sale</h1>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search items…"
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100"
      />

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(item => {
          const isLow = new Decimal(item.stockQty).lte(0);
          const isSelected = selectedItemId === item.id;
          return (
            <button key={item.id} onClick={() => selectItem(item)}
              className={`rounded-lg border p-3 text-left min-h-[80px] transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}>
              <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{item.name}</p>
              {item.nameAm && <p className="text-xs text-zinc-500">{item.nameAm}</p>}
              <p className="text-xs text-zinc-500 mt-1">ETB {item.sellPrice} · {item.unit}</p>
              {isLow && <span className="text-xs text-amber-600 font-medium">Low stock</span>}
            </button>
          );
        })}
      </div>

      {selectedItemId && (
        <div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-3">
          <p className="font-medium text-sm">{items.find(i => i.id === selectedItemId)?.name}</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Qty</label>
              <input type="number" step="0.001" min="0.001" value={qtyInput} onChange={e => setQtyInput(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-800" placeholder="0.000" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Unit Price</label>
              <input type="number" step="0.01" min="0.01" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
            </div>
          </div>
          <button onClick={addLine} className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium min-h-[44px]">
            Add to Sale
          </button>
        </div>
      )}

      {lines.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-500">Added Items</h3>
          {lines.map(l => (
            <div key={l.itemId} className="flex justify-between items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
              <div>
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-xs text-zinc-500">{l.qty} {l.unit} × ETB {l.unitPrice}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold">ETB {new Decimal(l.qty).mul(new Decimal(l.unitPrice)).toFixed(2)}</p>
                <button onClick={() => removeLine(l.itemId)} className="text-red-500 text-xs min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 p-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-xl font-bold">ETB {total.toFixed(2)}</p>
        </div>
        <button onClick={goToPayment} disabled={lines.length === 0}
          className="rounded-lg bg-indigo-600 text-white px-6 py-3 font-semibold min-h-[44px] disabled:opacity-50">
          Payment →
        </button>
      </div>
    </div>
  );

  if (step === 'payment') return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('items')} className="text-zinc-500 hover:text-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center">←</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Payment</h1>
      </div>
      <p className="text-sm text-zinc-500">Total: <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">ETB {total.toFixed(2)}</span></p>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setCashAmount(total.toFixed(2)); setStep('confirm'); }}
          className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-5 text-center min-h-[80px]">
          <p className="text-2xl mb-1">💵</p>
          <p className="font-semibold text-green-700 dark:text-green-300">Cash</p>
        </button>
        <button
          onClick={() => { setBankName(''); setReference(''); setScreenshotPath(''); setImageHash(''); setUploadError(null); setStep('transfer'); }}
          className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-5 text-center min-h-[80px]">
          <p className="text-2xl mb-1">🏦</p>
          <p className="font-semibold text-blue-700 dark:text-blue-300">Transfer</p>
        </button>
        {(['Credit', 'Split'] as const).map(m => (
          <button key={m} disabled
            className="rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-5 text-center min-h-[80px] opacity-50 cursor-not-allowed">
            <p className="font-semibold text-zinc-500">{m}</p>
            <p className="text-xs text-zinc-400">Coming soon</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cash Amount (ETB)</label>
        <input type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-lg font-mono" />
      </div>
    </div>
  );

  if (step === 'transfer') return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('payment')} className="text-zinc-500 hover:text-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center">←</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Transfer Details</h1>
      </div>
      <p className="text-sm text-zinc-500">Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">ETB {total.toFixed(2)}</span></p>

      {/* Bank select */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bank</label>
        <select
          value={bankName}
          onChange={e => setBankName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select a bank…</option>
          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Reference number */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reference / Transaction Number</label>
        <input
          type="text"
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="e.g. FT2401231234"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Screenshot upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Screenshot</label>
        {screenshotPath ? (
          <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 flex items-center gap-3">
            <span className="text-green-600 text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Screenshot uploaded</p>
              <p className="text-xs text-zinc-500 font-mono truncate">{imageHash.slice(0, 16)}…</p>
            </div>
            <button
              onClick={() => { setScreenshotPath(''); setImageHash(''); }}
              className="ml-auto text-xs text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 cursor-pointer hover:border-blue-400 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-3xl mb-2">📷</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{uploading ? 'Uploading…' : 'Tap to pick from camera or gallery'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              capture="environment"
              disabled={uploading}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </label>
        )}
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </div>

      <button
        onClick={handleSubmitTransfer}
        disabled={uploading || !screenshotPath}
        className="w-full rounded-xl bg-blue-600 text-white py-4 text-lg font-bold min-h-[56px] disabled:opacity-50"
      >
        Continue →
      </button>
    </div>
  );

  // Confirm step
  const isTransfer = !!(screenshotPath && imageHash);
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(isTransfer ? 'transfer' : 'payment')} className="text-zinc-500 hover:text-zinc-700 min-h-[44px] min-w-[44px] flex items-center justify-center">←</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Confirm Sale</h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700">
        {lines.map(l => (
          <div key={l.itemId} className="flex justify-between p-3">
            <span className="text-sm">{l.name} ×{l.qty}</span>
            <span className="text-sm font-medium">ETB {new Decimal(l.qty).mul(new Decimal(l.unitPrice)).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-bold">
          <span>Total</span>
          <span>ETB {total.toFixed(2)}</span>
        </div>
        {isTransfer ? (
          <div className="p-3 space-y-1 text-blue-600">
            <div className="flex justify-between">
              <span className="text-sm">Transfer ({bankName})</span>
              <span className="text-sm font-medium">ETB {total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-zinc-500">Ref: {reference}</p>
            <p className="text-xs text-zinc-400">Pending admin verification</p>
          </div>
        ) : (
          <div className="flex justify-between p-3 text-green-600">
            <span className="text-sm">Cash Paid</span>
            <span className="text-sm">ETB {cashAmount || '0.00'}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>}

      <button onClick={handleSubmit} disabled={pending}
        className="w-full rounded-xl bg-indigo-600 text-white py-4 text-lg font-bold min-h-[56px] disabled:opacity-50">
        {pending ? 'Saving…' : 'Complete Sale'}
      </button>
    </div>
  );
}
