import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupplierAction, deactivateSupplierAction } from '../actions';

export default async function SuppliersPage() {
  await requireRole('ADMIN');
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Suppliers</h1>

      <form action={async (fd: FormData) => { await createSupplierAction(fd); }} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Name *</label>
          <input name="name" type="text" required placeholder="Supplier name"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Phone</label>
          <input name="phone" type="text" placeholder="+251…"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Note</label>
          <input name="note" type="text"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div className="col-span-3">
          <button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium">
            Add Supplier
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Phone</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Note</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Status</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {suppliers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No suppliers yet</td></tr>
            ) : suppliers.map(s => (
              <tr key={s.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-zinc-500">{s.phone ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-500">{s.note ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {s.isActive ? (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5">Active</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 text-xs px-2 py-0.5">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.isActive && (
                    <form action={deactivateSupplierAction.bind(null, s.id)}>
                      <button type="submit" className="text-xs text-red-500 hover:text-red-700">Deactivate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
