import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import type { UserRole } from '@/types/auth';

// TEMPORARY: Set to true to bypass authentication for development
const BYPASS_AUTH = true;

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  // TEMPORARY: Bypass authentication if flag is enabled
  if (BYPASS_AUTH) {
    return <>{children}</>;
  }

  const { user, initialized } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (!initialized) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
