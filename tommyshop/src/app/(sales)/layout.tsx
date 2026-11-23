import { requireRole } from '@/lib/auth';
import { EthiopianDateProvider } from '@/components/providers/EthiopianDateProvider';
import { SyncBadge } from '@/components/sales/SyncBadge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { LogoutButton } from '@/components/ui/LogoutButton';

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requireRole('SALES').catch((err: unknown) => {
    if (err instanceof AuthError) redirect('/login');
    throw err;
  });

  return (
    <EthiopianDateProvider>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">Tommy Market</span>
          <div className="flex items-center gap-3">
            <SyncBadge />
            <LogoutButton compact />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom tab bar — min 44px touch targets */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
          {[
            { href: '/sales/today', label: 'Today', icon: '🏠' },
            { href: '/sales/new', label: 'New Sale', icon: '➕' },
            { href: '/sales/stock', label: 'Stock', icon: '📦' },
            { href: '/sales/customers', label: 'Customers', icon: '👥' },
            { href: '/sales/end-of-day', label: 'End Day', icon: '✅' },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center min-h-[56px] text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
            >
              <span className="text-xl mb-0.5">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </EthiopianDateProvider>
  );
}
