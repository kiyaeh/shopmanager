import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { checkInvariants } from '@/lib/health';

export default async function HealthPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const report = await checkInvariants();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Health Check</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${report.healthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {report.healthy ? '✓ All Healthy' : '✗ Issues Found'}
        </span>
      </div>
      <p className="text-xs text-zinc-500">Checked at: {new Date(report.checkedAt).toLocaleString()}</p>

      {[
        { key: 'stockQty', label: 'Stock Qty = SUM(Movements)', result: report.stockQty },
        { key: 'balanceDue', label: 'Sale.balanceDue = total − paid', result: report.balanceDue },
        { key: 'duplicateReference', label: 'No duplicate (bankName, reference)', result: report.duplicateReference },
        { key: 'duplicateImageHash', label: 'No duplicate imageHash', result: report.duplicateImageHash },
      ].map(({ key, label, result }) => (
        <div key={key} className={`rounded-xl border p-5 space-y-2 ${result.healthy ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'}`}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
            <span className={`text-sm font-semibold ${result.healthy ? 'text-green-600' : 'text-red-600'}`}>
              {result.healthy ? '✓ OK' : `✗ ${result.errors.length} issue(s)`}
            </span>
          </div>
          {result.errors.length > 0 && (
            <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 font-mono">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
