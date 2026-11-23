import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatEthiopian } from '@/lib/ethiopian-date';

export default async function UsersPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const users = await prisma.profile.findMany({ orderBy: { createdAt: 'asc' } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Users</h1>
      <p className="text-sm text-zinc-500">Create new users via the Supabase Auth dashboard, then they appear here automatically on first login.</p>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Username</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Full Name</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Role</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Phone</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Active</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {users.map(u => (
              <tr key={u.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 font-mono text-sm">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-600'
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{u.phone ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {u.isActive ? (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">Yes</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 text-xs px-2 py-0.5">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{formatEthiopian(new Date(u.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
