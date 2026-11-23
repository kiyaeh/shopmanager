'use client';
import { useTransition } from 'react';
import { signOutAction } from '@/app/(auth)/logout/actions';

interface Props {
  compact?: boolean;
}

export function LogoutButton({ compact = false }: Props) {
  const [pending, startTransition] = useTransition();

  if (compact) {
    return (
      <button
        onClick={() => startTransition(() => signOutAction())}
        disabled={pending}
        title="Sign out"
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-600 hover:border-red-300 disabled:opacity-50 transition-colors min-h-[36px]"
      >
        {pending ? '…' : '🚪'}
      </button>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => signOutAction())}
      disabled={pending}
      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
    >
      <span>🚪</span>
      <span>{pending ? 'Signing out…' : 'Sign Out'}</span>
    </button>
  );
}
