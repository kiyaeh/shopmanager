import { createServerClient } from './supabase/server';
import { prisma } from './prisma';
import type { Profile } from '@prisma/client';
import { Role } from '@prisma/client';
import { AuthError } from './errors';

// Re-export so existing imports from '@/lib/auth' still work
export { AuthError } from './errors';

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@tommy.local`;
}

export async function getSession() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AuthError(401, 'Not authenticated');
  return user;
}

export async function requireRole(minimumRole: Role): Promise<Profile> {
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
