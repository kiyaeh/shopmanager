'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthError } from '@/lib/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (error instanceof AuthError) {
      if (error.status === 401) router.replace('/login');
    }
  }, [error, router]);

  if (error instanceof AuthError && error.status === 403) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
            Access Denied
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            You don&apos;t have permission to view this page.
          </p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <button
          onClick={reset}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
