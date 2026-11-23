'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { usernameToEmail } from '@/lib/auth';

export async function signInAction(formData: FormData): Promise<{ error: string } | never> {
  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error || !data.user) {
    return { error: 'Invalid username or password' };
  }

  // Load profile to verify it exists and is active
  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id, isActive: true },
    select: { role: true },
  });

  if (!profile) {
    await supabase.auth.signOut();
    return { error: 'Account not found or deactivated' };
  }

  // Redirect based on role
  if (profile.role === 'ADMIN') {
    redirect('/admin/dashboard');
  } else {
    redirect('/sales/today');
  }
}
