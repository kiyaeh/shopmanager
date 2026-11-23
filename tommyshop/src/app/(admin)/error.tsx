'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthError } from '@/lib/errors';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (error instanceof AuthError && error.status === 401) {
      router.replace('/login');
    }
  }, [error, router]);

  if (error instanceof AuthError && error.status === 403) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Access Denied</h1>
          <p className="text-zinc-500 mb-4">ADMIN role required to view this page.</p>
          <button onClick={() => router.replace('/login')} className="text-indigo-600 hover:underline">Sign in as Admin</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-500 text-sm mb-4">{error.message}</p>
        <button onClick={reset} className="text-indigo-600 hover:underline">Try again</button>
      </div>
    </div>
  );
}
