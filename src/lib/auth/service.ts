import { supabase } from '@/lib/supabase/client';
import type { AuthUser } from '@/types/auth';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password');
    }
    if (error.message.includes('Network')) {
      throw new Error('Unable to connect. Please check your connection.');
    }
    throw new Error(error.message);
  }
}

export async function signUp(email: string, password: string, name?: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: {
        name: name || null,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('An account with this email already exists');
    }
    throw new Error(error.message);
  }

  // Update the user profile with the name if provided
  if (data.user && name) {
    await supabase
      .from('user_profiles')
      .update({ name })
      .eq('id', data.user.id);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[Service] Session error:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('[Service] Failed to get session:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  // Fetch user profile from user_profiles table
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    name: profile.name || undefined,
    avatar_url: profile.avatar_url || undefined,
    created_at: profile.created_at,
  };
}

export async function refreshSession(): Promise<void> {
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    throw new Error(error.message);
  }
}
