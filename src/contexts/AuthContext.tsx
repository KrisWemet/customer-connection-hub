import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  signIn as signInService,
  signUp as signUpService,
  signOut as signOutService,
  getCurrentUser,
  getSession,
  refreshSession as refreshSessionService
} from '@/lib/auth/service';
import type { AuthContextValue, AuthState } from '@/types/auth';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    initialized: false,
  });

  // Initialize on mount - check existing session
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function initializeAuth() {
      try {
        const session = await getSession();

        if (session) {
          try {
            const user = await getCurrentUser();
            setState({ user, loading: false, initialized: true });
          } catch (userError) {
            // If we can't get the user profile, clear the session
            console.error('Failed to get user profile, clearing session:', userError);
            await supabase.auth.signOut();
            setState({ user: null, loading: false, initialized: true });
          }
        } else {
          setState({ user: null, loading: false, initialized: true });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any bad session
        await supabase.auth.signOut().catch(() => {});
        setState({ user: null, loading: false, initialized: true });
      }
    }

    // Set timeout to force initialization after 10 seconds
    timeoutId = setTimeout(() => {
      setState(s => s.initialized ? s : { user: null, loading: false, initialized: true });
    }, 10000);

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            const user = await getCurrentUser();
            setState({ user, loading: false, initialized: true });
          } catch (error) {
            console.error('Failed to get user after sign in:', error);
            setState({ user: null, loading: false, initialized: true });
          }
        } else if (event === 'SIGNED_OUT') {
          setState({ user: null, loading: false, initialized: true });
        } else if (event === 'TOKEN_REFRESHED') {
          try {
            const user = await getCurrentUser();
            setState({ user, loading: false, initialized: true });
          } catch (error) {
            console.error('Failed to get user after token refresh:', error);
          }
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    setState(s => ({ ...s, loading: true }));
    try {
      await signInService(email, password);

      // Fetch the user profile
      const user = await getCurrentUser();

      setState({ user, loading: false, initialized: true });
      toast.success('Signed in successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(message);
      setState(s => ({ ...s, loading: false, initialized: true }));
      throw error;
    }
  }

  async function signUp(email: string, password: string, name?: string) {
    setState(s => ({ ...s, loading: true }));
    try {
      await signUpService(email, password, name);
      toast.success('Account created successfully! Please sign in.');
      setState(s => ({ ...s, loading: false, initialized: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
      setState(s => ({ ...s, loading: false, initialized: true }));
      throw error;
    }
  }

  async function signOut() {
    try {
      await signOutService();
      setState({ user: null, loading: false, initialized: true });
      toast.success('Signed out successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      toast.error(message);
      throw error;
    }
  }

  async function refreshSession() {
    try {
      await refreshSessionService();
      const user = await getCurrentUser();
      setState(s => ({ ...s, user }));
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setState({ user: null, loading: false, initialized: true });
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
