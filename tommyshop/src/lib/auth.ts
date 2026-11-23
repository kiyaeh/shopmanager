import { createServerClient } from './supabase/server';
import { prisma } from './prisma';
import { AuthError } from './errors';

// Re-export so existing imports from '@/lib/auth' still work
export { AuthError } from './errors';

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@tommy.local`;
}

export async function getSession() {
  const supabase = await createServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) throw new AuthError(401, 'Not authenticated');
  return session.user;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireRole(minimumRole: string): Promise<any> {
  const user = await getSession();
  const profile = await prisma.profile.findUnique({
    where: { id: user.id, isActive: true },
  });
  if (!profile) throw new AuthError(401, 'Profile not found or account deactivated');
  if (minimumRole === 'ADMIN' && profile.role !== 'ADMIN') {
    throw new AuthError(403, 'ADMIN role required');
  }
  return profile;
}
