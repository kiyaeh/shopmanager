import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatEthiopian } from '@/lib/ethiopian-date';

export default async function AuditPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { fullName: true, username: true } } },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Audit Log</h1>
      <p className="text-sm text-zinc-500">Last {logs.length} entries — read only</p>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Time</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Action</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Entity</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">By</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No audit entries</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="bg-white dark:bg-zinc-900 align-top">
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 font-mono font-medium">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p className="font-medium">{log.entity}</p>
                  {log.entityId && <p className="text-zinc-400 font-mono">{log.entityId.slice(0,8)}…</p>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {log.user?.fullName ?? 'System'}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {(log.before || log.after) ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700">View diff</summary>
                      <div className="mt-1 space-y-1 font-mono">
                        {log.before && <pre className="bg-red-50 dark:bg-red-900/20 rounded p-1 text-red-700 dark:text-red-400 overflow-x-auto">{JSON.stringify(log.before, null, 2)}</pre>}
                        {log.after && <pre className="bg-green-50 dark:bg-green-900/20 rounded p-1 text-green-700 dark:text-green-400 overflow-x-auto">{JSON.stringify(log.after, null, 2)}</pre>}
                      </div>
                    </details>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
