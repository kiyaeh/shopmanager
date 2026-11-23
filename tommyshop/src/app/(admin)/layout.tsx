import { requireRole } from '@/lib/auth';
import { EthiopianDateProvider } from '@/components/providers/EthiopianDateProvider';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof AuthError) redirect('/login');
    throw err;
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/transfers', label: 'Transfers', icon: '💸' },
    { href: '/admin/sales', label: 'Sales', icon: '🛒' },
    { href: '/admin/inventory', label: 'Inventory', icon: '📦' },
    { href: '/admin/customers', label: 'Customers', icon: '👥' },
    { href: '/admin/expenses', label: 'Expenses', icon: '💰' },
    { href: '/admin/reports', label: 'Reports', icon: '📄' },
    { href: '/admin/items', label: 'Items', icon: '🏷️' },
    { href: '/admin/users', label: 'Users', icon: '👤' },
    { href: '/admin/audit', label: 'Audit Log', icon: '🔍' },
    { href: '/admin/health', label: 'Health', icon: '❤️' },
  ];

  return (
    <EthiopianDateProvider>
      <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 fixed h-full z-10">
          <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-bold">Tommy Market</span>
            <span className="ml-2 text-xs text-zinc-400">Admin</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 h-14 flex items-center">
            <span className="font-bold">Tommy Market Admin</span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </EthiopianDateProvider>
  );
}
